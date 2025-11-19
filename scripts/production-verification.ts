import { supabase } from './lib/supabase-node.js';

interface TestCity {
  name: string;
  latitude: number;
  longitude: number;
  country: string;
  continent: string;
}

const testCities: TestCity[] = [
  // Required Indian cities
  {
    name: 'Bengaluru',
    latitude: 12.9716,
    longitude: 77.5946,
    country: 'India',
    continent: 'Asia'
  },
  {
    name: 'Kolkata',
    latitude: 22.5726,
    longitude: 88.3639,
    country: 'India',
    continent: 'Asia'
  },
  // Random global cities (diverse coverage)
  {
    name: 'Tokyo',
    latitude: 35.6762,
    longitude: 139.6503,
    country: 'Japan',
    continent: 'Asia'
  },
  {
    name: 'London',
    latitude: 51.5074,
    longitude: -0.1278,
    country: 'United Kingdom',
    continent: 'Europe'
  },
  {
    name: 'São Paulo',
    latitude: -23.5505,
    longitude: -46.6333,
    country: 'Brazil',
    continent: 'South America'
  },
  {
    name: 'Sydney',
    latitude: -33.8688,
    longitude: 151.2093,
    country: 'Australia',
    continent: 'Oceania'
  },
  {
    name: 'Los Angeles',
    latitude: 34.0522,
    longitude: -118.2437,
    country: 'United States',
    continent: 'North America'
  }
];

interface BandTestConfig {
  band: string;
  radiusKm: number;
  expectedMin: number;
  description: string;
}

const bandTests: BandTestConfig[] = [
  { band: 'FM', radiusKm: 75, expectedMin: 0, description: 'Local FM stations' },
  { band: 'AM', radiusKm: 400, expectedMin: 0, description: 'Regional AM stations' },
  { band: 'SW', radiusKm: 0, expectedMin: 5, description: 'Global SW stations' }
];

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

async function testBandQuery(city: TestCity, bandConfig: BandTestConfig) {
  const start = Date.now();

  if (bandConfig.band === 'SW') {
    const { data, error } = await supabase
      .from('stations_view')
      .select('station_id, station_name, band_type, frequency_khz, stream_url, latitude, longitude')
      .ilike('band_type', 'SW%')
      .limit(100);

    const duration = Date.now() - start;

    if (error) {
      return {
        band: bandConfig.band,
        success: false,
        error: error.message,
        duration,
        count: 0,
        withStream: 0,
        sampleStations: []
      };
    }

    const stations = data || [];
    const withValidStream = stations.filter(s =>
      s.stream_url && !s.stream_url.includes('placeholder')
    );

    return {
      band: bandConfig.band,
      success: stations.length >= bandConfig.expectedMin,
      error: null,
      duration,
      count: stations.length,
      withStream: withValidStream.length,
      sampleStations: stations.slice(0, 3).map(s => ({
        name: s.station_name,
        frequency: s.frequency_khz,
        hasStream: !!(s.stream_url && !s.stream_url.includes('placeholder'))
      }))
    };
  }

  const latDelta = (bandConfig.radiusKm / 111.0);
  const lonDelta = (bandConfig.radiusKm / (111.0 * Math.cos(toRad(city.latitude))));

  const minLat = city.latitude - latDelta;
  const maxLat = city.latitude + latDelta;
  const minLon = city.longitude - lonDelta;
  const maxLon = city.longitude + lonDelta;

  const { data, error } = await supabase
    .from('stations_view')
    .select('station_id, station_name, band_type, frequency_khz, stream_url, latitude, longitude')
    .or(`band_type.eq.${bandConfig.band},band_type.ilike.${bandConfig.band}%`)
    .not('latitude', 'is', null)
    .not('longitude', 'is', null)
    .gte('latitude', minLat)
    .lte('latitude', maxLat)
    .gte('longitude', minLon)
    .lte('longitude', maxLon)
    .limit(500);

  const duration = Date.now() - start;

  if (error) {
    return {
      band: bandConfig.band,
      success: false,
      error: error.message,
      duration,
      count: 0,
      withStream: 0,
      sampleStations: []
    };
  }

  if (!data || data.length === 0) {
    return {
      band: bandConfig.band,
      success: true,
      error: null,
      duration,
      count: 0,
      withStream: 0,
      sampleStations: []
    };
  }

  const stationsWithDistance = data
    .map(station => {
      const distance = calculateDistance(
        city.latitude,
        city.longitude,
        station.latitude!,
        station.longitude!
      );
      return { ...station, distance };
    })
    .filter(s => s.distance <= bandConfig.radiusKm)
    .sort((a, b) => a.distance - b.distance);

  const withValidStream = stationsWithDistance.filter(s =>
    s.stream_url && !s.stream_url.includes('placeholder')
  );

  return {
    band: bandConfig.band,
    success: stationsWithDistance.length >= bandConfig.expectedMin,
    error: null,
    duration,
    count: stationsWithDistance.length,
    withStream: withValidStream.length,
    sampleStations: stationsWithDistance.slice(0, 3).map(s => ({
      name: s.station_name,
      frequency: s.frequency_khz,
      distance: (s as any).distance,
      hasStream: !!(s.stream_url && !s.stream_url.includes('placeholder'))
    }))
  };
}

