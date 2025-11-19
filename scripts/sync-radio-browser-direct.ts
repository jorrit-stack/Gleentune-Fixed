import 'dotenv/config';

interface RadioBrowserStation {
  // Core fields
  name: string;
  url: string;
  url_resolved: string;
  country: string;
  countrycode: string;
  state: string;
  language: string;
  languagecodes: string;

  // Identity
  stationuuid: string;
  changeuuid: string;
  serveruuid: string;

  // Stream metadata
  bitrate: number;
  codec: string;
  hls: number;

  // Popularity
  votes: number;
  clickcount: number;
  clicktrend: number;
  clicktimestamp: string;

  // Status
  lastcheckok: number;
  lastchecktime: string;
  lastcheckoktime: string;
  lastchangetime: string;
  lastlocalchecktime: string;

  // Location
  geo_lat: number | null;
  geo_long: number | null;

  // Additional
  tags?: string;
  homepage?: string;
  favicon?: string;
  iso_3166_2?: string;
  has_extended_info?: boolean;
  ssl_error?: number;
}

async function fetchIndiaStations(): Promise<RadioBrowserStation[]> {
  const response = await fetch('https://de1.api.radio-browser.info/json/stations/bycountry/India', {
    headers: { 'User-Agent': 'gleetune/1.0' }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch: ${response.status}`);
  }

  return await response.json();
}

async function generateSQLUpdates(stations: RadioBrowserStation[]): Promise<void> {
  console.log('🇮🇳 Fetching India stations from Radio Browser...\n');

  const sqlStatements: string[] = [];
  let processedCount = 0;
  let kolkataCount = 0;

  for (const station of stations) {
    const name = station.name.replace(/'/g, "''");
    const url = station.url_resolved ? station.url_resolved.replace(/'/g, "''") : null;
    const codec = station.codec ? station.codec.replace(/'/g, "''") : 'MP3';
    const language = station.language ? station.language.replace(/'/g, "''") : '';
    const state = station.state ? station.state.replace(/'/g, "''") : '';

    const isActive = station.lastcheckok === 1;
    const lastchecktime = station.lastchecktime || null;
    const lastcheckoktime = station.lastcheckoktime || null;

    // Check if this might be a Kolkata station
    if (name.toLowerCase().includes('kolkata') || name.toLowerCase().includes('calcutta')) {
      kolkataCount++;
    }

    const stationuuid = station.stationuuid ? `'${station.stationuuid.replace(/'/g, "''")}'` : 'NULL';
    const changeuuid = station.changeuuid ? `'${station.changeuuid.replace(/'/g, "''")}'` : 'NULL';
    const serveruuid = station.serveruuid ? `'${station.serveruuid.replace(/'/g, "''")}'` : 'NULL';
    const languagecodes = station.languagecodes ? `'${station.languagecodes.replace(/'/g, "''")}'` : 'NULL';
    const lastchangetime = station.lastchangetime ? `'${station.lastchangetime}'` : 'NULL';
    const lastlocalchecktime = station.lastlocalchecktime ? `'${station.lastlocalchecktime}'` : 'NULL';
    const clicktimestamp = station.clicktimestamp ? `'${station.clicktimestamp}'` : 'NULL';

    const sql = `
-- Station: ${name}
-- CRITICAL: Only updates Radio Browser source fields, preserves frequency, band_type, city, logo_* fields
UPDATE radio_stations
SET
  stationuuid = ${stationuuid},
  changeuuid = ${changeuuid},
  serveruuid = ${serveruuid},
  url_resolved = ${url ? `'${url}'` : 'NULL'},
  stream_url = ${url ? `'${url}'` : 'NULL'},
  bitrate = ${station.bitrate},
  codec = '${codec}',
  hls = ${station.hls === 1},
  votes = ${station.votes},
  clickcount = ${station.clickcount},
  clicktrend = ${station.clicktrend},
  clicktimestamp = ${clicktimestamp},
  lastchecktime = ${lastchecktime ? `'${lastchecktime}'` : 'NULL'},
  lastcheckoktime = ${lastcheckoktime ? `'${lastcheckoktime}'` : 'NULL'},
  lastchangetime = ${lastchangetime},
  lastlocalchecktime = ${lastlocalchecktime},
  languagecodes = ${languagecodes},
  has_extended_info = ${station.has_extended_info || false},
  ssl_error = ${station.ssl_error === 1},
  is_active = ${isActive},
  last_check_ok = ${isActive},
  source = 'radio_browser',
  language = '${language}',
  state = '${state}',
  retrieved_at = NOW()
WHERE name = '${name}' AND country = 'India';

INSERT INTO radio_stations (name, country, country_code, state, language, languagecodes, latitude, longitude, stream_url, url_resolved, bitrate, codec, hls, votes, clickcount, clicktrend, clicktimestamp, lastchecktime, lastcheckoktime, lastchangetime, lastlocalchecktime, stationuuid, changeuuid, serveruuid, has_extended_info, ssl_error, is_active, last_check_ok, source, retrieved_at)
SELECT '${name}', 'India', '${station.countrycode || 'IN'}', '${state}', '${language}', ${languagecodes}, ${station.geo_lat || 'NULL'}, ${station.geo_long || 'NULL'}, ${url ? `'${url}'` : 'NULL'}, ${url ? `'${url}'` : 'NULL'}, ${station.bitrate}, '${codec}', ${station.hls === 1}, ${station.votes}, ${station.clickcount}, ${station.clicktrend}, ${clicktimestamp}, ${lastchecktime ? `'${lastchecktime}'` : 'NULL'}, ${lastcheckoktime ? `'${lastcheckoktime}'` : 'NULL'}, ${lastchangetime}, ${lastlocalchecktime}, ${stationuuid}, ${changeuuid}, ${serveruuid}, ${station.has_extended_info || false}, ${station.ssl_error === 1}, ${isActive}, ${isActive}, 'radio_browser', NOW()
WHERE NOT EXISTS (SELECT 1 FROM radio_stations WHERE name = '${name}' AND country = 'India');
`;

    sqlStatements.push(sql);
    processedCount++;

    if (processedCount % 100 === 0) {
      console.log(`Processed ${processedCount}/${stations.length} stations...`);
    }
  }

  console.log(`\n✅ Generated SQL for ${processedCount} stations`);
  console.log(`📍 Found ${kolkataCount} Kolkata-related stations\n`);
  console.log(`Copy and paste the following SQL statements into Supabase SQL Editor:\n`);
  console.log('='.repeat(80));
  console.log(sqlStatements.join('\n'));
  console.log('='.repeat(80));
}

async function main() {
  try {
    const stations = await fetchIndiaStations();
    console.log(`✅ Fetched ${stations.length} stations from Radio Browser\n`);
    await generateSQLUpdates(stations);
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
