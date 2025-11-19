import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

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

function generateFallbackLogo(stationName: string): string {
  const initials = getStationInitials(stationName);
  const colors = getColorFromName(stationName);

  return `data:image/svg+xml,${encodeURIComponent(`
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
}

async function populateLogosForTable(
  tableName: 'radio_stations' | 'stations' | 'shortwave_stations',
  batchSize = 100
) {
  console.log(`\n📸 Populating logos for ${tableName}...`);

  const idField = tableName === 'radio_stations' ? 'id' :
                  tableName === 'stations' ? 'station_id' :
                  'sw_station_id';

  const nameField = tableName === 'shortwave_stations' ? 'station_name' : 'name';

  let offset = 0;
  let totalUpdated = 0;

  while (true) {
    const { data: stations, error } = await supabase
      .from(tableName)
      .select(`${idField}, ${nameField}, homepage, favicon, logo_url`)
      .is('logo_url', null)
      .range(offset, offset + batchSize - 1);

    if (error) {
      console.error(`❌ Error fetching ${tableName}:`, error);
      break;
    }

    if (!stations || stations.length === 0) {
      break;
    }

    console.log(`Processing batch ${offset} to ${offset + stations.length}...`);

    for (const station of stations) {
      const name = (station as any)[nameField];
      const homepage = (station as any).homepage;
      const favicon = (station as any).favicon;
      const id = (station as any)[idField];

      let logoUrl: string;
      let logoSource: string;

      if (favicon && favicon.trim() !== '') {
        logoUrl = favicon;
        logoSource = 'radio-browser';
      } else if (homepage && homepage.trim() !== '') {
        try {
          const url = new URL(homepage);
          logoUrl = `${url.protocol}//${url.host}/favicon.ico`;
          logoSource = 'favicon';
        } catch {
          logoUrl = generateFallbackLogo(name);
          logoSource = 'generated';
        }
      } else {
        logoUrl = generateFallbackLogo(name);
        logoSource = 'generated';
      }

      const { error: updateError } = await supabase
        .from(tableName)
        .update({
          logo_url: logoUrl,
          logo_source: logoSource,
          logo_verified: logoSource === 'radio-browser' || logoSource === 'generated',
          logo_last_checked: new Date().toISOString(),
        })
        .eq(idField, id);

      if (updateError) {
        console.error(`❌ Error updating ${name}:`, updateError);
      } else {
        totalUpdated++;
      }
    }

    offset += batchSize;
  }

  console.log(`✅ Updated ${totalUpdated} stations in ${tableName}`);
  return totalUpdated;
}

async function main() {
  console.log('🚀 Starting logo population for all station tables...\n');

  try {
    const radioStationsCount = await populateLogosForTable('radio_stations');
    const stationsCount = await populateLogosForTable('stations');
    const shortwaveCount = await populateLogosForTable('shortwave_stations');

    console.log('\n✨ Logo population complete!');
    console.log(`📊 Summary:`);
    console.log(`   - radio_stations: ${radioStationsCount} updated`);
    console.log(`   - stations: ${stationsCount} updated`);
    console.log(`   - shortwave_stations: ${shortwaveCount} updated`);
    console.log(`   - Total: ${radioStationsCount + stationsCount + shortwaveCount} stations updated`);
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

main();
