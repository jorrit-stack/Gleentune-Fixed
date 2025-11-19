import { supabase } from './lib/supabase-node.js';

interface TestResult {
  name: string;
  passed: boolean;
  details: string;
  duration: number;
}

const results: TestResult[] = [];

async function runTest(
  name: string,
  testFn: () => Promise<{ passed: boolean; details: string }>
): Promise<void> {
  const start = Date.now();
  try {
    const result = await testFn();
    results.push({
      name,
      passed: result.passed,
      details: result.details,
      duration: Date.now() - start
    });
  } catch (error) {
    results.push({
      name,
      passed: false,
      details: `Error: ${error}`,
      duration: Date.now() - start
    });
  }
}

async function testStationsViewExists() {
  const { data, error } = await supabase
    .from('stations_view')
    .select('station_id')
    .limit(1);

  if (error) {
    return { passed: false, details: `View not accessible: ${error.message}` };
  }

  return { passed: true, details: 'stations_view accessible' };
}

async function testAllBandsPresent() {
  const { data, error } = await supabase
    .from('stations_view')
    .select('band_type')
    .limit(1000);

  if (error) {
    return { passed: false, details: `Query failed: ${error.message}` };
  }

  const bands = new Set(data?.map(s => s.band_type) || []);
  const hasFM = bands.has('FM');
  const hasAM = bands.has('AM');
  const hasSW = Array.from(bands).some(b => b === 'SW' || b.startsWith('SW'));

  const details = `Bands found: ${Array.from(bands).join(', ')}`;

  return {
    passed: hasFM && hasAM && hasSW,
    details
  };
}

async function testStreamUrlAvailability() {
  const { data, error } = await supabase
    .from('stations_view')
    .select('station_id, stream_url, band_type')
    .not('stream_url', 'is', null)
    .limit(100);

  if (error) {
    return { passed: false, details: `Query failed: ${error.message}` };
  }

  const total = data?.length || 0;
  const withStreams = data?.filter(s => s.stream_url && !s.stream_url.includes('placeholder')).length || 0;

  return {
    passed: withStreams > 0,
    details: `${withStreams}/${total} stations have valid streams`
  };
}

async function testCoordinateData() {
  const { data, error } = await supabase
    .from('stations_view')
    .select('station_id, latitude, longitude, band_type')
    .not('latitude', 'is', null)
    .not('longitude', 'is', null)
    .limit(100);

  if (error) {
    return { passed: false, details: `Query failed: ${error.message}` };
  }

  const total = data?.length || 0;
  const validCoords = data?.filter(s =>
    s.latitude !== null &&
    s.longitude !== null &&
    Math.abs(s.latitude) <= 90 &&
    Math.abs(s.longitude) <= 180
  ).length || 0;

  return {
    passed: validCoords > 50,
    details: `${validCoords}/${total} stations have valid coordinates`
  };
}

async function testBandFiltering() {
  const fmResult = await supabase
    .from('stations_view')
    .select('station_id')
    .eq('band_type', 'FM')
    .limit(10);

  const amResult = await supabase
    .from('stations_view')
    .select('station_id')
    .eq('band_type', 'AM')
    .limit(10);

  const swResult = await supabase
    .from('stations_view')
    .select('station_id')
    .ilike('band_type', 'SW%')
    .limit(10);

  const fmCount = fmResult.data?.length || 0;
  const amCount = amResult.data?.length || 0;
  const swCount = swResult.data?.length || 0;

  return {
    passed: fmCount > 0 && amCount > 0 && swCount > 0,
    details: `FM: ${fmCount}, AM: ${amCount}, SW: ${swCount} stations`
  };
}

async function testSearchFunctionality() {
  const { data, error } = await supabase
    .from('stations_view')
    .select('station_id, station_name, city_name')
    .or('station_name.ilike.%BBC%,city_name.ilike.%London%')
    .limit(10);

  if (error) {
    return { passed: false, details: `Search failed: ${error.message}` };
  }

  return {
    passed: (data?.length || 0) > 0,
    details: `Found ${data?.length || 0} stations matching search`
  };
}

async function testDataQuality() {
  const { data, error } = await supabase
    .from('stations_view')
    .select('*')
    .limit(100);

  if (error) {
    return { passed: false, details: `Query failed: ${error.message}` };
  }

  const stations = data || [];
  const withNames = stations.filter(s => s.station_name && s.station_name.length > 0).length;
  const withCountries = stations.filter(s => s.country_name && s.country_name.length > 0).length;
  const withFrequencies = stations.filter(s => s.frequency_khz && s.frequency_khz > 0).length;

  const qualityScore = ((withNames + withCountries + withFrequencies) / (stations.length * 3)) * 100;

  return {
    passed: qualityScore > 70,
    details: `Quality score: ${qualityScore.toFixed(1)}% (names: ${withNames}, countries: ${withCountries}, frequencies: ${withFrequencies})`
  };
}

async function testPerformance() {
  const start = Date.now();

  const { error } = await supabase
    .from('stations_view')
    .select('*')
    .limit(100);

  const duration = Date.now() - start;

  if (error) {
    return { passed: false, details: `Query failed: ${error.message}` };
  }

  return {
    passed: duration < 2000,
    details: `Query completed in ${duration}ms`
  };
}

async function runAllTests() {
  console.log('=== Radio Database Integration Tests ===\n');

  await runTest('View Accessibility', testStationsViewExists);
  await runTest('All Bands Present', testAllBandsPresent);
  await runTest('Stream URL Availability', testStreamUrlAvailability);
  await runTest('Coordinate Data', testCoordinateData);
  await runTest('Band Filtering', testBandFiltering);
  await runTest('Search Functionality', testSearchFunctionality);
  await runTest('Data Quality', testDataQuality);
  await runTest('Query Performance', testPerformance);

  console.log('\n=== Test Results ===\n');

  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;

  results.forEach(result => {
    const status = result.passed ? '✅' : '❌';
    console.log(`${status} ${result.name} (${result.duration}ms)`);
    console.log(`   ${result.details}\n`);
  });

  console.log(`\n=== Summary ===`);
  console.log(`Passed: ${passed}/${total} (${((passed/total)*100).toFixed(1)}%)`);
  console.log(`Average Duration: ${avgDuration.toFixed(0)}ms`);
  console.log(`Status: ${passed === total ? '🎉 ALL TESTS PASSED' : '⚠️  SOME TESTS FAILED'}`);

  return { passed, total, results };
}

runAllTests().catch(console.error);
