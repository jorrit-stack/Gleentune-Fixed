import 'dotenv/config';

interface RadioBrowserStation {
  stationuuid: string;
  name: string;
  url: string;
  url_resolved: string;
  homepage: string;
  favicon: string;
  tags: string;
  country: string;
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

async function fetchTopStations(limit: number): Promise<RadioBrowserStation[]> {
  console.log(`Fetching top ${limit} voted stations...`);
  const response = await fetch(`https://de1.api.radio-browser.info/json/stations/topvote/${limit}`, {
    headers: { 'User-Agent': 'gleetune/1.0' }
  });

  if (!response.ok) {
    throw new Error(`Failed: ${response.status}`);
  }

  return await response.json();
}

async function main() {
  console.log('🌍 Fetching Radio Browser stations for SQL import\n');

  const stations = await fetchTopStations(2000);
  console.log(`✅ Fetched ${stations.length} stations\n`);

  const ccStations = stations.filter(hasOpenLicense);
  console.log(`🔍 Found ${ccStations.length} stations with CC/PD indicators\n`);

  const sqlStatements: string[] = [];

  for (const station of ccStations) {
    const name = station.name.replace(/'/g, "''");
    const url = (station.url_resolved || station.url || '').replace(/'/g, "''");
    const homepage = (station.homepage || '').replace(/'/g, "''");
    const favicon = (station.favicon || '').replace(/'/g, "''");
    const country = station.country.replace(/'/g, "''");
    const state = (station.state || '').replace(/'/g, "''");
    const language = (station.language || '').replace(/'/g, "''");
    const codec = (station.codec || '').replace(/'/g, "''");

    const tags = station.tags ? station.tags.split(',').map(t => t.trim().replace(/'/g, "''")).filter(Boolean) : [];
    const tagsArray = tags.length > 0 ? `ARRAY['${tags.join("','")}']` : 'NULL';

    const sql = `
INSERT INTO radio_stations (
  name, country, state, language, latitude, longitude,
  stream_url, url_resolved, homepage, favicon, tags,
  bitrate, codec, hls, votes, clickcount, clicktrend,
  lastchecktime, lastcheckoktime, is_active, source, license_tier
) VALUES (
  '${name}',
  '${country}',
  ${state ? `'${state}'` : 'NULL'},
  ${language ? `'${language}'` : 'NULL'},
  ${station.geo_lat || 'NULL'},
  ${station.geo_long || 'NULL'},
  ${url ? `'${url}'` : 'NULL'},
  ${url ? `'${url}'` : 'NULL'},
  ${homepage ? `'${homepage}'` : 'NULL'},
  ${favicon ? `'${favicon}'` : 'NULL'},
  ${tagsArray},
  ${station.bitrate || 0},
  ${codec ? `'${codec}'` : 'NULL'},
  ${station.hls === 1},
  ${station.votes || 0},
  ${station.clickcount || 0},
  ${station.clicktrend || 0},
  ${station.lastchecktime_iso8601 ? `'${station.lastchecktime_iso8601}'` : 'NULL'},
  ${station.lastcheckoktime_iso8601 ? `'${station.lastcheckoktime_iso8601}'` : 'NULL'},
  ${station.lastcheckok === 1},
  'radio_browser',
  'safe'
)
ON CONFLICT (stream_url)
DO UPDATE SET
  license_tier = 'safe',
  tags = EXCLUDED.tags,
  homepage = EXCLUDED.homepage,
  favicon = EXCLUDED.favicon,
  votes = EXCLUDED.votes,
  clickcount = EXCLUDED.clickcount,
  is_active = EXCLUDED.is_active,
  lastchecktime = EXCLUDED.lastchecktime,
  lastcheckoktime = EXCLUDED.lastcheckoktime;
`;

    sqlStatements.push(sql);
  }

  console.log('📝 Generated SQL statements:\n');
  console.log('-- CC-Licensed Radio Browser Stations Import');
  console.log(`-- Total stations: ${ccStations.length}\n`);
  console.log(sqlStatements.join('\n'));
  console.log('\n✅ Copy the SQL above and run it using MCP Supabase execute_sql tool');
}

main().catch(console.error);
