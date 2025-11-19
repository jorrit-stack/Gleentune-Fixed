import { supabase } from '../../lib/supabase';
import type { GeocodingResult } from './types';

const GEONAMES_USERNAME = 'demo';

export async function resolveCountry(
  countryCode: string,
  countryName?: string
): Promise<string | null> {
  const { data: existing } = await supabase
    .from('countries')
    .select('country_id')
    .eq('iso_code', countryCode.toUpperCase())
    .maybeSingle();

  if (existing) {
    return existing.country_id;
  }

  if (!countryName) {
    return null;
  }

  const { data: created, error } = await supabase
    .from('countries')
    .insert({
      country_name: countryName,
      iso_code: countryCode.toUpperCase(),
      region: null,
    })
    .select('country_id')
    .single();

  if (error) {
    console.error('Error creating country:', error);
    return null;
  }

  return created.country_id;
}

export async function resolveCityByName(
  cityName: string,
  countryId: string,
  latitude?: number,
  longitude?: number
): Promise<string | null> {
  const { data: existing } = await supabase
    .from('cities')
    .select('city_id')
    .eq('city_name', cityName)
    .eq('country_id', countryId)
    .maybeSingle();

  if (existing) {
    return existing.city_id;
  }

  if (!latitude || !longitude) {
    return null;
  }

  const { data: created, error } = await supabase
    .from('cities')
    .insert({
      city_name: cityName,
      country_id: countryId,
      latitude,
      longitude,
      population: null,
    })
    .select('city_id')
    .single();

  if (error) {
    console.error('Error creating city:', error);
    return null;
  }

  return created.city_id;
}

export async function resolveCityByCoordinates(
  latitude: number,
  longitude: number
): Promise<GeocodingResult | null> {
  const { data: existing } = await supabase
    .from('cities')
    .select('city_id, city_name, country_id, latitude, longitude, population')
    .gte('latitude', latitude - 0.1)
    .lte('latitude', latitude + 0.1)
    .gte('longitude', longitude - 0.1)
    .lte('longitude', longitude + 0.1)
    .limit(1)
    .maybeSingle();

  if (existing) {
    return {
      cityId: existing.city_id,
      cityName: existing.city_name,
      countryId: existing.country_id,
      latitude: parseFloat(existing.latitude),
      longitude: parseFloat(existing.longitude),
      population: existing.population || undefined,
    };
  }

  try {
    const response = await fetch(
      `http://api.geonames.org/findNearbyPlaceNameJSON?lat=${latitude}&lng=${longitude}&username=${GEONAMES_USERNAME}&maxRows=1`
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    if (!data.geonames || data.geonames.length === 0) {
      return null;
    }

    const place = data.geonames[0];
    const countryId = await resolveCountry(place.countryCode, place.countryName);

    if (!countryId) {
      return null;
    }

    const cityId = await resolveCityByName(
      place.name,
      countryId,
      parseFloat(place.lat),
      parseFloat(place.lng)
    );

    if (!cityId) {
      return null;
    }

    return {
      cityId,
      cityName: place.name,
      countryId,
      latitude: parseFloat(place.lat),
      longitude: parseFloat(place.lng),
      population: place.population || undefined,
    };
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

export function validateCoordinates(lat?: number, lon?: number): boolean {
  if (lat === undefined || lon === undefined) {
    return false;
  }
  return lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
}

export function normalizeStationName(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\s*-\s*/g, ' - ')
    .replace(/\s*\(\s*/g, ' (')
    .replace(/\s*\)\s*/g, ') ');
}

export function convertMhzToKhz(mhz: number): number {
  return Math.round(mhz * 1000 * 1000) / 1000;
}
