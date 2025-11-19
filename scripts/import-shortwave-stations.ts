import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as readline from 'readline';

const supabaseUrl = 'https://lokoaovrcslqlazxedhx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxva29hb3ZyY3NscWxhenhlZGh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3NTk0MzAsImV4cCI6MjA3NzMzNTQzMH0.rdRUkHWqtlMblbS2jt2AN1izyV1k8EcN6Mmwiywe5hc';

const supabase = createClient(supabaseUrl, supabaseKey);

interface TransmitterSite {
  country: string;
  siteCode: string;
  name: string;
  lat: number;
  lon: number;
}

interface ShortwaveStation {
  frequencyKhz: number;
  times: string;
  ituCode: string;
  stationName: string;
  language: string;
  targetArea: string;
  siteCode?: string;
  transmitterLat?: number;
  transmitterLong?: number;
  propagationPattern?: string;
  targetRegions?: string[];
}

interface ImportStats {
  totalParsed: number;
  matched: number;
  unmatched: number;
  inserted: number;
  duplicates: number;
  errors: number;
  byCountry: Record<string, number>;
}

const stats: ImportStats = {
  totalParsed: 0,
  matched: 0,
  unmatched: 0,
  inserted: 0,
  duplicates: 0,
  errors: 0,
  byCountry: {},
};

const transmitterSites = new Map<string, TransmitterSite>();
const countryCache = new Map<string, string>();

// Map target area codes to regions
function deriveTargetRegions(targetArea: string, ituCode: string): string[] {
  const regions = new Set<string>();

  // Always include Global for broad coverage
  regions.add('Global');

  // Parse target area codes (examples: NAf, SEu, EAs, etc.)
  const areaUpper = targetArea.toUpperCase();

  // Continental/Regional patterns
  if (areaUpper.includes('AF') || areaUpper.includes('AFR')) regions.add('Africa');
  if (areaUpper.includes('AS') || areaUpper.includes('ASIA')) regions.add('Asia');
  if (areaUpper.includes('EU') || areaUpper.includes('EUR')) regions.add('Europe');
  if (areaUpper.includes('NAM') || areaUpper.includes('NA ')) regions.add('North America');
  if (areaUpper.includes('SAM') || areaUpper.includes('SA ')) regions.add('South America');
  if (areaUpper.includes('OC') || areaUpper.includes('PAC')) regions.add('Oceania');
  if (areaUpper.includes('ME') || areaUpper.includes('MIDEAST')) regions.add('Middle East');

  // Specific region codes from EiBi
  if (/^(N|S|E|W|C)?AF/i.test(targetArea)) regions.add('Africa');
  if (/^(N|S|E|W|C|SE|NE)?AS/i.test(targetArea)) regions.add('Asia');
  if (/^(N|S|E|W|C)?EU/i.test(targetArea)) regions.add('Europe');
  if (/^(N|S|E|W|C)?AM/i.test(targetArea)) regions.add('Americas');

  // Country-specific broadcasts
  const countryMap: Record<string, string> = {
    'IND': 'India', 'CHN': 'China', 'JPN': 'Japan', 'AUS': 'Australia',
    'USA': 'United States', 'CAN': 'Canada', 'GBR': 'United Kingdom',
    'DEU': 'Germany', 'FRA': 'France', 'RUS': 'Russia', 'BRA': 'Brazil'
  };

  if (countryMap[ituCode]) {
    regions.add(countryMap[ituCode]);
  }

  return Array.from(regions);
}

// Derive propagation pattern from broadcast times
function derivePropagationPattern(times: string): string {
  // Parse times like "0000-2400", "0600-1800", "1800-0600"
  const match = times.match(/(\d{4})-(\d{4})/);
  if (!match) return 'day_night';

  const startHour = parseInt(match[1].substring(0, 2));
  const endHour = parseInt(match[2].substring(0, 2));

  // 24-hour broadcast
  if (startHour === 0 && endHour === 24) return 'day_night';
  if (startHour === endHour) return 'day_night';

  // Determine if mostly day or night
  // Day: 06:00-17:59, Night: 18:00-05:59
  const isDayStart = startHour >= 6 && startHour < 18;
  const isDayEnd = endHour > 6 && endHour <= 18;

  if (isDayStart && isDayEnd) return 'day';
  if (!isDayStart && !isDayEnd) return 'night';

  // Mixed or crossing midnight
  return 'day_night';
}

