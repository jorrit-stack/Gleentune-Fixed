import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface AIRStationData {
  name: string;
  image?: string;
  live_url: string;
  state?: string;
  lang?: string;
}

async function fetchAIRStations(): Promise<AIRStationData[]> {
  console.log('Fetching AIR station data from Akashvani website...');

  const response = await fetch('https://akashvani.gov.in/radio/live.php');
  const html = await response.text();

  const stations: AIRStationData[] = [];

  // Extract all station objects using regex
  const stationPattern = /'(\d+)':\s*\{[^}]*name:\s*'([^']+)'[^}]*live_url:\s*'([^']+)'[^}]*\}/g;

  let match;
  while ((match = stationPattern.exec(html)) !== null) {
    const [, id, name, liveUrl] = match;

    // Extract image URL if present
    const imageMatch = match[0].match(/image:\s*'([^']+)'/);
    const image = imageMatch ? imageMatch[1] : undefined;

    stations.push({
      name: name.trim(),
      live_url: liveUrl.trim(),
      image
    });
  }

  console.log(`Extracted ${stations.length} stations from Akashvani website`);
  return stations;
}

function parseStationInfo(name: string) {
  // Extract city and band type from station name
  // Examples:
  //   "Akashvani Mumbai" -> city: Mumbai, band: FM
  //   "FM Rainbow Delhi" -> city: Delhi, band: FM
  //   "AIR Bangalore" -> city: Bangalore, band: FM
  //   "Vividh Bharati" -> city: null, band: FM

  let city: string | undefined;
  let state: string | undefined;
  let bandType: 'FM' | 'AM' | 'SW' = 'FM';

  // Extract city name
  const cityMatch = name.match(/(?:Akashvani|AIR|FM Rainbow)\s+([A-Za-z\s]+?)(?:\s*$)/i);
  if (cityMatch) {
    city = cityMatch[1].trim();
  }

  // Determine band type (most AIR stations are FM, some are MW/AM)
  if (name.match(/MW|Medium Wave/i)) {
    bandType = 'AM';
  } else if (name.match(/SW|Shortwave/i)) {
    bandType = 'SW';
  }

  return { city, state, bandType };
}

async function importAIRStations() {
  try {
    const stations = await fetchAIRStations();

    console.log('\nSample stations:');
    stations.slice(0, 10).forEach(s => {
      console.log(`  - ${s.name}`);
      console.log(`    URL: ${s.live_url.substring(0, 70)}...`);
    });

    let imported = 0;
    let skipped = 0;
    let errors = 0;

    console.log('\nImporting stations to database...');

    for (const station of stations) {
      try {
        // Check if station already exists
        const { data: existing } = await supabase
          .from('radio_stations')
          .select('id, name')
          .eq('name', station.name)
          .maybeSingle();

        if (existing) {
          skipped++;
          if (skipped % 50 === 0) {
            console.log(`  Skipped ${skipped} existing stations...`);
          }
          continue;
        }

        const { city, state, bandType } = parseStationInfo(station.name);

        const insertData: any = {
          name: station.name,
          band_type: bandType,
          country: 'India',
          country_code: 'IN',
          city,
          state,
          stream_url: station.live_url,
          logo_url: station.image,
          logo_source: station.image ? 'manual' : null,
          tags: [
            'AIR',
            'All India Radio',
            'Akashvani',
            'India'
          ].filter(Boolean),
          homepage: 'https://akashvani.gov.in',
          license_tier: 'safe',
          source: 'akashvani.gov.in'
        };

        if (city) {
          insertData.tags.push(city);
        }

        const table = bandType === 'SW' ? 'shortwave_stations' : 'radio_stations';

        if (bandType === 'SW') {
          insertData.broadcaster = 'All India Radio';
          insertData.target_area = 'India';
        }

        const { error } = await supabase
          .from(table)
          .insert(insertData);

        if (error) {
          console.error(`Error importing ${station.name}:`, error.message);
          errors++;
        } else {
          imported++;
          if (imported % 50 === 0) {
            console.log(`  Imported ${imported} stations...`);
          }
        }
      } catch (err) {
        console.error(`Error processing ${station.name}:`, err);
        errors++;
      }
    }

    console.log('\n=== Import Summary ===');
    console.log(`Total stations found: ${stations.length}`);
    console.log(`Imported: ${imported}`);
    console.log(`Skipped (already exist): ${skipped}`);
    console.log(`Errors: ${errors}`);

    // Show some examples
    console.log('\n=== Sample Imported Stations ===');
    const { data: samples } = await supabase
      .from('radio_stations')
      .select('name, city, stream_url')
      .ilike('name', '%Akashvani%')
      .limit(10);

    samples?.forEach(s => {
      console.log(`  ${s.name} (${s.city || 'N/A'})`);
    });

  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

importAIRStations();
