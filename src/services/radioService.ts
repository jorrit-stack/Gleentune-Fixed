import { supabase } from '../lib/supabase';
import { RadioStation, UserLocation, BandType } from '../types/radio';

interface StationsViewRow {
  station_id: string;
  station_name: string;
  call_sign: string | null;
  frequency_mhz: number;
  frequency_khz: number;
  band_type: string;
  city_name: string | null;
  country_name: string | null;
  country_code: string | null;
  latitude: number | null;
  longitude: number | null;
  stream_url: string | null;
  language: string | null;
  genre: string | null;
  genre_category: string | null;
  power_kw: number | null;
  website_url: string | null;
  bitrate_kbps: number | null;
  status: string | null;
  source_table: string;
  created_at: string;
  logo_url: string | null;
  logo_source: string | null;
  logo_verified: boolean | null;
  logo_last_checked: string | null;
  license_tier: string | null;
  is_active: boolean | null;
  codec: string | null;
  owner: string | null;
  source_url: string | null;
}

function mapStationFromView(row: StationsViewRow): RadioStation {
  const streamUrl = row.stream_url && row.stream_url.trim() !== '' ? row.stream_url : undefined;

  // FM uses MHz, AM/SW use kHz for display
  const frequency = row.band_type === 'FM' ? row.frequency_mhz : row.frequency_khz;

  if (row.country_code === 'IN' && row.band_type === 'FM') {
    console.log(`[RadioService] Mapping ${row.station_name}: freq=${frequency} ${row.band_type === 'FM' ? 'MHz' : 'kHz'}, stream_url="${row.stream_url}" -> streamUrl=${streamUrl ? 'DEFINED' : 'UNDEFINED'}`);
  }

  return {
    id: row.station_id,
    name: row.station_name,
    country: row.country_name || 'Unknown',
    country_code: row.country_code || '',
    city: row.city_name || undefined,
    language: row.language || 'unknown',
    stream_url: streamUrl,
    homepage: row.website_url || undefined,
    website_url: row.website_url || undefined,
    source_url: row.source_url || undefined,
    tags: [],
    bitrate: row.bitrate_kbps || 128,
    codec: row.codec || 'MP3',
    frequency: frequency,
    band_type: normalizeBandType(row.band_type),
    latitude: row.latitude || undefined,
    longitude: row.longitude || undefined,
    power_kw: row.power_kw || undefined,
    call_sign: row.call_sign || undefined,
    genre: row.genre || undefined,
    genre_category: row.genre_category || undefined,
    status: row.status || undefined,
    created_at: row.created_at,
    logo_url: row.logo_url || undefined,
    logo_source: (row.logo_source as 'radio-browser' | 'favicon' | 'generated' | 'manual') || undefined,
    logo_verified: row.logo_verified || undefined,
    logo_last_checked: row.logo_last_checked || undefined,
    license_tier: (row.license_tier as 'safe' | 'restricted' | 'unknown') || 'unknown',
    owner: row.owner || undefined,
    last_check_ok: row.status === 'Active',
    source_table: row.source_table
  };
}

function normalizeBandType(bandType: string): BandType {
  const upper = bandType.toUpperCase();
  if (upper === 'AM') return 'AM';
  if (upper === 'FM') return 'FM';
  if (upper.startsWith('SW')) {
    if (upper === 'SW1') return 'SW1';
    if (upper === 'SW2') return 'SW2';
    if (upper === 'SW3') return 'SW3';
    return 'SW';
  }
  return 'FM';
}

