import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lokoaovrcslqlazxedhx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxva29hb3ZyY3NscWxhenhlZGh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3NTk0MzAsImV4cCI6MjA3NzMzNTQzMH0.rdRUkHWqtlMblbS2jt2AN1izyV1k8EcN6Mmwiywe5hc';

const supabase = createClient(supabaseUrl, supabaseKey);

const GEONAMES_BASE = 'https://download.geonames.org/export/dump';

interface GeoNamesCountry {
  iso: string;
  country: string;
  continent: string;
}

interface GeoNamesCity {
  name: string;
  latitude: string;
  longitude: string;
  countryCode: string;
  population: string;
}

async function fetchCountries(): Promise<GeoNamesCountry[]> {
  console.log('Fetching countryInfo.txt from GeoNames...');
  const response = await fetch(`${GEONAMES_BASE}/countryInfo.txt`);
  const text = await response.text();
  const lines = text.split('\n');
  const countries: GeoNamesCountry[] = [];

  for (const line of lines) {
    if (line.startsWith('#') || line.trim() === '') continue;
    const parts = line.split('\t');
    if (parts.length < 19) continue;

    countries.push({
      iso: parts[0],
      country: parts[4],
      continent: parts[8],
    });
  }

  return countries;
}

async function fetchCities(): Promise<GeoNamesCity[]> {
  console.log('Fetching cities500.txt from GeoNames (this may take a minute)...');
  const response = await fetch(`${GEONAMES_BASE}/cities500.txt`);
  const text = await response.text();
  const lines = text.split('\n');
  const cities: GeoNamesCity[] = [];

  for (const line of lines) {
    if (line.trim() === '') continue;
    const parts = line.split('\t');
    if (parts.length < 19) continue;

    cities.push({
      name: parts[1],
      latitude: parts[4],
      longitude: parts[5],
      countryCode: parts[8],
      population: parts[14],
    });
  }

  return cities;
}

async function importCountries(countries: GeoNamesCountry[]) {
  let imported = 0;
  let skipped = 0;

  for (const country of countries) {
    if (!country.iso || country.iso.length < 2 || !country.country) {
      skipped++;
      continue;
    }

    const { data: existing } = await supabase
      .from('countries')
      .select('country_id')
      .eq('iso_code', country.iso)
      .maybeSingle();

    if (existing) {
      skipped++;
      continue;
    }

    const { error } = await supabase.from('countries').insert({
      country_name: country.country,
      iso_code: country.iso,
      region: country.continent || null,
    });

    if (error) {
      console.error(`Error importing ${country.iso}:`, error.message);
      skipped++;
    } else {
      imported++;
    }
  }

  return { imported, skipped };
}

async function importCities(cities: GeoNamesCity[]) {
  let imported = 0;
  let skipped = 0;

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

      if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
        skipped++;
        continue;
      }

      if (!city.name || city.name.trim() === '') {
        skipped++;
        continue;
      }

      const countryId = countryMap.get(city.countryCode);
      if (!countryId) {
        skipped++;
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
        .insert(citiesToInsert);

      if (error) {
        skipped += citiesToInsert.length;
      } else {
        imported += citiesToInsert.length;
      }
    }

    if ((i / batchSize) % 20 === 0) {
      console.log(`Processed ${i + batch.length}/${cities.length} cities...`);
    }
  }

  return { imported, skipped };
}

async function main() {
  console.log('GeoNames Data Prepopulation Script\n');
  console.log('This will download and import:');
  console.log('- countryInfo.txt (~250 countries)');
  console.log('- cities500.txt (~200,000 cities with population > 500)\n');

  try {
    const countries = await fetchCountries();
    console.log(`Fetched ${countries.length} countries\n`);

    console.log('Importing countries...');
    const countryResult = await importCountries(countries);
    console.log(`Countries: ${countryResult.imported} imported, ${countryResult.skipped} skipped\n`);

    const cities = await fetchCities();
    console.log(`Fetched ${cities.length} cities\n`);

    console.log('Importing cities...');
    const cityResult = await importCities(cities);
    console.log(`Cities: ${cityResult.imported} imported, ${cityResult.skipped} skipped\n`);

    const { count: countryCount } = await supabase
      .from('countries')
      .select('*', { count: 'exact', head: true });

    const { count: cityCount } = await supabase
      .from('cities')
      .select('*', { count: 'exact', head: true });

    console.log('=== Final Summary ===');
    console.log(`\nCountries:`);
    console.log(`  Imported: ${countryResult.imported}`);
    console.log(`  Skipped: ${countryResult.skipped}`);
    console.log(`\nCities:`);
    console.log(`  Imported: ${cityResult.imported}`);
    console.log(`  Skipped: ${cityResult.skipped}`);
    console.log(`\n=== Database Verification ===`);
    console.log(`Total countries in database: ${countryCount || 0}`);
    console.log(`Total cities in database: ${cityCount || 0}`);
    console.log('\nPrepopulation completed successfully!');
  } catch (error) {
    console.error('\nPrepopulation failed:', error);
    process.exit(1);
  }
}

main();
