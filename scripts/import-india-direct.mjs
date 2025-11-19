#!/usr/bin/env node
import 'dotenv/config';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🇮🇳 Fetching and importing India stations from Radio Browser...\n');

// Fetch stations
const response = await fetch('https://de1.api.radio-browser.info/json/stations/bycountry/India', {
  headers: { 'User-Agent': 'gleetune/1.0' }
});

const stations = await response.json();
console.log(`✅ Fetched ${stations.length} stations from Radio Browser\n`);

// Import in batches of 10 using direct fetch to Supabase REST API
const batchSize = 10;
let imported = 0;
let updated = 0;
let errors = 0;

for (let i = 0; i < stations.length; i += batchSize) {
  const batch = stations.slice(i, i + batchSize);

  for (const s of batch) {
    try {
      const tags = s.tags ? s.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
      const licenseTier = (tags.some(t => t.match(/creative.?commons|cc.?by/i)) ||
                           (s.homepage && s.homepage.match(/creativecommons\.org/i))) ? 'safe' : 'unknown';

      const payload = {
        name: s.name,
        country: s.country,
        country_code: s.countrycode,
        state: s.state,
        language: s.language,
        languagecodes: s.languagecodes,
        stream_url: s.url_resolved || s.url,
        url_resolved: s.url_resolved,
        homepage: s.homepage,
        favicon: s.favicon,
        tags: tags,
        bitrate: s.bitrate,
        codec: s.codec,
        hls: s.hls === 1,
        latitude: s.geo_lat,
        longitude: s.geo_long,
        stationuuid: s.stationuuid,
        changeuuid: s.changeuuid,
        serveruuid: s.serveruuid,
        votes: s.votes,
        clickcount: s.clickcount,
        clicktrend: s.clicktrend,
        is_active: s.lastcheckok === 1,
        last_check_ok: s.lastcheckok === 1,
        ssl_error: s.ssl_error === 1,
        has_extended_info: s.has_extended_info || false,
        source: 'radio_browser',
        license_tier: licenseTier,
        retrieved_at: new Date().toISOString()
      };

      // Use Supabase REST API directly
      const upsertResponse = await fetch(`${SUPABASE_URL}/rest/v1/radio_stations`, {
        method: 'POST',
        headers: {
          'apikey': SERVICE_KEY,
          'Authorization': `Bearer ${SERVICE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify(payload)
      });

      if (upsertResponse.ok) {
        imported++;
      } else {
        const errorText = await upsertResponse.text();
        if (errorText.includes('duplicate') || errorText.includes('conflict')) {
          updated++;
        } else {
          errors++;
          console.error(`⚠️  Error importing ${s.name}: ${errorText.substring(0, 100)}`);
        }
      }

    } catch (err) {
      errors++;
      console.error(`⚠️  Error processing ${s.name}: ${err.message}`);
    }
  }

  // Progress update
  if ((i + batchSize) % 100 === 0 || i + batchSize >= stations.length) {
    process.stdout.write(`\r📥 Progress: ${Math.min(i + batchSize, stations.length)}/${stations.length} | Imported: ${imported} | Updated: ${updated} | Errors: ${errors}`);
  }
}

console.log('\n\n✅ Import complete!');
console.log(`   Total processed: ${stations.length}`);
console.log(`   Imported: ${imported}`);
console.log(`   Updated: ${updated}`);
console.log(`   Errors: ${errors}`);
