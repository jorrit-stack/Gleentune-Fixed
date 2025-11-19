#!/usr/bin/env node
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    db: { schema: 'public' },
    auth: { persistSession: false }
  }
);

console.log('🇮🇳 Fetching India stations from Radio Browser API...\n');

const response = await fetch('http://all.api.radio-browser.info/json/stations/bycountry/India');
const stations = await response.json();

console.log(`✅ Fetched ${stations.length} stations from Radio Browser\n`);

let imported = 0;
let errors = 0;
const batchSize = 100;

for (let i = 0; i < stations.length; i += batchSize) {
  const batch = stations.slice(i, i + batchSize);

  const values = batch.map(s => {
    const esc = (str) => {
      if (!str) return 'NULL';
      return `'${String(str).replace(/'/g, "''").replace(/\\/g, '\\\\')}'`;
    };

    const tags = s.tags ? s.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
    const tagsArray = tags.length > 0
      ? `ARRAY[${tags.map(t => esc(t)).join(',')}]::text[]`
      : 'ARRAY[]::text[]';

    const licenseTier = (tags.some(t => t.match(/creative.?commons|cc.?by/i)) ||
                       (s.homepage && s.homepage.match(/creativecommons\.org/i))) ? 'safe' : 'unknown';

    return `(
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
    )`;
  }).join(',\n');

  const sql = `
INSERT INTO radio_stations (
  name, country, country_code, state, language, languagecodes,
  stream_url, url_resolved, homepage, favicon, tags,
  bitrate, codec, hls, latitude, longitude,
  stationuuid, changeuuid, serveruuid,
  votes, clickcount, clicktrend,
  is_active, last_check_ok, ssl_error,
  has_extended_info, source, license_tier, retrieved_at
) VALUES ${values}
ON CONFLICT (stationuuid) DO UPDATE SET
  url_resolved = EXCLUDED.url_resolved,
  stream_url = EXCLUDED.stream_url,
  bitrate = EXCLUDED.bitrate,
  votes = EXCLUDED.votes,
  clickcount = EXCLUDED.clickcount,
  is_active = EXCLUDED.is_active,
  retrieved_at = EXCLUDED.retrieved_at;
  `;

  try {
    const { error } = await supabase.rpc('exec', { sql });

    if (error) {
      console.error(`❌ Batch ${Math.floor(i/batchSize) + 1} failed:`, error.message);
      errors += batch.length;
    } else {
      imported += batch.length;
    }
  } catch (err) {
    console.error(`❌ Exception in batch ${Math.floor(i/batchSize) + 1}:`, err.message);
    errors += batch.length;
  }

  console.log(`📥 Progress: ${Math.min(i + batchSize, stations.length)}/${stations.length} | Imported: ${imported} | Errors: ${errors}`);
}

console.log(`\n✅ Import complete!`);
console.log(`   Successfully imported: ${imported}`);
console.log(`   Errors: ${errors}`);

// Verify final count
const { count } = await supabase
  .from('radio_stations')
  .select('*', { count: 'exact', head: true })
  .eq('country', 'India');

console.log(`\n🇮🇳 Total India stations in database: ${count}`);
