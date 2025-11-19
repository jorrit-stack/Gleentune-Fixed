import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lokoaovrcslqlazxedhx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxva29hb3ZyY3NscWxhenhlZGh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3NTk0MzAsImV4cCI6MjA3NzMzNTQzMH0.rdRUkHWqtlMblbS2jt2AN1izyV1k8EcN6Mmwiywe5hc';

const supabase = createClient(supabaseUrl, supabaseKey);

interface Station {
  station_id: string;
  station_name: string;
  frequency_khz: string;
  band_name: string;
}

interface City {
  city_id: string;
  city_name: string;
  latitude: number;
  longitude: number;
  country_id: string;
}

interface EnrichmentStats {
  totalProcessed: number;
  enriched: number;
  failed: number;
  alreadyHaveCoords: number;
  byCountry: Record<string, number>;
}

const stats: EnrichmentStats = {
  totalProcessed: 0,
  enriched: 0,
  failed: 0,
  alreadyHaveCoords: 0,
  byCountry: {},
};

const cityCache = new Map<string, City[]>();

async function loadCitiesByName(cityName: string): Promise<City[]> {
  if (cityCache.has(cityName.toLowerCase())) {
    return cityCache.get(cityName.toLowerCase())!;
  }

  const { data: cities, error } = await supabase
    .from('cities')
    .select('city_id, city_name, latitude, longitude, country_id')
    .ilike('city_name', cityName)
    .limit(10);

  if (error || !cities) {
    return [];
  }

  const cityList = cities.map((c) => ({
    city_id: c.city_id,
    city_name: c.city_name,
    latitude: parseFloat(c.latitude),
    longitude: parseFloat(c.longitude),
    country_id: c.country_id,
  }));

  cityCache.set(cityName.toLowerCase(), cityList);
  return cityList;
}

function extractCityNames(stationName: string): string[] {
  const cities: string[] = [];

  const patterns = [
    /\(([^)]+)\)/g,
    /- ([A-Z][a-zá-ú]+(?:\s+[A-Z][a-zá-ú]+)?)/g,
    /,\s*([A-Z][a-zá-ú]+(?:\s+[A-Z][a-zá-ú]+)?)/g,
    /FM\s+([A-Z][a-zá-ú]+)/gi,
    /Radio\s+([A-Z][a-zá-ú]+)/gi,
  ];

  for (const pattern of patterns) {
    const matches = stationName.matchAll(pattern);
    for (const match of matches) {
      const cityName = match[1].trim();
      if (cityName.length >= 3 && cityName.length <= 30) {
        cities.push(cityName);
      }
    }
  }

  const uniqueCities = [...new Set(cities)];
  return uniqueCities.filter((city) => {
    const lower = city.toLowerCase();
    return (
      !lower.includes('radio') &&
      !lower.includes('fm') &&
      !lower.includes('am') &&
      !lower.match(/^\d/) &&
      !lower.includes('grupo') &&
      !lower.includes('cadena')
    );
  });
}

async function getStationsWithoutCoordinates(): Promise<Station[]> {
  console.log('Fetching stations without coordinates...');

  const { data: stationsWithCoords } = await supabase
    .from('station_locations')
    .select('station_id')
    .not('transmitter_lat', 'is', null);

  const stationIdsWithCoords = new Set(
    (stationsWithCoords || []).map((s) => s.station_id)
  );

  const { data: allStations, error } = await supabase
    .from('stations')
    .select(`
      station_id,
      station_name,
      frequency_khz,
      bands!inner(band_name)
    `)
    .limit(2000);

  if (error) {
    throw new Error(`Failed to fetch stations: ${error.message}`);
  }

  const stationsWithoutCoords = (allStations || []).filter(
    (s: any) => !stationIdsWithCoords.has(s.station_id)
  );

  return stationsWithoutCoords.map((s: any) => ({
    station_id: s.station_id,
    station_name: s.station_name,
    frequency_khz: s.frequency_khz,
    band_name: s.bands.band_name,
  }));
}

