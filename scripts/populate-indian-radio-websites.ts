import { config } from 'dotenv';
import { supabase } from '../scripts/lib/supabase-node';

config();

// Common Indian radio station chains and their websites
const INDIAN_RADIO_CHAINS: Record<string, string> = {
  'big fm': 'https://www.bigfmindia.com/',
  'radio mirchi': 'https://www.radiomirchi.com/',
  'red fm': 'https://www.redfmindia.in/',
  'radio city': 'https://www.radiocity.in/',
  'fever fm': 'https://www.fever104.fm/',
  'radio one': 'https://www.radiooneindia.in/',
  'radio indigo': 'https://www.91.9indigofm.com/',
  'aap ki awaaz': 'https://www.aapkiawaaz.com/',
  'radio gyan vani': 'http://www.gyanvani.ac.in/',
  'vividh bharati': 'https://prasarbharati.gov.in/',
  'akashvani': 'https://prasarbharati.gov.in/',
  'rainbow': 'https://prasarbharati.gov.in/',
  'suryan fm': 'https://www.suryanfm.in/',
  'hello fm': 'https://www.hellofm.in/',
  'my fm': 'https://www.myfmindia.in/',
  'club fm': 'https://www.clubfmindia.com/',
  'radio dhamaal': 'https://www.dhamaalfm.com/',
  'gyan vani': 'http://www.gyanvani.ac.in/',
  'amruthavarshini': 'https://prasarbharati.gov.in/'
};

async function populateIndianRadioWebsites() {
  console.log('🇮🇳 Populating Website URLs for Indian Radio Stations\n');

  let totalUpdated = 0;

  for (const [pattern, website] of Object.entries(INDIAN_RADIO_CHAINS)) {
    console.log(`\n📻 Processing "${pattern}" stations...`);

    // Find stations in radio_stations table (legacy)
    const { data: legacyStations } = await supabase
      .from('radio_stations')
      .select('id, name, city, country')
      .ilike('name', `%${pattern}%`)
      .eq('country', 'India')
      .or('homepage.is.null,homepage.eq.');

    if (legacyStations && legacyStations.length > 0) {
      console.log(`   Found ${legacyStations.length} legacy stations`);

      for (const station of legacyStations) {
        const { error } = await supabase
          .from('radio_stations')
          .update({ homepage: website })
          .eq('id', station.id);

        if (!error) {
          console.log(`   ✅ Updated: ${station.name} (${station.city})`);
          totalUpdated++;
        }
      }
    }

    // Find stations in stations table (proper schema)
    const { data: properStations } = await supabase
      .from('stations')
      .select(`
        station_id,
        station_name,
        website_url,
        station_locations!inner(
          cities!inner(city_name, countries!inner(country_name))
        )
      `)
      .ilike('station_name', `%${pattern}%`)
      .or('website_url.is.null,website_url.eq.');

    if (properStations && properStations.length > 0) {
      // Filter for India
      const indianStations = properStations.filter(s =>
        s.station_locations?.[0]?.cities?.countries?.country_name === 'India'
      );

      if (indianStations.length > 0) {
        console.log(`   Found ${indianStations.length} stations in stations table`);

        for (const station of indianStations) {
          const city = station.station_locations?.[0]?.cities?.city_name || '';

          const { error } = await supabase
            .from('stations')
            .update({ website_url: website })
            .eq('station_id', station.station_id);

          if (!error) {
            console.log(`   ✅ Updated: ${station.station_name} (${city})`);
            totalUpdated++;
          }
        }
      }
    }
  }

  console.log(`\n\n✅ Website population complete!`);
  console.log(`📊 Total stations updated: ${totalUpdated}`);
  console.log(`\n💡 Next step: Run logo enrichment`);
  console.log(`   npx tsx scripts/enrich-am-fm-logos.ts`);
}

populateIndianRadioWebsites().catch(console.error);
