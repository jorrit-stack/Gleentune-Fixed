import { config } from 'dotenv';
import { supabase } from './lib/supabase-node';

config();

async function fillLogoGaps() {
  console.log('🎨 Comprehensive Logo Gap Filling');
  console.log('==================================\n');

  let totalUpdated = 0;

  // Strategy 1: Use Google Favicon service for stations with valid homepages
  console.log('📍 Strategy 1: Google Favicon for valid homepages...');
  const { data: withHomepage } = await supabase
    .from('radio_stations')
    .select('id, name, homepage')
    .in('band_type', ['AM', 'FM'])
    .is('logo_url', null)
    .not('homepage', 'is', null);

  if (withHomepage && withHomepage.length > 0) {
    let strategy1Count = 0;

    for (const station of withHomepage) {
      // Skip streaming URLs
      if (station.homepage.includes('.mp3') ||
          station.homepage.includes('.m3u8') ||
          station.homepage.includes('.aac') ||
          station.homepage.includes('.pls') ||
          station.homepage.includes('icecast') ||
          station.homepage.includes('/api/') ||
          station.homepage.includes('/stream')) {
        continue;
      }

      // Extract proper domain from homepage
      let domain = station.homepage;
      try {
        const url = new URL(station.homepage);
        domain = url.origin;
      } catch {
        continue;
      }

      // Use Google's s2/favicons service - it works for any domain
      const logoUrl = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`;

      const { error } = await supabase
        .from('radio_stations')
        .update({
          logo_url: logoUrl,
          logo_source: 'google-favicon',
          source_url: domain,
          retrieved_at: new Date().toISOString(),
          logo_last_checked: new Date().toISOString()
        })
        .eq('id', station.id);

      if (!error) {
        strategy1Count++;
        totalUpdated++;
      }
    }

    console.log(`✅ Updated ${strategy1Count} stations with Google Favicon\n`);
  }

  // Strategy 2: For Facebook/social pages, use platform logos
  console.log('📍 Strategy 2: Social media platform logos...');
  const socialPlatforms = [
    { pattern: 'facebook.com', logo: 'https://www.facebook.com/images/fb_icon_325x325.png' },
    { pattern: 'instagram.com', logo: 'https://www.instagram.com/static/images/ico/favicon-192.png/68d99ba29cc8.png' },
    { pattern: 'twitter.com', logo: 'https://abs.twimg.com/favicons/twitter.3.ico' },
    { pattern: 'youtube.com', logo: 'https://www.youtube.com/s/desktop/12d6b690/img/favicon_144x144.png' }
  ];

  let strategy2Count = 0;
  for (const platform of socialPlatforms) {
    const { data: socialStations } = await supabase
      .from('radio_stations')
      .select('id')
      .in('band_type', ['AM', 'FM'])
      .is('logo_url', null)
      .like('homepage', `%${platform.pattern}%`);

    if (socialStations && socialStations.length > 0) {
      const { error } = await supabase
        .from('radio_stations')
        .update({
          logo_url: platform.logo,
          logo_source: 'social-platform',
          retrieved_at: new Date().toISOString()
        })
        .in('id', socialStations.map(s => s.id));

      if (!error) {
        strategy2Count += socialStations.length;
        totalUpdated += socialStations.length;
      }
    }
  }

  console.log(`✅ Updated ${strategy2Count} stations with social platform logos\n`);

  // Strategy 3: For stations without any homepage, try to construct logo from station name
  console.log('📍 Strategy 3: Generic fallback for stations without homepages...');
  const { data: noHomepage } = await supabase
    .from('radio_stations')
    .select('id, name')
    .in('band_type', ['AM', 'FM'])
    .is('logo_url', null)
    .or('homepage.is.null,homepage.eq.');

  let strategy3Count = 0;
  if (noHomepage && noHomepage.length > 0) {
    // Use a generic radio icon service or placeholder
    // For now, we'll use UI Avatars which generates text-based logos
    for (const station of noHomepage.slice(0, 100)) { // Limit to avoid too many
      const initials = station.name
        .split(' ')
        .filter(w => w.length > 0)
        .slice(0, 2)
        .map(w => w[0])
        .join('')
        .toUpperCase();

      const logoUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&size=128&background=4F46E5&color=fff&bold=true`;

      const { error } = await supabase
        .from('radio_stations')
        .update({
          logo_url: logoUrl,
          logo_source: 'generated',
          retrieved_at: new Date().toISOString()
        })
        .eq('id', station.id);

      if (!error) {
        strategy3Count++;
        totalUpdated++;
      }
    }
  }

  console.log(`✅ Updated ${strategy3Count} stations with generated logos\n`);

  console.log(`\n🎉 Total Updated: ${totalUpdated} stations\n`);

  // Final coverage report
  const { data: coverage } = await supabase
    .from('radio_stations')
    .select('band_type, logo_url')
    .in('band_type', ['AM', 'FM']);

  if (coverage) {
    console.log('📊 Final Logo Coverage');
    console.log('======================');

    const amTotal = coverage.filter(s => s.band_type === 'AM').length;
    const amWithLogos = coverage.filter(s => s.band_type === 'AM' && s.logo_url).length;
    const fmTotal = coverage.filter(s => s.band_type === 'FM').length;
    const fmWithLogos = coverage.filter(s => s.band_type === 'FM' && s.logo_url).length;

    console.log(`AM: ${amWithLogos}/${amTotal} (${((amWithLogos/amTotal)*100).toFixed(1)}%)`);
    console.log(`FM: ${fmWithLogos}/${fmTotal} (${((fmWithLogos/fmTotal)*100).toFixed(1)}%)`);
    console.log(`\nOverall: ${amWithLogos + fmWithLogos}/${amTotal + fmTotal} (${(((amWithLogos + fmWithLogos)/(amTotal + fmTotal))*100).toFixed(1)}%)`);
  }
}

fillLogoGaps().catch(console.error);
