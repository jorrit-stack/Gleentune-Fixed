import { supabase } from '../lib/supabase';
import { BandType } from '../types/radio';

interface RadioBrowserStation {
  stationuuid: string;
  name: string;
  url: string;
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

export async function fetchStationsByLocation(latitude: number, longitude: number, radiusKm: number = 500) {
  try {
    const radiusMeters = radiusKm * 1000;
    const url = `${RADIO_BROWSER_API}/stations/search?geo_lat=${latitude}&geo_long=${longitude}&geo_distance=${radiusMeters}&limit=200&order=votes&reverse=true`;

    const response = await fetch(url);
    const stations: RadioBrowserStation[] = await response.json();

    const validStations = stations.filter(station =>
      station.url_resolved &&
      station.geo_lat &&
      station.geo_long
    );

    const stationsToInsert = validStations.map((station, index) => {
      const { band_type, frequency } = assignBandAndFrequency(index);

      return {
        name: station.name,
        country: station.country || 'Unknown',
        country_code: station.countrycode || 'XX',
        state: station.state || null,
        city: null,
        language: station.language || 'unknown',
        stream_url: station.url_resolved,
        homepage: station.homepage || null,
        favicon: station.favicon || null,
        tags: station.tags ? station.tags.split(',').map(t => t.trim()) : [],
        bitrate: station.bitrate || 128,
        codec: station.codec || 'MP3',
        frequency,
        band_type,
        latitude: station.geo_lat,
        longitude: station.geo_long,
        last_check_ok: station.lastcheckok === 1
      };
    });

    if (stationsToInsert.length > 0) {
      const { error } = await supabase
        .from('radio_stations')
        .upsert(stationsToInsert, {
          onConflict: 'stream_url',
          ignoreDuplicates: true
        });

      if (error) {
        console.error('Error inserting location stations:', error);
      }
    }

    return { success: true, count: stationsToInsert.length };
  } catch (error) {
    console.error('Failed to fetch stations by location:', error);
    return { success: false, count: 0 };
  }
}

function assignBandAndFrequency(index: number): { band_type: BandType; frequency: number } {
  const rand = index % 100;

  if (rand < 60) {
    return { band_type: 'FM', frequency: 88.1 + (index % 200) * 0.1 };
  } else if (rand < 85) {
    return { band_type: 'AM', frequency: 530 + (index % 117) * 10 };
  } else if (rand < 90) {
    return { band_type: 'SW1', frequency: 5900 + (index % 30) * 10 };
  } else if (rand < 95) {
    return { band_type: 'SW2', frequency: 9500 + (index % 40) * 10 };
  } else {
    return { band_type: 'SW3', frequency: 15100 + (index % 50) * 10 };
  }
}

export async function fetchStationsByCountry(countryCode: string, limit: number = 50) {
  return [];
}

export async function populateRadioStations() {
  try {
    const countries = [
      { code: 'US', limit: 150 },
      { code: 'GB', limit: 100 },
      { code: 'DE', limit: 100 },
      { code: 'FR', limit: 100 },
      { code: 'IN', limit: 150 },
      { code: 'CA', limit: 100 },
      { code: 'AU', limit: 100 },
      { code: 'JP', limit: 100 },
      { code: 'BR', limit: 100 },
      { code: 'MX', limit: 100 },
      { code: 'ES', limit: 100 },
      { code: 'IT', limit: 100 },
      { code: 'NL', limit: 80 },
      { code: 'SE', limit: 80 },
      { code: 'NO', limit: 80 }
    ];

    const fetchPromises = countries.map(({ code, limit }) =>
      fetch(`${RADIO_BROWSER_API}/stations/bycountrycodeexact/${code}?limit=${limit}`)
        .then(res => res.json())
        .catch(() => [])
    );

    const results = await Promise.all(fetchPromises);
    const allStations: RadioBrowserStation[] = results.flat();

    const uniqueStations = new Map<string, RadioBrowserStation>();
    allStations
      .filter(station => station.url_resolved)
      .forEach(station => {
        const key = `${station.name}-${station.url_resolved}`;
        if (!uniqueStations.has(key)) {
          uniqueStations.set(key, station);
        }
      });

    const stationsToInsert = Array.from(uniqueStations.values()).map((station, index) => {
      const { band_type, frequency } = assignBandAndFrequency(index);

      return {
        name: station.name,
        country: station.country || 'Unknown',
        country_code: station.countrycode || 'XX',
        state: station.state || null,
        language: station.language || 'unknown',
        stream_url: station.url_resolved,
        homepage: station.homepage || null,
        favicon: station.favicon || null,
        tags: station.tags ? station.tags.split(',').map(t => t.trim()) : [],
        bitrate: station.bitrate || 128,
        codec: station.codec || 'MP3',
        frequency,
        band_type,
        latitude: station.geo_lat || null,
        longitude: station.geo_long || null,
        last_check_ok: station.lastcheckok === 1
      };
    });

    const { error } = await supabase
      .from('radio_stations')
      .upsert(stationsToInsert, {
        onConflict: 'stream_url',
        ignoreDuplicates: true
      });

    if (error) {
      console.error('Error inserting stations:', error);
      return { success: false, count: 0 };
    }

    return { success: true, count: stationsToInsert.length };
  } catch (error) {
    console.error('Failed to populate radio stations:', error);
    return { success: false, count: 0 };
  }
}
