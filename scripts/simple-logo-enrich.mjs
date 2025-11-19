import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fetchFavicon(url) {
  try {
    const domain = new URL(url).origin;
    const faviconUrl = `${domain}/favicon.ico`;
    
    const response = await fetch(faviconUrl, { 
      method: 'HEAD',
      signal: AbortSignal.timeout(5000)
    });
    
    if (response.ok) {
      return faviconUrl;
    }
    return null;
  } catch (error) {
    return null;
  }
}

async function main() {
  console.log('🎨 Starting logo enrichment...\n');
  
  const { data: stations, error } = await supabase
    .from('radio_stations')
    .select('id, name, homepage')
    .in('band_type', ['AM', 'FM'])
    .is('logo_url', null)
    .not('homepage', 'is', null);
    
  if (error) {
    console.error('❌ Error:', error.message);
    return;
  }
  
  console.log(`Found ${stations.length} stations\n`);
  
  for (const station of stations) {
    console.log(`🔍 ${station.name}: ${station.homepage}`);
    
    const logoUrl = await fetchFavicon(station.homepage);
    
    if (logoUrl) {
      const { error: updateError } = await supabase
        .from('radio_stations')
        .update({ 
          logo_url: logoUrl,
          logo_source: 'favicon',
          logo_last_checked: new Date().toISOString()
        })
        .eq('id', station.id);
        
      console.log(updateError ? `   ❌ ${updateError.message}` : `   ✅ ${logoUrl}`);
    } else {
      console.log(`   ⏭️  No favicon`);
    }
    console.log('');
    await new Promise(r => setTimeout(r, 1000));
  }
  
  console.log('✅ Done!');
}

main();