async function testCity(city: TestCity) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`📍 ${city.name}, ${city.country} (${city.continent})`);
  console.log(`   Coordinates: ${city.latitude}, ${city.longitude}`);
  console.log(`${'='.repeat(70)}\n`);

  const results = [];

  for (const bandConfig of bandTests) {
    console.log(`  Testing ${bandConfig.band} (${bandConfig.description})...`);
    const result = await testBandQuery(city, bandConfig);

    if (result.error) {
      console.log(`    ❌ Error: ${result.error}`);
    } else {
      const status = result.count > 0 ? '✅' : '⚠️';
      console.log(`    ${status} Found ${result.count} stations (${result.withStream} with valid streams)`);
      console.log(`       Query time: ${result.duration}ms`);

      if (result.sampleStations.length > 0) {
        console.log(`       Sample stations:`);
        result.sampleStations.forEach(s => {
          const streamStatus = s.hasStream ? '🎵' : '📻';
          const distStr = (s as any).distance ? ` (${(s as any).distance.toFixed(1)}km)` : '';
          console.log(`         ${streamStatus} ${s.name} - ${s.frequency}kHz${distStr}`);
        });
      }
    }

    results.push({
      city: city.name,
      band: result.band,
      ...result
    });
  }

  return results;
}

async function checkDatabaseHealth() {
  console.log('\n' + '='.repeat(70));
  console.log('🔍 DATABASE HEALTH CHECK');
  console.log('='.repeat(70) + '\n');

  const checks = [];

  console.log('Checking total station counts by band...\n');

  const { data: fmCount } = await supabase
    .from('stations_view')
    .select('station_id', { count: 'exact', head: true })
    .or('band_type.eq.FM,band_type.ilike.FM%');
  console.log(`  FM Stations: ${fmCount?.length || 0}`);
  checks.push({ type: 'FM Count', value: fmCount?.length || 0, status: (fmCount?.length || 0) > 0 ? '✅' : '❌' });

  const { data: amCount } = await supabase
    .from('stations_view')
    .select('station_id', { count: 'exact', head: true })
    .or('band_type.eq.AM,band_type.ilike.AM%');
  console.log(`  AM Stations: ${amCount?.length || 0}`);
  checks.push({ type: 'AM Count', value: amCount?.length || 0, status: (amCount?.length || 0) > 0 ? '✅' : '❌' });

  const { data: swCount } = await supabase
    .from('stations_view')
    .select('station_id', { count: 'exact', head: true })
    .ilike('band_type', 'SW%');
  console.log(`  SW Stations: ${swCount?.length || 0}`);
  checks.push({ type: 'SW Count', value: swCount?.length || 0, status: (swCount?.length || 0) > 0 ? '✅' : '❌' });

  console.log('\nChecking stations with coordinates...\n');

  const { data: coordCount } = await supabase
    .from('stations_view')
    .select('station_id', { count: 'exact', head: true })
    .not('latitude', 'is', null)
    .not('longitude', 'is', null);
  console.log(`  Stations with coordinates: ${coordCount?.length || 0}`);
  checks.push({ type: 'Coordinates', value: coordCount?.length || 0, status: (coordCount?.length || 0) > 0 ? '✅' : '❌' });

  console.log('\nChecking stations with valid stream URLs...\n');

  const { data: streamCount } = await supabase
    .from('stations_view')
    .select('station_id', { count: 'exact', head: true })
    .not('stream_url', 'is', null)
    .not('stream_url', 'ilike', '%placeholder%');
  console.log(`  Stations with valid streams: ${streamCount?.length || 0}`);
  checks.push({ type: 'Valid Streams', value: streamCount?.length || 0, status: (streamCount?.length || 0) > 0 ? '✅' : '❌' });

  console.log('\nChecking view performance...\n');

  const start = Date.now();
  const { data: perfTest } = await supabase
    .from('stations_view')
    .select('station_id')
    .limit(100);
  const duration = Date.now() - start;
  console.log(`  View query time (100 rows): ${duration}ms`);
  checks.push({ type: 'Query Performance', value: duration, status: duration < 1000 ? '✅' : '⚠️' });

  return checks;
}

