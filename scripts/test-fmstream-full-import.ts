import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface StationImport {
  station_name: string;
  city?: string;
  state?: string;
  country: string;
  frequencies_am?: string[];
  frequencies_fm?: string[];
  stream_url?: string;
  website?: string;
  broadcaster?: string;
  genre?: string[];
  slogan?: string;
  description?: string;
  codec?: string;
  bitrate?: number;
  source: string;
  raw_data?: any;
}

async function fetchAllIndianStations() {
  console.log('Fetching all Indian stations from fmstream.org...\n');

  const pages = ['0', 'top', 'sma'];
  const allStations: StationImport[] = [];

  for (const page of pages) {
    console.log(`Fetching page: ${page}`);
    try {
      const response = await fetch(`https://fmstream.org/index.php?c=IND&o=${page}`);
      const html = await response.text();

      const stations = parseStations(html);
      allStations.push(...stations);
      console.log(`  Found ${stations.length} stations`);

      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(`Error fetching page ${page}:`, error);
    }
  }

  return allStations;
}

function parseStations(html: string): StationImport[] {
  const stations: StationImport[] = [];

  const stationBlocks = html.match(/<div class="stnblock">[\s\S]*?(?=<div class="stnblock">|<\/body>)/g);
  if (!stationBlocks) {
    console.log('No station blocks found');
    return stations;
  }

  console.log(`  Parsing ${stationBlocks.length} station blocks...`);

  for (const block of stationBlocks) {
    try {
      const nameMatch = block.match(/<h3 class="stn">(.*?)<\/h3>/);
      if (!nameMatch) continue;

      const name = nameMatch[1].replace(/🇮🇳/g, '').trim();

      const locMatch = block.match(/<span class="loc">(.*?)<\/span>/);
      const location = locMatch ? locMatch[1].trim() : undefined;

      let city: string | undefined;
      let state: string | undefined;
      if (location) {
        const parts = location.split(',').map(s => s.trim());
        city = parts[0];
        state = parts[1];
      }

      const freqMatches = block.match(/<span class="frq">(.*?)<\/span>/g);
      const frequencies_am: string[] = [];
      const frequencies_fm: string[] = [];

      if (freqMatches) {
        for (const freqMatch of freqMatches) {
          const text = freqMatch.replace(/<[^>]+>/g, '').trim();
          if (text.includes('AM')) {
            const amFreqs = text.replace('AM', '').trim().split(/\s+/);
            frequencies_am.push(...amFreqs);
          }
          if (text.includes('FM')) {
            const fmFreqs = text.replace('FM', '').trim().split(/\s+/);
            frequencies_fm.push(...fmFreqs);
          }
        }
      }

      const websiteMatch = block.match(/<a[^>]*href="([^"]+)"[^>]*class="hp"/);
      const website = websiteMatch ? websiteMatch[1] : undefined;

      const braMatch = block.match(/<span class="bra">(.*?)<\/span>/);
      const broadcaster = braMatch ? braMatch[1].replace(/<[^>]+>/g, '').trim() : undefined;

      const sloMatch = block.match(/<span class="slo">(.*?)<\/span>/);
      const slogan = sloMatch ? sloMatch[1].replace(/<[^>]+>/g, '').trim() : undefined;

      const descMatch = block.match(/<span class="desc">(.*?)<\/span>/);
      const description = descMatch ? descMatch[1].replace(/<[^>]+>/g, '').trim() : undefined;

      const genreMatches = block.match(/<span class="sty">(.*?)<\/span>/g);
      const genre: string[] = [];
      if (genreMatches) {
        for (const genreMatch of genreMatches) {
          const text = genreMatch.replace(/<[^>]+>/g, '').trim();
          if (text) genre.push(text);
        }
      }

      stations.push({
        station_name: name,
        city,
        state,
        country: 'India',
        frequencies_am: frequencies_am.length > 0 ? frequencies_am : undefined,
        frequencies_fm: frequencies_fm.length > 0 ? frequencies_fm : undefined,
        website,
        broadcaster,
        genre: genre.length > 0 ? genre : undefined,
        slogan,
        description,
        source: 'fmstream.org',
        raw_data: {
          location,
          frequencies_am,
          frequencies_fm,
          has_streams: block.includes('var data')
        }
      });
    } catch (error) {
      console.error('Error parsing station block:', error);
    }
  }

  return stations;
}

