import { supabase } from './lib/supabase-node';

interface Station {
  id: string;
  name: string;
  homepage: string;
}

async function fetchFavicon(url: string): Promise<string | null> {
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

async function enrichLogos() {
  console.log('🎨 Starting logo enrichment for stations without logos...\n');
  
  const { data: stations, error } = await supabase
    .from('radio_stations')
    .select('id, name, homepage')
    .in('band_type', ['AM', 'FM'])
    .is('logo_url', null)
    .not('homepage', 'is', null) as { data: Station[] | null, error: any };
    
  if (error || !stations) {
    console.error('❌ Error fetching stations:', error);
    return;
  }
  
  console.log(`Found ${stations.length} stations to enrich\n`);
  
  for (const station of stations) {
    console.log(`🔍 ${station.name}`);
    console.log(`   Homepage: ${station.homepage}`);
    
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
        
      if (updateError) {
        console.log(`   ❌ Update failed: ${updateError.message}\n`);
      } else {
        console.log(`   ✅ Logo added: ${logoUrl}\n`);
      }
    } else {
      console.log(`   ⏭️  No favicon found\n`);
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('✅ Enrichment complete!');
}

enrichLogos().catch(console.error);
