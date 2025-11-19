import { supabase } from './lib/supabase-node.js';

interface TestCity {
  searchName: string;
  expectedNames: string[];
  latitude: number;
  longitude: number;
  country: string;
}

const testCities: TestCity[] = [
  {
    searchName: 'Bangalore',
    expectedNames: ['Bangalore', 'Bengaluru'],
    latitude: 12.9716,
    longitude: 77.5946,
    country: 'India'
  },
  {
    searchName: 'Delhi',
    expectedNames: ['Delhi', 'New Delhi'],
    latitude: 28.7041,
    longitude: 77.1025,
    country: 'India'
  },
  {
    searchName: 'Mumbai',
    expectedNames: ['Mumbai', 'Bombay'],
    latitude: 19.0760,
    longitude: 72.8777,
    country: 'India'
  },
  {
    searchName: 'London',
    expectedNames: ['London'],
    latitude: 51.5074,
    longitude: -0.1278,
    country: 'United Kingdom'
  },
  {
    searchName: 'New York',
    expectedNames: ['New York', 'New York City'],
    latitude: 40.7128,
    longitude: -74.0060,
    country: 'United States'
  }
];

async function testCityMatching(city: TestCity) {
  console.log(`\n=== Testing: ${city.searchName} ===`);
  console.log(`Coordinates: ${city.latitude}, ${city.longitude}`);
  console.log(`Expected names: ${city.expectedNames.join(', ')}`);

  // 1. Check if city exists in database
  const { data: cityMatches } = await supabase
    .from('cities')
    .select('city_name, country_name, latitude, longitude')
    .or(city.expectedNames.map(name => `city_name.ilike.%${name}%`).join(','))
    .limit(5);

  console.log(`\nCity matches in database: ${cityMatches?.length || 0}`);
  cityMatches?.forEach(c => {
    console.log(`  - ${c.city_name}, ${c.country_name} (${c.latitude}, ${c.longitude})`);
  });

  // 2. Test FM stations (75km radius)
  const fm75km = await testProximityQuery('FM', city.latitude, city.longitude, 75);
  console.log(`\nFM stations (75km): ${fm75km.count} stations`);
  if (fm75km.count > 0) {
    console.log(`  Sample: ${fm75km.sample?.slice(0, 3).map(s => s.station_name).join(', ')}`);
  }

  // 3. Test AM stations (400km radius)
  const am400km = await testProximityQuery('AM', city.latitude, city.longitude, 400);
  console.log(`\nAM stations (400km): ${am400km.count} stations`);
  if (am400km.count > 0) {
    console.log(`  Sample: ${am400km.sample?.slice(0, 3).map(s => s.station_name).join(', ')}`);
  }

  // 4. Test SW stations (no radius - global)
  const { data: swStations } = await supabase
    .from('stations_view')
    .select('station_id, station_name, band_type')
    .ilike('band_type', 'SW%')
    .limit(5);

  console.log(`\nSW stations (global): ${swStations?.length || 0} sample stations`);
  if (swStations && swStations.length > 0) {
    console.log(`  Sample: ${swStations.map(s => s.station_name).join(', ')}`);
  }

  return {
    city: city.searchName,
    cityMatches: cityMatches?.length || 0,
    fm75km: fm75km.count,
    am400km: am400km.count,
    swGlobal: swStations?.length || 0
  };
}

async function testProximityQuery(band: string, lat: number, lon: number, radiusKm: number) {
  // Get all stations with coordinates for this band
  const { data, error } = await supabase
    .from('stations_view')
    .select('station_id, station_name, band_type, latitude, longitude, stream_url')
    .or(`band_type.eq.${band},band_type.ilike.${band}%`)
    .not('latitude', 'is', null)
    .not('longitude', 'is', null)
    .not('stream_url', 'is', null)
    .not('stream_url', 'ilike', '%placeholder%');

  if (error) {
    console.error(`Error querying ${band}:`, error);
    return { count: 0, sample: [] };
  }

  if (!data || data.length === 0) {
    return { count: 0, sample: [] };
  }

  // Calculate distances
  const stationsWithDistance = data
    .map(station => {
      const distance = calculateDistance(lat, lon, station.latitude!, station.longitude!);
      return { ...station, distance };
    })
    .filter(s => s.distance <= radiusKm)
    .sort((a, b) => a.distance - b.distance);

  return {
    count: stationsWithDistance.length,
    sample: stationsWithDistance.slice(0, 5)
  };
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
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

async function main() {
  console.log('=== City Matching & Proximity Query Test ===\n');
  console.log('Testing city name normalization and proximity queries...\n');
  console.log('Expected radii:');
  console.log('  - FM: 75 km (local stations)');
  console.log('  - AM: 400 km (regional stations)');
  console.log('  - SW: Global (no radius filter)');

  const results = [];
  for (const city of testCities) {
    const result = await testCityMatching(city);
    results.push(result);
  }

  console.log('\n\n=== Summary Table ===\n');
  console.log('City'.padEnd(15), '| City Matches | FM (75km) | AM (400km) | SW (Global)');
  console.log('-'.repeat(75));

  results.forEach(r => {
    console.log(
      r.city.padEnd(15),
      '|',
      String(r.cityMatches).padEnd(12),
      '|',
      String(r.fm75km).padEnd(9),
      '|',
      String(r.am400km).padEnd(10),
      '|',
      r.swGlobal
    );
  });

  console.log('\n=== Recommendations ===\n');

  const totalFM = results.reduce((sum, r) => sum + r.fm75km, 0);
  const totalAM = results.reduce((sum, r) => sum + r.am400km, 0);
  const avgFM = totalFM / results.length;
  const avgAM = totalAM / results.length;

  console.log(`Average FM stations (75km): ${avgFM.toFixed(1)}`);
  console.log(`Average AM stations (400km): ${avgAM.toFixed(1)}`);

  if (avgFM < 10) {
    console.log('\n⚠️  FM radius may be too small. Recommend increasing to 100-150km');
  } else {
    console.log('\n✅ FM radius (75km) appears appropriate');
  }

  if (avgAM < 5) {
    console.log('⚠️  AM radius may be too small. Recommend increasing to 500-600km');
  } else {
    console.log('✅ AM radius (400km) appears appropriate');
  }

  // Check for city name normalization issues
  console.log('\n=== City Name Normalization ===\n');
  results.forEach((r, i) => {
    if (r.cityMatches === 0) {
      console.log(`❌ "${testCities[i].searchName}" has NO matches in database`);
      console.log(`   Expected: ${testCities[i].expectedNames.join(' OR ')}`);
      console.log(`   Action: Add city name normalization or fuzzy matching`);
    } else {
      console.log(`✅ "${testCities[i].searchName}" found (${r.cityMatches} matches)`);
    }
  });
}

main().catch(console.error);