export const radioService = {
  async getStationsByLocation(countryCode: string, limit = 50, offset = 0): Promise<RadioStation[]> {
    const { data, error } = await supabase
      .from('stations_view')
      .select('*')
      .eq('country_code', countryCode)
      .eq('is_active', true)
      .order('bitrate_kbps', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return (data || []).map(mapStationFromView);
  },

  async getStationsByLocationWithCount(countryCode: string, limit = 50, offset = 0): Promise<{ stations: RadioStation[], total: number }> {
    // Get total count
    const { count, error: countError } = await supabase
      .from('stations_view')
      .select('*', { count: 'exact', head: true })
      .eq('country_code', countryCode)
      .eq('is_active', true);

    if (countError) throw countError;

    // Get stations
    const { data, error } = await supabase
      .from('stations_view')
      .select('*')
      .eq('country_code', countryCode)
      .eq('is_active', true)
      .order('bitrate_kbps', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return {
      stations: (data || []).map(mapStationFromView),
      total: count || 0
    };
  },

  async getStationsByBand(bandType: BandType, countryCode?: string): Promise<RadioStation[]> {
    let query = supabase
      .from('stations_view')
      .select('*')
      .or(`band_type.eq.${bandType},band_type.ilike.${bandType}%`)
      .eq('is_active', true)
      .order('frequency_khz', { ascending: true });

    if (countryCode) {
      query = query.eq('country_code', countryCode);
    }

    const { data, error } = await query.limit(200);

    if (error) throw error;
    return (data || []).map(mapStationFromView);
  },

  async getStationsByProximity(
    bandType: BandType,
    latitude: number,
    longitude: number,
    radiusKm: number = 500
  ): Promise<RadioStation[]> {
    const latDelta = (radiusKm / 111.0);
    const lonDelta = (radiusKm / (111.0 * Math.cos(this.toRad(latitude))));

    const minLat = latitude - latDelta;
    const maxLat = latitude + latDelta;
    const minLon = longitude - lonDelta;
    const maxLon = longitude + lonDelta;

    const { data, error } = await supabase
      .from('stations_view')
      .select('*')
      .or(`band_type.eq.${bandType},band_type.ilike.${bandType}%`)
      .eq('is_active', true)
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .gte('latitude', minLat)
      .lte('latitude', maxLat)
      .gte('longitude', minLon)
      .lte('longitude', maxLon)
      .limit(500);

    if (error) throw error;

    if (!data) return [];

    const stations = data.map(mapStationFromView);
    const stationsWithDistance = stations.map(station => {
      const distance = this.calculateDistance(
        latitude,
        longitude,
        station.latitude!,
        station.longitude!
      );
      return { ...station, distance };
    });

    const nearbyStations = stationsWithDistance
      .filter(station => station.distance <= radiusKm)
      .sort((a, b) => (a as any).distance - (b as any).distance)
      .slice(0, 100);

    return nearbyStations;
  },

  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  },

  toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  },

  async getAllStations(limit = 200, offset = 0): Promise<RadioStation[]> {
    const { data, error } = await supabase
      .from('stations_view')
      .select('*')
      .eq('is_active', true)
      .order('bitrate_kbps', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    const stations = (data || []).map(mapStationFromView);

    const genreCounts = stations.reduce((acc, s) => {
      if (s.genre_category) {
        acc[s.genre_category] = (acc[s.genre_category] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    console.log('[getAllStations] Genre distribution:', genreCounts);
    console.log('[getAllStations] Total stations loaded:', stations.length);

    return stations;
  },

  async searchStations(query: string, countryCodeOrBandType?: string, limit = 50): Promise<RadioStation[]> {
    let supabaseQuery = supabase
      .from('stations_view')
      .select('*')
      .eq('is_active', true)
      .or(`station_name.ilike.%${query}%,city_name.ilike.%${query}%,country_name.ilike.%${query}%,language.ilike.%${query}%,genre.ilike.%${query}%,genre_category.ilike.%${query}%`);

    // Check if it's a country code (2 letters) or band type
    if (countryCodeOrBandType) {
      if (countryCodeOrBandType.length === 2) {
        // Country code filter
        supabaseQuery = supabaseQuery.eq('country_code', countryCodeOrBandType);
      } else {
        // Band type filter
        supabaseQuery = supabaseQuery.or(`band_type.eq.${countryCodeOrBandType},band_type.ilike.${countryCodeOrBandType}%`);
      }
    }

    const { data, error } = await supabaseQuery
      .order('station_name', { ascending: true })
      .limit(limit);

    if (error) throw error;
    return (data || []).map(mapStationFromView);
  },

  async addListeningHistory(stationId: string) {
    if (stationId.startsWith('legacy_') || stationId.startsWith('sw_')) {
      return;
    }

    const { error } = await supabase
      .from('listening_history')
      .insert({ station_id: stationId });

    if (error) console.error('Failed to add listening history:', error);
  },

  async getUserLocation(): Promise<UserLocation | null> {
    try {
      const response = await fetch('https://ipapi.co/json/');
      const data = await response.json();

      return {
        country: data.country_name || 'United States',
        country_code: data.country_code || 'US',
        city: data.city || 'San Francisco',
        latitude: data.latitude || 37.7749,
        longitude: data.longitude || -122.4194,
        timezone: data.timezone || 'America/Los_Angeles'
      };
    } catch (error) {
      console.error('Failed to get user location:', error);
      return {
        country: 'United States',
        country_code: 'US',
        city: 'San Francisco',
        latitude: 37.7749,
        longitude: -122.4194,
        timezone: 'America/Los_Angeles'
      };
    }
  },

  async getStationsByGenre(genreCategory: string, limit = 1000): Promise<RadioStation[]> {
    const { data, error } = await supabase.rpc('get_stations_by_genre', {
      p_genre_category: genreCategory,
      p_limit: limit
    });

    if (error) {
      console.error('Error fetching stations by genre:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      return [];
    }

    return data.map(mapStationFromView);
  },

  async getStationsByCityAndBand(cityName: string, bandType: BandType): Promise<RadioStation[]> {
    const { data, error } = await supabase.rpc('get_stations_by_city_and_band', {
      input_city: cityName,
      input_band: bandType
    });

    if (error) {
      console.error('Error fetching stations by city and band:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      console.log(`No stations found for city "${cityName}" and band "${bandType}"`);
      return [];
    }

    const stations: RadioStation[] = data.map((row: any) => ({
      id: row.station_id,
      name: row.station_name,
      country: row.country_name || 'Unknown',
      country_code: '',
      city: row.city_name || undefined,
      language: 'unknown',
      stream_url: row.stream_url || undefined,
      homepage: row.source_url || undefined,
      website_url: row.source_url || undefined,
      source_url: row.source_url || undefined,
      tags: row.target_regions || [],
      bitrate: 128,
      codec: 'MP3',
      frequency: row.frequency_khz,
      band_type: normalizeBandType(row.band_type),
      latitude: row.latitude || undefined,
      longitude: row.longitude || undefined,
      power_kw: row.power_kw || undefined,
      call_sign: undefined,
      genre: undefined,
      status: 'Active',
      created_at: new Date().toISOString(),
      logo_url: row.logo_url || undefined,
      logo_source: (row.logo_source as 'radio-browser' | 'favicon' | 'generated' | 'manual') || undefined,
      logo_verified: row.logo_verified || undefined,
      logo_last_checked: row.logo_last_checked || undefined,
      owner: row.owner || undefined,
      last_check_ok: true,
      license_tier: (row.license_tier as 'safe' | 'restricted' | 'unknown') || 'unknown',
      source_table: bandType.startsWith('SW') ? 'shortwave' : 'fm_am'
    }));

    console.log(`Found ${stations.length} ${bandType} stations for ${cityName}`);
    return stations;
  },

  async getAvailableLanguages(): Promise<string[]> {
    try {
      const { getCanonicalLanguage, LANGUAGE_SYNONYMS } = await import('./languageSynonyms');

      const { data, error } = await supabase.rpc('get_distinct_languages');

      if (error) {
        console.warn('RPC function not available, falling back to client-side processing');

        const { data: rawData, error: queryError } = await supabase
          .from('stations_view')
          .select('language')
          .not('language', 'is', null)
          .neq('language', '')
          .limit(5000);

        if (queryError) {
          console.error('Error fetching languages:', queryError);
          return [];
        }

        const languageSet = new Set<string>();

        rawData.forEach((row) => {
          if (!row.language) return;
          const languages = row.language.split(',').map((lang: string) => {
            let cleaned = lang.trim().toLowerCase();
            cleaned = cleaned.replace(/^#/, '');
            cleaned = cleaned.replace(/^\d+\s+(additional|other)\s+languages?$/i, '');
            return cleaned;
          }).filter(lang => lang && lang.length > 1 && !lang.match(/^\d+$/));
          languages.forEach(lang => languageSet.add(lang));
        });

        return Array.from(languageSet).sort();
      }

      const canonicalLanguages = new Set<string>();
      const languagesWithoutSynonyms: string[] = [];

      data.forEach((lang: string) => {
        const canonical = getCanonicalLanguage(lang);
        if (canonical) {
          canonicalLanguages.add(canonical.displayName);
        } else {
          languagesWithoutSynonyms.push(lang.charAt(0).toUpperCase() + lang.slice(1));
        }
      });

      return [...Array.from(canonicalLanguages), ...languagesWithoutSynonyms].sort();
    } catch (error) {
      console.error('Error in getAvailableLanguages:', error);
      return [];
    }
  },

  async getStationsByLanguage(language: string, limit: number = 1000): Promise<RadioStation[]> {
    const { getAllSynonymsForLanguage } = await import('./languageSynonyms');
    const synonyms = getAllSynonymsForLanguage(language);

    console.log(`Searching for language: ${language} with synonyms: ${synonyms.join(', ')}`);

    let query = supabase
      .from('stations_view')
      .select('*')
      .not('stream_url', 'is', null)
      .neq('stream_url', '')
      .eq('is_active', true);

    if (synonyms.length > 0) {
      const orConditions = synonyms.map(syn => `language.ilike.%${syn}%`).join(',');
      query = query.or(orConditions);
    }

    const { data, error } = await query.limit(limit);

    if (error) {
      console.error('Error fetching stations by language:', error);
      return [];
    }

    const filtered = data.filter((station) => {
      if (!station.language) return false;
      const stationLanguages = station.language.toLowerCase().split(',').map((l: string) => l.trim());
      return stationLanguages.some((l: string) =>
        synonyms.some(syn => l === syn || l.includes(syn))
      );
    });

    console.log(`Found ${filtered.length} stations for language: ${language}`);
    return filtered.map(mapStationFromView);
  },

  async getAvailableGenres(): Promise<string[]> {
    const { data, error } = await supabase.rpc('get_distinct_genres');

    if (error) {
      console.error('Error fetching genres:', error);
      return [];
    }

    return data.map((row: any) => row.genre);
  },


  async getNewsstations(limit: number = 100): Promise<RadioStation[]> {
    return this.getStationsByGenre('news', limit);
  }
};
