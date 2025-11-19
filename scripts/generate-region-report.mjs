import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, ANON_KEY);

async function generateRegionReport() {
  console.log('\n📊 INDIA RADIO ENRICHMENT STATUS - REGION BY REGION\n');
  console.log('='.repeat(100));

  // Get all Indian cities
  const { data: cities } = await supabase
    .from('stations_view')
    .select('city_name')
    .eq('country_code', 'IN')
    .eq('is_active', true)
    .not('city_name', 'is', null);

  const uniqueCities = [...new Set(cities.map(c => c.city_name))].sort();

  console.log(`\n🇮🇳 Found ${uniqueCities.length} cities with active stations\n`);

  const cityResults = [];

  for (const city of uniqueCities) {
    const { data: stats } = await supabase
      .from('stations_view')
      .select('band_type, stream_url, logo_url, website_url, source_table')
      .eq('country_code', 'IN')
      .eq('city_name', city)
      .eq('is_active', true);

    if (!stats || stats.length === 0) continue;

    const total = stats.length;
    const withStreams = stats.filter(s => s.stream_url).length;
    const withLogos = stats.filter(s => s.logo_url).length;
    const withWebsites = stats.filter(s => s.website_url).length;

    const streamPct = Math.round((withStreams / total) * 100);
    const logoPct = Math.round((withLogos / total) * 100);
    const websitePct = Math.round((withWebsites / total) * 100);

    cityResults.push({
      city,
      total,
      withStreams,
      withLogos,
      withWebsites,
      streamPct,
      logoPct,
      websitePct
    });
  }

  // Sort by total stations descending
  cityResults.sort((a, b) => b.total - a.total);

  // Print top cities
  console.log('📍 TOP CITIES BY NUMBER OF STATIONS:\n');
  cityResults.slice(0, 20).forEach(c => {
    const streamIcon = c.streamPct >= 80 ? '✅' : c.streamPct >= 50 ? '⚠️' : '❌';
    const logoIcon = c.logoPct >= 80 ? '✅' : c.logoPct >= 50 ? '⚠️' : '❌';
    const webIcon = c.websitePct >= 80 ? '✅' : c.websitePct >= 50 ? '⚠️' : '❌';

    console.log(`   ${c.city} - ${c.total} stations`);
    console.log(`      ${streamIcon} Streams:  ${c.withStreams}/${c.total} (${c.streamPct}%)`);
    console.log(`      ${logoIcon} Logos:    ${c.withLogos}/${c.total} (${c.logoPct}%)`);
    console.log(`      ${webIcon} Websites: ${c.withWebsites}/${c.total} (${c.websitePct}%)`);
    console.log();
  });

  // Overall summary
  console.log('='.repeat(100));
  console.log('\n📊 OVERALL INDIA SUMMARY\n');

  const { data: allStats } = await supabase
    .from('stations_view')
    .select('stream_url, logo_url, website_url, band_type, source_table')
    .eq('country_code', 'IN')
    .eq('is_active', true);

  const totalStations = allStats.length;
  const totalStreams = allStats.filter(s => s.stream_url).length;
  const totalLogos = allStats.filter(s => s.logo_url).length;
  const totalWebsites = allStats.filter(s => s.website_url).length;

  // By band
  const byBand = {};
  allStats.forEach(s => {
    const band = s.band_type || 'Unknown';
    if (!byBand[band]) {
      byBand[band] = { total: 0, streams: 0, logos: 0, websites: 0 };
    }
    byBand[band].total++;
    if (s.stream_url) byBand[band].streams++;
    if (s.logo_url) byBand[band].logos++;
    if (s.website_url) byBand[band].websites++;
  });

  console.log(`Total Active Stations: ${totalStations}`);
  console.log(`With Streams:  ${totalStreams}/${totalStations} (${Math.round((totalStreams/totalStations)*100)}%)`);
  console.log(`With Logos:    ${totalLogos}/${totalStations} (${Math.round((totalLogos/totalStations)*100)}%)`);
  console.log(`With Websites: ${totalWebsites}/${totalStations} (${Math.round((totalWebsites/totalStations)*100)}%)`);
  console.log();

  console.log('📊 BY BAND TYPE:\n');
  Object.keys(byBand).sort().forEach(band => {
    const b = byBand[band];
    const streamPct = Math.round((b.streams / b.total) * 100);
    const logoPct = Math.round((b.logos / b.total) * 100);
    const webPct = Math.round((b.websites / b.total) * 100);

    console.log(`   ${band}: ${b.total} stations`);
    console.log(`      Streams: ${b.streams}/${b.total} (${streamPct}%)`);
    console.log(`      Logos: ${b.logos}/${b.total} (${logoPct}%)`);
    console.log(`      Websites: ${b.websites}/${b.total} (${webPct}%)`);
    console.log();
  });

  console.log('='.repeat(100));
  console.log('\n🎯 ENRICHMENT OPPORTUNITIES:\n');

  const needStreams = totalStations - totalStreams;
  const needLogos = totalStations - totalLogos;
  const needWebsites = totalStations - totalWebsites;

  console.log(`   ⚠️  ${needStreams} stations missing streams (${Math.round((needStreams/totalStations)*100)}%)`);
  console.log(`   ⚠️  ${needLogos} stations missing logos (${Math.round((needLogos/totalStations)*100)}%)`);
  console.log(`   ⚠️  ${needWebsites} stations missing websites (${Math.round((needWebsites/totalStations)*100)}%)`);
  console.log();

  // Identify biggest gaps by band
  console.log('📊 BIGGEST GAPS BY BAND:\n');
  Object.keys(byBand).forEach(band => {
    const b = byBand[band];
    const missingStreams = b.total - b.streams;
    const missingLogos = b.total - b.logos;
    const missingWebsites = b.total - b.websites;

    if (missingStreams > 0 || missingLogos > 0 || missingWebsites > 0) {
      console.log(`   ${band}:`);
      if (missingStreams > 0) console.log(`      - ${missingStreams} missing streams`);
      if (missingLogos > 0) console.log(`      - ${missingLogos} missing logos`);
      if (missingWebsites > 0) console.log(`      - ${missingWebsites} missing websites`);
      console.log();
    }
  });

  console.log('='.repeat(100));
  console.log('\n✅ Report Generation Complete\n');
}

generateRegionReport()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
