import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface LogoResult {
  url: string | null;
  source: string | null;
}

const BROADCASTER_LOGOS: Record<string, LogoResult> = {
  'BBC': {
    url: 'https://www.bbc.co.uk/favicon.ico',
    source: 'broadcaster-favicon'
  },
  'DW': {
    url: 'https://www.dw.com/cssi/dwlogo-print.gif',
    source: 'broadcaster-official'
  },
  'Deutsche': {
    url: 'https://www.dw.com/cssi/dwlogo-print.gif',
    source: 'broadcaster-official'
  },
  'Deutche': {
    url: 'https://www.dw.com/cssi/dwlogo-print.gif',
    source: 'broadcaster-official'
  },
  'Radio Taiwan': {
    url: 'https://en.rti.org.tw/favicon.ico',
    source: 'broadcaster-favicon'
  },
  'NHK': {
    url: 'https://www3.nhk.or.jp/nhkworld/common/site_images/icon_nhkworld.png',
    source: 'broadcaster-official'
  },
  'RNZ': {
    url: 'https://www.rnz.co.nz/assets/rnz_logo-b32dc8edc4b2d143b49f66768d8b43c0fcb0be111d1c4a266fe12fd815f2f8e7.svg',
    source: 'broadcaster-official'
  },
  'KBS': {
    url: 'https://world.kbs.co.kr/images/common/logo_kbs.png',
    source: 'broadcaster-official'
  },
  'AIR': {
    url: 'https://newsonair.gov.in/favicon.ico',
    source: 'broadcaster-favicon'
  },
  'CRI': {
    url: 'https://english.cri.cn/favicon.ico',
    source: 'broadcaster-favicon'
  },
  'WINB': {
    url: 'https://winb.com/favicon.ico',
    source: 'broadcaster-favicon'
  }
};

async function extractLogoFromWebsite(url: string): Promise<LogoResult> {
  try {
    const domain = new URL(url).hostname;

    const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;

    return {
      url: faviconUrl,
      source: 'google-favicon'
    };
  } catch (error) {
    console.error(`Failed to extract logo from ${url}:`, error);
    return { url: null, source: null };
  }
}

function matchBroadcaster(stationName: string, ituCode: string | null): LogoResult {
  if (ituCode && BROADCASTER_LOGOS[ituCode]) {
    return BROADCASTER_LOGOS[ituCode];
  }

  for (const [key, logo] of Object.entries(BROADCASTER_LOGOS)) {
    if (stationName.includes(key) || ituCode?.includes(key)) {
      return logo;
    }
  }

  return { url: null, source: null };
}

async function enrichShortwaveLogos() {
  console.log('🔍 Fetching shortwave stations without logos...\n');

  const { data: stations, error: fetchError } = await supabase
    .from('shortwave_stations')
    .select('sw_station_id, station_name, itu_code, source_url')
    .is('logo_url', null)
    .order('station_name');

  if (fetchError || !stations) {
    console.error('Failed to fetch stations:', fetchError);
    return;
  }

  console.log(`📊 Found ${stations.length} stations without logos\n`);

  const stats = {
    total: stations.length,
    processed: 0,
    matched: 0,
    extracted: 0,
    failed: 0
  };

  for (const station of stations) {
    stats.processed++;

    const logoMatch = matchBroadcaster(station.station_name, station.itu_code);

    let finalLogo: LogoResult = logoMatch;

    if (!logoMatch.url && station.source_url) {
      finalLogo = await extractLogoFromWebsite(station.source_url);

      if (finalLogo.url) {
        stats.extracted++;
        console.log(`🌐 ${station.station_name} → Extracted from website`);
      }
    } else if (logoMatch.url) {
      stats.matched++;
      console.log(`✅ ${station.station_name} → Matched ${logoMatch.source}`);
    }

    if (finalLogo.url) {
      const { error: updateError } = await supabase
        .from('shortwave_stations')
        .update({
          logo_url: finalLogo.url,
          logo_source: finalLogo.source,
          logo_verified: true,
          logo_last_checked: new Date().toISOString()
        })
        .eq('sw_station_id', station.sw_station_id);

      if (updateError) {
        console.error(`❌ Failed to update ${station.station_name}:`, updateError.message);
        stats.failed++;
      }
    } else {
      stats.failed++;
      console.log(`⏭️  ${station.station_name} → No logo found`);
    }

    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n📈 Enrichment Summary:');
  console.log(`   Total:     ${stats.total}`);
  console.log(`   Processed: ${stats.processed}`);
  console.log(`   Matched:   ${stats.matched}`);
  console.log(`   Extracted: ${stats.extracted}`);
  console.log(`   Failed:    ${stats.failed}`);
  console.log(`   Success:   ${Math.round((stats.matched + stats.extracted) / stats.total * 100)}%`);
}

enrichShortwaveLogos().catch(console.error);
