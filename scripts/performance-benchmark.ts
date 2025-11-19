import { supabase } from './lib/supabase-node.js';

interface BenchmarkResult {
  name: string;
  duration: number;
  resultCount: number;
  success: boolean;
  error?: string;
}

const results: BenchmarkResult[] = [];

async function benchmark(
  name: string,
  queryFn: () => Promise<{ data: any; error: any }>
): Promise<void> {
  console.log(`Running: ${name}...`);
  const start = Date.now();

  try {
    const { data, error } = await queryFn();
    const duration = Date.now() - start;

    if (error) {
      results.push({
        name,
        duration,
        resultCount: 0,
        success: false,
        error: error.message
      });
      console.log(`  ❌ Failed in ${duration}ms: ${error.message}`);
    } else {
      results.push({
        name,
        duration,
        resultCount: data?.length || 0,
        success: true
      });
      console.log(`  ✅ ${duration}ms (${data?.length || 0} results)`);
    }
  } catch (error) {
    const duration = Date.now() - start;
    results.push({
      name,
      duration,
      resultCount: 0,
      success: false,
      error: String(error)
    });
    console.log(`  ❌ Failed in ${duration}ms: ${error}`);
  }
}

async function runBenchmarks() {
  console.log('=== Radio Database Performance Benchmarks ===\n');
  console.log('Testing query performance with new indexes...\n');

  // 1. Simple station count
  await benchmark('Total Stations Count', () =>
    supabase
      .from('stations_view')
      .select('station_id', { count: 'exact', head: true })
  );

  // 2. Band filtering - FM
  await benchmark('Band Filter: FM (limit 100)', () =>
    supabase
      .from('stations_view')
      .select('*')
      .eq('band_type', 'FM')
      .not('stream_url', 'is', null)
      .not('stream_url', 'ilike', '%placeholder%')
      .limit(100)
  );

  // 3. Band filtering - AM
  await benchmark('Band Filter: AM (limit 100)', () =>
    supabase
      .from('stations_view')
      .select('*')
      .eq('band_type', 'AM')
      .not('stream_url', 'is', null)
      .not('stream_url', 'ilike', '%placeholder%')
      .limit(100)
  );

  // 4. Band filtering - SW
  await benchmark('Band Filter: SW (limit 100)', () =>
    supabase
      .from('stations_view')
      .select('*')
      .ilike('band_type', 'SW%')
      .limit(100)
  );

  // 5. Country filtering
  await benchmark('Country Filter: US (limit 100)', () =>
    supabase
      .from('stations_view')
      .select('*')
      .eq('country_code', 'US')
      .not('stream_url', 'is', null)
      .not('stream_url', 'ilike', '%placeholder%')
      .limit(100)
  );

  // 6. City search
  await benchmark('City Search: London (limit 50)', () =>
    supabase
      .from('stations_view')
      .select('*')
      .ilike('city_name', '%London%')
      .limit(50)
  );

  // 7. Station name search
  await benchmark('Station Name Search: BBC (limit 50)', () =>
    supabase
      .from('stations_view')
      .select('*')
      .ilike('station_name', '%BBC%')
      .limit(50)
  );

  // 8. Multi-field search
  await benchmark('Multi-field Search: Radio (limit 50)', () =>
    supabase
      .from('stations_view')
      .select('*')
      .or('station_name.ilike.%Radio%,city_name.ilike.%Radio%')
      .limit(50)
  );

  // 9. Proximity query (simulated - get stations with coordinates)
  await benchmark('Stations with Coordinates (limit 100)', () =>
    supabase
      .from('stations_view')
      .select('*')
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .not('stream_url', 'is', null)
      .not('stream_url', 'ilike', '%placeholder%')
      .limit(100)
  );

  // 10. Stream URL filtering
  await benchmark('Valid Stream URLs (limit 100)', () =>
    supabase
      .from('stations_view')
      .select('*')
      .not('stream_url', 'is', null)
      .not('stream_url', 'ilike', '%placeholder%')
      .limit(100)
  );

  // 11. Complex query: Band + Country + Stream
  await benchmark('Complex: FM + US + Valid Stream (limit 50)', () =>
    supabase
      .from('stations_view')
      .select('*')
      .eq('band_type', 'FM')
      .eq('country_code', 'US')
      .not('stream_url', 'is', null)
      .not('stream_url', 'ilike', '%placeholder%')
      .limit(50)
  );

  // 12. Frequency ordering
  await benchmark('Frequency Ordered: FM (limit 100)', () =>
    supabase
      .from('stations_view')
      .select('*')
      .eq('band_type', 'FM')
      .order('frequency_khz', { ascending: true })
      .limit(100)
  );

  console.log('\n=== Benchmark Results ===\n');

  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log('Summary:');
  console.log(`  Successful: ${successful.length}/${results.length}`);
  console.log(`  Failed: ${failed.length}/${results.length}`);

  if (successful.length > 0) {
    const avgDuration = successful.reduce((sum, r) => sum + r.duration, 0) / successful.length;
    const minDuration = Math.min(...successful.map(r => r.duration));
    const maxDuration = Math.max(...successful.map(r => r.duration));
    const p95Duration = successful.map(r => r.duration).sort((a, b) => a - b)[Math.floor(successful.length * 0.95)];

    console.log(`\nPerformance Metrics:`);
    console.log(`  Average: ${avgDuration.toFixed(0)}ms`);
    console.log(`  Minimum: ${minDuration}ms`);
    console.log(`  Maximum: ${maxDuration}ms`);
    console.log(`  P95: ${p95Duration}ms`);
  }

  console.log('\nDetailed Results:');
  results.forEach(result => {
    const status = result.success ? '✅' : '❌';
    const info = result.success
      ? `${result.duration}ms (${result.resultCount} rows)`
      : `${result.duration}ms - ${result.error}`;
    console.log(`  ${status} ${result.name}: ${info}`);
  });

  if (failed.length > 0) {
    console.log('\n⚠️  Failed Queries:');
    failed.forEach(result => {
      console.log(`  - ${result.name}: ${result.error}`);
    });
  }

  // Performance grading
  const avgDuration = successful.length > 0
    ? successful.reduce((sum, r) => sum + r.duration, 0) / successful.length
    : 0;

  let grade = 'F';
  if (avgDuration < 100) grade = 'A+';
  else if (avgDuration < 250) grade = 'A';
  else if (avgDuration < 500) grade = 'B';
  else if (avgDuration < 1000) grade = 'C';
  else if (avgDuration < 2000) grade = 'D';

  console.log(`\n📊 Performance Grade: ${grade}`);
  console.log(`   (Based on average query time: ${avgDuration.toFixed(0)}ms)`);

  return { results, successful: successful.length, failed: failed.length, avgDuration, grade };
}

runBenchmarks().catch(console.error);
