import { supabase } from './lib/supabase-node.js';

interface TestLocation {
  name: string;
  latitude: number;
  longitude: number;
  country: string;
}

const testLocations: TestLocation[] = [
  {
    name: 'Delhi',
    latitude: 28.7041,
    longitude: 77.1025,
    country: 'India'
  },
  {
    name: 'Bengaluru',
    latitude: 12.9716,
    longitude: 77.5946,
    country: 'India'
  },
  {
    name: 'New York',
    latitude: 40.7128,
    longitude: -74.0060,
    country: 'United States'
  }
];

interface BandConfig {
  band: string;
  radiusKm: number;
}

const bandConfigs: BandConfig[] = [
  { band: 'FM', radiusKm: 75 },
  { band: 'AM', radiusKm: 400 }
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

async function testProximityQuery(
  location: TestLocation,
  band: string,
  radiusKm: number,
  optimized: boolean = true
) {
  const start = Date.now();

  if (optimized) {
    const latDelta = (radiusKm / 111.0);
    const lonDelta = (radiusKm / (111.0 * Math.cos(toRad(location.latitude))));

    const minLat = location.latitude - latDelta;
    const maxLat = location.latitude + latDelta;
    const minLon = location.longitude - lonDelta;
    const maxLon = location.longitude + lonDelta;

    const { data, error } = await supabase
      .from('stations_view')
      .select('station_id, station_name, band_type, latitude, longitude, stream_url')
      .or(`band_type.eq.${band},band_type.ilike.${band}%`)
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .gte('latitude', minLat)
      .lte('latitude', maxLat)
      .gte('longitude', minLon)
      .lte('longitude', maxLon)
      .not('stream_url', 'is', null)
      .not('stream_url', 'ilike', '%placeholder%')
      .limit(500);

    const fetchDuration = Date.now() - start;

    if (error) {
      return { error: error.message, duration: fetchDuration };
    }

    if (!data || data.length === 0) {
      return {
        method: 'optimized',
        fetchDuration,
        totalDuration: Date.now() - start,
        rowsFetched: 0,
        stationsInRadius: 0,
        error: null
      };
    }

    const stationsWithDistance = data
      .map(station => {
        const distance = calculateDistance(
          location.latitude,
          location.longitude,
          station.latitude!,
          station.longitude!
        );
        return { ...station, distance };
      })
      .filter(s => s.distance <= radiusKm)
      .sort((a, b) => a.distance - b.distance);

    return {
      method: 'optimized',
      fetchDuration,
      totalDuration: Date.now() - start,
      rowsFetched: data.length,
      stationsInRadius: stationsWithDistance.length,
      error: null
    };
  } else {
    const { data, error } = await supabase
      .from('stations_view')
      .select('station_id, station_name, band_type, latitude, longitude, stream_url')
      .or(`band_type.eq.${band},band_type.ilike.${band}%`)
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .not('stream_url', 'is', null)
      .not('stream_url', 'ilike', '%placeholder%');

    const fetchDuration = Date.now() - start;

    if (error) {
      return { error: error.message, duration: fetchDuration };
    }

    if (!data || data.length === 0) {
      return {
        method: 'unoptimized',
        fetchDuration,
        totalDuration: Date.now() - start,
        rowsFetched: 0,
        stationsInRadius: 0,
        error: null
      };
    }

    const stationsWithDistance = data
      .map(station => {
        const distance = calculateDistance(
          location.latitude,
          location.longitude,
          station.latitude!,
          station.longitude!
        );
        return { ...station, distance };
      })
      .filter(s => s.distance <= radiusKm)
      .sort((a, b) => a.distance - b.distance);

    return {
      method: 'unoptimized',
      fetchDuration,
      totalDuration: Date.now() - start,
      rowsFetched: data.length,
      stationsInRadius: stationsWithDistance.length,
      error: null
    };
  }
}

async function main() {
  console.log('=== Proximity Query Performance Test ===\n');
  console.log('Comparing optimized vs unoptimized proximity queries\n');
  console.log('Test locations: Delhi, Bengaluru, New York');
  console.log('Bands: FM (75km), AM (400km)\n');

  const results: any[] = [];

  for (const location of testLocations) {
    console.log(`\n📍 Testing: ${location.name}, ${location.country}`);
    console.log(`   Coordinates: ${location.latitude}, ${location.longitude}\n`);

    for (const config of bandConfigs) {
      console.log(`  ${config.band} Band (${config.radiusKm}km radius):`);

      console.log(`    Running unoptimized query...`);
      const unoptimized = await testProximityQuery(location, config.band, config.radiusKm, false);
      console.log(`      ⏱️  Fetch: ${unoptimized.fetchDuration}ms, Total: ${unoptimized.totalDuration}ms`);
      console.log(`      📊 Rows fetched: ${unoptimized.rowsFetched}, In radius: ${unoptimized.stationsInRadius}`);

      console.log(`    Running optimized query...`);
      const optimized = await testProximityQuery(location, config.band, config.radiusKm, true);
      console.log(`      ⏱️  Fetch: ${optimized.fetchDuration}ms, Total: ${optimized.totalDuration}ms`);
      console.log(`      📊 Rows fetched: ${optimized.rowsFetched}, In radius: ${optimized.stationsInRadius}`);

      if (unoptimized.totalDuration > 0 && optimized.totalDuration > 0) {
        const improvement = ((unoptimized.totalDuration - optimized.totalDuration) / unoptimized.totalDuration * 100).toFixed(1);
        const speedup = (unoptimized.totalDuration / optimized.totalDuration).toFixed(2);
        console.log(`      ✅ Improvement: ${improvement}% faster (${speedup}x speedup)`);
      }

      results.push({
        location: location.name,
        band: config.band,
        radius: config.radiusKm,
        unoptimized,
        optimized,
        improvement: unoptimized.totalDuration > 0 && optimized.totalDuration > 0
          ? ((unoptimized.totalDuration - optimized.totalDuration) / unoptimized.totalDuration * 100)
          : 0
      });
    }
  }

  console.log('\n\n=== Performance Summary ===\n');

  console.log('Location'.padEnd(15), '| Band | Radius | Unopt. | Opt. | Improvement | Stations');
  console.log('-'.repeat(95));

  results.forEach(r => {
    const unoptTime = r.unoptimized.totalDuration;
    const optTime = r.optimized.totalDuration;
    const improvement = r.improvement.toFixed(1) + '%';
    const stations = r.optimized.stationsInRadius;

    console.log(
      r.location.padEnd(15),
      '|',
      r.band.padEnd(4),
      '|',
      String(r.radius + 'km').padEnd(6),
      '|',
      String(unoptTime + 'ms').padEnd(6),
      '|',
      String(optTime + 'ms').padEnd(4),
      '|',
      improvement.padEnd(11),
      '|',
      stations
    );
  });

  const avgUnopt = results.reduce((sum, r) => sum + r.unoptimized.totalDuration, 0) / results.length;
  const avgOpt = results.reduce((sum, r) => sum + r.optimized.totalDuration, 0) / results.length;
  const avgImprovement = ((avgUnopt - avgOpt) / avgUnopt * 100).toFixed(1);
  const avgSpeedup = (avgUnopt / avgOpt).toFixed(2);

  console.log('\n📊 Overall Statistics:');
  console.log(`   Average unoptimized: ${avgUnopt.toFixed(0)}ms`);
  console.log(`   Average optimized: ${avgOpt.toFixed(0)}ms`);
  console.log(`   Average improvement: ${avgImprovement}%`);
  console.log(`   Average speedup: ${avgSpeedup}x`);

  console.log('\n🎯 Key Optimizations Applied:');
  console.log('   1. Bounding box filter (lat/lon range) before Haversine calculation');
  console.log('   2. Limit query to 500 rows max');
  console.log('   3. Reduced data transfer from database');
  console.log('   4. Uses existing B-tree indexes on latitude/longitude');

  if (avgOpt < 500) {
    console.log('\n✅ Performance Grade: A (Excellent - <500ms average)');
  } else if (avgOpt < 1000) {
    console.log('\n✅ Performance Grade: B (Good - <1000ms average)');
  } else if (avgOpt < 2000) {
    console.log('\n⚠️  Performance Grade: C (Fair - <2000ms average)');
  } else {
    console.log('\n❌ Performance Grade: D (Needs improvement - >2000ms average)');
  }

  console.log('\n💡 Recommendations:');
  if (avgOpt < 500) {
    console.log('   - Performance is excellent for production use');
    console.log('   - Consider adding result caching for popular locations');
  } else if (avgOpt < 1000) {
    console.log('   - Performance is acceptable for production');
    console.log('   - Consider materialized view for frequently queried areas');
  } else {
    console.log('   - Consider PostGIS extension for spatial queries');
    console.log('   - Add materialized views for major cities');
    console.log('   - Implement aggressive caching strategy');
  }
}

main().catch(console.error);
