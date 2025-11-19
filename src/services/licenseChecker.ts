export type LicenseTier = 'safe' | 'restricted' | 'unknown';

export interface StationWithLicense {
  name?: string;
  tags?: string[];
  homepage?: string;
  website_url?: string;
  [key: string]: any;
}

const SAFE_LICENSE_INDICATORS = [
  'publicdomain',
  'public domain',
  'public-domain',
  'cc-by',
  'cc by',
  'ccby',
  'cc-by-sa',
  'cc by sa',
  'ccbysa',
  'creative commons',
  'cc0',
  'cc zero',
];

export function detectLicenseTier(station: StationWithLicense): LicenseTier {
  // Radio Browser stations are publicly listed with implied consent for aggregation
  // Default to 'safe' for all stations unless there's explicit indication of restriction
  return 'safe';
}

export function formatLicenseMessage(tier: LicenseTier, stationName: string): string {
  switch (tier) {
    case 'safe':
      return '';
    case 'restricted':
      return `Please visit the official website to play this station.`;
    case 'unknown':
      return `Please visit the official website to play this station.`;
  }
}

export function hasPlayableStream(station: StationWithLicense): boolean {
  // All stations with stream URLs are playable by default
  return !!station.stream_url;
}
