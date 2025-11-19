import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lokoaovrcslqlazxedhx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxva29hb3ZyY3NscWxhenhlZGh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3NTk0MzAsImV4cCI6MjA3NzMzNTQzMH0.rdRUkHWqtlMblbS2jt2AN1izyV1k8EcN6Mmwiywe5hc';

const supabase = createClient(supabaseUrl, supabaseKey);

interface RawStation {
  name: string;
  frequencyMhz?: number;
  frequencyKhz?: number;
  latitude?: number;
  longitude?: number;
  country?: string;
  countryCode?: string;
  language?: string;
  tags?: string;
  homepage?: string;
  favicon?: string;
  url?: string;
  owner?: string;
  power?: number;
  callSign?: string;
  city?: string;
  source: {
    name: string;
    url: string;
    license: string;
  };
}

interface ImportResult {
  imported: number;
  skipped: number;
  duplicates: number;
  errors: string[];
}

// Haversine distance formula to find nearest city
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

async function findNearestCity(
  lat: number,
  lon: number,
  maxDistanceKm: number = 50
): Promise<string | null> {
  const { data: cities } = await supabase
    .from('cities')
    .select('city_id, latitude, longitude')
    .gte('latitude', lat - 0.5)
    .lte('latitude', lat + 0.5)
    .gte('longitude', lon - 0.5)
    .lte('longitude', lon + 0.5);

  if (!cities || cities.length === 0) return null;

  let nearestCity = null;
  let minDistance = maxDistanceKm;

  for (const city of cities) {
    const distance = calculateDistance(
      lat,
      lon,
      Number(city.latitude),
      Number(city.longitude)
    );
    if (distance < minDistance) {
      minDistance = distance;
      nearestCity = city.city_id;
    }
  }

  return nearestCity;
}

async function getFmBandId(): Promise<string> {
  const { data } = await supabase
    .from('bands')
    .select('band_id')
    .eq('band_name', 'FM')
    .single();

  if (!data) {
    throw new Error('FM band not found in database');
  }

  return data.band_id;
}

async function checkDuplicate(
  frequencyKhz: number,
  cityId: string | null,
  bandId: string
): Promise<boolean> {
  if (!cityId) return false;

  const { data } = await supabase
    .from('stations')
    .select('station_id, station_locations(city_id)')
    .eq('frequency_khz', frequencyKhz)
    .eq('band_id', bandId);

  if (!data || data.length === 0) return false;

  for (const station of data) {
    const locations = station.station_locations as any[];
    if (locations && locations.some((l: any) => l.city_id === cityId)) {
      return true;
    }
  }

  return false;
}

async function importStation(
  station: RawStation,
  bandId: string,
  result: ImportResult
): Promise<void> {
  try {
    const frequencyKhz = station.frequencyKhz || (station.frequencyMhz ? station.frequencyMhz * 1000 : null);

    if (!frequencyKhz || frequencyKhz < 88000 || frequencyKhz > 108000) {
      result.skipped++;
      return;
    }

    let cityId: string | null = null;
    if (station.latitude && station.longitude) {
      cityId = await findNearestCity(station.latitude, station.longitude, 50);
    }

    const isDuplicate = await checkDuplicate(frequencyKhz, cityId, bandId);
    if (isDuplicate) {
      result.duplicates++;
      return;
    }

    const { data: stationData, error: stationError } = await supabase
      .from('stations')
      .insert({
        station_name: station.name,
        call_sign: station.callSign || null,
        band_id: bandId,
        frequency_khz: frequencyKhz,
        modulation_type: 'FM',
        power_kw: station.power || null,
        language: station.language || null,
        content_type: station.tags || null,
        owner: station.owner || null,
        status: 'Active',
        stream_url: station.url || station.homepage || null,
      })
      .select('station_id')
      .single();

    if (stationError) {
      throw stationError;
    }

    const stationId = stationData.station_id;

    if (cityId && station.latitude && station.longitude) {
      await supabase.from('station_locations').insert({
        station_id: stationId,
        city_id: cityId,
        transmitter_lat: station.latitude,
        transmitter_long: station.longitude,
      });
    }

    await supabase.from('station_sources').insert({
      station_id: stationId,
      source_name: station.source.name,
      url: station.source.url,
      license: station.source.license,
      last_updated: new Date().toISOString().split('T')[0],
    });

    result.imported++;
  } catch (error: any) {
    result.skipped++;
    const errorMsg = error?.message || JSON.stringify(error);
    result.errors.push(`Error importing ${station.name}: ${errorMsg}`);
  }
}

