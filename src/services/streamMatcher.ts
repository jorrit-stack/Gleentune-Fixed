import { RadioStation } from '../types/radio';

interface RadioBrowserStation {
  stationuuid: string;
  name: string;
  url_resolved: string;
  homepage: string;
  favicon: string;
  tags: string;
  country: string;
  countrycode: string;
  state: string;
  language: string;
  codec: string;
  bitrate: number;
  geo_lat: number;
  geo_long: number;
  lastcheckok: number;
}

const RADIO_BROWSER_API = 'https://de1.api.radio-browser.info/json';

function normalizeStationName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^a-z0-9\s]/g, '')
    .trim();
}

function extractKeywords(name: string): string[] {
  const normalized = normalizeStationName(name);
  const words = normalized.split(' ');

  const commonCityWords = ['delhi', 'mumbai', 'kolkata', 'chennai', 'bangalore', 'hyderabad', 'pune', 'ahmedabad'];
  const filteredWords = words.filter(word =>
    word.length > 2 && !commonCityWords.includes(word)
  );

  return filteredWords.length > 0 ? filteredWords : words.filter(w => w.length > 2);
}

function calculateNameSimilarity(name1: string, name2: string): number {
  const norm1 = normalizeStationName(name1);
  const norm2 = normalizeStationName(name2);

  if (norm1 === norm2) return 1.0;

  if (norm1.includes(norm2) || norm2.includes(norm1)) return 0.8;

  const keywords1 = extractKeywords(name1);
  const keywords2 = extractKeywords(name2);

  const commonKeywords = keywords1.filter(kw => keywords2.includes(kw));
  if (commonKeywords.length === 0) return 0;

  const similarity = (2 * commonKeywords.length) / (keywords1.length + keywords2.length);
  return similarity;
}

async function searchRadioBrowserByName(stationName: string, countryCode?: string): Promise<RadioBrowserStation[]> {
  try {
    const keywords = extractKeywords(stationName);
    const allResults: RadioBrowserStation[] = [];

    for (const keyword of keywords) {
      let url = `${RADIO_BROWSER_API}/stations/search?name=${encodeURIComponent(keyword)}&limit=30&order=votes&reverse=true`;
      if (countryCode) {
        url += `&countrycode=${countryCode}`;
      }

      const response = await fetch(url);
      if (response.ok) {
        const stations: RadioBrowserStation[] = await response.json();
        allResults.push(...stations.filter(s => s.url_resolved && s.lastcheckok === 1));
      }

      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const uniqueStations = Array.from(
      new Map(allResults.map(s => [s.stationuuid, s])).values()
    );

    return uniqueStations;
  } catch (error) {
    console.error('Radio Browser search failed:', error);
    return [];
  }
}

async function searchRadioBrowserForAIR(cityName?: string, countryCode: string = 'IN'): Promise<RadioBrowserStation[]> {
  try {
    const searchTerms = ['AIR', 'Akashvani', 'All India Radio'];
    const allResults: RadioBrowserStation[] = [];

    for (const term of searchTerms) {
      const searchQuery = cityName ? `${term} ${cityName}` : term;
      const url = `${RADIO_BROWSER_API}/stations/search?name=${encodeURIComponent(searchQuery)}&countrycode=${countryCode}&limit=10`;

      const response = await fetch(url);
      if (response.ok) {
        const stations: RadioBrowserStation[] = await response.json();
        allResults.push(...stations.filter(s => s.url_resolved && s.lastcheckok === 1));
      }
    }

    const uniqueStations = Array.from(
      new Map(allResults.map(s => [s.stationuuid, s])).values()
    );

    return uniqueStations;
  } catch (error) {
    console.error('AIR search failed:', error);
    return [];
  }
}

export async function enrichStationWithStream(station: RadioStation): Promise<RadioStation> {
  if (station.stream_url && !station.stream_url.includes('placeholder')) {
    return station;
  }

  console.log(`Enriching station: ${station.name} (${station.city})`);

  const { findCuratedStream } = await import('./curatedStreams');
  const curatedMatch = findCuratedStream(station.name, station.city, station.frequency);
  if (curatedMatch) {
    console.log(`Found curated stream for ${station.name}`);
    return {
      ...station,
      stream_url: curatedMatch.streamUrl,
      last_check_ok: curatedMatch.verified,
      codec: 'AAC'
    };
  }

  let candidates: RadioBrowserStation[] = [];

  if (station.band_type === 'AM' && station.country_code === 'IN') {
    candidates = await searchRadioBrowserForAIR(station.city, station.country_code);
  } else {
    candidates = await searchRadioBrowserByName(station.name, station.country_code);
  }

  console.log(`Found ${candidates.length} candidates for ${station.name}`);

  if (candidates.length === 0) {
    return station;
  }

  const scored = candidates.map(candidate => {
    let score = calculateNameSimilarity(station.name, candidate.name);

    if (station.city && candidate.state) {
      const cityMatch = normalizeStationName(station.city) === normalizeStationName(candidate.state);
      if (cityMatch) score += 0.3;
    }

    if (station.country_code && candidate.countrycode) {
      if (station.country_code.toUpperCase() === candidate.countrycode.toUpperCase()) {
        score += 0.2;
      }
    }

    return { candidate, score };
  });

  scored.sort((a, b) => b.score - a.score);

  const bestMatch = scored[0];
  const CONFIDENCE_THRESHOLD = 0.4;

  console.log(`Best match for ${station.name}: ${bestMatch?.candidate.name} (score: ${bestMatch?.score.toFixed(2)})`);

  if (bestMatch && bestMatch.score >= CONFIDENCE_THRESHOLD) {
    console.log(`Match accepted! Using stream: ${bestMatch.candidate.url_resolved}`);
    return {
      ...station,
      stream_url: bestMatch.candidate.url_resolved,
      homepage: bestMatch.candidate.homepage || station.homepage,
      website_url: bestMatch.candidate.homepage || station.website_url,
      codec: bestMatch.candidate.codec || station.codec,
      bitrate: bestMatch.candidate.bitrate || station.bitrate,
      last_check_ok: true,
      tags: bestMatch.candidate.tags ? bestMatch.candidate.tags.split(',').map(t => t.trim()) : station.tags
    };
  }

  console.log(`No match found (threshold: ${CONFIDENCE_THRESHOLD})`);
  return station;
}

export async function enrichStationsWithStreams(stations: RadioStation[]): Promise<RadioStation[]> {
  const batchSize = 5;
  const enrichedStations: RadioStation[] = [];

  for (let i = 0; i < stations.length; i += batchSize) {
    const batch = stations.slice(i, i + batchSize);
    const enrichedBatch = await Promise.all(
      batch.map(station => enrichStationWithStream(station))
    );
    enrichedStations.push(...enrichedBatch);

    if (i + batchSize < stations.length) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  return enrichedStations;
}
