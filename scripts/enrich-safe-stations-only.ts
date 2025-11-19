import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { enrichStationWithStream } from '../src/services/streamMatcher.js';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function enrichSafeStations() {
  console.log('🔍 Fetching SAFE stations without streams...\n');

  const { data: stations, error } = await supabase
    .from('radio_stations')
    .select('*')
    .in('band_type', ['FM', 'AM'])
    .eq('license_tier', 'safe')
    .or('stream_url.is.null,stream_url.eq.');

  if (error) {
    console.error('❌ Error fetching stations:', error);
    return;
  }

  console.log(`✅ Found ${stations?.length || 0} safe stations without streams\n`);

  if (!stations || stations.length === 0) {
    console.log('✨ All safe stations already have streams!');
    return;
  }

  let enrichedCount = 0;
  let failedCount = 0;

  for (const station of stations) {
    console.log(`\n📻 Processing: ${station.name} (${station.city || 'Unknown city'})`);
    
    try {
      const enriched = await enrichStationWithStream(station as any);
      
      if (enriched.stream_url && enriched.stream_url !== station.stream_url) {
        console.log(`  ✅ Found stream: ${enriched.stream_url.substring(0, 60)}...`);
        
        const { error: updateError } = await supabase
          .from('radio_stations')
          .update({
            stream_url: enriched.stream_url,
            homepage: enriched.homepage,
            codec: enriched.codec,
            bitrate: enriched.bitrate,
            last_check_ok: enriched.last_check_ok
          })
          .eq('id', station.id);

        if (updateError) {
          console.log(`  ❌ Failed to update: ${updateError.message}`);
          failedCount++;
        } else {
          console.log(`  ✅ Database updated!`);
          enrichedCount++;
        }
      } else {
        console.log(`  ⚠️  No stream found in Radio Browser`);
        failedCount++;
      }
    } catch (err) {
      console.log(`  ❌ Error: ${err}`);
      failedCount++;
    }

    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 ENRICHMENT SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total processed: ${stations.length}`);
  console.log(`✅ Successfully enriched: ${enrichedCount}`);
  console.log(`❌ Failed/Not found: ${failedCount}`);
  console.log('='.repeat(60));
}

enrichSafeStations().catch(console.error);