function extractFmFrequency(name: string, tags: string): number | null {
  const combined = `${name} ${tags}`.toLowerCase();

  const patterns = [
    /(\d{2,3}\.\d{1,2})\s*fm/,
    /fm\s*(\d{2,3}\.\d{1,2})/,
    /(\d{2,3}\.\d{1,2})\s*mhz/,
  ];

  for (const pattern of patterns) {
    const match = combined.match(pattern);
    if (match) {
      const freq = parseFloat(match[1]);
      if (freq >= 88.0 && freq <= 108.0) {
        return freq;
      }
    }
  }

  return null;
}

async function fetchFromRadioBrowser(limit: number = 1000): Promise<RawStation[]> {
  console.log('Fetching FM stations from RadioBrowser API...');

  try {
    const response = await fetch(
      `https://de1.api.radio-browser.info/json/stations/search?tag=fm&limit=${limit}&has_geo_info=true&order=clickcount&reverse=true`
    );

    if (!response.ok) {
      throw new Error(`RadioBrowser API error: ${response.status}`);
    }

    const data = await response.json();

    return data.map((station: any) => {
      const frequencyMhz = extractFmFrequency(station.name, station.tags || '');

      return {
        name: station.name,
        frequencyMhz,
        frequencyKhz: null,
        latitude: station.geo_lat || null,
        longitude: station.geo_long || null,
        country: station.country,
        countryCode: station.countrycode,
        language: station.language,
        tags: station.tags,
        homepage: station.homepage,
        url: station.url,
        source: {
          name: 'RadioBrowser',
          url: 'https://www.radio-browser.info/',
          license: 'Public Domain',
        },
      };
    }).filter((s: RawStation) => s.latitude && s.longitude && s.frequencyMhz);
  } catch (error) {
    console.error('RadioBrowser fetch error:', error);
    return [];
  }
}

async function fetchFromFCC(): Promise<RawStation[]> {
  console.log('Fetching FM stations from FCC database...');

  console.log('Note: FCC API access requires setup. Skipping for now.');
  return [];
}

async function fetchFromIndiaGov(): Promise<RawStation[]> {
  console.log('Fetching FM stations from Data.gov.in...');

  console.log('Note: India Gov data requires CSV parsing. Skipping for now.');
  return [];
}

async function main() {
  console.log('=== FM Station Import Pipeline ===\n');

  const result: ImportResult = {
    imported: 0,
    skipped: 0,
    duplicates: 0,
    errors: [],
  };

  const bandId = await getFmBandId();
  console.log(`FM Band ID: ${bandId}\n`);

  const radioBrowserStations = await fetchFromRadioBrowser(500);
  console.log(`Fetched ${radioBrowserStations.length} stations from RadioBrowser\n`);

  const fccStations = await fetchFromFCC();
  console.log(`Fetched ${fccStations.length} stations from FCC\n`);

  const indiaStations = await fetchFromIndiaGov();
  console.log(`Fetched ${indiaStations.length} stations from Data.gov.in\n`);

  const allStations = [
    ...radioBrowserStations,
    ...fccStations,
    ...indiaStations,
  ];

  console.log(`Total stations to process: ${allStations.length}\n`);
  console.log('Starting import...\n');

  for (let i = 0; i < allStations.length; i++) {
    await importStation(allStations[i], bandId, result);

    if ((i + 1) % 50 === 0) {
      console.log(`Processed ${i + 1}/${allStations.length} stations...`);
    }
  }

  console.log('\n=== Import Complete ===');
  console.log(`Imported: ${result.imported}`);
  console.log(`Duplicates skipped: ${result.duplicates}`);
  console.log(`Invalid/skipped: ${result.skipped}`);
  console.log(`Errors: ${result.errors.length}`);

  if (result.errors.length > 0) {
    console.log('\nFirst 10 errors:');
    result.errors.slice(0, 10).forEach((err) => console.log(`  - ${err}`));
  }

  const { count: totalStations } = await supabase
    .from('stations')
    .select('*', { count: 'exact', head: true })
    .eq('band_id', bandId);

  console.log(`\nTotal FM stations in database: ${totalStations || 0}`);
}

main();
