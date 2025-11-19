import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface AIRStation {
  name: string;
  state: string;
  language: string;
  streamUrl: string;
  city?: string;
  frequency?: string;
  bandType: 'FM' | 'AM' | 'SW';
}

async function fetchAIRStations(): Promise<AIRStation[]> {
  console.log('Fetching AIR station data from Akashvani website...');

  const response = await fetch('https://akashvani.gov.in/radio/live.php');
  const html = await response.text();

  const stations: AIRStation[] = [];

  // Extract station data using regex patterns
  const stationBlocks = html.match(/<div class="selectchannel"[^>]*>[\s\S]*?<\/div>\s*<\/div>/g) || [];

  let currentState = 'NATIONAL';
  const stateMatches = html.match(/<p[^>]*class="state-name"[^>]*>————([^—]+)————<\/p>/g) || [];

  for (const block of stationBlocks) {
    // Update state if we find a state marker before this block
    const stateMatch = block.match(/state-name[^>]*>————([^—]+)————/);
    if (stateMatch) {
      currentState = stateMatch[1].trim();
    }

    // Extract station name
    const nameMatch = block.match(/<img[^>]*alt="([^"]+)"/);
    const name = nameMatch ? nameMatch[1].trim() : '';

    // Extract state
    const stateTextMatch = block.match(/<p class="channel-state">([^<]+)<\/p>/);
    const state = stateTextMatch ? stateTextMatch[1].trim() : currentState;

    // Extract language
    const langMatch = block.match(/<p class="channel-language">([^<]+)<\/p>/);
    const language = langMatch ? langMatch[1].trim() : 'Hindi';

    // Extract stream URL
    const urlMatch = block.match(/https:\/\/[^"']+\.m3u8/);
    const streamUrl = urlMatch ? urlMatch[0] : '';

    if (name && streamUrl) {
      // Determine band type and extract frequency if available
      let bandType: 'FM' | 'AM' | 'SW' = 'FM';
      let frequency: string | undefined;
      let city: string | undefined;

      // Parse station name for city and frequency
      // Examples: "Akashvani Mumbai FM Rainbow", "AIR Delhi", "Vividh Bharati"
      const cityMatch = name.match(/(?:Akashvani|AIR)\s+([A-Za-z\s]+?)(?:\s+FM|\s+MW|\s+SW|$)/i);
      if (cityMatch) {
        city = cityMatch[1].trim();
      }

      // Check for FM/MW/SW indicators
      if (name.match(/FM|Rainbow/i)) {
        bandType = 'FM';
      } else if (name.match(/MW|Medium Wave/i)) {
        bandType = 'AM';
      } else if (name.match(/SW|Short ?Wave/i)) {
        bandType = 'SW';
      }

      stations.push({
        name,
        state,
        language,
        streamUrl,
        city,
        frequency,
        bandType
      });
    }
  }

  console.log(`Extracted ${stations.length} stations from Akashvani website`);
  return stations;
}

async function importAIRStations() {
  try {
    const stations = await fetchAIRStations();

    console.log('\nSample stations:');
    stations.slice(0, 5).forEach(s => {
      console.log(`  - ${s.name} (${s.state}) - ${s.language} - ${s.streamUrl.substring(0, 50)}...`);
    });

    let imported = 0;
    let skipped = 0;
    let errors = 0;

    console.log('\nImporting stations to database...');

    for (const station of stations) {
      try {
        // Check if station already exists by name
        const { data: existing } = await supabase
          .from('radio_stations')
          .select('id')
          .eq('name', station.name)
          .maybeSingle();

        if (existing) {
          skipped++;
          continue;
        }

        // Determine table based on band type
        const table = station.bandType === 'SW' ? 'shortwave_stations' : 'radio_stations';

        const insertData: any = {
          name: station.name,
          band_type: station.bandType,
          state: station.state,
          city: station.city,
          stream_url: station.streamUrl,
          tags: [
            'AIR',
            'All India Radio',
            'Akashvani',
            ...station.language.split(',').map(l => l.trim()),
            station.state
          ].filter(Boolean),
          language: station.language,
          website: 'https://akashvani.gov.in',
          logo_source: 'government',
          license_tier: 'free'
        };

        if (station.bandType === 'SW') {
          insertData.broadcaster = 'All India Radio';
          insertData.target_area = station.state === 'NATIONAL' ? 'India' : station.state;
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

    // Show breakdown by state
    console.log('\n=== Stations by State ===');
    const byState = stations.reduce((acc, s) => {
      acc[s.state] = (acc[s.state] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    Object.entries(byState)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .forEach(([state, count]) => {
        console.log(`  ${state}: ${count}`);
      });

  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

importAIRStations();
