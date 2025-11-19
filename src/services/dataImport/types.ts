export interface RawStationData {
  stationName: string;
  callSign?: string;
  frequencyMhz?: number;
  frequencyKhz?: number;
  bandName: 'AM' | 'FM' | 'SW1' | 'SW2' | 'SW3';
  country?: string;
  countryCode?: string;
  city?: string;
  state?: string;
  region?: string;
  latitude?: number;
  longitude?: number;
  powerKw?: number;
  language?: string;
  contentType?: string;
  owner?: string;
  licenseType?: string;
  coverageRadiusKm?: number;
  streamUrl?: string;
  sourceName: string;
  sourceUrl?: string;
  sourceLicense: string;
  licenseTier?: 'safe' | 'restricted' | 'unknown';
}

export interface NormalizedStation {
  stationId?: string;
  stationName: string;
  callSign?: string;
  bandId: string;
  frequencyKhz: number;
  modulationType?: string;
  powerKw?: number;
  language?: string;
  contentType?: string;
  owner?: string;
  licenseType?: string;
  coverageRadiusKm?: number;
  status: 'Active' | 'Inactive';
  lastVerified: string;
  streamUrl?: string;
  licenseTier?: 'safe' | 'restricted' | 'unknown';
}

export interface NormalizedLocation {
  stationId: string;
  cityId: string;
  transmitterLat: number;
  transmitterLong: number;
  altitudeM?: number;
  notes?: string;
}

export interface NormalizedSource {
  stationId: string;
  sourceName: string;
  url?: string;
  license: string;
  lastUpdated: string;
}

export interface ImportResult {
  success: boolean;
  imported: number;
  skipped: number;
  errors: string[];
  details: {
    stations: number;
    locations: number;
    sources: number;
  };
}

export interface GeocodingResult {
  cityId: string;
  cityName: string;
  countryId: string;
  latitude: number;
  longitude: number;
  population?: number;
}

export interface BatchImportConfig {
  batchSize: number;
  validateFrequency: boolean;
  deduplicateByFrequency: boolean;
  skipInvalidCoordinates: boolean;
  logErrors: boolean;
}
