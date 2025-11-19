import { config } from 'dotenv';
import { supabase } from '../scripts/lib/supabase-node';
import { enrichStationLogo } from '../src/services/logoEnrichment';

config();

async function testEnrichment() {
  console.log('🧪 Testing Logo Enrichment on Sample Stations\n');

  // Get 5 FM stations with websites but no real logos
  const { data: stations } = await supabase
    .from('stations')
    .select(`
      station_id,
      station_name,
      website_url,
      logo_url,
      logo_source,
      bands!inner(band_name)
    `)
    .eq('bands.band_name', 'FM')
    .not('website_url', 'is', null)
    .neq('website_url', '')
    .or('logo_url.is.null,logo_source.eq.generated')
    .limit(5);

  if (!stations || stations.length === 0) {
    console.log('❌ No stations found for testing');
    return;
  }

  console.log(`Found ${stations.length} test stations:\n`);

  for (const station of stations) {
    console.log(`📻 ${station.station_name}`);
    console.log(`   Website: ${station.website_url}`);
    console.log(`   Current logo: ${station.logo_source || 'none'}`);

    const result = await enrichStationLogo(
      station.station_id,
      station.station_name,
      station.website_url,
      'stations',
      station.logo_url,
      station.logo_source
    );

    if (result.success) {
      console.log(`   ✅ Found ${result.logoSource} logo: ${result.logoUrl?.substring(0, 60)}...`);
    } else {
      console.log(`   ❌ ${result.error}`);
    }
    console.log();

    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log('\n✅ Test complete!');
}

testEnrichment().catch(console.error);
