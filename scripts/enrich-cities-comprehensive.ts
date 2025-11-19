import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface Station {
  id: string;
  stationuuid: string;
  name: string;
  city: string | null;
  state: string | null;
  country_code: string;
  latitude: string | null;
  longitude: string | null;
  tags: string[];
  homepage: string | null;
}

interface CityMatch {
  city_name: string;
  iso_code: string;
  latitude: number;
  longitude: number;
  population: number;
}

interface EnrichmentResult {
  stationId: string;
  stationName: string;
  originalCity: string | null;
  extractedCity: string | null;
  confidence: 'high' | 'medium' | 'low';
  method: 'name_parse' | 'reverse_geocode' | 'state_field' | 'tags';
  success: boolean;
  reason?: string;
}

// Patterns for extracting city from station names
const CITY_PATTERNS = [
  // Pattern 1: City in parentheses: "Station Name (City Name)"
  /\(([^)]+)\)/g,
  // Pattern 2: City after dash: "Station - City, State"
  /\s-\s([^-,]+),\s*([A-Z]{2}|\w+)$/g,
  // Pattern 3: City in name: "BBC Radio City"
  /Radio\s+(\w+(?:\s+\w+)?)/gi,
  // Pattern 4: City at end: "Station Name City"
  /\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)$/g,
];

// Cities that are commonly confused with other terms
const FALSE_POSITIVE_CITIES = new Set([
  'FM', 'AM', 'Radio', 'Station', 'Music', 'News', 'Sports', 'Talk',
  'Classic', 'Rock', 'Pop', 'Jazz', 'Country', 'Hip Hop', 'Dance',
  'Online', 'Internet', 'Digital', 'Live', 'Plus', 'Extra', 'Premium',
  'HD', 'MP3', 'AAC', 'HLS', 'Stream', 'Channel', 'Network',
]);

async function loadCitiesDatabase(): Promise<Map<string, CityMatch[]>> {
  console.log('📚 Loading cities database...\n');

  // Load ALL cities in paginated chunks
  let allCities: any[] = [];
  let page = 0;
  const pageSize = 10000;

  while (true) {
    const { data, error } = await supabase
      .from('cities')
      .select(`
        city_name,
        latitude,
        longitude,
        population,
        countries!inner(iso_code)
      `)
      .order('population', { ascending: false })
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error) {
      console.error('Error loading cities:', error);
      break;
    }

    if (!data || data.length === 0) {
      break;
    }

    allCities = allCities.concat(data);
    page++;

    if (page % 5 === 0) {
      console.log(`  Loaded ${allCities.length} cities so far...`);
    }

    if (data.length < pageSize) {
      break;
    }
  }

  // Index cities by country for fast lookup
  const citiesByCountry = new Map<string, CityMatch[]>();

  for (const city of allCities) {
    const isoCode = (city.countries as any).iso_code;
    if (!citiesByCountry.has(isoCode)) {
      citiesByCountry.set(isoCode, []);
    }
    citiesByCountry.get(isoCode)!.push({
      city_name: city.city_name,
      iso_code: isoCode,
      latitude: city.latitude,
      longitude: city.longitude,
      population: city.population,
    });
  }

  console.log(`✅ Loaded ${allCities.length} cities from ${citiesByCountry.size} countries\n`);
  return citiesByCountry;
}

function cleanCityName(city: string): string {
  return city
    .trim()
    .replace(/^(city|ciudad|ville|stadt)\s+/i, '') // Remove "City" prefix
    .replace(/\s+(city|ciudad|ville|stadt)$/i, '') // Remove "City" suffix
    .replace(/[,;].*$/, '') // Remove everything after comma/semicolon
    .trim();
}

function extractCityFromName(stationName: string): string[] {
  const candidates: string[] = [];

  // Try all patterns
  for (const pattern of CITY_PATTERNS) {
    const matches = stationName.matchAll(pattern);
    for (const match of matches) {
      if (match[1]) {
        const cleaned = cleanCityName(match[1]);
        if (cleaned && !FALSE_POSITIVE_CITIES.has(cleaned)) {
          candidates.push(cleaned);
        }
      }
    }
  }

  return [...new Set(candidates)]; // Remove duplicates
}

function extractCityFromState(state: string, countryCode: string): string | null {
  // Known city-states (state field contains city name)
  const CITY_STATES: Record<string, string[]> = {
    AE: ['Dubai', 'Abu Dhabi', 'Sharjah'],
    GR: ['Athens', 'Thessaloniki'],
    AT: ['Vienna'],
    ES: ['Madrid', 'Barcelona'],
    FR: ['Paris'],
    GB: ['London', 'Manchester', 'Birmingham'],
    RU: ['Moscow', 'Saint-Petersburg', 'St. Petersburg'],
    AU: ['Sydney', 'Melbourne', 'Brisbane', 'Perth'],
    PE: ['Lima'],
    MX: ['Ciudad de México', 'Mexico City'],
  };

  const citiesForCountry = CITY_STATES[countryCode] || [];

  for (const city of citiesForCountry) {
    if (state.toLowerCase().includes(city.toLowerCase())) {
      return city;
    }
  }

  // Check if state field looks like "City, State" format
  const match = state.match(/^([^,]+),/);
  if (match) {
    const cleaned = cleanCityName(match[1]);
    if (cleaned && !FALSE_POSITIVE_CITIES.has(cleaned)) {
      return cleaned;
    }
  }

  return null;
}

