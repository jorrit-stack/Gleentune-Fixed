import { supabase } from '../../lib/supabase';
import type {
  RawStationData,
  NormalizedStation,
  NormalizedLocation,
  NormalizedSource,
} from './types';
import {
  resolveCountry,
  resolveCityByName,
  resolveCityByCoordinates,
  validateCoordinates,
  normalizeStationName,
  convertMhzToKhz,
} from './geocoding';

export async function getBandId(bandName: string): Promise<string | null> {
  const { data } = await supabase
    .from('bands')
    .select('band_id')
    .eq('band_name', bandName)
    .maybeSingle();

  return data?.band_id || null;
}

export async function normalizeRawStation(
  raw: RawStationData
): Promise<{
  station: NormalizedStation;
  location?: NormalizedLocation;
  source: Omit<NormalizedSource, 'stationId'>;
  cityId?: string;
} | null> {
  const bandId = await getBandId(raw.bandName);
  if (!bandId) {
    console.error(`Band not found: ${raw.bandName}`);
    return null;
  }

  let frequencyKhz: number;
  if (raw.frequencyKhz !== undefined) {
    frequencyKhz = raw.frequencyKhz;
  } else if (raw.frequencyMhz !== undefined) {
    frequencyKhz = convertMhzToKhz(raw.frequencyMhz);
  } else {
    console.warn(`No frequency data for station: ${raw.stationName}`);
    return null;
  }

  const station: NormalizedStation = {
    stationName: normalizeStationName(raw.stationName),
    callSign: raw.callSign,
    bandId,
    frequencyKhz,
    modulationType: raw.bandName === 'FM' ? 'FM' : raw.bandName === 'AM' ? 'AM' : undefined,
    powerKw: raw.powerKw,
    language: raw.language,
    contentType: raw.contentType,
    owner: raw.owner,
    licenseType: raw.licenseType,
    coverageRadiusKm: raw.coverageRadiusKm,
    status: 'Active',
    lastVerified: new Date().toISOString().split('T')[0],
    streamUrl: raw.streamUrl,
    licenseTier: raw.licenseTier || 'unknown',
  };

  const source: Omit<NormalizedSource, 'stationId'> = {
    sourceName: raw.sourceName,
    url: raw.sourceUrl,
    license: raw.sourceLicense,
    lastUpdated: new Date().toISOString().split('T')[0],
  };

  if (!validateCoordinates(raw.latitude, raw.longitude)) {
    return { station, source };
  }

  let cityId: string | null = null;

  if (raw.countryCode) {
    const countryId = await resolveCountry(raw.countryCode, raw.country);

    if (countryId && raw.city) {
      cityId = await resolveCityByName(
        raw.city,
        countryId,
        raw.latitude,
        raw.longitude
      );
    }
  }

  if (!cityId && raw.latitude && raw.longitude) {
    const geocoded = await resolveCityByCoordinates(raw.latitude, raw.longitude);
    if (geocoded) {
      cityId = geocoded.cityId;
    }
  }

  if (!cityId) {
    return { station, source };
  }

  const location = {
    cityId,
    transmitterLat: raw.latitude!,
    transmitterLong: raw.longitude!,
    altitudeM: undefined,
    notes: undefined,
  };

  return { station, source, location: location as NormalizedLocation, cityId };
}

export function deduplicateStations(
  normalized: Array<{
    station: NormalizedStation;
    location?: NormalizedLocation;
    source: Omit<NormalizedSource, 'stationId'>;
    cityId?: string;
  }>
): Array<{
  station: NormalizedStation;
  location?: NormalizedLocation;
  source: Omit<NormalizedSource, 'stationId'>;
  cityId?: string;
}> {
  const uniqueMap = new Map<string, typeof normalized[0]>();

  for (const item of normalized) {
    const key = `${item.station.frequencyKhz}-${item.cityId || 'no-city'}-${item.station.bandId}`;

    if (!uniqueMap.has(key)) {
      uniqueMap.set(key, item);
    } else {
      const existing = uniqueMap.get(key)!;
      if (item.station.streamUrl && !existing.station.streamUrl) {
        uniqueMap.set(key, item);
      }
    }
  }

  return Array.from(uniqueMap.values());
}

export async function checkExistingStation(
  frequencyKhz: number,
  bandId: string,
  cityId?: string
): Promise<string | null> {
  let query = supabase
    .from('stations')
    .select('station_id, station_locations(city_id)')
    .eq('frequency_khz', frequencyKhz)
    .eq('band_id', bandId);

  const { data } = await query;

  if (!data || data.length === 0) {
    return null;
  }

  if (!cityId) {
    return data[0].station_id;
  }

  for (const station of data) {
    const locations = Array.isArray(station.station_locations)
      ? station.station_locations
      : station.station_locations
      ? [station.station_locations]
      : [];

    if (locations.some((loc: any) => loc.city_id === cityId)) {
      return station.station_id;
    }
  }

  return null;
}
