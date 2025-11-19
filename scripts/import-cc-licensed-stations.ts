import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { detectLicenseTier } from '../src/services/licenseChecker.js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY!;

const supabase = createClient(SUPABASE_URL, ANON_KEY);

interface RadioBrowserStation {
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
  languagecodes: string;
  votes: number;
  lastchangetime: string;
  lastchangetime_iso8601: string;
  codec: string;
  bitrate: number;
  hls: number;
  lastcheckok: number;
  lastchecktime: string;
  lastchecktime_iso8601: string;
  lastcheckoktime: string;
  lastcheckoktime_iso8601: string;
  lastlocalchecktime: string;
  lastlocalchecktime_iso8601: string;
  clicktimestamp: string;
  clicktimestamp_iso8601: string;
  clickcount: number;
  clicktrend: number;
  ssl_error: number;
  geo_lat: number | null;
  geo_long: number | null;
  has_extended_info: boolean;
}

const CC_KEYWORDS = [
  'creative commons',
  'cc-by',
  'cc by',
  'public domain',
  'publicdomain',
  'cc0',
  'cc-by-sa',
  'open license'
];

function hasOpenLicense(station: RadioBrowserStation): boolean {
  const searchText = `${station.name} ${station.tags} ${station.homepage}`.toLowerCase();
  return CC_KEYWORDS.some(keyword => searchText.includes(keyword));
}

async function fetchStationsByTag(tag: string): Promise<RadioBrowserStation[]> {
  console.log(`Fetching stations with tag: ${tag}...`);
  const response = await fetch(`https://de1.api.radio-browser.info/json/stations/bytag/${encodeURIComponent(tag)}`, {
    headers: { 'User-Agent': 'gleetune/1.0' }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch tag ${tag}: ${response.status}`);
  }

  return await response.json();
}

async function fetchTopStations(limit: number = 500): Promise<RadioBrowserStation[]> {
  console.log(`Fetching top ${limit} voted stations...`);
  const response = await fetch(`https://de1.api.radio-browser.info/json/stations/topvote/${limit}`, {
    headers: { 'User-Agent': 'gleetune/1.0' }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch top stations: ${response.status}`);
  }

  return await response.json();
}

async function importStation(station: RadioBrowserStation): Promise<boolean> {
  const tags = station.tags ? station.tags.split(',').map(t => t.trim()).filter(Boolean) : [];

  const licenseTier = detectLicenseTier({
    name: station.name,
    tags: tags,
    homepage: station.homepage
  });

  if (licenseTier !== 'safe') {
    return false;
  }

  const stationData = {
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
  };

  const { error } = await supabase
    .from('radio_stations')
    .upsert(stationData, {
      onConflict: 'stream_url',
      ignoreDuplicates: false
    });

  if (error) {
    console.error(`Error importing ${station.name}:`, error.message);
    return false;
  }

  return true;
}

async function main() {
  console.log('🎵 Importing CC-licensed stations from Radio Browser\n');

  const searchTags = [
    'creative commons',
    'public domain',
    'cc-by',
    'open license'
  ];

  let allStations: RadioBrowserStation[] = [];
  let tagStationCount = 0;

  for (const tag of searchTags) {
    try {
      const stations = await fetchStationsByTag(tag);
      console.log(`  Found ${stations.length} stations with tag "${tag}"`);
      allStations.push(...stations);
      tagStationCount += stations.length;
    } catch (error: any) {
      console.error(`  Error fetching tag "${tag}":`, error.message);
    }
  }

  console.log(`\n📊 Fetched ${tagStationCount} stations from CC tags`);

  const topStations = await fetchTopStations(500);
  console.log(`📊 Fetched ${topStations.length} top voted stations`);
  allStations.push(...topStations);

  const uniqueStations = new Map<string, RadioBrowserStation>();
  for (const station of allStations) {
    const key = station.url_resolved || station.url;
    if (!uniqueStations.has(key)) {
      uniqueStations.set(key, station);
    }
  }

  console.log(`\n🔍 ${uniqueStations.size} unique stations to process`);
  console.log(`🔍 Filtering for CC/PD licenses...\n`);

  let imported = 0;
  let ccFiltered = 0;
  let processed = 0;

  for (const [, station] of uniqueStations) {
    processed++;

    const hasLicense = hasOpenLicense(station);
    if (hasLicense) {
      ccFiltered++;
    }

    if (await importStation(station)) {
      imported++;
      console.log(`✓ Imported: ${station.name} (${station.country})`);
    }

    if (processed % 50 === 0) {
      console.log(`\n📊 Progress: ${processed}/${uniqueStations.size} | CC-filtered: ${ccFiltered} | Imported: ${imported}\n`);
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('📊 IMPORT SUMMARY');
  console.log('='.repeat(70));
  console.log(`Total stations processed: ${uniqueStations.size}`);
  console.log(`Stations with CC/PD indicators: ${ccFiltered}`);
  console.log(`Successfully imported (safe): ${imported}`);
  console.log(`Rejected (restricted): ${uniqueStations.size - imported}`);
  console.log('='.repeat(70));

  console.log('\n🔍 Checking database totals...');
  const { count } = await supabase
    .from('radio_stations')
    .select('*', { count: 'exact', head: true })
    .eq('license_tier', 'safe');

  console.log(`\n✅ Total safe stations in database: ${count || 0}`);
}

main().catch(console.error);
