import { supabase } from './lib/supabase-node.js';

async function debugCityStations() {
  console.log('=== Checking stations in specific cities ===\n');

  const testCity = 'London';

  const { data, error } = await supabase
    .from('stations_view')
    .select('station_id, station_name, band_type, city_name, country_name, stream_url, latitude, longitude')
    .eq('city_name', testCity)
    .limit(10);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`Stations found in ${testCity}:`, data?.length || 0);
  console.log(JSON.stringify(data, null, 2));

  console.log('\n=== Checking what cities have stations ===\n');

  const { data: citiesWithStations } = await supabase
    .from('stations_view')
    .select('city_name, band_type, country_name')
    .not('city_name', 'is', null)
    .not('stream_url', 'is', null)
    .limit(20);

  console.log('Sample cities with streaming stations:');
  console.log(JSON.stringify(citiesWithStations, null, 2));

  console.log('\n=== Checking unique station_id formats ===\n');

  const { data: sampleIds } = await supabase
    .from('stations_view')
    .select('station_id, source_table')
    .limit(10);

  console.log('Sample station IDs:');
  console.log(JSON.stringify(sampleIds, null, 2));
}

debugCityStations().catch(console.error);
