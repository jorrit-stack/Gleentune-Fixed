import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { enrichStationWithStream } from '../src/services/streamMatcher';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testAMMatching() {
  console.log('🧪 Testing AM Station Matching\n');

  const { data: amStations } = await supabase
    .from('stations_view')
    .select('*')
    .eq('band_type', 'AM')
    .eq('country_code', 'IN')
    .limit(10);

  if (!amStations || amStations.length === 0) {
    console.log('❌ No AM stations found');
    return;
  }

  console.log(`Testing ${amStations.length} AM stations:\n`);

  let successCount = 0;

  for (const row of amStations) {
    const station = {
      id: row.station_id,
      name: row.station_name,
      country: row.country_name || 'India',
      country_code: row.country_code || 'IN',
      city: row.city_name || undefined,
      language: row.language || 'unknown',
      stream_url: row.stream_url || 'https://placeholder-stream.example.com',
      tags: [],
      bitrate: row.bitrate_kbps || 128,
      codec: 'MP3',
      frequency: row.frequency_khz,
      band_type: 'AM' as any,
      latitude: row.latitude || undefined,
      longitude: row.longitude || undefined,
      created_at: row.created_at,
      last_check_ok: false
    };

    console.log(`\n📻 ${station.name} (${station.frequency} kHz)`);
    console.log(`   City: ${station.city || 'Unknown'}`);

    const enriched = await enrichStationWithStream(station);

    if (enriched.stream_url !== station.stream_url && !enriched.stream_url.includes('placeholder')) {
      console.log(`   ✅ Found: ${enriched.stream_url.substring(0, 60)}...`);
      successCount++;
    } else {
      console.log(`   ❌ No match`);
    }

    await new Promise(resolve => setTimeout(resolve, 300));
  }

  console.log('\n' + '='.repeat(60));
  console.log(`\n📊 AM Stations Success Rate: ${successCount}/${amStations.length} (${Math.round((successCount / amStations.length) * 100)}%)\n`);
}

testAMMatching().catch(console.error);
