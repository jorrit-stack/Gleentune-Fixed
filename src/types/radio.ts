export interface RadioStation {
  id: string;
  name: string;
  country: string;
  country_code: string;
  state?: string;
  city?: string;
  language: string;
  stream_url?: string;
  homepage?: string;
  website_url?: string;
  favicon?: string;
  tags: string[];
  bitrate: number;
  codec: string;
  frequency?: number;
  band_type: 'AM' | 'FM' | 'SW' | 'SW1' | 'SW2' | 'SW3';
  latitude?: number;
  longitude?: number;
  power_kw?: number;
  call_sign?: string;
  genre?: string;
  genre_category?: string;
  status?: string;
  created_at?: string;
  last_check_ok: boolean;
  source_table?: string;
  logo_url?: string;
  logo_source?: 'radio-browser' | 'favicon' | 'og-image' | 'apple-touch-icon' | 'link-icon' | 'generated' | 'manual';
  source_url?: string;
  retrieved_at?: string;
  logo_verified?: boolean;
  logo_last_checked?: string;
  license_tier?: 'safe' | 'restricted' | 'unknown';
  owner?: string;
  network?: string;
}

export interface UserLocation {
  country: string;
  country_code: string;
  city?: string;
  latitude: number;
  longitude: number;
  timezone?: string;
}

export type BandType = 'AM' | 'FM' | 'SW' | 'SW1' | 'SW2' | 'SW3';

export type ModeType = 'Radio' | 'Region' | 'Language' | 'Genre' | 'Search';
