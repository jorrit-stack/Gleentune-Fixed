import { supabase } from './lib/supabase-node';

async function test() {
  console.log('🔧 Testing service role access...\n');
  
  const { data: stations, error: readError } = await supabase
    .from('radio_stations')
    .select('id, name, logo_url')
    .limit(2);
    
  if (readError) {
    console.error('❌ Read error:', readError);
    return;
  }
  
  console.log('✅ Read success:', stations?.length, 'stations');
  
  if (stations && stations.length > 0) {
    console.log('Station:', stations[0].name);
    
    const { error: updateError } = await supabase
      .from('radio_stations')
      .update({ logo_url: stations[0].logo_url })
      .eq('id', stations[0].id);
      
    if (updateError) {
      console.error('\n❌ Update error:', updateError.message);
      console.error('Details:', updateError);
    } else {
      console.log('✅ Update success - service role has write access!');
    }
  }
}

test().catch(console.error);
