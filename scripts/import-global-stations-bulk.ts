import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { detectLicenseTier } from '../src/services/licenseChecker.js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY!;

const supabase = createClient(SUPABASE_URL, ANON_KEY);

interface RadioBrowserStation {
  stationuuid: string;
  name: string;
  url: string;
  url_resolved: string;
  homepage: string;
  favicon: string;
  tags: string;
  country: string;
  countrycode: string;
  state: string;
  language: string;
  votes: number;
  codec: string;
  bitrate: number;
  hls: number;
  lastcheckok: number;
  lastchecktime_iso8601: string;
  lastcheckoktime_iso8601: string;
  clickcount: number;
  clicktrend: number;
  geo_lat: number | null;
  geo_long: number | null;
}

async function fetchTopStations(limit: number): Promise<RadioBrowserStation[]> {
  const response = await fetch(`https://de1.api.radio-browser.info/json/stations/topvote/${limit}`, {
    headers: { 'User-Agent': 'gleetune/1.0' }
  });

  if (!response.ok) {
    throw new Error(`Failed: ${response.status}`);
  }

  return await response.json();
}

async function fetchCountryStations(countries: string[]): Promise<RadioBrowserStation[]> {
  const allStations: RadioBrowserStation[] = [];

  for (const country of countries) {
    console.log(`Fetching ${country} stations...`);
    const response = await fetch(`https://de1.api.radio-browser.info/json/stations/bycountry/${encodeURIComponent(country)}`, {
      headers: { 'User-Agent': 'gleetune/1.0' }
    });

    if (response.ok) {
      const stations = await response.json();
      console.log(`  Found ${stations.length} stations`);
      allStations.push(...stations);
    }
  }

  return allStations;
}

async function main() {
  console.log('🌍 Importing global Radio Browser stations\n');

  const majorCountries = [
    'India',
    'United States',
    'United Kingdom',
    'Germany',
    'France',
    'Canada',
    'Australia',
    'Brazil',
    'Japan',
    'South Korea'
  ];

  console.log('📥 Fetching stations from major countries...\n');
  const countryStations = await fetchCountryStations(majorCountries);

  console.log('\n📥 Fetching top voted stations globally...\n');
  const topStations = await fetchTopStations(1000);

  const allStations = [...countryStations, ...topStations];

  const uniqueMap = new Map<string, RadioBrowserStation>();
  for (const station of allStations) {
    const key = station.url_resolved || station.url;
    if (key && !uniqueMap.has(key)) {
      uniqueMap.set(key, station);
    }
  }

  console.log(`\n📊 ${uniqueMap.size} unique stations to process`);
  console.log('🔄 Importing all stations with license classification...\n');

  let imported = 0;
  let safe = 0;
  let restricted = 0;
  let errors = 0;
  let processed = 0;

  const batchSize = 50;
  const stations = Array.from(uniqueMap.values());

  for (let i = 0; i < stations.length; i += batchSize) {
    const batch = stations.slice(i, i + batchSize);
    const inserts = [];

    for (const station of batch) {
      const tags = station.tags ? station.tags.split(',').map(t => t.trim()).filter(Boolean) : [];

      const licenseTier = detectLicenseTier({
        name: station.name,
        tags: tags,
        homepage: station.homepage
      });

      if (licenseTier === 'safe') {
        safe++;
      } else {
        restricted++;
      }

      inserts.push({
        name: station.name,
        country: station.country,
        state: station.state || null,
        language: station.language || null,
        latitude: station.geo_lat,
        longitude: station.geo_long,
        stream_url: station.url_resolved || station.url,
        url_resolved: station.url_resolved || station.url,
        homepage: station.homepage || null,
        favicon: station.favicon || null,
        tags: tags.length > 0 ? tags : null,
        bitrate: station.bitrate || null,
        codec: station.codec || null,
        hls: station.hls === 1,
        votes: station.votes || 0,
        clickcount: station.clickcount || 0,
        clicktrend: station.clicktrend || 0,
        lastchecktime: station.lastchecktime_iso8601 || null,
        lastcheckoktime: station.lastcheckoktime_iso8601 || null,
        is_active: station.lastcheckok === 1,
        source: 'radio_browser',
        license_tier: licenseTier
      });

      processed++;
    }

    const { data, error } = await supabase
      .from('radio_stations')
      .upsert(inserts, {
        onConflict: 'stream_url',
        ignoreDuplicates: false
      });

    if (error) {
      console.error(`Batch error:`, error.message);
      errors += batch.length;
    } else {
      imported += batch.length;
    }

    process.stdout.write(`\r📊 Progress: ${processed}/${stations.length} | Safe: ${safe} | Restricted: ${restricted} | Errors: ${errors}`);
  }

  console.log('\n\n' + '='.repeat(70));
  console.log('📊 IMPORT SUMMARY');
  console.log('='.repeat(70));
  console.log(`Total processed: ${processed}`);
  console.log(`Imported/updated: ${imported}`);
  console.log(`Safe stations: ${safe}`);
  console.log(`Restricted stations: ${restricted}`);
  console.log(`Errors: ${errors}`);
  console.log('='.repeat(70));

  const { count } = await supabase
    .from('radio_stations')
    .select('*', { count: 'exact', head: true })
    .eq('license_tier', 'safe');

  console.log(`\n✅ Total safe stations in database: ${count || 0}`);
}

main().catch(console.error);
