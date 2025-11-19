import { supabase } from './lib/supabase-node.js';

async function checkRealStreams() {
  console.log('=== Checking for real streaming stations ===\n');

  const { data, error } = await supabase
    .from('stations_view')
    .select('station_id, station_name, band_type, city_name, stream_url')
    .not('stream_url', 'is', null)
    .not('stream_url', 'ilike', '%placeholder%')
    .limit(20);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`Found ${data?.length || 0} stations with real streams\n`);
  console.log(JSON.stringify(data, null, 2));
}

checkRealStreams().catch(console.error);
