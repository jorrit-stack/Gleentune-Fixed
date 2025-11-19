import { config } from 'dotenv';
import { supabase } from './lib/supabase-node';

config();

async function extractLogo(url: string): Promise<{ url: string; source: string } | null> {
  if (!url?.startsWith('http')) return null;
  try {
    const u = new URL(url);
    const fav = `${u.protocol}//${u.host}/favicon.ico`;
    const r = await fetch(fav, { method: 'HEAD', signal: AbortSignal.timeout(3000) });
    if (r.ok && r.headers.get('content-type')?.startsWith('image/')) {
      return { url: fav, source: 'favicon' };
    }
    const resp = await fetch(url, { signal: AbortSignal.timeout(8000) });
    const html = await resp.text();
    const og = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i);
    if (og) return { url: new URL(og[1], url).href, source: 'og-image' };
    const apple = html.match(/<link[^>]*rel=["']apple-touch-icon["'][^>]*href=["']([^"']+)["']/i);
    if (apple) return { url: new URL(apple[1], url).href, source: 'apple-touch-icon' };
  } catch {}
  return null;
}

async function enrichMajorCities() {
  console.log('🏙️  Enriching Major Cities: Mumbai, Delhi, Kolkata, Tokyo, Bhopal\n');

  const { data: stations } = await supabase
    .from('radio_stations')
    .select('id, name, homepage, city, country')
    .in('band_type', ['FM', 'AM'])
    .not('homepage', 'is', null)
    .eq('logo_source', 'generated')
    .or('city.ilike.%mumbai%,city.ilike.%delhi%,city.ilike.%kolkata%,city.ilike.%tokyo%,city.ilike.%bhopal%');

  if (!stations) {
    console.log('No stations found');
    return;
  }

  console.log(`Processing ${stations.length} stations...\n`);

  let success = 0;
  let failed = 0;

  for (const s of stations) {
    console.log(`📻 ${s.name} (${s.city}, ${s.country})`);
    console.log(`   ${s.homepage}`);

    const logo = await extractLogo(s.homepage!);
    if (logo) {
      await supabase.from('radio_stations').update({
        logo_url: logo.url,
        logo_source: logo.source,
        source_url: s.homepage,
        retrieved_at: new Date().toISOString(),
        logo_verified: true
      }).eq('id', s.id);
      console.log(`   ✅ Found ${logo.source} logo!`);
      success++;
    } else {
      console.log(`   ⏭️  No logo found`);
      failed++;
    }
    console.log();
    await new Promise(r => setTimeout(r, 1500));
  }

  console.log(`\n📊 Results:`);
  console.log(`   ✅ Successful: ${success}`);
  console.log(`   ❌ Failed: ${failed}`);
}

enrichMajorCities().catch(console.error);
