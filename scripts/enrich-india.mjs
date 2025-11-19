import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, ANON_KEY);

async function fetchStationsByCountry(country) {
  const API_BASE = "https://de1.api.radio-browser.info/json";
  const url = `${API_BASE}/stations/bycountry/${encodeURIComponent(country)}`;

  console.log(`📡 Fetching stations from: ${url}`);

  const res = await fetch(url, {
    headers: { "User-Agent": "gleetune/1.0" },
  });

  if (!res.ok) {
    throw new Error(`Radio Browser API failed for ${country}: ${res.status}`);
  }

  return await res.json();
}

function detectLicenseTier(station) {
  const name = (station.name || '').toLowerCase();
  const tags = station.tags || [];
  const homepage = (station.homepage || '').toLowerCase();

  const restrictedKeywords = ['all rights reserved', 'copyright', '©', 'dmca'];
  const safeIndicators = ['creative commons', 'cc-by', 'public domain', 'royalty free'];

  for (const safe of safeIndicators) {
    if (name.includes(safe) || homepage.includes(safe) || tags.some(t => t.toLowerCase().includes(safe))) {
      return 'safe';
    }
  }

  for (const restricted of restrictedKeywords) {
    if (name.includes(restricted) || homepage.includes(restricted)) {
      return 'restricted';
    }
  }

  return 'unknown';
}

async function enrichIndiaStations() {
  console.log('🇮🇳 Phase 1: Matching Indian FM stations to Radio Browser\n');

  const results = { synced: 0, inserted: 0, updated: 0, errors: 0 };

  try {
    const remoteStations = await fetchStationsByCountry("India");
    console.log(`✅ Fetched ${remoteStations.length} stations from Radio Browser\n`);

    for (let i = 0; i < remoteStations.length; i++) {
      const s = remoteStations[i];

      try {
        // Check if station already exists by name and country
        const { data: existing } = await supabase
          .from("radio_stations")
          .select("id, name, stream_url")
          .eq("name", s.name)
          .eq("country", "India")
          .maybeSingle();

        const tags = s.tags ? s.tags.split(',') : [];
        const licenseTier = detectLicenseTier({
          name: s.name,
          tags,
          homepage: s.homepage
        });

        const payload = {
          stationuuid: s.stationuuid,
          changeuuid: s.changeuuid,
          serveruuid: s.serveruuid,
          url_resolved: s.url_resolved,
          stream_url: s.url_resolved || null,
          bitrate: s.bitrate,
          codec: s.codec,
          hls: s.hls === 1,
          votes: s.votes,
          clickcount: s.clickcount,
          clicktrend: s.clicktrend,
          clicktimestamp: s.clicktimestamp || null,
          lastchecktime: s.lastchecktime || null,
          lastcheckoktime: s.lastcheckoktime || null,
          lastchangetime: s.lastchangetime || null,
          lastlocalchecktime: s.lastlocalchecktime || null,
          is_active: s.lastcheckok === 1,
          last_check_ok: s.lastcheckok === 1,
          ssl_error: s.ssl_error === 1,
          languagecodes: s.languagecodes || null,
          has_extended_info: s.has_extended_info || false,
          homepage: s.homepage || null,
          favicon: s.favicon || null,
          tags: tags,
          iso_3166_2: s.iso_3166_2 || null,
          source: "radio_browser",
          license_tier: licenseTier,
          retrieved_at: new Date().toISOString(),
        };

        if (existing) {
          const { error } = await supabase
            .from("radio_stations")
            .update(payload)
            .eq("id", existing.id);

          if (error) throw error;
          results.updated++;
        } else {
          const { error } = await supabase
            .from("radio_stations")
            .insert({
              ...payload,
              name: s.name,
              country: s.country,
              country_code: s.countrycode,
              state: s.state,
              language: s.language,
              latitude: s.geo_lat,
              longitude: s.geo_long,
            });

          if (error) throw error;
          results.inserted++;
        }

        results.synced++;

        if ((i + 1) % 50 === 0) {
          process.stdout.write(`\r✏️  Updated: ${results.updated}, Inserted: ${results.inserted}, Errors: ${results.errors} | Progress: ${i + 1}/${remoteStations.length}`);
        }
      } catch (stationError) {
        console.error(`\n⚠️  Error processing station ${s.name}:`, stationError.message);
        results.errors++;
      }
    }

    console.log(`\n\n✅ Phase 1 Complete!`);
    console.log(`📊 Total Synced: ${results.synced}`);
    console.log(`   ➕ Inserted: ${results.inserted}`);
    console.log(`   ✏️  Updated: ${results.updated}`);
    console.log(`   ❌ Errors: ${results.errors}\n`);

    return results;
  } catch (error) {
    console.error('\n❌ Phase 1 failed:', error.message);
    throw error;
  }
}

async function generateRegionReport() {
  console.log('\n📊 Generating Region-by-Region Report\n');
  console.log('='.repeat(80));

  // Get all Indian cities
  const { data: cities } = await supabase
    .from('stations_view')
    .select('city_name, country_code')
    .eq('country_code', 'IN')
    .eq('is_active', true)
    .not('city_name', 'is', null);

  const uniqueCities = [...new Set(cities.map(c => c.city_name))].sort();

  console.log(`\n🇮🇳 INDIA - ENRICHMENT RESULTS BY CITY\n`);
  console.log(`Found ${uniqueCities.length} cities with stations\n`);

  for (const city of uniqueCities) {
    const { data: stats } = await supabase
      .from('stations_view')
      .select('band_type, stream_url, logo_url, website_url')
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

    const streamIcon = streamPct >= 80 ? '✅' : streamPct >= 50 ? '⚠️' : '❌';
    const logoIcon = logoPct >= 80 ? '✅' : logoPct >= 50 ? '⚠️' : '❌';
    const webIcon = websitePct >= 80 ? '✅' : websitePct >= 50 ? '⚠️' : '❌';

    console.log(`📍 ${city} (${total} stations)`);
    console.log(`   ${streamIcon} Streams:  ${withStreams}/${total} (${streamPct}%)`);
    console.log(`   ${logoIcon} Logos:    ${withLogos}/${total} (${logoPct}%)`);
    console.log(`   ${webIcon} Websites: ${withWebsites}/${total} (${websitePct}%)`);
    console.log();
  }

  // Overall summary
  console.log('='.repeat(80));
  console.log('\n📊 OVERALL INDIA SUMMARY\n');

  const { data: allStats } = await supabase
    .from('stations_view')
    .select('stream_url, logo_url, website_url')
    .eq('country_code', 'IN')
    .eq('is_active', true);

  const totalStations = allStats.length;
  const totalStreams = allStats.filter(s => s.stream_url).length;
  const totalLogos = allStats.filter(s => s.logo_url).length;
  const totalWebsites = allStats.filter(s => s.website_url).length;

  console.log(`Total Active Stations: ${totalStations}`);
  console.log(`With Streams:  ${totalStreams}/${totalStations} (${Math.round((totalStreams/totalStations)*100)}%)`);
  console.log(`With Logos:    ${totalLogos}/${totalStations} (${Math.round((totalLogos/totalStations)*100)}%)`);
  console.log(`With Websites: ${totalWebsites}/${totalStations} (${Math.round((totalWebsites/totalStations)*100)}%)`);
  console.log();
}

async function main() {
  try {
    await enrichIndiaStations();
    await generateRegionReport();
    process.exit(0);
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

main();
