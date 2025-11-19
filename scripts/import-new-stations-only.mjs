import { readFileSync } from 'fs';

const stations = JSON.parse(readFileSync('/tmp/india-stations.json', 'utf8'));

console.log(`Processing ${stations.length} Radio Browser stations...\n`);

// Generate INSERT statements that ignore constraint violations
const statements = [];

for (const s of stations) {
  const tags = s.tags ? s.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
  const tagsArray = tags.length > 0
    ? `ARRAY[${tags.map(t => `'${t.replace(/'/g, "''")}'`).join(',')}]::text[]`
    : 'ARRAY[]::text[]';

  const esc = (str) => str ? `'${String(str).replace(/'/g, "''").replace(/\\/g, '\\\\')}'` : 'NULL';

  const sql = `INSERT INTO radio_stations (name, country, country_code, stream_url, stationuuid, changeuuid, serveruuid, bitrate, codec, language, tags, votes, clickcount, is_active, source, license_tier, retrieved_at, url_resolved, homepage, latitude, longitude, state, languagecodes, hls, has_extended_info, last_check_ok) VALUES (${esc(s.name)}, 'India', 'IN', ${esc(s.url_resolved || s.url)}, ${esc(s.stationuuid)}, ${esc(s.changeuuid)}, ${esc(s.serveruuid)}, ${s.bitrate || 0}, ${esc(s.codec)}, ${esc(s.language)}, ${tagsArray}, ${s.votes || 0}, ${s.clickcount || 0}, ${s.lastcheckok === 1}, 'radio_browser', 'unknown', NOW(), ${esc(s.url_resolved)}, ${esc(s.homepage)}, ${s.geo_lat || 'NULL'}, ${s.geo_long || 'NULL'}, ${esc(s.state)}, ${esc(s.languagecodes)}, ${s.hls === 1}, ${s.has_extended_info || false}, ${s.lastcheckok === 1}) ON CONFLICT (stationuuid) DO NOTHING;`;

  statements.push(sql);
}

// Split into batches of 100 for printing
const batchSize = 100;
for (let i = 0; i < statements.length; i += batchSize) {
  const batch = statements.slice(i, i + batchSize);
  console.log(`\n-- Batch ${Math.floor(i/batchSize) + 1}: Stations ${i + 1} to ${Math.min(i + batchSize, statements.length)}\n`);
  console.log(batch.join('\n'));
}

console.log(`\n\nTotal SQL statements generated: ${statements.length}`);
