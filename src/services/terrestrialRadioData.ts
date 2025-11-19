import { supabase } from '../lib/supabase';

interface TerrestrialStation {
  name: string;
  frequency: number;
  city: string;
  state: string;
  country: string;
  country_code: string;
  latitude: number;
  longitude: number;
  stream_url?: string;
}

const INDIAN_FM_STATIONS: TerrestrialStation[] = [
  { name: 'Radio Mirchi', frequency: 98.3, city: 'Kolkata', state: 'West Bengal', country: 'India', country_code: 'IN', latitude: 22.5726, longitude: 88.3639 },
  { name: 'Air Rainbow', frequency: 107.0, city: 'Kolkata', state: 'West Bengal', country: 'India', country_code: 'IN', latitude: 22.5726, longitude: 88.3639 },
  { name: 'BIG FM', frequency: 92.7, city: 'Kolkata', state: 'West Bengal', country: 'India', country_code: 'IN', latitude: 22.5726, longitude: 88.3639 },
  { name: 'Radio Aamar FM', frequency: 106.2, city: 'Kolkata', state: 'West Bengal', country: 'India', country_code: 'IN', latitude: 22.5726, longitude: 88.3639 },
  { name: 'Air Gold', frequency: 100.2, city: 'Kolkata', state: 'West Bengal', country: 'India', country_code: 'IN', latitude: 22.5726, longitude: 88.3639 },
  { name: 'Red FM', frequency: 93.5, city: 'Kolkata', state: 'West Bengal', country: 'India', country_code: 'IN', latitude: 22.5726, longitude: 88.3639 },
  { name: 'Fever FM', frequency: 104.0, city: 'Kolkata', state: 'West Bengal', country: 'India', country_code: 'IN', latitude: 22.5726, longitude: 88.3639 },
  { name: 'Radio One', frequency: 94.3, city: 'Kolkata', state: 'West Bengal', country: 'India', country_code: 'IN', latitude: 22.5726, longitude: 88.3639 },
  { name: 'Vividh Bharati', frequency: 101.8, city: 'Kolkata', state: 'West Bengal', country: 'India', country_code: 'IN', latitude: 22.5726, longitude: 88.3639 },
  { name: 'Ishq FM', frequency: 104.8, city: 'Kolkata', state: 'West Bengal', country: 'India', country_code: 'IN', latitude: 22.5726, longitude: 88.3639 },
  { name: 'Radio Gyan Vani', frequency: 105.4, city: 'Kolkata', state: 'West Bengal', country: 'India', country_code: 'IN', latitude: 22.5726, longitude: 88.3639 },

  { name: 'Radio Mirchi', frequency: 98.3, city: 'Mumbai', state: 'Maharashtra', country: 'India', country_code: 'IN', latitude: 19.0760, longitude: 72.8777 },
  { name: 'BIG FM', frequency: 92.7, city: 'Mumbai', state: 'Maharashtra', country: 'India', country_code: 'IN', latitude: 19.0760, longitude: 72.8777 },
  { name: 'Red FM', frequency: 93.5, city: 'Mumbai', state: 'Maharashtra', country: 'India', country_code: 'IN', latitude: 19.0760, longitude: 72.8777 },
  { name: 'Radio One', frequency: 94.3, city: 'Mumbai', state: 'Maharashtra', country: 'India', country_code: 'IN', latitude: 19.0760, longitude: 72.8777 },
  { name: 'Fever FM', frequency: 104.0, city: 'Mumbai', state: 'Maharashtra', country: 'India', country_code: 'IN', latitude: 19.0760, longitude: 72.8777 },
  { name: 'Radio City', frequency: 91.1, city: 'Mumbai', state: 'Maharashtra', country: 'India', country_code: 'IN', latitude: 19.0760, longitude: 72.8777 },
  { name: 'Vividh Bharati', frequency: 100.7, city: 'Mumbai', state: 'Maharashtra', country: 'India', country_code: 'IN', latitude: 19.0760, longitude: 72.8777 },

  { name: 'Radio Mirchi', frequency: 98.3, city: 'Delhi', state: 'Delhi', country: 'India', country_code: 'IN', latitude: 28.7041, longitude: 77.1025 },
  { name: 'BIG FM', frequency: 92.7, city: 'Delhi', state: 'Delhi', country: 'India', country_code: 'IN', latitude: 28.7041, longitude: 77.1025 },
  { name: 'Red FM', frequency: 93.5, city: 'Delhi', state: 'Delhi', country: 'India', country_code: 'IN', latitude: 28.7041, longitude: 77.1025 },
  { name: 'Radio One', frequency: 94.3, city: 'Delhi', state: 'Delhi', country: 'India', country_code: 'IN', latitude: 28.7041, longitude: 77.1025 },
  { name: 'Fever FM', frequency: 104.0, city: 'Delhi', state: 'Delhi', country: 'India', country_code: 'IN', latitude: 28.7041, longitude: 77.1025 },
  { name: 'Radio City', frequency: 91.1, city: 'Delhi', state: 'Delhi', country: 'India', country_code: 'IN', latitude: 28.7041, longitude: 77.1025 },

  { name: 'Radio Mirchi', frequency: 98.3, city: 'Bangalore', state: 'Karnataka', country: 'India', country_code: 'IN', latitude: 12.9716, longitude: 77.5946 },
  { name: 'BIG FM', frequency: 92.7, city: 'Bangalore', state: 'Karnataka', country: 'India', country_code: 'IN', latitude: 12.9716, longitude: 77.5946 },
  { name: 'Red FM', frequency: 93.5, city: 'Bangalore', state: 'Karnataka', country: 'India', country_code: 'IN', latitude: 12.9716, longitude: 77.5946 },
  { name: 'Radio One', frequency: 95.0, city: 'Bangalore', state: 'Karnataka', country: 'India', country_code: 'IN', latitude: 12.9716, longitude: 77.5946 },
  { name: 'Fever FM', frequency: 104.0, city: 'Bangalore', state: 'Karnataka', country: 'India', country_code: 'IN', latitude: 12.9716, longitude: 77.5946 },
  { name: 'Radio City', frequency: 91.1, city: 'Bangalore', state: 'Karnataka', country: 'India', country_code: 'IN', latitude: 12.9716, longitude: 77.5946 },

  { name: 'Radio Mirchi', frequency: 98.3, city: 'Chennai', state: 'Tamil Nadu', country: 'India', country_code: 'IN', latitude: 13.0827, longitude: 80.2707 },
  { name: 'BIG FM', frequency: 92.7, city: 'Chennai', state: 'Tamil Nadu', country: 'India', country_code: 'IN', latitude: 13.0827, longitude: 80.2707 },
  { name: 'Red FM', frequency: 93.5, city: 'Chennai', state: 'Tamil Nadu', country: 'India', country_code: 'IN', latitude: 13.0827, longitude: 80.2707 },
  { name: 'Radio One', frequency: 94.3, city: 'Chennai', state: 'Tamil Nadu', country: 'India', country_code: 'IN', latitude: 13.0827, longitude: 80.2707 },
  { name: 'Fever FM', frequency: 104.0, city: 'Chennai', state: 'Tamil Nadu', country: 'India', country_code: 'IN', latitude: 13.0827, longitude: 80.2707 },
  { name: 'Radio City', frequency: 91.1, city: 'Chennai', state: 'Tamil Nadu', country: 'India', country_code: 'IN', latitude: 13.0827, longitude: 80.2707 },

  { name: 'Radio Mirchi', frequency: 98.3, city: 'Hyderabad', state: 'Telangana', country: 'India', country_code: 'IN', latitude: 17.3850, longitude: 78.4867 },
  { name: 'BIG FM', frequency: 92.7, city: 'Hyderabad', state: 'Telangana', country: 'India', country_code: 'IN', latitude: 17.3850, longitude: 78.4867 },
  { name: 'Red FM', frequency: 93.5, city: 'Hyderabad', state: 'Telangana', country: 'India', country_code: 'IN', latitude: 17.3850, longitude: 78.4867 },
  { name: 'Radio One', frequency: 95.0, city: 'Hyderabad', state: 'Telangana', country: 'India', country_code: 'IN', latitude: 17.3850, longitude: 78.4867 },
  { name: 'Fever FM', frequency: 104.0, city: 'Hyderabad', state: 'Telangana', country: 'India', country_code: 'IN', latitude: 17.3850, longitude: 78.4867 },

  { name: 'Radio Mirchi', frequency: 98.3, city: 'Pune', state: 'Maharashtra', country: 'India', country_code: 'IN', latitude: 18.5204, longitude: 73.8567 },
  { name: 'BIG FM', frequency: 92.7, city: 'Pune', state: 'Maharashtra', country: 'India', country_code: 'IN', latitude: 18.5204, longitude: 73.8567 },
  { name: 'Red FM', frequency: 93.5, city: 'Pune', state: 'Maharashtra', country: 'India', country_code: 'IN', latitude: 18.5204, longitude: 73.8567 },
  { name: 'Radio One', frequency: 94.3, city: 'Pune', state: 'Maharashtra', country: 'India', country_code: 'IN', latitude: 18.5204, longitude: 73.8567 },
];

export async function importTerrestrialStations() {
  try {
    const stationsToInsert = INDIAN_FM_STATIONS.map(station => ({
      name: `${station.name} ${station.city}`,
      country: station.country,
      country_code: station.country_code,
      state: station.state,
      language: 'hindi',
      stream_url: null,
      homepage: null,
      favicon: null,
      tags: [station.city, station.state, 'terrestrial', 'fm'],
      bitrate: 128,
      codec: 'MP3',
      frequency: station.frequency,
      band_type: 'FM' as const,
      latitude: station.latitude,
      longitude: station.longitude,
      last_check_ok: true
    }));

    const { error } = await supabase
      .from('radio_stations')
      .upsert(stationsToInsert, {
        onConflict: 'stream_url',
        ignoreDuplicates: true
      });

    if (error) {
      console.error('Error importing terrestrial stations:', error);
      return { success: false, count: 0 };
    }

    return { success: true, count: stationsToInsert.length };
  } catch (error) {
    console.error('Failed to import terrestrial stations:', error);
    return { success: false, count: 0 };
  }
}
