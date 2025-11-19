#!/usr/bin/env node

console.log('🇮🇳 Fetching India stations from Radio Browser API...\n');

const response = await fetch('http://all.api.radio-browser.info/json/stations/bycountry/India');
const stations = await response.json();

console.log(`✅ Fetched ${stations.length} stations\n`);
console.log(`📝 Generating SQL INSERT statements...\n`);

const esc = (str) => {
  if (!str) return 'NULL';
  return `'${String(str).replace(/'/g, "''").replace(/\\/g, '\\\\')}'`;
};

const escNonNull = (str) => {
  if (!str) return "''";
  return `'${String(str).replace(/'/g, "''").replace(/\\/g, '\\\\')}'`;
};

const batchSize = 10;
let batchNum = 1;

for (let i = 0; i < Math.min(stations.length, 1200); i += batchSize) {
  const batch = stations.slice(i, i + batchSize);

  const values = batch.map(s => {
    const tags = s.tags ? s.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
    const tagsArray = tags.length > 0
      ? `ARRAY[${tags.map(t => esc(t)).join(',')}]::text[]`
      : 'ARRAY[]::text[]';

    const licenseTier = (tags.some(t => t.match(/creative.?commons|cc.?by/i)) ||
                       (s.homepage && s.homepage.match(/creativecommons\.org/i))) ? 'safe' : 'unknown';

    return `(${escNonNull(s.name)}, ${escNonNull(s.country)}, ${esc(s.countrycode)}, ${esc(s.state)}, ${escNonNull(s.language)}, ${esc(s.languagecodes)}, ${escNonNull(s.url_resolved || s.url)}, ${esc(s.url_resolved)}, ${esc(s.homepage)}, ${esc(s.favicon)}, ${tagsArray}, ${s.bitrate || 0}, ${escNonNull(s.codec)}, ${s.hls === 1}, ${s.geo_lat || 'NULL'}, ${s.geo_long || 'NULL'}, ${esc(s.stationuuid)}, ${esc(s.changeuuid)}, ${esc(s.serveruuid)}, ${s.votes || 0}, ${s.clickcount || 0}, ${s.clicktrend || 0}, ${s.lastcheckok === 1}, ${s.lastcheckok === 1}, ${s.ssl_error === 1}, ${s.has_extended_info || false}, 'radio_browser', ${esc(licenseTier)}, NOW())`;
  }).join(',');

  const sql = `INSERT INTO radio_stations (name, country, country_code, state, language, languagecodes, stream_url, url_resolved, homepage, favicon, tags, bitrate, codec, hls, latitude, longitude, stationuuid, changeuuid, serveruuid, votes, clickcount, clicktrend, is_active, last_check_ok, ssl_error, has_extended_info, source, license_tier, retrieved_at) VALUES ${values} ON CONFLICT (stationuuid) DO UPDATE SET url_resolved = EXCLUDED.url_resolved, stream_url = EXCLUDED.stream_url, bitrate = EXCLUDED.bitrate, votes = EXCLUDED.votes, clickcount = EXCLUDED.clickcount, is_active = EXCLUDED.is_active, retrieved_at = EXCLUDED.retrieved_at;`;

  console.log(`-- Batch ${batchNum} (stations ${i + 1} to ${Math.min(i + batchSize, stations.length)})`);
  console.log(sql);
  console.log('');

  batchNum++;
}

console.log(`\n-- Total: ${batchNum - 1} batches generated`);
