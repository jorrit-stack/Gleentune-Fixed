import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as readline from 'readline';

const supabaseUrl = 'https://lokoaovrcslqlazxedhx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxva29hb3ZyY3NscWxhenhlZGh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3NTk0MzAsImV4cCI6MjA3NzMzNTQzMH0.rdRUkHWqtlMblbS2jt2AN1izyV1k8EcN6Mmwiywe5hc';

const supabase = createClient(supabaseUrl, supabaseKey);

interface GeoNamesCity {
  geonameId: string;
  name: string;
  asciiName: string;
  latitude: number;
  longitude: number;
  countryCode: string;
  population: number;
}

interface ImportStats {
  totalProcessed: number;
  inserted: number;
  skipped: number;
  duplicates: number;
  errors: number;
  byCountry: Record<string, number>;
  errorMessages: string[];
}

const stats: ImportStats = {
  totalProcessed: 0,
  inserted: 0,
  skipped: 0,
  duplicates: 0,
  errors: 0,
  byCountry: {},
  errorMessages: [],
};

const countryCache = new Map<string, string>();
const existingCitiesCache = new Set<string>();

async function loadCountries(): Promise<void> {
  console.log('Loading countries from database...');
  const { data: countries, error } = await supabase
    .from('countries')
    .select('country_id, iso_code');

  if (error) {
    throw new Error(`Failed to load countries: ${error.message}`);
  }

  for (const country of countries || []) {
    countryCache.set(country.iso_code, country.country_id);
  }

  console.log(`Loaded ${countryCache.size} countries`);
}

async function createMissingCountries(countryCodes: Set<string>): Promise<void> {
  const missingCodes = Array.from(countryCodes).filter(
    (code) => !countryCache.has(code)
  );

  if (missingCodes.length === 0) {
    console.log('All countries already exist');
    return;
  }

  console.log(`Creating ${missingCodes.length} missing countries...`);

  const countryNames: Record<string, string> = {
    US: 'United States',
    GB: 'United Kingdom',
    CA: 'Canada',
    AU: 'Australia',
    NZ: 'New Zealand',
    IE: 'Ireland',
    SG: 'Singapore',
    MY: 'Malaysia',
    PH: 'Philippines',
    TH: 'Thailand',
    VN: 'Vietnam',
    ID: 'Indonesia',
    PK: 'Pakistan',
    BD: 'Bangladesh',
    LK: 'Sri Lanka',
    NP: 'Nepal',
    MM: 'Myanmar',
    KH: 'Cambodia',
    LA: 'Laos',
    BN: 'Brunei',
    TL: 'Timor-Leste',
    CN: 'China',
    HK: 'Hong Kong',
    MO: 'Macau',
    TW: 'Taiwan',
    MN: 'Mongolia',
    KP: 'North Korea',
    AF: 'Afghanistan',
    IR: 'Iran',
    IQ: 'Iraq',
    SY: 'Syria',
    JO: 'Jordan',
    LB: 'Lebanon',
    IL: 'Israel',
    PS: 'Palestine',
    SA: 'Saudi Arabia',
    AE: 'United Arab Emirates',
    OM: 'Oman',
    YE: 'Yemen',
    KW: 'Kuwait',
    BH: 'Bahrain',
    QA: 'Qatar',
    TR: 'Turkey',
    GE: 'Georgia',
    AM: 'Armenia',
    AZ: 'Azerbaijan',
    KZ: 'Kazakhstan',
    UZ: 'Uzbekistan',
    TM: 'Turkmenistan',
    KG: 'Kyrgyzstan',
    TJ: 'Tajikistan',
    NO: 'Norway',
    SE: 'Sweden',
    DK: 'Denmark',
    FI: 'Finland',
    IS: 'Iceland',
    NL: 'Netherlands',
    PL: 'Poland',
    CZ: 'Czech Republic',
    SK: 'Slovakia',
    HU: 'Hungary',
    RO: 'Romania',
    UA: 'Ukraine',
    BY: 'Belarus',
    MD: 'Moldova',
    LT: 'Lithuania',
    LV: 'Latvia',
    EE: 'Estonia',
    AT: 'Austria',
    CH: 'Switzerland',
    LI: 'Liechtenstein',
    PT: 'Portugal',
    GR: 'Greece',
    HR: 'Croatia',
    SI: 'Slovenia',
    BA: 'Bosnia and Herzegovina',
    RS: 'Serbia',
    ME: 'Montenegro',
    MK: 'North Macedonia',
    AL: 'Albania',
    XK: 'Kosovo',
    BR: 'Brazil',
    CL: 'Chile',
    CO: 'Colombia',
    PE: 'Peru',
    VE: 'Venezuela',
    UY: 'Uruguay',
    PY: 'Paraguay',
    BO: 'Bolivia',
    GY: 'Guyana',
    SR: 'Suriname',
    GF: 'French Guiana',
    ZA: 'South Africa',
    EG: 'Egypt',
    NG: 'Nigeria',
    KE: 'Kenya',
    ET: 'Ethiopia',
    TZ: 'Tanzania',
    UG: 'Uganda',
    GH: 'Ghana',
    MA: 'Morocco',
    DZ: 'Algeria',
    TN: 'Tunisia',
    LY: 'Libya',
    SD: 'Sudan',
    SS: 'South Sudan',
    SO: 'Somalia',
    DJ: 'Djibouti',
    ER: 'Eritrea',
    AO: 'Angola',
    MZ: 'Mozambique',
    ZM: 'Zambia',
    ZW: 'Zimbabwe',
    BW: 'Botswana',
    NA: 'Namibia',
    MW: 'Malawi',
    MG: 'Madagascar',
    MU: 'Mauritius',
    SC: 'Seychelles',
    RE: 'Réunion',
    YT: 'Mayotte',
    KM: 'Comoros',
  };

  const newCountries = missingCodes.map((code) => ({
    iso_code: code,
    country_name: countryNames[code] || code,
    region: null,
  }));

  const batchSize = 100;
  for (let i = 0; i < newCountries.length; i += batchSize) {
    const batch = newCountries.slice(i, i + batchSize);
    const { error } = await supabase.from('countries').insert(batch);

    if (error) {
      console.error(`Error inserting countries batch: ${error.message}`);
    }
  }

  await loadCountries();
  console.log(`Created ${missingCodes.length} new countries`);
}

