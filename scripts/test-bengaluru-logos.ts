import { config } from 'dotenv';
import { enrichStationLogo } from '../src/services/logoEnrichment';
import { supabase } from '../scripts/lib/supabase-node';

config();

async function testBengaluruLogos() {
  console.log('🧪 Testing Logo Enrichment on Bengaluru Stations\n');

  const { data: stations } = await supabase
    .from('radio_stations')
    .select('id, name, homepage, logo_url, logo_source, city')
    .or('city.ilike.%bengaluru%,city.ilike.%bangalore%')
    .not('homepage', 'is', null)
    .limit(5);

  if (!stations || stations.length === 0) {
    console.log('❌ No Bengaluru stations found');
    return;
  }

  console.log(`Testing ${stations.length} Bengaluru stations:\n`);

  for (const station of stations) {
    console.log(`📻 ${station.name}`);
    console.log(`   Website: ${station.homepage}`);
    console.log(`   Current: ${station.logo_source || 'none'}`);

    const result = await enrichStationLogo(
      station.id,
      station.name,
      station.homepage,
      'radio_stations',
      station.logo_url,
      station.logo_source
    );

    if (result.success) {
      console.log(`   ✅ SUCCESS! Found ${result.logoSource} logo`);
      console.log(`   URL: ${result.logoUrl?.substring(0, 80)}...`);
    } else {
      console.log(`   ℹ️  ${result.error}`);
    }
    console.log();

    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log('✅ Test complete!');
}

testBengaluruLogos().catch(console.error);
