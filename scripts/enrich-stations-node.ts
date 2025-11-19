import { config } from 'dotenv';
import { supabase } from './lib/supabase-node';

config();

interface ExtractedLogo {
  url: string;
  source: 'favicon' | 'og-image' | 'apple-touch-icon' | 'link-icon';
  sourceUrl: string;
}

async function extractLogo(websiteUrl: string): Promise<ExtractedLogo | null> {
  if (!websiteUrl || !websiteUrl.startsWith('http')) {
    return null;
  }

  try {
    const urlObj = new URL(websiteUrl);

    // Try favicon first
    const faviconUrl = `${urlObj.protocol}//${urlObj.host}/favicon.ico`;
    try {
      const faviconResponse = await fetch(faviconUrl, {
        method: 'HEAD',
        signal: AbortSignal.timeout(5000)
      });

      if (faviconResponse.ok && faviconResponse.headers.get('content-type')?.startsWith('image/')) {
        return {
          url: faviconUrl,
          source: 'favicon',
          sourceUrl: websiteUrl
        };
      }
    } catch {}

    // Try fetching the page for meta images
    const response = await fetch(websiteUrl, {
      signal: AbortSignal.timeout(10000),
      headers: {
        'User-Agent': 'RadioCatalogBot/1.0 (Logo Attribution Bot)'
      }
    });

    if (!response.ok) return null;

    const html = await response.text();

    // Try og:image
    const ogMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i) ||
                    html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i);

    if (ogMatch) {
      const imageUrl = new URL(ogMatch[1], websiteUrl).href;
      return { url: imageUrl, source: 'og-image', sourceUrl: websiteUrl };
    }

    // Try apple-touch-icon
    const appleMatch = html.match(/<link[^>]*rel=["']apple-touch-icon["'][^>]*href=["']([^"']+)["']/i);
    if (appleMatch) {
      const imageUrl = new URL(appleMatch[1], websiteUrl).href;
      return { url: imageUrl, source: 'apple-touch-icon', sourceUrl: websiteUrl };
    }

    return null;
  } catch (error) {
    return null;
  }
}

async function enrichBengaluruStations() {
  console.log('🎨 Enriching Bengaluru Station Logos\n');

  const { data: stations } = await supabase
    .from('radio_stations')
    .select('id, name, homepage, logo_source, city, band_type')
    .or('city.ilike.%bengaluru%,city.ilike.%bangalore%')
    .not('homepage', 'is', null)
    .eq('logo_source', 'generated');

  if (!stations || stations.length === 0) {
    console.log('No stations to enrich');
    return;
  }

  console.log(`Found ${stations.length} Bengaluru stations with websites\n`);

  let successful = 0;
  let failed = 0;

  for (const station of stations) {
    console.log(`📻 ${station.name}`);
    console.log(`   ${station.homepage}`);

    const logo = await extractLogo(station.homepage!);

    if (logo) {
      const { error } = await supabase
        .from('radio_stations')
        .update({
          logo_url: logo.url,
          logo_source: logo.source,
          source_url: logo.sourceUrl,
          retrieved_at: new Date().toISOString(),
          logo_verified: true,
          logo_last_checked: new Date().toISOString()
        })
        .eq('id', station.id);

      if (!error) {
        console.log(`   ✅ Found ${logo.source} logo!`);
        successful++;
      } else {
        console.log(`   ❌ Database error: ${error.message}`);
        failed++;
      }
    } else {
      console.log(`   ℹ️  No logo found`);
      failed++;
    }

    console.log();
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log(`\n✅ Complete!`);
  console.log(`   Successful: ${successful}`);
  console.log(`   Failed: ${failed}`);
}

enrichBengaluruStations().catch(console.error);