function parseTransmitterSites(readmePath: string): void {
  console.log('Parsing transmitter sites from README...');

  const content = fs.readFileSync(readmePath, 'utf-8');
  const lines = content.split('\n');

  let currentCountry = '';
  let siteCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    const countryMatch = line.match(/^([A-Z]{3}):\s+(.+)/);
    if (countryMatch) {
      currentCountry = countryMatch[1];
      const siteInfo = countryMatch[2];

      const coordMatch = siteInfo.match(/(\d+[NS]\d+.*-\d+[EW]\d+.*)/);
      if (coordMatch) {
        const coords = parseDetailedCoordinate(coordMatch[1]);
        if (coords) {
          const siteName = siteInfo.substring(0, siteInfo.indexOf(coordMatch[1])).trim();
          const key = currentCountry;
          transmitterSites.set(key, {
            country: currentCountry,
            siteCode: '',
            name: siteName,
            lat: coords.lat,
            lon: coords.lon,
          });
          siteCount++;
        }
      }
      continue;
    }

    const siteMatch = line.match(/^\s+([a-z0-9]+)-(.+?)(\d+[NS]\d+.*-\d+[EW]\d+.*)/);
    if (siteMatch && currentCountry) {
      const siteCode = siteMatch[1];
      const siteName = siteMatch[2].trim();
      const coordString = siteMatch[3].trim();

      const coords = parseDetailedCoordinate(coordString);
      if (coords) {
        const key = `${currentCountry}-${siteCode}`;
        transmitterSites.set(key, {
          country: currentCountry,
          siteCode,
          name: siteName,
          lat: coords.lat,
          lon: coords.lon,
        });
        siteCount++;
      }
    }
  }

  console.log(`Parsed ${siteCount} transmitter sites`);
}

function parseDetailedCoordinate(coordString: string): { lat: number; lon: number } | null {
  const match = coordString.match(/(\d+)([NS])(\d+)(?:'(\d+))?(?:"(\d+))?.*?(\d+)([EW])(\d+)(?:'(\d+))?(?:"(\d+))?/);
  if (!match) return null;

  const latDeg = parseInt(match[1]);
  const latMin = parseInt(match[3]);
  const latSec = match[4] ? parseInt(match[4]) : 0;
  const latDir = match[2];

  const lonDeg = parseInt(match[6]);
  const lonMin = parseInt(match[8]);
  const lonSec = match[9] ? parseInt(match[9]) : 0;
  const lonDir = match[7];

  let lat = latDeg + latMin / 60 + latSec / 3600;
  let lon = lonDeg + lonMin / 60 + lonSec / 3600;

  if (latDir === 'S') lat = -lat;
  if (lonDir === 'W') lon = -lon;

  return { lat, lon };
}

async function loadCountries(): Promise<void> {
  console.log('Loading countries from database...');
  const { data: countries, error } = await supabase
    .from('countries')
    .select('country_id, iso_code');

  if (error) {
    throw new Error(`Failed to load countries: ${error.message}`);
  }

  for (const country of countries || []) {
    countryCache.set(country.iso_code, country.country_id);
  }

  console.log(`Loaded ${countryCache.size} countries`);
}

function parseShortwaveLine(line: string): ShortwaveStation | null {
  if (!line.match(/^\d{3,5}\s+/)) return null;

  const parts = line.match(/^(\d+)\s+(\d{4}-\d{4})\s+(\S+)\s+(\S+)\s+(.+?)\s+(\S+)\s+(\S+)\s+(.*)$/);
  if (!parts) return null;

  const [, freq, times, days, ituCode, stationRaw, language, targetArea, remarks] = parts;

  const frequency = parseInt(freq);
  if (frequency < 100 || frequency > 30000) return null;

  let stationName = stationRaw.trim();
  let siteCode: string | undefined;
  let site: TransmitterSite | undefined;

  const relaySiteMatch = stationName.match(/\/([A-Z]{3})-([a-z0-9]+)$/);
  if (relaySiteMatch) {
    const relayCountry = relaySiteMatch[1];
    siteCode = relaySiteMatch[2];
    site = transmitterSites.get(`${relayCountry}-${siteCode}`);

    if (site) {
      return {
        frequencyKhz: frequency,
        times,
        ituCode,
        stationName: stationName.replace(/\/[A-Z]{3}-[a-z0-9]+$/, '').trim(),
        language,
        targetArea,
        siteCode,
        transmitterLat: site.lat,
        transmitterLong: site.lon,
      };
    }
  }

  const siteMatch = remarks.match(/\s([a-z0-9]{1,3})$/);
  if (siteMatch) {
    siteCode = siteMatch[1];
    site = transmitterSites.get(`${ituCode}-${siteCode}`);
  }

  if (!site) {
    site = transmitterSites.get(ituCode);
  }

  const propagationPattern = derivePropagationPattern(times);
  const targetRegions = deriveTargetRegions(targetArea, ituCode);

  if (site) {
    return {
      frequencyKhz: frequency,
      times,
      ituCode,
      stationName,
      language,
      targetArea,
      siteCode,
      transmitterLat: site.lat,
      transmitterLong: site.lon,
      propagationPattern,
      targetRegions,
    };
  }

  return {
    frequencyKhz: frequency,
    times,
    ituCode,
    stationName,
    language,
    targetArea,
    propagationPattern,
    targetRegions,
  };
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
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
  maxDistanceKm: number = 200
): Promise<string | null> {
  const latRange = maxDistanceKm / 111;
  const lonRange = maxDistanceKm / (111 * Math.cos((lat * Math.PI) / 180));

  const { data: cities, error } = await supabase
    .from('cities')
    .select('city_id, latitude, longitude')
    .gte('latitude', lat - latRange)
    .lte('latitude', lat + latRange)
    .gte('longitude', lon - lonRange)
    .lte('longitude', lon + lonRange)
    .limit(50);

  if (error || !cities || cities.length === 0) {
    return null;
  }

  let nearestCityId: string | null = null;
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
      nearestCityId = city.city_id;
    }
  }

  return nearestCityId;
}