function parseCityLine(line: string): GeoNamesCity | null {
  const fields = line.split('\t');

  if (fields.length < 15) {
    return null;
  }

  const geonameId = fields[0];
  const name = fields[1];
  const asciiName = fields[2];
  const latitude = parseFloat(fields[4]);
  const longitude = parseFloat(fields[5]);
  const countryCode = fields[8];
  const population = parseInt(fields[14] || '0', 10);

  if (
    !geonameId ||
    !name ||
    isNaN(latitude) ||
    isNaN(longitude) ||
    !countryCode ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null;
  }

  return {
    geonameId,
    name: name.substring(0, 255),
    asciiName: asciiName.substring(0, 255),
    latitude,
    longitude,
    countryCode,
    population,
  };
}

async function loadExistingCities(): Promise<void> {
  console.log('Loading existing cities to prevent duplicates...');
  let offset = 0;
  const limit = 5000;

  while (true) {
    const { data: cities, error } = await supabase
      .from('cities')
      .select('city_name, latitude, longitude')
      .range(offset, offset + limit - 1);

    if (error) {
      console.error(`Error loading existing cities: ${error.message}`);
      break;
    }

    if (!cities || cities.length === 0) break;

    for (const city of cities) {
      const key = `${city.city_name}|${city.latitude}|${city.longitude}`;
      existingCitiesCache.add(key);
    }

    offset += limit;

    if (cities.length < limit) break;
  }

  console.log(`Loaded ${existingCitiesCache.size} existing cities into cache`);
}

async function insertCitiesBatch(cities: GeoNamesCity[]): Promise<void> {
  if (cities.length === 0) return;

  const cityRecords = cities
    .map((city) => {
      const countryId = countryCache.get(city.countryCode);
      if (!countryId) {
        stats.skipped++;
        return null;
      }

      const key = `${city.name}|${city.latitude}|${city.longitude}`;
      if (existingCitiesCache.has(key)) {
        stats.duplicates++;
        return null;
      }

      existingCitiesCache.add(key);

      return {
        city_name: city.name,
        country_id: countryId,
        latitude: city.latitude,
        longitude: city.longitude,
        population: city.population,
      };
    })
    .filter((record) => record !== null);

  if (cityRecords.length === 0) return;

  const { data, error } = await supabase
    .from('cities')
    .upsert(cityRecords, {
      onConflict: 'city_name,country_id,latitude,longitude',
      ignoreDuplicates: true,
    })
    .select('city_id');

  if (error) {
    stats.errors += cityRecords.length;
    stats.errorMessages.push(`Batch insert error: ${error.message}`);
  } else {
    const insertedCount = data?.length || cityRecords.length;
    stats.inserted += insertedCount;

    for (const city of cities) {
      if (countryCache.has(city.countryCode)) {
        stats.byCountry[city.countryCode] =
          (stats.byCountry[city.countryCode] || 0) + 1;
      }
    }
  }
}