function extractCityFromTags(tags: string[]): string | null {
  for (const tag of tags) {
    const cleaned = cleanCityName(tag);
    // City tags are usually lowercase and multi-word
    if (cleaned && cleaned.length > 3 && !FALSE_POSITIVE_CITIES.has(cleaned)) {
      // Check if it looks like a city (starts with uppercase or is all lowercase)
      if (/^[A-Z][a-z]/.test(cleaned) || /^[a-z\s]+$/.test(tag)) {
        return cleaned;
      }
    }
  }
  return null;
}

async function validateCityAgainstDatabase(
  cityName: string,
  countryCode: string,
  citiesDb: Map<string, CityMatch[]>
): Promise<{ valid: boolean; match: CityMatch | null; confidence: 'high' | 'medium' | 'low' }> {

  const countryCities = citiesDb.get(countryCode) || [];

  if (countryCities.length === 0) {
    return { valid: false, match: null, confidence: 'low' };
  }

  // Exact match (case-insensitive)
  const exactMatch = countryCities.find(
    c => c.city_name.toLowerCase() === cityName.toLowerCase()
  );

  if (exactMatch) {
    return { valid: true, match: exactMatch, confidence: 'high' };
  }

  // Partial match (fuzzy)
  const partialMatch = countryCities.find(c =>
    c.city_name.toLowerCase().includes(cityName.toLowerCase()) ||
    cityName.toLowerCase().includes(c.city_name.toLowerCase())
  );

  if (partialMatch) {
    return { valid: true, match: partialMatch, confidence: 'medium' };
  }

  return { valid: false, match: null, confidence: 'low' };
}

