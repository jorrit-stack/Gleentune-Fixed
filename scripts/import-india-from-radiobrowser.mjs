#!/usr/bin/env node
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function importIndiaStations() {
  console.log('🇮🇳 Fetching India stations from Radio Browser API...\n');

  const response = await fetch('http://all.api.radio-browser.info/json/stations/bycountry/India');
  const stations = await response.json();

  console.log(`✅ Fetched ${stations.length} stations from Radio Browser\n`);

  let imported = 0;
  let updated = 0;
  let errors = 0;
  const batchSize = 50;

  for (let i = 0; i < stations.length; i += batchSize) {
    const batch = stations.slice(i, i + batchSize);

    for (const s of batch) {
      try {
        const tags = s.tags ? s.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
        const licenseTier = (tags.some(t => t.match(/creative.?commons|cc.?by/i)) ||
                           (s.homepage && s.homepage.match(/creativecommons\.org/i))) ? 'safe' : 'unknown';

        const stationData = {
          name: s.name || 'Unknown',
          country: s.country || 'India',
          country_code: s.countrycode || 'IN',
          state: s.state || null,
          language: s.language || null,
          languagecodes: s.languagecodes || null,
          stream_url: s.url_resolved || s.url || null,
          url_resolved: s.url_resolved || null,
          homepage: s.homepage || null,
          favicon: s.favicon || null,
          tags: tags,
          bitrate: s.bitrate || 0,
          codec: s.codec || null,
          hls: s.hls === 1,
          latitude: s.geo_lat || null,
          longitude: s.geo_long || null,
          stationuuid: s.stationuuid,
          changeuuid: s.changeuuid || null,
          serveruuid: s.serveruuid || null,
          votes: s.votes || 0,
          clickcount: s.clickcount || 0,
          clicktrend: s.clicktrend || 0,
          is_active: s.lastcheckok === 1,
          last_check_ok: s.lastcheckok === 1,
          ssl_error: s.ssl_error === 1,
          has_extended_info: s.has_extended_info || false,
          source: 'radio_browser',
          license_tier: licenseTier,
          retrieved_at: new Date().toISOString()
        };

        const { error } = await supabase
          .from('radio_stations')
          .upsert(stationData, {
            onConflict: 'stationuuid',
            ignoreDuplicates: false
          });

        if (error) {
          errors++;
          if (errors <= 10) {
            console.error(`❌ Error importing ${s.name}:`, error.message);
          }
        } else {
          imported++;
        }
      } catch (err) {
        errors++;
        if (errors <= 10) {
          console.error(`❌ Exception importing ${s.name}:`, err.message);
        }
      }
    }

    console.log(`📥 Progress: ${Math.min(i + batchSize, stations.length)}/${stations.length} | Imported: ${imported} | Errors: ${errors}`);
  }

  console.log(`\n✅ Import complete!`);
  console.log(`   Total processed: ${stations.length}`);
  console.log(`   Successfully imported: ${imported}`);
  console.log(`   Errors: ${errors}`);

  // Verify final count
  const { count } = await supabase
    .from('radio_stations')
    .select('*', { count: 'exact', head: true })
    .eq('country', 'India');

  console.log(`\n🇮🇳 Total India stations in database: ${count}`);
}

importIndiaStations().catch(console.error);
