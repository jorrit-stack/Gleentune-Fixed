import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

interface RadioBrowserStation {
  name: string;
  url: string;
  url_resolved: string;
  country: string;
  countrycode: string;
  state: string;
  language: string;
  codec: string;
  bitrate: number;
  hls: number;
  votes: number;
  clickcount: number;
  lastcheckok: number;
  homepage?: string;
  favicon?: string;
  tags?: string;
}

async function fetchWorkingIndianStreams(): Promise<RadioBrowserStation[]> {
  const API_BASE = "https://de1.api.radio-browser.info/json";

  // Fetch only working, popular Indian streams
  const url = `${API_BASE}/stations/search?` + new URLSearchParams({
    countrycode: 'IN',
    hidebroken: 'true',
    order: 'clickcount',
    reverse: 'true',
    limit: '200'
  });

  console.log(`📡 Fetching working Indian streams...`);

  const res = await fetch(url, {
    headers: { "User-Agent": "gleetune/1.0" },
  });

  if (!res.ok) {
    throw new Error(`Radio Browser API failed: ${res.status}`);
  }

  return await res.json();
}

function normalizeStationName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s]/g, '')
    .trim();
}

async function enrichIndianStreams() {
  console.log('🎵 Starting Stream Enrichment for India\n');

  const results = { matched: 0, enriched: 0, skipped: 0, errors: 0 };

  try {
    // Fetch working streams from Radio Browser
    const workingStreams = await fetchWorkingIndianStreams();
    console.log(`✅ Found ${workingStreams.length} working streams\n`);

    // Fetch all Indian stations without streams from our database
    const { data: stationsWithoutStreams, error: fetchError } = await supabase
      .from('radio_stations')
      .select('id, name, city, state, band_type, frequency')
      .eq('country', 'India')
      .is('stream_url', null)
      .order('name');

    if (fetchError) throw fetchError;

    console.log(`🔍 Found ${stationsWithoutStreams?.length || 0} stations without streams\n`);

    if (!stationsWithoutStreams || stationsWithoutStreams.length === 0) {
      console.log('✅ All stations already have streams!');
      return;
    }

    // Try to match stations
    for (const station of stationsWithoutStreams) {
      const normalizedName = normalizeStationName(station.name);

      // Try to find matching stream
      const match = workingStreams.find(stream => {
        const streamName = normalizeStationName(stream.name);

        // Exact match
        if (streamName === normalizedName) return true;

        // Partial match (contains station name)
        if (streamName.includes(normalizedName) || normalizedName.includes(streamName)) {
          return true;
        }

        // City + band match (e.g., "Radio Mirchi Delhi" matches "Mirchi" station in Delhi)
        if (station.city && stream.state) {
          const cityMatch = stream.state.toLowerCase().includes(station.city.toLowerCase()) ||
                           station.city.toLowerCase().includes(stream.state.toLowerCase());
          const namePartMatch = streamName.includes(normalizedName.split(' ')[0]) ||
                                normalizedName.includes(streamName.split(' ')[0]);
          if (cityMatch && namePartMatch) return true;
        }

        return false;
      });

      if (match) {
        try {
          const { error: updateError } = await supabase
            .from('radio_stations')
            .update({
              stream_url: match.url_resolved || match.url,
              url_resolved: match.url_resolved,
              codec: match.codec,
              bitrate: match.bitrate,
              hls: match.hls === 1,
              homepage: match.homepage || station.homepage,
              favicon: match.favicon || station.favicon,
              source: 'radio_browser',
              is_active: true,
              last_check_ok: true,
              retrieved_at: new Date().toISOString()
            })
            .eq('id', station.id);

          if (updateError) throw updateError;

          results.matched++;
          results.enriched++;
          console.log(`✅ Enriched: ${station.name} (${station.city || station.state}) → ${match.name}`);
        } catch (error: any) {
          console.error(`⚠️  Error enriching ${station.name}:`, error.message);
          results.errors++;
        }
      } else {
        results.skipped++;
        if (results.skipped <= 10) {
          console.log(`⏭️  Skipped: ${station.name} (${station.city || station.state}) - no match found`);
        }
      }
    }

    console.log(`\n\n📊 Enrichment Complete!`);
    console.log(`   ✅ Matched: ${results.matched}`);
    console.log(`   🎵 Enriched: ${results.enriched}`);
    console.log(`   ⏭️  Skipped: ${results.skipped}`);
    console.log(`   ❌ Errors: ${results.errors}\n`);

    // Show sample of enriched stations
    const { data: enrichedSample } = await supabase
      .from('radio_stations')
      .select('name, city, stream_url')
      .eq('country', 'India')
      .not('stream_url', 'is', null)
      .limit(10);

    if (enrichedSample && enrichedSample.length > 0) {
      console.log(`\n🎵 Sample of stations with streams:\n`);
      enrichedSample.forEach(s => {
        console.log(`   ${s.name} (${s.city})`);
        console.log(`   └─ ${s.stream_url?.substring(0, 60)}...\n`);
      });
    }

  } catch (error: any) {
    console.error('\n❌ Enrichment failed:', error.message);
    process.exit(1);
  }
}

enrichIndianStreams();
