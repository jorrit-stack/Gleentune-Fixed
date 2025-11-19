import { readFileSync, writeFileSync } from 'fs';

const stations = JSON.parse(readFileSync('/tmp/india-stations.json', 'utf8'));

// Helper to escape SQL strings
const escape = (str) => {
  if (str === null || str === undefined) return 'NULL';
  return `'${String(str).replace(/'/g, "''").replace(/\\/g, '\\\\')}'`;
};

// Helper for arrays
const escapeArray = (arr) => {
  if (!arr || arr.length === 0) return 'ARRAY[]::text[]';
  const items = arr.map(item => escape(item)).join(',');
  return `ARRAY[${items}]::text[]`;
};

// Generate SQL in batches to avoid query size limits
const batchSize = 100;
let sqlStatements = [];

for (let batchNum = 0; batchNum < Math.ceil(stations.length / batchSize); batchNum++) {
  const start = batchNum * batchSize;
  const batchStations = stations.slice(start, start + batchSize);

  let sql = `-- Batch ${batchNum + 1}: Importing stations ${start + 1} to ${start + batchStations.length}\n`;
  sql += 'INSERT INTO radio_stations (\n';
  sql += '  name, country, country_code, state, language, languagecodes,\n';
  sql += '  stream_url, url_resolved, homepage, favicon, tags,\n';
  sql += '  bitrate, codec, hls, latitude, longitude,\n';
  sql += '  stationuuid, changeuuid, serveruuid,\n';
  sql += '  votes, clickcount, clicktrend, clicktimestamp,\n';
  sql += '  lastchecktime, lastcheckoktime, lastchangetime, lastlocalchecktime,\n';
  sql += '  is_active, last_check_ok, ssl_error,\n';
  sql += '  has_extended_info, source, license_tier, retrieved_at, iso_3166_2\n';
  sql += ') VALUES\n';

  const valueRows = batchStations.map((s, idx) => {
    const tags = s.tags ? s.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
    const licenseTier = (tags.some(t => t.match(/creative.?commons|cc.?by/i)) ||
                         (s.homepage && s.homepage.match(/creativecommons\.org/i))) ? 'safe' : 'unknown';

    const values = [
      escape(s.name),
      escape(s.country),
      escape(s.countrycode),
      escape(s.state),
      escape(s.language),
      escape(s.languagecodes),
      escape(s.url_resolved || s.url),
      escape(s.url_resolved),
      escape(s.homepage),
      escape(s.favicon),
      escapeArray(tags),
      s.bitrate || 0,
      escape(s.codec),
      s.hls === 1 ? 'true' : 'false',
      s.geo_lat || 'NULL',
      s.geo_long || 'NULL',
      escape(s.stationuuid),
      escape(s.changeuuid),
      escape(s.serveruuid),
      s.votes || 0,
      s.clickcount || 0,
      s.clicktrend || 0,
      s.clicktimestamp ? escape(s.clicktimestamp) : 'NULL',
      s.lastchecktime ? escape(s.lastchecktime) : 'NULL',
      s.lastcheckoktime ? escape(s.lastcheckoktime) : 'NULL',
      s.lastchangetime ? escape(s.lastchangetime) : 'NULL',
      s.lastlocalchecktime ? escape(s.lastlocalchecktime) : 'NULL',
      s.lastcheckok === 1 ? 'true' : 'false',
      s.lastcheckok === 1 ? 'true' : 'false',
      s.ssl_error === 1 ? 'true' : 'false',
      s.has_extended_info ? 'true' : 'false',
      "'radio_browser'",
      escape(licenseTier),
      'NOW()',
      escape(s.iso_3166_2)
    ];

    return `  (${values.join(', ')})`;
  });

  sql += valueRows.join(',\n');
  sql += '\nON CONFLICT (stationuuid) DO UPDATE SET\n';
  sql += '  url_resolved = EXCLUDED.url_resolved,\n';
  sql += '  stream_url = EXCLUDED.stream_url,\n';
  sql += '  bitrate = EXCLUDED.bitrate,\n';
  sql += '  votes = EXCLUDED.votes,\n';
  sql += '  clickcount = EXCLUDED.clickcount,\n';
  sql += '  is_active = EXCLUDED.is_active,\n';
  sql += '  retrieved_at = EXCLUDED.retrieved_at;\n';

  sqlStatements.push(sql);
}

// Write first batch to console for testing
console.log(`Generated ${sqlStatements.length} batches for ${stations.length} stations\n`);
console.log('First batch preview:\n');
console.log(sqlStatements[0].substring(0, 1000) + '...\n');

// Save all batches to file
writeFileSync('/tmp/india-import-batches.sql', sqlStatements.join('\n\n'));
console.log('✅ Saved all SQL batches to /tmp/india-import-batches.sql');
console.log(`   Total file size: ${(sqlStatements.join('\n\n').length / 1024 / 1024).toFixed(2)} MB`);