async function reverseGeocodeCity(
  lat: number,
  lon: number,
  countryCode: string,
  citiesDb: Map<string, CityMatch[]>
): Promise<{ city: string | null; confidence: 'high' | 'medium' | 'low' }> {

  const countryCities = citiesDb.get(countryCode) || [];

  if (countryCities.length === 0) {
    return { city: null, confidence: 'low' };
  }

  // Find nearest city within reasonable distance
  let nearestCity: CityMatch | null = null;
  let minDistance = Infinity;

  for (const city of countryCities) {
    const distance = calculateDistance(lat, lon, city.latitude, city.longitude);

    if (distance < minDistance) {
      minDistance = distance;
      nearestCity = city;
    }
  }

  if (!nearestCity) {
    return { city: null, confidence: 'low' };
  }

  // Determine confidence based on distance
  let confidence: 'high' | 'medium' | 'low' = 'low';

  if (minDistance < 50) {
    confidence = 'high'; // Within 50km
  } else if (minDistance < 100) {
    confidence = 'medium'; // Within 100km
  } else if (minDistance < 200) {
    confidence = 'low'; // Within 200km
  } else {
    return { city: null, confidence: 'low' }; // Too far
  }

  return { city: nearestCity.city_name, confidence };
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

async function enrichStation(
  station: Station,
  citiesDb: Map<string, CityMatch[]>
): Promise<EnrichmentResult> {

  // Skip if already has city
  if (station.city) {
    return {
      stationId: station.id,
      stationName: station.name,
      originalCity: station.city,
      extractedCity: null,
      confidence: 'high',
      method: 'name_parse',
      success: false,
      reason: 'already_has_city',
    };
  }

  // Phase 1: Try parsing from name
  const nameCandidates = extractCityFromName(station.name);
  for (const candidate of nameCandidates) {
    const validation = await validateCityAgainstDatabase(candidate, station.country_code, citiesDb);
    if (validation.valid && validation.match) {
      return {
        stationId: station.id,
        stationName: station.name,
        originalCity: station.city,
        extractedCity: validation.match.city_name,
        confidence: validation.confidence,
        method: 'name_parse',
        success: true,
      };
    }
  }

  // Phase 2: Try reverse geocoding if has coordinates
  if (station.latitude && station.longitude) {
    const lat = parseFloat(station.latitude);
    const lon = parseFloat(station.longitude);

    const geocodeResult = await reverseGeocodeCity(lat, lon, station.country_code, citiesDb);
    if (geocodeResult.city) {
      return {
        stationId: station.id,
        stationName: station.name,
        originalCity: station.city,
        extractedCity: geocodeResult.city,
        confidence: geocodeResult.confidence,
        method: 'reverse_geocode',
        success: true,
      };
    }
  }

  // Phase 3: Try extracting from state field
  if (station.state) {
    const stateCity = extractCityFromState(station.state, station.country_code);
    if (stateCity) {
      const validation = await validateCityAgainstDatabase(stateCity, station.country_code, citiesDb);
      if (validation.valid && validation.match) {
        return {
          stationId: station.id,
          stationName: station.name,
          originalCity: station.city,
          extractedCity: validation.match.city_name,
          confidence: validation.confidence,
          method: 'state_field',
          success: true,
        };
      }
    }
  }

  // Phase 4: Try extracting from tags
  if (station.tags && station.tags.length > 0) {
    const tagCity = extractCityFromTags(station.tags);
    if (tagCity) {
      const validation = await validateCityAgainstDatabase(tagCity, station.country_code, citiesDb);
      if (validation.valid && validation.match) {
        return {
          stationId: station.id,
          stationName: station.name,
          originalCity: station.city,
          extractedCity: validation.match.city_name,
          confidence: validation.confidence,
          method: 'tags',
          success: true,
        };
      }
    }
  }

  // No city found
  return {
    stationId: station.id,
    stationName: station.name,
    originalCity: station.city,
    extractedCity: null,
    confidence: 'low',
    method: 'name_parse',
    success: false,
    reason: 'no_match_found',
  };
}

async function applyEnrichment(result: EnrichmentResult): Promise<boolean> {
  if (!result.success || !result.extractedCity) {
    return false;
  }

  const { error } = await supabase
    .from('radio_stations')
    .update({
      city: result.extractedCity,
      city_source: result.method,
      city_confidence: result.confidence,
      city_enriched_at: new Date().toISOString(),
      city_verified: false,
      city_original: result.originalCity,
    })
    .eq('id', result.stationId);

  if (error) {
    console.error(`❌ Failed to update station ${result.stationName}:`, error);
    return false;
  }

  return true;
}

async function main() {
  console.log('🚀 Starting Comprehensive City Enrichment\n');
  console.log('='.repeat(80));

  // Load cities database
  const citiesDb = await loadCitiesDatabase();

  // Fetch stations without cities
  console.log('📡 Fetching stations without cities...\n');

  // Fetch ALL stations (paginate in chunks of 5000)
  let allStations: Station[] = [];
  let page = 0;
  const pageSize = 5000;

  while (true) {
    const { data, error, count } = await supabase
      .from('radio_stations')
      .select('id, stationuuid, name, city, state, country_code, latitude, longitude, tags, homepage', { count: 'exact' })
      .is('city', null)
      .order('country_code')
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error) {
      console.error('Error fetching stations:', error);
      break;
    }

    if (!data || data.length === 0) {
      break;
    }

    allStations = allStations.concat(data);
    page++;

    if (data.length < pageSize) {
      break;
    }
  }

  const stations = allStations;

  console.log(`Found ${stations.length} stations without cities\n`);
  console.log('='.repeat(80) + '\n');

  // Process stations
  const results: EnrichmentResult[] = [];
  let enrichedCount = 0;
  let highConfidence = 0;
  let mediumConfidence = 0;
  let lowConfidence = 0;

  const byMethod: Record<string, number> = {
    name_parse: 0,
    reverse_geocode: 0,
    state_field: 0,
    tags: 0,
  };

  for (let i = 0; i < stations.length; i++) {
    const station = stations[i];

    if (i % 100 === 0) {
      console.log(`Processing ${i}/${stations.length}...`);
    }

    const result = await enrichStation(station, citiesDb);
    results.push(result);

    if (result.success && result.extractedCity) {
      const applied = await applyEnrichment(result);

      if (applied) {
        enrichedCount++;
        byMethod[result.method]++;

        if (result.confidence === 'high') highConfidence++;
        else if (result.confidence === 'medium') mediumConfidence++;
        else lowConfidence++;

        if (enrichedCount <= 10) {
          console.log(`✅ ${station.name}`);
          console.log(`   City: ${result.extractedCity} (${result.method}, ${result.confidence})`);
        }
      }
    }
  }

  console.log(`\n${'='.repeat(80)}\n`);
  console.log('📊 ENRICHMENT SUMMARY\n');
  console.log(`Total stations processed: ${stations.length}`);
  console.log(`Cities enriched: ${enrichedCount} (${((enrichedCount / stations.length) * 100).toFixed(1)}%)`);
  console.log(`\nBy Confidence:`);
  console.log(`  High (95%+): ${highConfidence}`);
  console.log(`  Medium (75-95%): ${mediumConfidence}`);
  console.log(`  Low (<75%): ${lowConfidence}`);
  console.log(`\nBy Method:`);
  console.log(`  Name parsing: ${byMethod.name_parse}`);
  console.log(`  Reverse geocoding: ${byMethod.reverse_geocode}`);
  console.log(`  State field: ${byMethod.state_field}`);
  console.log(`  Tags: ${byMethod.tags}`);

  console.log(`\n${'='.repeat(80)}\n`);
  console.log('✅ City enrichment complete!\n');
}

main().catch(console.error);
