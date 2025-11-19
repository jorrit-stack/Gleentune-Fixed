import { readFileSync } from 'fs';

const stations = JSON.parse(readFileSync('/tmp/india-stations.json', 'utf8'));

console.log('Generating SQL statements for MCP import...\n');

// Generate individual INSERT statements that can be executed via MCP
const statements = [];

for (let i = 0; i < Math.min(50, stations.length); i++) {
  const s = stations[i];

  const tags = s.tags ? s.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
  const tagsArray = tags.length > 0
    ? `ARRAY[${tags.map(t => `'${t.replace(/'/g, "''")}'`).join(',')}]::text[]`
    : 'ARRAY[]::text[]';

  const esc = (str) => str ? `'${String(str).replace(/'/g, "''").replace(/\\/g, '\\\\')}'` : 'NULL';

  const sql = `INSERT INTO radio_stations (name, country, country_code, stream_url, stationuuid, changeuuid, serveruuid, bitrate, codec, language, tags, votes, clickcount, is_active, source, license_tier, retrieved_at, url_resolved, homepage, latitude, longitude) VALUES (${esc(s.name)}, 'India', 'IN', ${esc(s.url_resolved || s.url)}, ${esc(s.stationuuid)}, ${esc(s.changeuuid)}, ${esc(s.serveruuid)}, ${s.bitrate || 0}, ${esc(s.codec)}, ${esc(s.language)}, ${tagsArray}, ${s.votes || 0}, ${s.clickcount || 0}, ${s.lastcheckok === 1}, 'radio_browser', 'unknown', NOW(), ${esc(s.url_resolved)}, ${esc(s.homepage)}, ${s.geo_lat || 'NULL'}, ${s.geo_long || 'NULL'}) ON CONFLICT (stationuuid) DO UPDATE SET votes = EXCLUDED.votes, clickcount = EXCLUDED.clickcount, url_resolved = EXCLUDED.url_resolved, retrieved_at = EXCLUDED.retrieved_at;`;

  statements.push(sql);
}

console.log(`Generated ${statements.length} SQL statements`);
console.log('\nFirst statement:');
console.log(statements[0]);
console.log('\n---\n');

// Write to file for batch execution
writeFileSync('/tmp/mcp-import-batch1.sql', statements.join('\n\n'));
console.log('Saved to /tmp/mcp-import-batch1.sql');
