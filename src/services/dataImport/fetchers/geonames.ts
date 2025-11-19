import { supabase } from '../../../lib/supabase';

const GEONAMES_BASE = 'https://download.geonames.org/export/dump';
const COUNTRY_INFO_URL = `${GEONAMES_BASE}/countryInfo.txt`;

interface GeoNamesCountry {
  iso: string;
  iso3: string;
  isoNumeric: string;
  fips: string;
  country: string;
  capital: string;
  area: string;
  population: string;
  continent: string;
  tld: string;
  currencyCode: string;
  currencyName: string;
  phone: string;
  postalCodeFormat: string;
  postalCodeRegex: string;
  languages: string;
  geonameId: string;
  neighbours: string;
  equivalentFipsCode: string;
}

interface GeoNamesCity {
  geonameid: string;
  name: string;
  asciiname: string;
  alternatenames: string;
  latitude: string;
  longitude: string;
  featureClass: string;
  featureCode: string;
  countryCode: string;
  cc2: string;
  admin1Code: string;
  admin2Code: string;
  admin3Code: string;
  admin4Code: string;
  population: string;
  elevation: string;
  dem: string;
  timezone: string;
  modificationDate: string;
}

export async function fetchAndParseCountries(): Promise<GeoNamesCountry[]> {
  try {
    console.log('Fetching countryInfo.txt from GeoNames...');
    const response = await fetch(COUNTRY_INFO_URL);

    if (!response.ok) {
      throw new Error(`Failed to fetch countries: ${response.status}`);
    }

    const text = await response.text();
    const lines = text.split('\n');
    const countries: GeoNamesCountry[] = [];

    for (const line of lines) {
      if (line.startsWith('#') || line.trim() === '') {
        continue;
      }

      const parts = line.split('\t');
      if (parts.length < 19) {
        continue;
      }

      countries.push({
        iso: parts[0],
        iso3: parts[1],
        isoNumeric: parts[2],
        fips: parts[3],
        country: parts[4],
        capital: parts[5],
        area: parts[6],
        population: parts[7],
        continent: parts[8],
        tld: parts[9],
        currencyCode: parts[10],
        currencyName: parts[11],
        phone: parts[12],
        postalCodeFormat: parts[13],
        postalCodeRegex: parts[14],
        languages: parts[15],
        geonameId: parts[16],
        neighbours: parts[17],
        equivalentFipsCode: parts[18],
      });
    }

    return countries;
  } catch (error) {
    console.error('Error fetching countries:', error);
    return [];
  }
}

export async function fetchAndParseCities(): Promise<GeoNamesCity[]> {
  try {
    console.log('Fetching cities500.txt from GeoNames...');
    console.log('Note: This is a large file (15MB+), downloading...');

    const response = await fetch(`${GEONAMES_BASE}/cities500.txt`);

    if (!response.ok) {
      throw new Error(`Failed to fetch cities: ${response.status}`);
    }

    const text = await response.text();
    const lines = text.split('\n');
    const cities: GeoNamesCity[] = [];

    console.log(`Parsing ${lines.length} city records...`);

    for (const line of lines) {
      if (line.trim() === '') {
        continue;
      }

      const parts = line.split('\t');
      if (parts.length < 19) {
        continue;
      }

      cities.push({
        geonameid: parts[0],
        name: parts[1],
        asciiname: parts[2],
        alternatenames: parts[3],
        latitude: parts[4],
        longitude: parts[5],
        featureClass: parts[6],
        featureCode: parts[7],
        countryCode: parts[8],
        cc2: parts[9],
        admin1Code: parts[10],
        admin2Code: parts[11],
        admin3Code: parts[12],
        admin4Code: parts[13],
        population: parts[14],
        elevation: parts[15],
        dem: parts[16],
        timezone: parts[17],
        modificationDate: parts[18],
      });
    }

    return cities;
  } catch (error) {
    console.error('Error fetching cities:', error);
    return [];
  }
}

function validateCoordinates(lat: number, lon: number): boolean {
  return lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
}

