import { config } from 'dotenv';
import { supabase } from './lib/supabase-node';

config();

async function extractLogo(websiteUrl: string): Promise<{ url: string; source: string } | null> {
  if (!websiteUrl || !websiteUrl.startsWith('http')) return null;

  try {
    const urlObj = new URL(websiteUrl);
    const faviconUrl = `${urlObj.protocol}//${urlObj.host}/favicon.ico`;

    const faviconResponse = await fetch(faviconUrl, {
      method: 'HEAD',
      signal: AbortSignal.timeout(3000)
    });

    if (faviconResponse.ok && faviconResponse.headers.get('content-type')?.startsWith('image/')) {
      return { url: faviconUrl, source: 'favicon' };
    }

    const response = await fetch(websiteUrl, {
      signal: AbortSignal.timeout(8000),
      headers: { 'User-Agent': 'RadioCatalogBot/1.0' }
    });

    if (!response.ok) return null;
    const html = await response.text();

    const ogMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i);
    if (ogMatch) {
      return { url: new URL(ogMatch[1], websiteUrl).href, source: 'og-image' };
    }

    const appleMatch = html.match(/<link[^>]*rel=["']apple-touch-icon["'][^>]*href=["']([^"']+)["']/i);
    if (appleMatch) {
      return { url: new URL(appleMatch[1], websiteUrl).href, source: 'apple-touch-icon' };
    }

    return null;
  } catch {
    return null;
  }
}

async function enrichStations() {
  console.log('🚀 FAST BATCH ENRICHMENT - Processing ALL stations\n');

  const { data: stations } = await supabase
    .from('stations')
    .select('station_id, station_name, website_url, bands!inner(band_name)')
    .in('bands.band_name', ['FM', 'AM'])
    .not('website_url', 'is', null)
    .neq('website_url', '')
    .or('logo_url.is.null,logo_source.is.null,logo_source.eq.generated');

  if (!stations || stations.length === 0) {
    console.log('No stations found');
    return;
  }

  console.log(`Processing ${stations.length} stations...\n`);

  let successful = 0;
  let failed = 0;
  let processed = 0;

  for (const station of stations) {
    const logo = await extractLogo(station.website_url);

    if (logo) {
      await supabase
        .from('stations')
        .update({
          logo_url: logo.url,
          logo_source: logo.source,
          source_url: station.website_url,
          retrieved_at: new Date().toISOString(),
          logo_verified: true
        })
        .eq('station_id', station.station_id);

      successful++;
    } else {
      failed++;
    }

    processed++;
    if (processed % 10 === 0) {
      process.stdout.write(`\r✅ ${successful} | ❌ ${failed} | Progress: ${processed}/${stations.length}`);
    }

    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log(`\n\n📊 Final Results:`);
  console.log(`   ✅ Successful: ${successful}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   📈 Success rate: ${((successful / (successful + failed)) * 100).toFixed(1)}%`);
}

enrichStations().catch(console.error);