async function enrichStation(station: Station): Promise<boolean> {
  const cityNames = extractCityNames(station.station_name);

  if (cityNames.length === 0) {
    return false;
  }

  for (const cityName of cityNames) {
    const cities = await loadCitiesByName(cityName);

    if (cities.length === 0) continue;

    const city = cities[0];

    const { data: existingLocation } = await supabase
      .from('station_locations')
      .select('id')
      .eq('station_id', station.station_id)
      .maybeSingle();

    if (existingLocation) {
      const { error: updateError } = await supabase
        .from('station_locations')
        .update({
          transmitter_lat: city.latitude,
          transmitter_long: city.longitude,
          city_id: city.city_id,
          updated_at: new Date().toISOString(),
        })
        .eq('station_id', station.station_id);

      if (updateError) {
        console.error(
          `Error updating station ${station.station_id}: ${updateError.message}`
        );
        return false;
      }
    } else {
      const { error: insertError } = await supabase
        .from('station_locations')
        .insert({
          station_id: station.station_id,
          transmitter_lat: city.latitude,
          transmitter_long: city.longitude,
          city_id: city.city_id,
        });

      if (insertError) {
        console.error(
          `Error inserting location for station ${station.station_id}: ${insertError.message}`
        );
        return false;
      }
    }

    const { data: countryData } = await supabase
      .from('countries')
      .select('iso_code')
      .eq('country_id', city.country_id)
      .maybeSingle();

    if (countryData) {
      if (!stats.byCountry[countryData.iso_code]) {
        stats.byCountry[countryData.iso_code] = 0;
      }
      stats.byCountry[countryData.iso_code]++;
    }

    return true;
  }

  return false;
}

async function processStations(): Promise<void> {
  const stations = await getStationsWithoutCoordinates();
  console.log(`Found ${stations.length} stations without coordinates\n`);

  for (let i = 0; i < stations.length; i++) {
    const station = stations[i];
    stats.totalProcessed++;

    const enriched = await enrichStation(station);

    if (enriched) {
      stats.enriched++;
    } else {
      stats.failed++;
    }

    if ((i + 1) % 100 === 0) {
      console.log(
        `Processed ${i + 1}/${stations.length} | Enriched: ${stats.enriched} | Failed: ${stats.failed}`
      );
    }
  }
}

async function generateReport(): Promise<void> {
  console.log('\n=== COORDINATE ENRICHMENT COMPLETE ===\n');

  console.log(`Total stations processed: ${stats.totalProcessed.toLocaleString()}`);
  console.log(`Stations enriched: ${stats.enriched.toLocaleString()}`);
  console.log(`Stations failed: ${stats.failed.toLocaleString()}`);

  const enrichmentRate = ((stats.enriched / stats.totalProcessed) * 100).toFixed(2);
  console.log(`Enrichment rate: ${enrichmentRate}%`);

  console.log('\n=== Enrichment by Country ===\n');
  const sortedCountries = Object.entries(stats.byCountry)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20);

  for (const [code, count] of sortedCountries) {
    console.log(`${code.padEnd(5)} ${count.toLocaleString()}`);
  }

  const { data: finalStats } = await supabase
    .from('stations')
    .select(`
      station_id,
      bands!inner(band_name),
      station_locations(transmitter_lat, city_id)
    `);

  if (finalStats) {
    const fmTotal = finalStats.filter((s: any) => s.bands.band_name === 'FM').length;
    const fmWithCoords = finalStats.filter(
      (s: any) => s.bands.band_name === 'FM' && s.station_locations[0]?.transmitter_lat
    ).length;

    const amTotal = finalStats.filter((s: any) => s.bands.band_name === 'AM').length;
    const amWithCoords = finalStats.filter(
      (s: any) => s.bands.band_name === 'AM' && s.station_locations[0]?.transmitter_lat
    ).length;

    console.log('\n=== Final Coverage Statistics ===\n');
    console.log(
      `FM: ${fmWithCoords}/${fmTotal} (${((fmWithCoords / fmTotal) * 100).toFixed(2)}%)`
    );
    console.log(
      `AM: ${amWithCoords}/${amTotal} (${((amWithCoords / amTotal) * 100).toFixed(2)}%)`
    );
    console.log(
      `Total: ${fmWithCoords + amWithCoords}/${fmTotal + amTotal} (${(((fmWithCoords + amWithCoords) / (fmTotal + amTotal)) * 100).toFixed(2)}%)`
    );
  }
}

async function main() {
  console.log('=== City-Based Coordinate Enrichment ===\n');

  try {
    await processStations();
    await generateReport();

    console.log('\n✓ Enrichment completed successfully');
  } catch (error) {
    console.error('\n✗ Fatal error:', error);
    process.exit(1);
  }
}

main();
