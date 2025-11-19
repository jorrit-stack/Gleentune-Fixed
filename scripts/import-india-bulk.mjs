import { readFileSync } from 'fs';

const stations = JSON.parse(readFileSync('/tmp/india-stations.json', 'utf8'));

console.log(`🇮🇳 Importing ${stations.length} India stations via direct SQL...`);
console.log(`This will take several minutes due to API rate limits.\n`);

// We'll output individual INSERT statements that can be executed via MCP
const batchSize = 10;
let imported = 0;
let skipped = 0;

for (let i = 0; i < Math.min(100, stations.length); i++) {
  const s = stations[i];

  // Escape helper
  const esc = (str) => {
    if (str === null || str === undefined || str === '') return 'NULL';
    return `'${String(str).replace(/'/g, "''").replace(/\\/g, '\\\\')}'`;
  };

  const tags = s.tags ? s.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
  const tagsArray = tags.length > 0
    ? `ARRAY[${tags.map(t => esc(t)).join(',')}]::text[]`
    : 'ARRAY[]::text[]';

  const licenseTier = (tags.some(t => t.match(/creative.?commons|cc.?by/i)) ||
                       (s.homepage && s.homepage.match(/creativecommons\.org/i))) ? 'safe' : 'unknown';

  const sql = `
INSERT INTO radio_stations (
  name, country, country_code, state, language, languagecodes,
  stream_url, url_resolved, homepage, favicon, tags,
  bitrate, codec, hls, latitude, longitude,
  stationuuid, changeuuid, serveruuid,
  votes, clickcount, clicktrend,
  is_active, last_check_ok, ssl_error,
  has_extended_info, source, license_tier, retrieved_at
) VALUES (
  ${esc(s.name)}, ${esc(s.country)}, ${esc(s.countrycode)}, ${esc(s.state)},
  ${esc(s.language)}, ${esc(s.languagecodes)},
  ${esc(s.url_resolved || s.url)}, ${esc(s.url_resolved)},
  ${esc(s.homepage)}, ${esc(s.favicon)}, ${tagsArray},
  ${s.bitrate || 0}, ${esc(s.codec)}, ${s.hls === 1},
  ${s.geo_lat || 'NULL'}, ${s.geo_long || 'NULL'},
  ${esc(s.stationuuid)}, ${esc(s.changeuuid)}, ${esc(s.serveruuid)},
  ${s.votes || 0}, ${s.clickcount || 0}, ${s.clicktrend || 0},
  ${s.lastcheckok === 1}, ${s.lastcheckok === 1}, ${s.ssl_error === 1},
  ${s.has_extended_info || false}, 'radio_browser', ${esc(licenseTier)}, NOW()
)
ON CONFLICT (stationuuid) DO UPDATE SET
  url_resolved = EXCLUDED.url_resolved,
  stream_url = EXCLUDED.stream_url,
  bitrate = EXCLUDED.bitrate,
  votes = EXCLUDED.votes,
  clickcount = EXCLUDED.clickcount,
  is_active = EXCLUDED.is_active,
  retrieved_at = EXCLUDED.retrieved_at;
`.trim();

  // Output the SQL (can be piped or redirected)
  console.log(sql);
  console.log('');

  imported++;

  if (imported % 10 === 0) {
    console.error(`Progress: ${imported}/${Math.min(100, stations.length)}`);
  }
}

console.error(`\n✅ Generated SQL for ${imported} stations`);
console.error(`ℹ️  Execute these via the MCP Supabase tool`);