async function processEiBiFile(filePath: string): Promise<void> {
  console.log('\nProcessing EiBi frequency list...');

  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  const stationsBuffer: any[] = [];
  const batchSize = 100;

  for await (const line of rl) {
    const station = parseShortwaveLine(line);
    if (!station) continue;

    stats.totalParsed++;

    const countryId = countryCache.get(station.ituCode) || null;

    let cityId: string | null = null;
    if (station.transmitterLat && station.transmitterLong) {
      cityId = await findNearestCity(station.transmitterLat, station.transmitterLong);
      if (cityId) {
        stats.matched++;
      } else {
        stats.unmatched++;
      }
    } else {
      stats.unmatched++;
    }

    stationsBuffer.push({
      station_name: station.stationName.substring(0, 255),
      frequency_khz: station.frequencyKhz,
      country_id: countryId,
      city_id: cityId,
      transmitter_lat: station.transmitterLat || null,
      transmitter_long: station.transmitterLong || null,
      transmitter_site_code: station.siteCode || null,
      itu_code: station.ituCode,
      target_area: station.targetArea,
      language_code: station.language,
      broadcast_times: station.times,
      source: 'eibi',
      propagation_pattern: station.propagationPattern,
      target_regions: station.targetRegions,
    });

    if (!stats.byCountry[station.ituCode]) {
      stats.byCountry[station.ituCode] = 0;
    }
    stats.byCountry[station.ituCode]++;

    if (stationsBuffer.length >= batchSize) {
      await insertBatch(stationsBuffer);
      stationsBuffer.length = 0;

      if (stats.totalParsed % 1000 === 0) {
        console.log(
          `Processed ${stats.totalParsed.toLocaleString()} | Inserted: ${stats.inserted.toLocaleString()} | Matched: ${stats.matched} | Unmatched: ${stats.unmatched}`
        );
      }
    }
  }

  if (stationsBuffer.length > 0) {
    await insertBatch(stationsBuffer);
  }
}

async function insertBatch(stations: any[]): Promise<void> {
  const { data, error } = await supabase
    .from('shortwave_stations')
    .upsert(stations, {
      onConflict: 'station_name,frequency_khz,itu_code,transmitter_site_code',
      ignoreDuplicates: true,
    })
    .select('sw_station_id');

  if (error) {
    stats.errors += stations.length;
    console.error(`Error inserting batch: ${error.message}`);
  } else {
    const insertedCount = data?.length || 0;
    stats.inserted += insertedCount;
    stats.duplicates += stations.length - insertedCount;
  }
}

async function generateReport(): Promise<void> {
  console.log('\n=== SHORTWAVE IMPORT COMPLETE ===\n');

  console.log(`Total stations parsed: ${stats.totalParsed.toLocaleString()}`);
  console.log(`Stations inserted: ${stats.inserted.toLocaleString()}`);
  console.log(`Duplicates skipped: ${stats.duplicates.toLocaleString()}`);
  console.log(`Matched to cities: ${stats.matched}`);
  console.log(`Unmatched: ${stats.unmatched}`);
  console.log(`Errors: ${stats.errors}`);

  if (stats.matched + stats.unmatched > 0) {
    const matchRate = ((stats.matched / (stats.matched + stats.unmatched)) * 100).toFixed(2);
    console.log(`Match rate: ${matchRate}%`);
  }

  console.log('\n=== Top 20 Countries by Station Count ===\n');
  const sortedCountries = Object.entries(stats.byCountry)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20);

  for (const [code, count] of sortedCountries) {
    console.log(`${code.padEnd(5)} ${count.toLocaleString()}`);
  }

  const { data: totalCount } = await supabase
    .from('shortwave_stations')
    .select('sw_station_id', { count: 'exact', head: true });

  console.log(`\n=== Total Shortwave Stations in Database: ${totalCount || 0} ===`);
}

async function main() {
  console.log('=== EiBi Shortwave Station Import ===\n');

  try {
    await loadCountries();
    parseTransmitterSites('readme.txt');
    await processEiBiFile('eibi.txt');
    await generateReport();

    console.log('\n✓ Import completed successfully');
  } catch (error) {
    console.error('\n✗ Fatal error:', error);
    process.exit(1);
  }
}

main();
