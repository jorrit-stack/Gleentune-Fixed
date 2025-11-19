import { readFileSync, writeFileSync } from 'fs';

const stations = JSON.parse(readFileSync('/tmp/india-stations.json', 'utf8'));

console.log(`🇮🇳 Starting bulk import of ${stations.length} India stations\n`);

// Helper to escape SQL strings
const esc = (str) => {
  if (str === null || str === undefined || str === '') return 'NULL';
  return `'${String(str).replace(/'/g, "''").replace(/\\/g, '\\\\')}'`;
};

// Import in batches of 50
const batchSize = 50;
const batches = [];

for (let i = 0; i < stations.length; i += batchSize) {
  batches.push(stations.slice(i, i + batchSize));
}

console.log(`Split into ${batches.length} batches of up to ${batchSize} stations each\n`);

// Generate each batch
batches.forEach((batch, batchNum) => {
  const values = batch.map(s => {
    const tags = s.tags ? s.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
    const tagsArray = tags.length > 0
      ? `ARRAY[${tags.map(t => esc(t)).join(',')}]::text[]`
      : 'ARRAY[]::text[]';

    const licenseTier = (tags.some(t => t.match(/creative.?commons|cc.?by/i)) ||
                         (s.homepage && s.homepage.match(/creativecommons\.org/i))) ? 'safe' : 'unknown';

    return `(${esc(s.name)}, ${esc(s.country)}, ${esc(s.countrycode)}, ${esc(s.url_resolved || s.url)}, ${esc(s.url_resolved)}, ${esc(s.homepage)}, ${s.bitrate || 0}, ${esc(s.codec)}, ${esc(s.language)}, ${tagsArray}, ${esc(s.stationuuid)}, ${esc(s.changeuuid)}, ${esc(s.serveruuid)}, ${s.votes || 0}, ${s.clickcount || 0}, ${s.lastcheckok === 1}, 'radio_browser', ${esc(licenseTier)}, NOW())`;
  }).join(',\n  ');

  const sql = `-- Batch ${batchNum + 1}/${batches.length}
INSERT INTO radio_stations (
  name, country, country_code, stream_url, url_resolved, homepage,
  bitrate, codec, language, tags, stationuuid, changeuuid, serveruuid,
  votes, clickcount, is_active, source, license_tier, retrieved_at
) VALUES
  ${values}
ON CONFLICT (stationuuid) DO UPDATE SET
  votes = EXCLUDED.votes,
  clickcount = EXCLUDED.clickcount,
  url_resolved = EXCLUDED.url_resolved,
  stream_url = EXCLUDED.stream_url,
  is_active = EXCLUDED.is_active,
  retrieved_at = EXCLUDED.retrieved_at;
`;

  // Save to individual batch file
  writeFileSync(`/tmp/india-batch-${batchNum + 1}.sql`, sql);

  if ((batchNum + 1) % 5 === 0) {
    console.error(`Generated batch ${batchNum + 1}/${batches.length}`);
  }
});

console.error(`\n✅ Generated ${batches.length} SQL batch files in /tmp/`);
console.error(`   Files: india-batch-1.sql through india-batch-${batches.length}.sql`);
console.error(`\nTo import all batches, run:`);
console.error(`   for i in {1..${batches.length}}; do cat /tmp/india-batch-$i.sql; done`);
