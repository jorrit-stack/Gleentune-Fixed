import { supabase } from '../lib/supabase';

export interface LogoData {
  url: string;
  source: 'radio-browser' | 'favicon' | 'generated' | 'manual';
  verified: boolean;
  lastChecked: Date;
}

export async function fetchStationLogo(
  stationName: string,
  homepage?: string,
  radioBrowserFavicon?: string
): Promise<LogoData> {
  if (radioBrowserFavicon && radioBrowserFavicon.trim() !== '') {
    return {
      url: radioBrowserFavicon,
      source: 'radio-browser',
      verified: true,
      lastChecked: new Date(),
    };
  }

  if (homepage && homepage.trim() !== '') {
    try {
      const url = new URL(homepage);
      const faviconUrl = `${url.protocol}//${url.host}/favicon.ico`;

      return {
        url: faviconUrl,
        source: 'favicon',
        verified: false,
        lastChecked: new Date(),
      };
    } catch {
      return generateFallbackLogo(stationName);
    }
  }

  return generateFallbackLogo(stationName);
}

export function generateFallbackLogo(stationName: string): LogoData {
  const initials = getStationInitials(stationName);
  const colors = getColorFromName(stationName);

  const svg = `data:image/svg+xml,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${colors.start};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${colors.end};stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="120" height="120" rx="16" fill="url(#grad)" />
      <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="42" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="central">
        ${initials}
      </text>
    </svg>
  `)}`;

  return {
    url: svg,
    source: 'generated',
    verified: true,
    lastChecked: new Date(),
  };
}

function getStationInitials(name: string): string {
  const cleaned = name
    .replace(/^(Radio|FM|AM|SW|KEXP|WNYC|BBC|VOA|DW|RFI)\s+/i, '')
    .replace(/\s+(Radio|FM|AM)$/i, '')
    .trim();

  const words = cleaned.split(/[\s\-_]+/).filter(w => w.length > 0);

  if (words.length === 0) {
    return name.substring(0, 2).toUpperCase();
  }

  if (words.length === 1) {
    return words[0].substring(0, 2).toUpperCase();
  }

  return (words[0][0] + words[1][0]).toUpperCase();
}

function getColorFromName(name: string): { start: string; end: string } {
  const colors = [
    { start: '#3b82f6', end: '#1e40af' },
    { start: '#10b981', end: '#047857' },
    { start: '#f59e0b', end: '#d97706' },
    { start: '#ef4444', end: '#b91c1c' },
    { start: '#8b5cf6', end: '#6d28d9' },
    { start: '#ec4899', end: '#be185d' },
    { start: '#14b8a6', end: '#0f766e' },
    { start: '#f97316', end: '#c2410c' },
  ];

  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }

  const index = Math.abs(hash) % colors.length;
  return colors[index];
}

export async function updateStationLogo(
  table: 'radio_stations' | 'stations' | 'shortwave_stations',
  stationId: string,
  logoData: LogoData
): Promise<void> {
  const { error } = await supabase
    .from(table)
    .update({
      logo_url: logoData.url,
      logo_source: logoData.source,
      logo_verified: logoData.verified,
      logo_last_checked: logoData.lastChecked.toISOString(),
    })
    .eq(
      table === 'radio_stations' ? 'id' :
      table === 'stations' ? 'station_id' :
      'sw_station_id',
      stationId
    );

  if (error) {
    console.error('Error updating station logo:', error);
    throw error;
  }
}

export async function bulkPopulateLogos(
  table: 'radio_stations' | 'stations' | 'shortwave_stations',
  limit = 100
): Promise<number> {
  const idField =
    table === 'radio_stations' ? 'id' :
    table === 'stations' ? 'station_id' :
    'sw_station_id';

  const { data: stations, error } = await supabase
    .from(table)
    .select(`${idField}, name, station_name, homepage, favicon`)
    .is('logo_url', null)
    .limit(limit);

  if (error || !stations) {
    console.error('Error fetching stations:', error);
    return 0;
  }

  let updated = 0;

  for (const station of stations) {
    const name = (station as any).name || (station as any).station_name;
    const homepage = (station as any).homepage;
    const favicon = (station as any).favicon;

    const logoData = await fetchStationLogo(name, homepage, favicon);

    try {
      await updateStationLogo(table, (station as any)[idField], logoData);
      updated++;
    } catch (err) {
      console.error(`Failed to update logo for ${name}:`, err);
    }
  }

  return updated;
}