export async function importCountries(
  countries: GeoNamesCountry[]
): Promise<{ imported: number; skipped: number; errors: string[] }> {
  const result = { imported: 0, skipped: 0, errors: [] as string[] };

  console.log(`Importing ${countries.length} countries...`);

  for (const country of countries) {
    if (!country.iso || country.iso.length < 2 || country.iso.length > 3) {
      result.skipped++;
      continue;
    }

    if (!country.country || country.country.trim() === '') {
      result.skipped++;
      continue;
    }

    const { data: existing } = await supabase
      .from('countries')
      .select('country_id')
      .eq('iso_code', country.iso)
      .maybeSingle();

    if (existing) {
      result.skipped++;
      continue;
    }

    const { error } = await supabase.from('countries').insert({
      country_name: country.country,
      iso_code: country.iso,
      region: country.continent || null,
    });

    if (error) {
      result.errors.push(`Error importing ${country.iso}: ${error.message}`);
      result.skipped++;
    } else {
      result.imported++;
    }
  }

  return result;
}

export async function importCities(
  cities: GeoNamesCity[]
): Promise<{ imported: number; skipped: number; errors: string[] }> {
  const result = { imported: 0, skipped: 0, errors: [] as string[] };

  console.log(`Importing ${cities.length} cities...`);

  const { data: countriesData } = await supabase
    .from('countries')
    .select('country_id, iso_code');

  const countryMap = new Map<string, string>();
  if (countriesData) {
    for (const country of countriesData) {
      countryMap.set(country.iso_code, country.country_id);
    }
  }

  const batchSize = 100;
  for (let i = 0; i < cities.length; i += batchSize) {
    const batch = cities.slice(i, i + batchSize);
    const citiesToInsert = [];

    for (const city of batch) {
      const lat = parseFloat(city.latitude);
      const lon = parseFloat(city.longitude);

      if (isNaN(lat) || isNaN(lon) || !validateCoordinates(lat, lon)) {
        result.skipped++;
        continue;
      }

      if (!city.name || city.name.trim() === '') {
        result.skipped++;
        continue;
      }

      const countryId = countryMap.get(city.countryCode);
      if (!countryId) {
        result.skipped++;
        continue;
      }

      const population = parseInt(city.population);

      citiesToInsert.push({
        city_name: city.name,
        country_id: countryId,
        latitude: lat,
        longitude: lon,
        population: isNaN(population) ? null : population,
      });
    }

    if (citiesToInsert.length > 0) {
      const { error } = await supabase
        .from('cities')
        .upsert(citiesToInsert, { onConflict: 'city_name,country_id', ignoreDuplicates: true });

      if (error) {
        result.errors.push(`Batch error: ${error.message}`);
        result.skipped += citiesToInsert.length;
      } else {
        result.imported += citiesToInsert.length;
      }
    }

    if ((i / batchSize) % 10 === 0) {
      console.log(`Processed ${i + batch.length}/${cities.length} cities...`);
    }
  }

  return result;
}

export async function prepopulateGeoData(): Promise<{
  countries: { imported: number; skipped: number; errors: string[] };
  cities: { imported: number; skipped: number; errors: string[] };
}> {
  console.log('=== Starting GeoNames Data Import ===\n');

  console.log('Step 1: Fetching countries...');
  const countries = await fetchAndParseCountries();
  console.log(`Fetched ${countries.length} countries from GeoNames\n`);

  console.log('Step 2: Importing countries...');
  const countryResult = await importCountries(countries);
  console.log(`Countries: ${countryResult.imported} imported, ${countryResult.skipped} skipped`);
  if (countryResult.errors.length > 0) {
    console.log(`Errors: ${countryResult.errors.length}`);
  }

  console.log('\nStep 3: Fetching cities...');
  const cities = await fetchAndParseCities();
  console.log(`Fetched ${cities.length} cities from GeoNames\n`);

  console.log('Step 4: Importing cities...');
  const cityResult = await importCities(cities);
  console.log(`Cities: ${cityResult.imported} imported, ${cityResult.skipped} skipped`);
  if (cityResult.errors.length > 0) {
    console.log(`Errors: ${cityResult.errors.length}`);
  }

  console.log('\n=== GeoNames Import Complete ===');

  return {
    countries: countryResult,
    cities: cityResult,
  };
}