async function validateStreamURLs(results: any[]) {
  console.log('\n' + '='.repeat(70));
  console.log('🎵 STREAM URL VALIDATION');
  console.log('='.repeat(70) + '\n');

  let totalStations = 0;
  let totalWithStreams = 0;

  results.forEach(r => {
    totalStations += r.count;
    totalWithStreams += r.withStream;
  });

  const streamPercentage = totalStations > 0 ? (totalWithStreams / totalStations * 100).toFixed(1) : '0.0';

  console.log(`Total stations found: ${totalStations}`);
  console.log(`Stations with valid streams: ${totalWithStreams}`);
  console.log(`Stream availability: ${streamPercentage}%`);

  const status = parseFloat(streamPercentage) > 50 ? '✅' : parseFloat(streamPercentage) > 25 ? '⚠️' : '❌';
  console.log(`Status: ${status}`);

  return {
    totalStations,
    totalWithStreams,
    streamPercentage: parseFloat(streamPercentage),
    status
  };
}

async function main() {
  console.log('\n');
  console.log('╔' + '═'.repeat(68) + '╗');
  console.log('║' + ' '.repeat(15) + 'PRODUCTION VERIFICATION TEST' + ' '.repeat(25) + '║');
  console.log('║' + ' '.repeat(68) + '║');
  console.log('║' + '  Testing: 7 global cities (2 India + 5 random)' + ' '.repeat(21) + '║');
  console.log('║' + '  Bands: FM (75km), AM (400km), SW (global)' + ' '.repeat(25) + '║');
  console.log('╚' + '═'.repeat(68) + '╝');
  console.log('\n');

  const healthChecks = await checkDatabaseHealth();

  const allResults = [];

  for (const city of testCities) {
    const cityResults = await testCity(city);
    allResults.push(...cityResults);
  }

  const streamValidation = await validateStreamURLs(allResults);

  console.log('\n' + '='.repeat(70));
  console.log('📊 SUMMARY TABLE');
  console.log('='.repeat(70) + '\n');

  console.log('City'.padEnd(20), '| Band | Stations | Streams | Query Time | Status');
  console.log('-'.repeat(80));

  allResults.forEach(r => {
    const status = r.count > 0 ? '✅' : '⚠️';
    console.log(
      r.city.padEnd(20),
      '|',
      r.band.padEnd(4),
      '|',
      String(r.count).padEnd(8),
      '|',
      String(r.withStream).padEnd(7),
      '|',
      String(r.duration + 'ms').padEnd(10),
      '|',
      status
    );
  });

  console.log('\n' + '='.repeat(70));
  console.log('📈 STATISTICS');
  console.log('='.repeat(70) + '\n');

  const byBand = {
    FM: allResults.filter(r => r.band === 'FM'),
    AM: allResults.filter(r => r.band === 'AM'),
    SW: allResults.filter(r => r.band === 'SW')
  };

  Object.entries(byBand).forEach(([band, results]) => {
    const totalStations = results.reduce((sum, r) => sum + r.count, 0);
    const avgStations = (totalStations / results.length).toFixed(1);
    const avgTime = (results.reduce((sum, r) => sum + r.duration, 0) / results.length).toFixed(0);
    const withStations = results.filter(r => r.count > 0).length;
    const coverage = ((withStations / results.length) * 100).toFixed(1);

    console.log(`${band} Band:`);
    console.log(`  Total stations: ${totalStations}`);
    console.log(`  Avg per city: ${avgStations}`);
    console.log(`  City coverage: ${coverage}% (${withStations}/${results.length})`);
    console.log(`  Avg query time: ${avgTime}ms`);
    console.log('');
  });

  console.log('='.repeat(70));
  console.log('🎯 PRODUCTION READINESS');
  console.log('='.repeat(70) + '\n');

  const fmCoverage = (byBand.FM.filter(r => r.count > 0).length / byBand.FM.length) * 100;
  const amCoverage = (byBand.AM.filter(r => r.count > 0).length / byBand.AM.length) * 100;
  const swCoverage = (byBand.SW.filter(r => r.count > 0).length / byBand.SW.length) * 100;

  const avgQueryTime = allResults.reduce((sum, r) => sum + r.duration, 0) / allResults.length;

  const checks = [
    {
      name: 'Database Health',
      status: healthChecks.every(c => c.status === '✅') ? '✅ Pass' : '⚠️ Partial',
      details: `${healthChecks.filter(c => c.status === '✅').length}/${healthChecks.length} checks passed`
    },
    {
      name: 'FM Coverage',
      status: fmCoverage > 30 ? '✅ Pass' : '⚠️ Limited',
      details: `${fmCoverage.toFixed(1)}% of cities have FM stations`
    },
    {
      name: 'AM Coverage',
      status: amCoverage > 30 ? '✅ Pass' : '⚠️ Limited',
      details: `${amCoverage.toFixed(1)}% of cities have AM stations`
    },
    {
      name: 'SW Coverage',
      status: swCoverage > 80 ? '✅ Pass' : '⚠️ Limited',
      details: `${swCoverage.toFixed(1)}% availability (global)`
    },
    {
      name: 'Query Performance',
      status: avgQueryTime < 1000 ? '✅ Pass' : '⚠️ Slow',
      details: `${avgQueryTime.toFixed(0)}ms average`
    },
    {
      name: 'Stream Availability',
      status: streamValidation.status,
      details: `${streamValidation.streamPercentage}% have valid URLs`
    }
  ];

  checks.forEach(check => {
    console.log(`${check.status.padEnd(10)} ${check.name}`);
    console.log(`           ${check.details}`);
    console.log('');
  });

  const passCount = checks.filter(c => c.status.includes('✅')).length;
  const grade = passCount === 6 ? 'A' : passCount >= 5 ? 'B' : passCount >= 4 ? 'C' : 'D';

  console.log('='.repeat(70));
  console.log(`OVERALL GRADE: ${grade} (${passCount}/6 checks passed)`);
  console.log('='.repeat(70));

  if (grade === 'A' || grade === 'B') {
    console.log('\n✅ System is PRODUCTION READY\n');
  } else {
    console.log('\n⚠️  System needs improvement before production deployment\n');
  }

  return {
    grade,
    passCount,
    healthChecks,
    cityResults: allResults,
    streamValidation,
    statistics: {
      FM: byBand.FM,
      AM: byBand.AM,
      SW: byBand.SW
    }
  };
}

main().catch(console.error);
