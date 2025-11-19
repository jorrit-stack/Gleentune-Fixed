import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface StreamTestResult {
  stationId: string;
  stationName: string;
  streamUrl: string;
  isWorking: boolean;
  statusCode?: number;
  error?: string;
  responseTime?: number;
}

async function testStreamUrl(url: string, timeout = 5000): Promise<{ working: boolean; statusCode?: number; error?: string; responseTime: number }> {
  const startTime = Date.now();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;

    if (response.ok || response.status === 200) {
      return { working: true, statusCode: response.status, responseTime };
    }

    return { working: false, statusCode: response.status, error: `HTTP ${response.status}`, responseTime };
  } catch (error: any) {
    const responseTime = Date.now() - startTime;

    if (error.name === 'AbortError') {
      return { working: false, error: 'Timeout', responseTime };
    }

    return { working: false, error: error.message, responseTime };
  }
}

async function validateShortwaveStreams() {
  console.log('🔍 Fetching all shortwave stations...\n');

  const { data: stations, error: fetchError } = await supabase
    .from('shortwave_stations')
    .select('sw_station_id, station_name, stream_url, frequency_khz')
    .not('stream_url', 'is', null)
    .order('frequency_khz');

  if (fetchError || !stations) {
    console.error('Failed to fetch stations:', fetchError);
    return;
  }

  console.log(`📊 Testing ${stations.length} shortwave streams...\n`);

  const results: StreamTestResult[] = [];
  const stats = {
    total: stations.length,
    tested: 0,
    working: 0,
    dead: 0,
    timeout: 0,
    error: 0
  };

  for (const station of stations) {
    stats.tested++;

    console.log(`[${stats.tested}/${stats.total}] Testing: ${station.station_name} (${station.frequency_khz} kHz)`);

    const testResult = await testStreamUrl(station.stream_url, 8000);

    const result: StreamTestResult = {
      stationId: station.sw_station_id,
      stationName: station.station_name,
      streamUrl: station.stream_url,
      isWorking: testResult.working,
      statusCode: testResult.statusCode,
      error: testResult.error,
      responseTime: testResult.responseTime
    };

    results.push(result);

    if (testResult.working) {
      stats.working++;
      console.log(`  ✅ Working (${testResult.responseTime}ms)\n`);
    } else if (testResult.error === 'Timeout') {
      stats.timeout++;
      console.log(`  ⏱️  Timeout\n`);
    } else {
      stats.dead++;
      console.log(`  ❌ Dead: ${testResult.error}\n`);
    }

    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n📈 Validation Summary:');
  console.log(`   Total:    ${stats.total}`);
  console.log(`   Working:  ${stats.working} (${Math.round(stats.working / stats.total * 100)}%)`);
  console.log(`   Dead:     ${stats.dead} (${Math.round(stats.dead / stats.total * 100)}%)`);
  console.log(`   Timeout:  ${stats.timeout} (${Math.round(stats.timeout / stats.total * 100)}%)`);

  const deadStations = results.filter(r => !r.isWorking);

  if (deadStations.length > 0) {
    console.log(`\n🗑️  Found ${deadStations.length} dead/timeout stations`);
    console.log('\nDead stations:');

    for (const station of deadStations.slice(0, 20)) {
      console.log(`  - ${station.stationName}: ${station.error}`);
    }

    if (deadStations.length > 20) {
      console.log(`  ... and ${deadStations.length - 20} more`);
    }

    console.log('\n⚠️  To remove dead stations, run:');
    console.log('   UPDATE shortwave_stations SET stream_verified = FALSE, is_active = FALSE');
    console.log('   WHERE sw_station_id IN (');
    const ids = deadStations.slice(0, 10).map(s => `'${s.stationId}'`).join(',');
    console.log(`     ${ids}`);
    console.log('   );');
  }

  return { results, stats };
}

validateShortwaveStreams().catch(console.error);