async function processFile(filePath: string): Promise<void> {
  console.log(`\nProcessing ${filePath}...`);

  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  const uniqueCountryCodes = new Set<string>();
  const citiesBuffer: GeoNamesCity[] = [];
  const batchSize = 500;

  for await (const line of rl) {
    const city = parseCityLine(line);

    if (!city) {
      stats.skipped++;
      continue;
    }

    uniqueCountryCodes.add(city.countryCode);
    citiesBuffer.push(city);
    stats.totalProcessed++;

    if (citiesBuffer.length >= batchSize) {
      await insertCitiesBatch(citiesBuffer);
      citiesBuffer.length = 0;

      if (stats.totalProcessed % 10000 === 0) {
        console.log(
          `Processed ${stats.totalProcessed.toLocaleString()} | Inserted ${stats.inserted.toLocaleString()} | Duplicates ${stats.duplicates.toLocaleString()}`
        );
      }
    }
  }

  if (citiesBuffer.length > 0) {
    await insertCitiesBatch(citiesBuffer);
  }

  console.log(`\nDiscovered ${uniqueCountryCodes.size} unique country codes`);
  await createMissingCountries(uniqueCountryCodes);
}

async function rebuildIndexes(): Promise<void> {
  console.log('\nRebuilding geographic indexes...');

  const indexes = [
    'DROP INDEX IF EXISTS idx_cities_country',
    'DROP INDEX IF EXISTS idx_cities_location',
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cities_country ON cities(country_id)',
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cities_location ON cities(latitude, longitude)',
  ];

  for (const sql of indexes) {
    try {
      await supabase.rpc('exec_sql', { sql });
      console.log(`  ✓ ${sql.substring(0, 50)}...`);
    } catch (error: any) {
      console.log(`  Using execute_sql instead...`);
    }
  }

  console.log('Indexes rebuilt');
}

async function generateReport(): Promise<void> {
  console.log('\n=== Import Complete ===\n');
  console.log(`Total lines processed: ${stats.totalProcessed.toLocaleString()}`);
  console.log(`Cities inserted: ${stats.inserted.toLocaleString()}`);
  console.log(`Duplicates skipped: ${stats.duplicates.toLocaleString()}`);
  console.log(`Invalid/skipped: ${stats.skipped.toLocaleString()}`);
  console.log(`Errors: ${stats.errors.toLocaleString()}`);

  if (stats.errorMessages.length > 0) {
    console.log('\nFirst 5 errors:');
    stats.errorMessages.slice(0, 5).forEach((msg) => console.log(`  - ${msg}`));
  }

  const { data: totalCities } = await supabase
    .from('cities')
    .select('city_id', { count: 'exact', head: true });

  console.log(`\n=== Total Cities in Database: ${totalCities || 0} ===\n`);

  const { data: countryStats } = await supabase
    .from('cities')
    .select('country_id, countries(country_name, iso_code)')
    .limit(200000);

  if (countryStats) {
    const countryCounts: Record<string, { name: string; count: number }> = {};

    for (const city of countryStats) {
      const country = city.countries as any;
      if (country) {
        const key = country.iso_code;
        if (!countryCounts[key]) {
          countryCounts[key] = { name: country.country_name, count: 0 };
        }
        countryCounts[key].count++;
      }
    }

    const sortedCountries = Object.entries(countryCounts)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 20);

    console.log('=== Top 20 Countries by City Count ===\n');
    for (const [code, data] of sortedCountries) {
      console.log(
        `${data.name.padEnd(25)} (${code}): ${data.count.toLocaleString()}`
      );
    }
  }
}

async function main() {
  console.log('=== GeoNames Cities1000 Import ===\n');

  try {
    await loadCountries();
    await loadExistingCities();
    await processFile('cities1000.txt');
    await generateReport();

    console.log('\n✓ Import completed successfully');
  } catch (error) {
    console.error('\n✗ Fatal error:', error);
    process.exit(1);
  }
}

main();
