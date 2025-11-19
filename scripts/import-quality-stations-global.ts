import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface QualityStationFilters {
  minVotes: number;
  minClickcount: number;
  requireHomepage: boolean;
  requireCoordinates: boolean;
  requireWorkingStream: boolean;
  excludeBroken: boolean;
  topCountries: number; // Import top N countries by station count
  bandCategory?: 'terrestrial' | 'internet'; // Optional: filter by category
  concurrency?: number; // How many countries to process in parallel (default: 5)
}

class QualityGlobalImporter {
  private apiBaseUrl = 'https://de1.api.radio-browser.info/json';

  /**
   * Get top countries by station count
   */
  async getTopCountries(limit: number): Promise<string[]> {
    console.log(`\n🌍 Fetching top ${limit} countries by station count...`);

    const response = await fetch(`${this.apiBaseUrl}/countrycodes`);
    const countries = await response.json();

    // Sort by station count (stationcount field)
    const sorted = countries
      .sort((a: any, b: any) => b.stationcount - a.stationcount)
      .slice(0, limit)
      .map((c: any) => c.name);

    console.log(`✅ Top countries: ${sorted.join(', ')}`);
    return sorted;
  }

  /**
   * Process a single country
   */
  async processCountry(
    country: string,
    filters: QualityStationFilters,
    dryRun: boolean
  ): Promise<{ fetched: number; qualified: number; imported: number; skipped: number }> {
    console.log(`\n🇺🇳 Processing: ${country}`);
    console.log('─'.repeat(50));

    // Fetch all stations for this country
    const response = await fetch(
      `${this.apiBaseUrl}/stations/bycountry/${encodeURIComponent(country)}`
    );
    const stations = await response.json();

    console.log(`   Fetched: ${stations.length} stations`);

    // Filter by quality criteria
    const qualityStations = stations.filter((station: any) => {
      if (filters.minVotes && (station.votes || 0) < filters.minVotes) return false;
      if (filters.minClickcount && (station.clickcount || 0) < filters.minClickcount) return false;
      if (filters.requireHomepage && !station.homepage) return false;
      if (filters.requireCoordinates && (!station.geo_lat || !station.geo_long)) return false;
      if (filters.requireWorkingStream && !station.lastcheckok) return false;
      if (filters.excludeBroken && !station.lastcheckok) return false;
      return true;
    });

    console.log(`   Qualified: ${qualityStations.length} stations (${Math.round(qualityStations.length / stations.length * 100)}%)`);

    let imported = 0;
    let skipped = 0;

    if (!dryRun && qualityStations.length > 0) {
      // Import in batches
      const batchSize = 100;
      for (let i = 0; i < qualityStations.length; i += batchSize) {
        const batch = qualityStations.slice(i, i + batchSize);

        const { data, error } = await supabase
          .from('radio_stations')
          .upsert(
            batch.map((station: any) => ({
              stationuuid: station.stationuuid,
              changeuuid: station.changeuuid,
              name: station.name,
              country: station.country,
              country_code: station.countrycode,
              state: station.state || null,
              language: station.language || 'unknown',
              stream_url: station.url_resolved || station.url,
              homepage: station.homepage || null,
              favicon: station.favicon || null,
              tags: station.tags ? station.tags.split(',').filter((t: string) => t.trim()) : [],
              bitrate: station.bitrate || null,
              codec: station.codec || null,
              latitude: station.geo_lat || null,
              longitude: station.geo_long || null,
              votes: station.votes || 0,
              clickcount: station.clickcount || 0,
              lastchecktime: station.lastchecktime || null,
              lastcheckoktime: station.lastcheckoktime || null,
              last_check_ok: station.lastcheckok || false,
              source: 'radio_browser',
              license_tier: 'unknown',
              band_category: (station.geo_lat && station.geo_long) ? 'terrestrial' : 'internet'
            })),
            { onConflict: 'stationuuid', ignoreDuplicates: false }
          );

        if (error) {
          console.error(`   ❌ Error importing batch: ${error.message}`);
          skipped += batch.length;
        } else {
          imported += batch.length;
          console.log(`   ✅ Imported batch ${Math.floor(i / batchSize) + 1}: ${batch.length} stations`);
        }
      }
    }

    return {
      fetched: stations.length,
      qualified: qualityStations.length,
      imported,
      skipped
    };
  }