async function extractStreamUrls(html: string): Promise<Map<number, string[]>> {
  const streamMap = new Map<number, string[]>();

  const dataMatch = html.match(/var data=(\[\[[\s\S]*?\]\]);/);
  if (!dataMatch) return streamMap;

  const dataText = dataMatch[1];
  const streamMatches = dataText.matchAll(/\['([^']+\.(m3u8|mp3|aac|pls))[^']*'/g);

  let index = 0;
  for (const match of streamMatches) {
    const url = match[1];
    if (!streamMap.has(index)) {
      streamMap.set(index, []);
    }
    streamMap.get(index)!.push(url.startsWith('http') ? url : `https://${url}`);
    index++;
  }

  return streamMap;
}

async function enrichWithStreams(stations: StationImport[]) {
  console.log('\nEnriching with stream URLs...');

  for (const page of ['0', 'top', 'sma']) {
    try {
      const response = await fetch(`https://fmstream.org/index.php?c=IND&o=${page}`);
      const html = await response.text();
      const streamMap = await extractStreamUrls(html);

      console.log(`  Page ${page}: Found ${streamMap.size} stream entries`);

      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(`Error fetching streams for page ${page}:`, error);
    }
  }
}

async function insertStations(stations: StationImport[]) {
  console.log(`\nInserting ${stations.length} stations into test_station_import...`);

  const batchSize = 100;
  let inserted = 0;
  let errors = 0;

  for (let i = 0; i < stations.length; i += batchSize) {
    const batch = stations.slice(i, i + batchSize);

    const { data, error } = await supabase
      .from('test_station_import')
      .insert(batch)
      .select();

    if (error) {
      console.error(`Error inserting batch ${i / batchSize + 1}:`, error.message);
      errors += batch.length;
    } else {
      inserted += data?.length || 0;
    }
  }

  console.log(`✓ Inserted ${inserted} stations`);
  if (errors > 0) {
    console.log(`✗ Failed to insert ${errors} stations`);
  }
}

async function generateReport() {
  console.log('\n=== Import Summary ===\n');

  const { data: total } = await supabase
    .from('test_station_import')
    .select('id', { count: 'exact', head: true });

  console.log(`Total stations imported: ${total?.length || 0}`);

  const { data: withFM } = await supabase
    .from('test_station_import')
    .select('id')
    .not('frequencies_fm', 'is', null);

  console.log(`Stations with FM frequencies: ${withFM?.length || 0}`);

  const { data: withAM } = await supabase
    .from('test_station_import')
    .select('id')
    .not('frequencies_am', 'is', null);

  console.log(`Stations with AM frequencies: ${withAM?.length || 0}`);

  const { data: withStream } = await supabase
    .from('test_station_import')
    .select('id')
    .not('stream_url', 'is', null);

  console.log(`Stations with stream URL: ${withStream?.length || 0}`);

  const { data: withWebsite } = await supabase
    .from('test_station_import')
    .select('id')
    .not('website', 'is', null);

  console.log(`Stations with website: ${withWebsite?.length || 0}`);

  const { data: withBroadcaster } = await supabase
    .from('test_station_import')
    .select('id')
    .not('broadcaster', 'is', null);

  console.log(`Stations with broadcaster: ${withBroadcaster?.length || 0}`);

  const { data: withGenre } = await supabase
    .from('test_station_import')
    .select('id')
    .not('genre', 'is', null);

  console.log(`Stations with genre: ${withGenre?.length || 0}`);

  const { data: byCity } = await supabase
    .from('test_station_import')
    .select('city')
    .not('city', 'is', null);

  const uniqueCities = new Set(byCity?.map(r => r.city) || []);
  console.log(`Unique cities: ${uniqueCities.size}`);

  console.log('\n--- Sample Stations ---\n');
  const { data: samples } = await supabase
    .from('test_station_import')
    .select('station_name, city, frequencies_fm, website, broadcaster')
    .limit(5);

  samples?.forEach(s => {
    console.log(`${s.station_name} - ${s.city || 'N/A'}`);
    console.log(`  FM: ${s.frequencies_fm?.join(', ') || 'N/A'}`);
    console.log(`  Website: ${s.website || 'N/A'}`);
    console.log(`  Broadcaster: ${s.broadcaster || 'N/A'}\n`);
  });
}

async function main() {
  console.log('=== FMStream.org Full Import Test ===\n');

  try {
    console.log('Clearing existing test data...');
    await supabase.from('test_station_import').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    const stations = await fetchAllIndianStations();

    if (stations.length === 0) {
      console.log('No stations found to import');
      return;
    }

    console.log(`\nTotal stations collected: ${stations.length}`);

    await insertStations(stations);
    await generateReport();

    console.log('\n✓ Import complete!');
  } catch (error) {
    console.error('Import failed:', error);
    process.exit(1);
  }
}

main();
