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

    // Try favicon first (fastest)
    const faviconUrl = `${urlObj.protocol}//${urlObj.host}/favicon.ico`;
    try {
      const faviconResponse = await fetch(faviconUrl, {
        method: 'HEAD',
        signal: AbortSignal.timeout(5000)
      });

      if (faviconResponse.ok && faviconResponse.headers.get('content-type')?.startsWith('image/')) {
        const size = parseInt(faviconResponse.headers.get('content-length') || '0');
        if (size > 0 && size <= 30000) {
          return { url: faviconUrl, source: 'favicon', sourceUrl: websiteUrl };
        }
      }
    } catch {}

    // Try fetching the page for meta images
    const response = await fetch(websiteUrl, {
      signal: AbortSignal.timeout(10000),
      headers: { 'User-Agent': 'RadioCatalogBot/1.0 (Logo Attribution Bot)' }
    });

    if (!response.ok) return null;
    const html = await response.text();

    // Try og:image
    const ogMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i);
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

    // Try link icon
    const linkMatch = html.match(/<link[^>]*rel=["']icon["'][^>]*href=["']([^"']+)["']/i);
    if (linkMatch) {
      const imageUrl = new URL(linkMatch[1], websiteUrl).href;
      return { url: imageUrl, source: 'link-icon', sourceUrl: websiteUrl };
    }

    return null;
  } catch (error) {
    return null;
  }
}

async function enrichStationsTable() {
  console.log('🎨 Enriching STATIONS TABLE (Main Schema)\n');

  const { data: stations } = await supabase
    .from('stations')
    .select(`
      station_id,
      station_name,
      website_url,
      logo_url,
      logo_source,
      bands!inner(band_name),
      station_locations(cities(city_name, countries(country_name)))
    `)
    .in('bands.band_name', ['FM', 'AM'])
    .not('website_url', 'is', null)
    .neq('website_url', '')
    .or('logo_url.is.null,logo_source.is.null,logo_source.eq.generated')
    .limit(100);

  if (!stations || stations.length === 0) {
    console.log('No stations to enrich in stations table');
    return;
  }

  console.log(`Found ${stations.length} stations with websites\n`);

  let successful = 0;
  let failed = 0;

  for (const station of stations) {
    const city = station.station_locations?.[0]?.cities?.city_name || 'Unknown';
    const country = station.station_locations?.[0]?.cities?.countries?.country_name || 'Unknown';

    console.log(`📻 ${station.station_name} (${city}, ${country})`);
    console.log(`   ${station.website_url}`);

    const logo = await extractLogo(station.website_url);

    if (logo) {
      const { error } = await supabase
        .from('stations')
        .update({
          logo_url: logo.url,
          logo_source: logo.source,
          source_url: logo.sourceUrl,
          retrieved_at: new Date().toISOString(),
          logo_verified: true,
          logo_last_checked: new Date().toISOString()
        })
        .eq('station_id', station.station_id);

      if (!error) {
        console.log(`   ✅ Found ${logo.source} logo!`);
        successful++;
      } else {
        console.log(`   ❌ Database error: ${error.message}`);
        failed++;
      }
    } else {
      console.log(`   ⏭️  No logo found`);
      failed++;
    }

    await new Promise(resolve => setTimeout(resolve, 1500));
  }

  console.log(`\n📊 Stations Table Results:`);
  console.log(`   ✅ Successful: ${successful}`);
  console.log(`   ❌ Failed: ${failed}`);
}

async function enrichRadioStationsTable() {
  console.log('\n🎨 Enriching RADIO_STATIONS TABLE (Legacy)\n');

  const { data: stations } = await supabase
    .from('radio_stations')
    .select('id, name, homepage, logo_source, city, country, band_type')
    .in('band_type', ['FM', 'AM'])
    .not('homepage', 'is', null)
    .neq('homepage', '')
    .eq('logo_source', 'generated')
    .limit(100);

  if (!stations || stations.length === 0) {
    console.log('No stations to enrich in radio_stations table');
    return;
  }

  console.log(`Found ${stations.length} stations with websites\n`);

  let successful = 0;
  let failed = 0;

  for (const station of stations) {
    console.log(`📻 ${station.name} (${station.city}, ${station.country})`);
    console.log(`   ${station.homepage}`);

    const logo = await extractLogo(station.homepage);

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
      console.log(`   ⏭️  No logo found`);
      failed++;
    }

    await new Promise(resolve => setTimeout(resolve, 1500));
  }

  console.log(`\n📊 Radio Stations Table Results:`);
  console.log(`   ✅ Successful: ${successful}`);
  console.log(`   ❌ Failed: ${failed}`);
}

async function main() {
  console.log('🚀 COMPREHENSIVE LOGO ENRICHMENT\n');
  console.log('This will enrich BOTH tables:\n');
  console.log('1. stations table (main schema) - 1,419 stations');
  console.log('2. radio_stations table (legacy) - 417 stations\n');
  console.log('Processing 100 stations from each table...\n');
  console.log('='.repeat(60) + '\n');

  await enrichStationsTable();
  await enrichRadioStationsTable();

  console.log('\n' + '='.repeat(60));
  console.log('✅ ENRICHMENT COMPLETE!\n');
  console.log('To continue enriching more stations, run this script again.');
}

main().catch(console.error);
