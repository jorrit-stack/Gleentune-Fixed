import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface AIRStation {
  station_name: string;
  city?: string;
  state?: string;
  country: string;
  frequencies_fm?: string[];
  stream_url?: string;
  website?: string;
  broadcaster: string;
  genre?: string[];
  slogan?: string;
  description?: string;
  source: string;
  raw_data?: any;
}

async function fetchAIRStationsFromAkashvani() {
  console.log('Fetching All India Radio stations from akashvani.gov.in...\n');

  const response = await fetch('https://akashvani.gov.in/radio/live.php');
  const html = await response.text();

  const stations: AIRStation[] = [];

  const stationPattern = /'(\d+)':\s*\{[^}]*name:\s*'([^']+)'[^}]*live_url:\s*'([^']+)'[^}]*\}/g;

  let match;
  while ((match = stationPattern.exec(html)) !== null) {
    const [fullMatch, id, name, liveUrl] = match;

    const imageMatch = fullMatch.match(/image:\s*'([^']+)'/);
    const image = imageMatch ? imageMatch[1] : undefined;

    const langMatch = fullMatch.match(/lang:\s*'([^']+)'/);
    const languages = langMatch ? langMatch[1].split(',').map(l => l.trim()) : [];

    const stateMatch = fullMatch.match(/state:\s*'([^']+)'/);
    const state = stateMatch ? stateMatch[1].trim() : undefined;

    const cityMatch = name.match(/(?:Akashvani|AIR|FM Rainbow|FM Gold)\s+([A-Za-z\s]+?)(?:\s*$|$)/i);
    const city = cityMatch ? cityMatch[1].trim() : undefined;

    stations.push({
      station_name: name.trim(),
      city,
      state,
      country: 'India',
      stream_url: liveUrl.trim(),
      website: 'https://akashvani.gov.in',
      broadcaster: 'All India Radio',
      genre: languages.length > 0 ? languages : ['Public Radio'],
      slogan: 'Bahujan Hitaya Bahujan Sukhaya',
      description: `All India Radio station${city ? ` in ${city}` : ''}${languages.length > 0 ? ` broadcasting in ${languages.join(', ')}` : ''}`,
      source: 'akashvani.gov.in',
      raw_data: {
        id,
        image,
        languages,
        state
      }
    });
  }

  console.log(`Found ${stations.length} stations from akashvani.gov.in\n`);
  return stations;
}

async function insertStations(stations: AIRStation[]) {
  console.log(`Inserting ${stations.length} stations into test_station_import...\n`);

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
      console.error(`Error inserting batch ${Math.floor(i / batchSize) + 1}:`, error.message);
      errors += batch.length;
    } else {
      inserted += data?.length || 0;
      console.log(`  Batch ${Math.floor(i / batchSize) + 1}: Inserted ${data?.length || 0} stations`);
    }
  }

  console.log(`\n✓ Inserted ${inserted} stations`);
  if (errors > 0) {
    console.log(`✗ Failed to insert ${errors} stations`);
  }
}

async function generateReport() {
  console.log('\n=== Import Summary ===\n');

  const { count: total } = await supabase
    .from('test_station_import')
    .select('*', { count: 'exact', head: true });

  console.log(`Total stations in test table: ${total || 0}`);

  const { count: airTotal } = await supabase
    .from('test_station_import')
    .select('*', { count: 'exact', head: true })
    .eq('broadcaster', 'All India Radio');

  console.log(`AIR stations: ${airTotal || 0}`);

  const { data: bySource } = await supabase
    .from('test_station_import')
    .select('source')
    .eq('broadcaster', 'All India Radio');

  const sourceCounts: Record<string, number> = {};
  bySource?.forEach(row => {
    sourceCounts[row.source] = (sourceCounts[row.source] || 0) + 1;
  });

  console.log('\nAIR stations by source:');
  Object.entries(sourceCounts).forEach(([source, count]) => {
    console.log(`  ${source}: ${count}`);
  });

  const { data: withStream } = await supabase
    .from('test_station_import')
    .select('id')
    .eq('broadcaster', 'All India Radio')
    .not('stream_url', 'is', null);

  console.log(`\nAIR stations with stream URL: ${withStream?.length || 0}`);

  const { data: byState } = await supabase
    .from('test_station_import')
    .select('state')
    .eq('broadcaster', 'All India Radio')
    .not('state', 'is', null);

  const uniqueStates = new Set(byState?.map(r => r.state) || []);
  console.log(`Unique states covered: ${uniqueStates.size}`);

  const { data: byLanguage } = await supabase
    .from('test_station_import')
    .select('genre')
    .eq('broadcaster', 'All India Radio')
    .not('genre', 'is', null);

  const allLanguages = new Set<string>();
  byLanguage?.forEach(row => {
    row.genre?.forEach((lang: string) => allLanguages.add(lang));
  });
  console.log(`Languages covered: ${allLanguages.size}`);

  console.log('\n--- Sample AIR Stations ---\n');
  const { data: samples } = await supabase
    .from('test_station_import')
    .select('station_name, city, state, genre, stream_url, source')
    .eq('broadcaster', 'All India Radio')
    .limit(15);

  samples?.forEach(s => {
    console.log(`${s.station_name}`);
    if (s.city || s.state) {
      console.log(`  Location: ${[s.city, s.state].filter(Boolean).join(', ')}`);
    }
    if (s.genre && s.genre.length > 0) {
      console.log(`  Languages: ${s.genre.join(', ')}`);
    }
    console.log(`  Stream: ${s.stream_url ? '✓ ' + s.stream_url.substring(0, 50) + '...' : '✗'}\n`);
  });

  console.log('\n--- States Covered ---\n');
  console.log([...uniqueStates].sort().join(', '));

  console.log('\n--- Languages Covered ---\n');
  console.log([...allLanguages].sort().join(', '));
}

async function main() {
  console.log('=== All India Radio Akashvani Import ===\n');

  try {
    console.log('Clearing existing AIR test data...');
    const { error: deleteError } = await supabase
      .from('test_station_import')
      .delete()
      .eq('broadcaster', 'All India Radio');

    if (deleteError) {
      console.error('Error clearing data:', deleteError.message);
    } else {
      console.log('✓ Cleared existing data\n');
    }

    const stations = await fetchAIRStationsFromAkashvani();

    if (stations.length === 0) {
      console.log('No stations found to import');
      return;
    }

    console.log(`Total AIR stations collected: ${stations.length}\n`);

    await insertStations(stations);
    await generateReport();

    console.log('\n✓ Import complete!');
  } catch (error) {
    console.error('Import failed:', error);
    process.exit(1);
  }
}

main();
