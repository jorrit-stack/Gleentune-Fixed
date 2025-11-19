import { config } from 'dotenv';
import { supabase } from '../scripts/lib/supabase-node';

config();

async function findMissingWebsites() {
  console.log('🔍 Finding stations without website URLs\n');

  // Get stations without websites from stations table
  const { data: stationsWithoutWebsites } = await supabase
    .from('stations')
    .select(`
      station_id,
      station_name,
      call_sign,
      website_url,
      bands!inner(band_name),
      station_locations!inner(
        cities!inner(city_name, countries!inner(country_name))
      )
    `)
    .in('bands.band_name', ['FM', 'AM'])
    .or('website_url.is.null,website_url.eq.')
    .limit(50);

  console.log(`Found ${stationsWithoutWebsites?.length || 0} stations without websites\n`);

  if (!stationsWithoutWebsites || stationsWithoutWebsites.length === 0) {
    console.log('No stations need website URLs');
    return;
  }

  // Group by country
  const byCountry: Record<string, any[]> = {};

  for (const station of stationsWithoutWebsites) {
    const location = station.station_locations?.[0];
    const country = location?.cities?.countries?.country_name || 'Unknown';

    if (!byCountry[country]) {
      byCountry[country] = [];
    }
    byCountry[country].push(station);
  }

  console.log('📊 Stations by Country:\n');

  for (const [country, stations] of Object.entries(byCountry)) {
    console.log(`${country}: ${stations.length} stations`);

    // Show first 5 stations in each country
    stations.slice(0, 5).forEach(s => {
      const location = s.station_locations?.[0];
      const city = location?.cities?.city_name || 'Unknown';
      console.log(`  - ${s.station_name} (${city})`);
    });

    if (stations.length > 5) {
      console.log(`  ... and ${stations.length - 5} more`);
    }
    console.log();
  }

  console.log('\n💡 Recommendations:\n');
  console.log('1. For India: Many radio stations have official websites');
  console.log('   Examples:');
  console.log('   - BIG FM: https://www.bigfmindia.com/');
  console.log('   - Radio Mirchi: https://www.radiomirchi.com/');
  console.log('   - Red FM: https://www.redfmindia.in/');
  console.log('   - Radio City: https://www.radiocity.in/');
  console.log();
  console.log('2. Use pattern matching for chain stations:');
  console.log('   - "Radio Mirchi [City]" → https://www.radiomirchi.com/');
  console.log('   - "BIG FM [City]" → https://www.bigfmindia.com/');
  console.log();
  console.log('3. For US stations: Use call sign lookup');
  console.log('   - Pattern: https://[callsign].com or https://[callsign].net');
  console.log();
  console.log('4. Run logo enrichment after populating websites:');
  console.log('   - tsx scripts/enrich-am-fm-logos.ts');
}

findMissingWebsites().catch(console.error);
