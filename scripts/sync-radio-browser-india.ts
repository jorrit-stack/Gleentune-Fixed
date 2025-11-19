import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { detectLicenseTier } from '../src/services/licenseChecker.js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

interface RadioBrowserStation {
  // Core fields
  name: string;
  url: string;
  url_resolved: string;
  country: string;
  countrycode: string;
  state: string;
  language: string;
  languagecodes: string;

  // Identity
  stationuuid: string;
  changeuuid: string;
  serveruuid: string;

  // Stream metadata
  bitrate: number;
  codec: string;
  hls: number;

  // Popularity
  votes: number;
  clickcount: number;
  clicktrend: number;
  clicktimestamp: string;

  // Status
  lastcheckok: number;
  lastchecktime: string;
  lastcheckoktime: string;
  lastchangetime: string;
  lastlocalchecktime: string;

  // Location
  geo_lat: number | null;
  geo_long: number | null;

  // Additional
  tags?: string;
  homepage?: string;
  favicon?: string;
  iso_3166_2?: string;
  has_extended_info?: boolean;
  ssl_error?: number;
}

async function fetchStationsByCountry(country: string): Promise<RadioBrowserStation[]> {
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

async function syncIndiaStations() {
  console.log('🇮🇳 Starting India Radio Sync\n');

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

        // CRITICAL: Only update Radio Browser source fields, preserve all other fields
        const payload = {
          // Identity - Radio Browser specific
          stationuuid: s.stationuuid,
          changeuuid: s.changeuuid,
          serveruuid: s.serveruuid,

          // Stream URLs - Radio Browser specific
          url_resolved: s.url_resolved,
          stream_url: s.url_resolved || null,

          // Stream metadata - Radio Browser specific
          bitrate: s.bitrate,
          codec: s.codec,
          hls: s.hls === 1,

          // Popularity - Radio Browser specific
          votes: s.votes,
          clickcount: s.clickcount,
          clicktrend: s.clicktrend,
          clicktimestamp: s.clicktimestamp || null,

          // Timestamps - Radio Browser specific
          lastchecktime: s.lastchecktime || null,
          lastcheckoktime: s.lastcheckoktime || null,
          lastchangetime: s.lastchangetime || null,
          lastlocalchecktime: s.lastlocalchecktime || null,

          // Status - Radio Browser specific
          is_active: s.lastcheckok === 1,
          last_check_ok: s.lastcheckok === 1,
          ssl_error: s.ssl_error === 1,

          // Language - Radio Browser specific
          languagecodes: s.languagecodes || null,

          // Metadata - Radio Browser specific
          has_extended_info: s.has_extended_info || false,
          homepage: s.homepage || null,
          favicon: s.favicon || null,
          tags: tags,
          iso_3166_2: s.iso_3166_2 || null,

          // Source tracking
          source: "radio_browser",
          license_tier: licenseTier,
          retrieved_at: new Date().toISOString(),
        };

        if (existing) {
          // Update existing station - ONLY Radio Browser fields
          // Preserves: frequency, band_type, city, logo_url, logo_source, logo_verified, logo_last_checked
          const { error } = await supabase
            .from("radio_stations")
            .update(payload)
            .eq("id", existing.id);

          if (error) throw error;
          results.updated++;

          if ((i + 1) % 10 === 0) {
            process.stdout.write(`\r✏️  Updated: ${results.updated}, Inserted: ${results.inserted}, Errors: ${results.errors} | Progress: ${i + 1}/${remoteStations.length}`);
          }
        } else {
          // Insert new station with all available data
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

          if ((i + 1) % 10 === 0) {
            process.stdout.write(`\r✏️  Updated: ${results.updated}, Inserted: ${results.inserted}, Errors: ${results.errors} | Progress: ${i + 1}/${remoteStations.length}`);
          }
        }

        results.synced++;
      } catch (stationError: any) {
        console.error(`\n⚠️  Error processing station ${s.name}:`, stationError.message);
        results.errors++;
      }
    }

    console.log(`\n\n✅ India Sync Complete!`);
    console.log(`📊 Total Synced: ${results.synced}`);
    console.log(`   ➕ Inserted: ${results.inserted}`);
    console.log(`   ✏️  Updated: ${results.updated}`);
    console.log(`   ❌ Errors: ${results.errors}\n`);

    // Check Kolkata stations specifically
    console.log('🔍 Checking Kolkata FM stations...\n');
    const { data: kolkataStations } = await supabase
      .from('radio_stations')
      .select('name, frequency, stream_url, url_resolved, is_active, source')
      .eq('city', 'Kolkata')
      .gte('frequency', 88.0)
      .lte('frequency', 108.0)
      .order('frequency');

    if (kolkataStations && kolkataStations.length > 0) {
      console.log(`Found ${kolkataStations.length} Kolkata FM stations:\n`);
      kolkataStations.forEach(st => {
        const hasStream = st.stream_url || st.url_resolved;
        const status = hasStream ? '✅' : '❌';
        console.log(`${status} ${st.name} (${st.frequency} FM) - ${st.is_active ? 'ACTIVE' : 'INACTIVE'} - Source: ${st.source}`);
      });
    } else {
      console.log('⚠️  No Kolkata FM stations found');
    }

  } catch (error: any) {
    console.error('\n❌ Sync failed:', error.message);
    process.exit(1);
  }
}

syncIndiaStations();