  /**
   * Fetch quality stations with filters (optimized with concurrency)
   */
  async fetchQualityStations(
    filters: QualityStationFilters,
    dryRun: boolean = true
  ): Promise<void> {
    console.log('🚀 Quality Global Station Import');
    console.log('=================================');
    console.log(`Mode: ${dryRun ? '🔍 DRY RUN' : '✏️  LIVE IMPORT'}\n`);

    console.log('📋 Import Criteria:');
    console.log(`   Min Votes: ${filters.minVotes}`);
    console.log(`   Min Clicks: ${filters.minClickcount}`);
    console.log(`   Require Homepage: ${filters.requireHomepage}`);
    console.log(`   Require Coordinates: ${filters.requireCoordinates}`);
    console.log(`   Require Working Stream: ${filters.requireWorkingStream}`);
    console.log(`   Exclude Broken: ${filters.excludeBroken}`);

    // Get top countries
    const topCountries = await this.getTopCountries(filters.topCountries);

    let totalFetched = 0;
    let totalQualified = 0;
    let totalImported = 0;
    let totalSkipped = 0;

    // Process countries concurrently in chunks
    const concurrency = filters.concurrency || 5;
    console.log(`\n⚡ Processing ${topCountries.length} countries with concurrency: ${concurrency}\n`);

    for (let i = 0; i < topCountries.length; i += concurrency) {
      const chunk = topCountries.slice(i, i + concurrency);

      // Process this chunk of countries in parallel
      const results = await Promise.all(
        chunk.map(country => this.processCountry(country, filters, dryRun))
      );

      // Aggregate results
      for (const result of results) {
        totalFetched += result.fetched;
        totalQualified += result.qualified;
        totalImported += result.imported;
        totalSkipped += result.skipped;
      }

      // Small delay between chunks to be nice to the API
      if (i + concurrency < topCountries.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('📊 IMPORT SUMMARY');
    console.log('='.repeat(50));
    console.log(`Total Fetched:    ${totalFetched.toLocaleString()}`);
    console.log(`Total Qualified:  ${totalQualified.toLocaleString()} (${Math.round(totalQualified / totalFetched * 100)}%)`);

    if (!dryRun) {
      console.log(`Total Imported:   ${totalImported.toLocaleString()}`);
      console.log(`Total Skipped:    ${totalSkipped.toLocaleString()}`);
    } else {
      console.log(`\n💡 This was a DRY RUN. Run with --apply to import.`);
    }

    console.log('\n✅ Import complete!');
  }
}

// Execution
const dryRun = !process.argv.includes('--apply');

// HYBRID APPROACH: Import BOTH terrestrial and internet stations
// Run this script twice with different filters:
//   1. Terrestrial stations (coords required) - for radio wave simulation
//   2. Internet stations (coords optional) - for bonus content directory

// Check which mode to run
const mode = process.argv.find(arg => arg.startsWith('--mode='))?.split('=')[1] || 'terrestrial';

let qualityFilters: QualityStationFilters;

if (mode === 'internet') {
  // INTERNET RADIO MODE: Allow stations without coordinates
  // These are internet-only streams (Zeno.FM, online-only broadcasters)
  // Goal: Expand content catalog with popular streaming stations
  console.log('🌐 MODE: Internet Radio Directory\n');
  qualityFilters = {
    minVotes: 5,               // Community validated
    minClickcount: 50,         // Actually used
    requireHomepage: true,     // REQUIRED - Can verify broadcaster identity
    requireCoordinates: false, // OPTIONAL - Internet streams don't need physical location
    requireWorkingStream: true,// REQUIRED - Must work
    excludeBroken: true,       // REQUIRED - Quality standard
    topCountries: 50,          // Top 50 countries (covers majority of streams)
    concurrency: 10,           // Process 10 countries at once
    bandCategory: 'internet'   // Will be tagged as 'internet' category
  };
} else {
  // TERRESTRIAL MODE (DEFAULT): Strict location requirements
  // These stations power the realistic radio wave propagation simulation
  // Goal: Import stations we can legally defend with verifiable locations
  console.log('🗼 MODE: Terrestrial Radio Simulation\n');
  qualityFilters = {
    minVotes: 5,               // Community validated (filters fake/spam streams)
    minClickcount: 50,         // Actually used (filters pirate restreams)
    requireHomepage: true,     // REQUIRED - Can verify broadcaster identity for DMCA
    requireCoordinates: true,  // REQUIRED - Can verify "local/nearby" claims for propagation
    requireWorkingStream: true,// REQUIRED - Good faith service standard
    excludeBroken: true,       // REQUIRED - Quality expectation
    topCountries: 50,          // Top 50 countries (covers ~90% of quality stations)
    concurrency: 10,           // Process 10 countries at once
    bandCategory: 'terrestrial'// Will be tagged as 'terrestrial' category
  };
}

const importer = new QualityGlobalImporter();
importer.fetchQualityStations(qualityFilters, dryRun).catch(console.error);
