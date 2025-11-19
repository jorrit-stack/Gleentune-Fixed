import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const US_CITIES = [
  'Los Angeles', 'San Francisco', 'San Diego', 'San Jose', 'Sacramento',
  'Fresno', 'Oakland', 'Long Beach', 'Bakersfield', 'Anaheim',
  'Riverside', 'Stockton', 'Irvine', 'Chula Vista', 'Fremont',
  'Santa Ana', 'Modesto', 'Fontana', 'Oxnard', 'Moreno Valley',
  'Glendale', 'Huntington Beach', 'Santa Clarita', 'Garden Grove', 'Santa Rosa',
  'Oceanside', 'Rancho Cucamonga', 'Ontario', 'Lancaster', 'Elk Grove',
  'Corona', 'Palmdale', 'Salinas', 'Pomona', 'Hayward',
  'Escondido', 'Torrance', 'Sunnyvale', 'Orange', 'Fullerton',
  'Pasadena', 'Thousand Oaks', 'Visalia', 'Simi Valley', 'Concord',
  'Roseville', 'Santa Clara', 'Vallejo', 'Victorville', 'Berkeley',
  'Chico', 'Redlands', 'Eureka', 'Santa Barbara', 'San Bernardino',
  'Redding', 'Merced', 'San Luis Obispo', 'Monterey', 'Napa'
];

async function enrichFromStationNames() {
  console.log('🔍 Finding California stations without coordinates...');

  const { data: stations, error } = await supabase
    .from('radio_stations')
    .select('id, name, city, state, latitude, longitude')
    .or('state.ilike.%California%,city.ilike.%California%')
    .or('latitude.is.null,longitude.is.null')
    .limit(500);

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  console.log(`📊 Found ${stations.length} stations to check`);

  let enriched = 0;
  let notFound = 0;

  for (const station of stations) {
    let cityFound: string | null = null;

    for (const city of US_CITIES) {
      if (station.name.toLowerCase().includes(city.toLowerCase())) {
        cityFound = city;
        break;
      }
    }

    if (!cityFound) {
      notFound++;
      continue;
    }

    const { data: cityData, error: cityError } = await supabase
      .from('cities')
      .select(`
        city_name,
        latitude,
        longitude,
        countries!inner(country_name)
      `)
      .ilike('city_name', cityFound)
      .ilike('countries.country_name', 'United States%')
      .gte('latitude', 32.5)
      .lte('latitude', 42)
      .gte('longitude', -124.5)
      .lte('longitude', -114)
      .limit(1)
      .maybeSingle();

    if (cityError || !cityData) {
      console.log(`   ⚠️  No match for: ${cityFound}`);
      notFound++;
      continue;
    }

    const { error: updateError } = await supabase
      .from('radio_stations')
      .update({
        city: cityFound,
        latitude: cityData.latitude,
        longitude: cityData.longitude
      })
      .eq('id', station.id);

    if (updateError) {
      console.error(`   ❌ Error updating ${station.name}:`, updateError.message);
    } else {
      enriched++;
      console.log(`   ✅ ${station.name} -> ${cityFound} (${cityData.latitude}, ${cityData.longitude})`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📋 ENRICHMENT COMPLETE');
  console.log('='.repeat(60));
  console.log(`✅ Successfully enriched: ${enriched} stations`);
  console.log(`⚠️  No city found in name: ${notFound} stations`);
  console.log('='.repeat(60));
}

enrichFromStationNames().catch(console.error);
