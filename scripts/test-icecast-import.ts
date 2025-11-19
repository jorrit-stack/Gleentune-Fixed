import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface IcecastStation {
  station_name: string;
  city?: string;
  state?: string;
  country?: string;
  frequency?: number;
  frequency_mhz?: string;
  transmitter_power_kw?: number;
  stream_url?: string;
  source: string;
  raw_data?: any;
}

async function fetchFMStreamOrg() {
  console.log('Fetching from fmstream.org...');

  const response = await fetch('https://fmstream.org/index.php?c=IND&o=top');
  const html = await response.text();

  const stations: IcecastStation[] = [];

  const dataMatch = html.match(/var data=(\[\[[\s\S]*?\]\]);/);
  if (!dataMatch) {
    console.log('Could not find data array in page');
    return stations;
  }

  const stationNamesMatch = html.match(/<h3 class="stn">(.*?)<\/h3>/g);
  const cityMatch = html.match(/<span class="loc">(.*?)<\/span>/g);
  const freqMatch = html.match(/<span class="frq">(.*?)<\/span>/g);

  if (!stationNamesMatch) {
    console.log('Could not find station names');
    return stations;
  }

  const streamUrls: string[] = [];
  const dataText = dataMatch[1];
  const urlMatches = dataText.matchAll(/\['([^']+\.(m3u8|mp3|aac|pls|stream)[^']*)'/g);
  for (const match of urlMatches) {
    streamUrls.push(match[1]);
  }

  for (let i = 0; i < stationNamesMatch.length; i++) {
    const name = stationNamesMatch[i].replace(/<[^>]+>/g, '').replace(/🇮🇳/g, '').trim();
    const city = cityMatch?.[i]?.replace(/<[^>]+>/g, '').trim();
    const freqTexts = [];

    let freqIdx = i;
    while (freqMatch && freqMatch[freqIdx]) {
      const text = freqMatch[freqIdx].replace(/<[^>]+>/g, '').trim();
      if (text.includes('FM')) {
        freqTexts.push(text);
      }
      freqIdx++;
      if (freqIdx >= freqMatch.length || !freqMatch[freqIdx].includes('class="frq"')) break;
    }

    const freqText = freqTexts.find(t => t.includes('FM'));
    const freqNumbers = freqText?.match(/FM\s+([\d.]+)/);
    const frequency = freqNumbers ? parseFloat(freqNumbers[1]) : undefined;

    let streamUrl = streamUrls[i];
    if (streamUrl && !streamUrl.startsWith('http')) {
      streamUrl = 'https://' + streamUrl;
    }

    if (name && (frequency || streamUrl)) {
      stations.push({
        station_name: name,
        city,
        country: 'India',
        frequency,
        frequency_mhz: freqText,
        stream_url: streamUrl,
        source: 'fmstream.org',
        raw_data: { freqTexts }
      });
    }
  }

  console.log(`Found ${stations.length} stations from fmstream.org`);
  return stations;
}

async function fetchRCastNet() {
  console.log('Fetching from rcast.net...');

  const stations: IcecastStation[] = [];

  for (let page = 1; page <= 3; page++) {
    const response = await fetch(`https://www.rcast.net/dir/india/page${page}`);
    const html = await response.text();

    const stationRegex = /<tr class="station-row"[^>]*>([\s\S]*?)<\/tr>/gi;
    const nameRegex = /<td[^>]*class="[^"]*station-name[^"]*"[^>]*>(.*?)<\/td>/i;
    const urlRegex = /<a[^>]*href="([^"]+\.m3u|[^"]+\.pls|[^"]+stream[^"]+)"/i;

    let match;
    while ((match = stationRegex.exec(html)) !== null) {
      const stationHtml = match[1];

      const nameMatch = nameRegex.exec(stationHtml);
      const urlMatch = urlRegex.exec(stationHtml);

      if (nameMatch) {
        const name = nameMatch[1].replace(/<[^>]+>/g, '').trim();
        const url = urlMatch ? urlMatch[1].trim() : undefined;

        if (name.toLowerCase().includes('india')) {
          stations.push({
            station_name: name,
            country: 'India',
            stream_url: url,
            source: 'rcast.net',
            raw_data: { html: stationHtml }
          });
        }
      }
    }

    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log(`Found ${stations.length} stations from rcast.net`);
  return stations;
}

async function fetchAsiaWavesNet() {
  console.log('Fetching from asiawaves.net...');

  const response = await fetch('https://www.asiawaves.net/india-fm-radio.htm');
  const html = await response.text();

  const stations: IcecastStation[] = [];

  const tableRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;

  let match;
  while ((match = tableRegex.exec(html)) !== null) {
    const rowHtml = match[1];

    if (rowHtml.includes('<th')) continue;

    const cells = rowHtml.match(/<td[^>]*>([\s\S]*?)<\/td>/gi);
    if (!cells || cells.length < 5) continue;

    const extractText = (html: string) => html.replace(/<[^>]+>/g, '').trim();

    const freqText = extractText(cells[0]);
    const powerText = extractText(cells[1]);
    const state = extractText(cells[2]);
    const location = extractText(cells[3]);
    const stationName = extractText(cells[4]);
    const notes = cells[5] ? extractText(cells[5]) : '';

    const freqMatch = freqText.match(/(\d+\.\d+)/);
    if (!freqMatch) continue;

    const frequency = parseFloat(freqMatch[1]);
    if (frequency < 87 || frequency > 108) continue;

    const powerMatch = powerText.match(/([\d.]+)/);
    const power = powerMatch ? parseFloat(powerMatch[1]) : undefined;

    const fullName = notes ? `${stationName} ${notes}` : stationName;

    stations.push({
      station_name: fullName || `${location} FM`,
      city: location,
      state,
      country: 'India',
      frequency,
      frequency_mhz: `${frequency} MHz`,
      transmitter_power_kw: power,
      source: 'asiawaves.net',
      raw_data: {
        frequency: freqText,
        power: powerText,
        state,
        location,
        station: stationName,
        notes
      }
    });
  }

  console.log(`Found ${stations.length} stations from asiawaves.net`);
  return stations;
}

async function insertStations(stations: IcecastStation[]) {
  console.log(`\nInserting ${stations.length} stations into temp_icecast_stations...`);

  const batchSize = 100;
  let inserted = 0;
  let errors = 0;

  for (let i = 0; i < stations.length; i += batchSize) {
    const batch = stations.slice(i, i + batchSize);

    const { data, error } = await supabase
      .from('temp_icecast_stations')
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

  const { data: bySource } = await supabase
    .from('temp_icecast_stations')
    .select('source, station_name')
    .order('source');

  if (bySource) {
    const sourceCounts = bySource.reduce((acc, row) => {
      acc[row.source] = (acc[row.source] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log('Stations by source:');
    Object.entries(sourceCounts).forEach(([source, count]) => {
      console.log(`  ${source}: ${count}`);
    });
  }

  const { data: withFreq } = await supabase
    .from('temp_icecast_stations')
    .select('id')
    .not('frequency', 'is', null);

  console.log(`\nStations with frequency: ${withFreq?.length || 0}`);

  const { data: withStream } = await supabase
    .from('temp_icecast_stations')
    .select('id')
    .not('stream_url', 'is', null);

  console.log(`Stations with stream URL: ${withStream?.length || 0}`);

  const { data: withCity } = await supabase
    .from('temp_icecast_stations')
    .select('id')
    .not('city', 'is', null);

  console.log(`Stations with city: ${withCity?.length || 0}`);
}

async function main() {
  console.log('Starting Icecast test import...\n');

  try {
    console.log('Clearing existing temp data...');
    await supabase.from('temp_icecast_stations').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    const allStations: IcecastStation[] = [];

    try {
      const fmStreamStations = await fetchFMStreamOrg();
      allStations.push(...fmStreamStations);
    } catch (error) {
      console.error('Error fetching from fmstream.org:', error);
    }

    await new Promise(resolve => setTimeout(resolve, 2000));

    try {
      const rcastStations = await fetchRCastNet();
      allStations.push(...rcastStations);
    } catch (error) {
      console.error('Error fetching from rcast.net:', error);
    }

    await new Promise(resolve => setTimeout(resolve, 2000));

    try {
      const asiawavesStations = await fetchAsiaWavesNet();
      allStations.push(...asiawavesStations);
    } catch (error) {
      console.error('Error fetching from asiawaves.net:', error);
    }

    if (allStations.length > 0) {
      await insertStations(allStations);
      await generateReport();
    } else {
      console.log('No stations found to import');
    }

    console.log('\n✓ Import complete!');
  } catch (error) {
    console.error('Import failed:', error);
    process.exit(1);
  }
}

main();
