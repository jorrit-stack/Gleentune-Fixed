import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lokoaovrcslqlazxedhx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxva29hb3ZyY3NscWxhenhlZGh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3NTk0MzAsImV4cCI6MjA3NzMzNTQzMH0.rdRUkHWqtlMblbS2jt2AN1izyV1k8EcN6Mmwiywe5hc';

const supabase = createClient(supabaseUrl, supabaseKey);

interface Station {
  station_id: string;
  station_name: string;
  frequency_khz: string;
  band_name: string;
  geo_lat?: number;
  geo_long?: number;
}

interface MatchStats {
  totalStations: number;
  matched: number;
  unmatched: number;
  noCoordinates: number;
  byBand: Record<string, { total: number; matched: number }>;
  byCountry: Record<string, { total: number; matched: number; unmatched: number }>;
}

const stats: MatchStats = {
  totalStations: 0,
  matched: 0,
  unmatched: 0,
  noCoordinates: 0,
  byBand: {},
  byCountry: {},
};

function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
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
  maxDistanceKm: number = 100
): Promise<{ city_id: string; distance: number } | null> {
  const latRange = maxDistanceKm / 111;
  const lonRange = maxDistanceKm / (111 * Math.cos((lat * Math.PI) / 180));

  const { data: cities, error } = await supabase
    .from('cities')
    .select('city_id, city_name, latitude, longitude')
    .gte('latitude', lat - latRange)
    .lte('latitude', lat + latRange)
    .gte('longitude', lon - lonRange)
    .lte('longitude', lon + lonRange)
    .limit(100);

  if (error || !cities || cities.length === 0) {
    return null;
  }

  let nearestCity: { city_id: string; distance: number } | null = null;
  let minDistance = maxDistanceKm;

  for (const city of cities) {
    const distance = haversineDistance(
      lat,
      lon,
      parseFloat(city.latitude),
      parseFloat(city.longitude)
    );

    if (distance < minDistance) {
      minDistance = distance;
      nearestCity = { city_id: city.city_id, distance };
    }
  }

  return nearestCity;
}

async function getAllStations(): Promise<Station[]> {
  console.log('Fetching all stations...');

  const { data: stations, error } = await supabase
    .from('stations')
    .select(`
      station_id,
      station_name,
      frequency_khz,
      bands!inner(band_name),
      station_locations(transmitter_lat, transmitter_long)
    `)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch stations: ${error.message}`);
  }

  const formatted = stations.map((s: any) => ({
    station_id: s.station_id,
    station_name: s.station_name,
    frequency_khz: s.frequency_khz,
    band_name: s.bands.band_name,
    geo_lat: s.station_locations?.[0]?.transmitter_lat,
    geo_long: s.station_locations?.[0]?.transmitter_long,
  }));

  console.log(`Found ${formatted.length} stations`);
  return formatted;
}

async function clearExistingMatches(): Promise<void> {
  console.log('Clearing existing station location matches...');

  const { error } = await supabase
    .from('station_locations')
    .update({ city_id: null })
    .not('station_id', 'is', null);

  if (error) {
    console.error(`Error clearing matches: ${error.message}`);
  } else {
    console.log('Cleared all city_id references from station_locations');
  }
}

async function updateStationLocation(
  stationId: string,
  cityId: string | null
): Promise<void> {
  const { error } = await supabase
    .from('station_locations')
    .update({ city_id: cityId })
    .eq('station_id', stationId);

  if (error) {
    console.error(`Error updating station ${stationId}: ${error.message}`);
  }
}

async function processStations(): Promise<void> {
  const stations = await getAllStations();
  stats.totalStations = stations.length;

  console.log('\nProcessing stations...\n');

  for (let i = 0; i < stations.length; i++) {
    const station = stations[i];
    const bandName = station.band_name;

    if (!stats.byBand[bandName]) {
      stats.byBand[bandName] = { total: 0, matched: 0 };
    }
    stats.byBand[bandName].total++;

    if (!station.geo_lat || !station.geo_long) {
      stats.noCoordinates++;
      continue;
    }

    const nearestCity = await findNearestCity(station.geo_lat, station.geo_long);

    if (nearestCity) {
      await updateStationLocation(station.station_id, nearestCity.city_id);
      stats.matched++;
      stats.byBand[bandName].matched++;
    } else {
      stats.unmatched++;
    }

    if ((i + 1) % 100 === 0) {
      console.log(
        `Processed ${i + 1}/${stations.length} | Matched: ${stats.matched} | Unmatched: ${stats.unmatched}`
      );
    }
  }
}

async function generateReport(): Promise<void> {
  console.log('\n=== RE-MATCHING COMPLETE ===\n');

  console.log('Total Stations:', stats.totalStations);
  console.log('Stations with coordinates:', stats.totalStations - stats.noCoordinates);
  console.log('Stations without coordinates:', stats.noCoordinates);
  console.log('Matched to cities:', stats.matched);
  console.log('Unmatched:', stats.unmatched);

  const matchRate = ((stats.matched / (stats.totalStations - stats.noCoordinates)) * 100).toFixed(2);
  console.log(`Match rate: ${matchRate}%\n`);

  console.log('=== By Band ===\n');
  for (const [band, data] of Object.entries(stats.byBand)) {
    const rate = ((data.matched / data.total) * 100).toFixed(2);
    console.log(`${band}: ${data.matched}/${data.total} matched (${rate}%)`);
  }

  console.log('\n=== Fetching country statistics from database... ===\n');

  const { data: finalStats } = await supabase
    .from('stations')
    .select(`
      station_id,
      bands!inner(band_name),
      station_locations!inner(city_id)
    `);

  console.log('\n=== Final Database Statistics ===\n');

  const fmWithCity = finalStats?.filter(
    (s: any) => s.bands.band_name === 'FM' && s.station_locations[0]?.city_id
  ).length || 0;

  const fmTotal = finalStats?.filter((s: any) => s.bands.band_name === 'FM').length || 0;

  const amWithCity = finalStats?.filter(
    (s: any) => s.bands.band_name === 'AM' && s.station_locations[0]?.city_id
  ).length || 0;

  const amTotal = finalStats?.filter((s: any) => s.bands.band_name === 'AM').length || 0;

  console.log(`FM Stations: ${fmWithCity}/${fmTotal} matched (${((fmWithCity/fmTotal)*100).toFixed(2)}%)`);
  console.log(`AM Stations: ${amWithCity}/${amTotal} matched (${((amWithCity/amTotal)*100).toFixed(2)}%)`);
  console.log(`Total: ${fmWithCity + amWithCity}/${fmTotal + amTotal} matched (${(((fmWithCity + amWithCity)/(fmTotal + amTotal))*100).toFixed(2)}%)`);
}

async function main() {
  console.log('=== Re-matching Stations to Cities ===\n');

  try {
    await clearExistingMatches();
    await processStations();
    await generateReport();

    console.log('\n✓ Re-matching completed successfully');
  } catch (error) {
    console.error('\n✗ Fatal error:', error);
    process.exit(1);
  }
}

main();
