import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { enrichStationWithStream } from '../src/services/streamMatcher';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing environment variables. Please ensure .env file has VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testStreamMatching() {
  console.log('🧪 Testing Stream Matching System\n');

  const { data: testStations } = await supabase
    .from('stations_view')
    .select('*')
    .in('band_type', ['FM', 'AM'])
    .eq('country_code', 'IN')
    .limit(10);

  if (!testStations || testStations.length === 0) {
    console.log('❌ No test stations found');
    return;
  }

  console.log(`Testing ${testStations.length} stations:\n`);

  let successCount = 0;
  let failCount = 0;

  for (const row of testStations) {
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
      band_type: row.band_type as any,
      latitude: row.latitude || undefined,
      longitude: row.longitude || undefined,
      created_at: row.created_at,
      last_check_ok: false
    };

    console.log(`\n📻 ${station.name} (${station.band_type} ${station.frequency} kHz)`);
    console.log(`   City: ${station.city || 'Unknown'}`);
    console.log(`   Before: ${station.stream_url.includes('placeholder') ? '❌ No stream' : '✅ Has stream'}`);

    const enriched = await enrichStationWithStream(station);

    if (enriched.stream_url !== station.stream_url && !enriched.stream_url.includes('placeholder')) {
      console.log(`   After:  ✅ Found stream: ${enriched.stream_url.substring(0, 60)}...`);
      successCount++;
    } else {
      console.log(`   After:  ❌ No match found`);
      failCount++;
    }

    await new Promise(resolve => setTimeout(resolve, 300));
  }

  console.log('\n' + '='.repeat(60));
  console.log(`\n📊 Results:`);
  console.log(`   ✅ Matched: ${successCount}/${testStations.length}`);
  console.log(`   ❌ No Match: ${failCount}/${testStations.length}`);
  console.log(`   Success Rate: ${Math.round((successCount / testStations.length) * 100)}%\n`);
}

testStreamMatching().catch(console.error);
