import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface WikidataStation {
  wikidataId: string;
  name: string;
  city?: string;
  frequency?: string;
  owner?: string;
  network?: string;
  wikipediaUrl?: string;
  homepage?: string;
  description?: string;
}

interface MergeCandidate {
  primaryId: string;
  duplicateId: string;
  primaryName: string;
  duplicateName: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  reason: string;
  streamUrl?: string;
}

class SafeRadioMirchiEnricher {
  private sparqlEndpoint = 'https://query.wikidata.org/sparql';

  /**
   * Step 1: Fetch Wikidata info for Radio Mirchi
   */
  async fetchWikidataInfo(): Promise<WikidataStation | null> {
    const query = `
      SELECT DISTINCT ?station ?stationLabel ?description ?owner ?ownerLabel
                      ?website ?wikipediaUrl
      WHERE {
        # Radio Mirchi entity (Q97063924)
        VALUES ?station { wd:Q97063924 }

        ?station rdfs:label ?stationLabel .
        FILTER(LANG(?stationLabel) = "en")

        # Get description
        OPTIONAL {
          ?station schema:description ?description .
          FILTER(LANG(?description) = "en")
        }

        # Get owner/operator
        OPTIONAL {
          ?station wdt:P137 ?owner .
          ?owner rdfs:label ?ownerLabel .
          FILTER(LANG(?ownerLabel) = "en")
        }

        # Get official website
        OPTIONAL { ?station wdt:P856 ?website . }

        # Get Wikipedia URL
        OPTIONAL {
          ?wikipediaUrl schema:about ?station .
          ?wikipediaUrl schema:isPartOf <https://en.wikipedia.org/> .
        }
      }
    `;

    try {
      console.log('🔍 Querying Wikidata for Radio Mirchi...');

      const response = await fetch(this.sparqlEndpoint, {
        method: 'POST',
        headers: {
          'Accept': 'application/sparql-results+json',
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'RadioCatalogBot/1.0 (Wikidata enrichment; educational use)'
        },
        body: `query=${encodeURIComponent(query)}`
      });

      if (!response.ok) {
        throw new Error(`SPARQL query failed: ${response.statusText}`);
      }

      const data = await response.json();
      const bindings = data.results.bindings;

      if (bindings.length === 0) {
        console.log('❌ No Wikidata results found');
        return null;
      }

      const result = bindings[0];
      const wikidataId = result.station?.value.split('/').pop();

      console.log('\n✅ Found Wikidata entry:');
      console.log(`   Wikidata ID: ${wikidataId}`);
      console.log(`   Name: ${result.stationLabel?.value || 'N/A'}`);
      console.log(`   Owner: ${result.ownerLabel?.value || 'N/A'}`);
      console.log(`   Wikipedia: ${result.wikipediaUrl?.value || 'N/A'}`);
      console.log(`   Website: ${result.website?.value || 'N/A'}`);

      return {
        wikidataId: wikidataId!,
        name: result.stationLabel?.value,
        owner: result.ownerLabel?.value,
        network: 'Radio Mirchi', // Radio Mirchi is itself the network
        wikipediaUrl: result.wikipediaUrl?.value,
        homepage: result.website?.value,
        description: result.description?.value
      };
    } catch (error) {
      console.error('❌ SPARQL query error:', error);
      return null;
    }
  }

  /**
   * Step 2: Identify duplicate/similar stations
   */
  async identifyDuplicates(): Promise<MergeCandidate[]> {
    console.log('\n🔍 Scanning for duplicate Radio Mirchi stations...');

    const { data: mirchiStations, error } = await supabase
      .from('radio_stations')
      .select('id, name, city, frequency, stream_url, owner, network')
      .ilike('name', '%mirchi%')
      .order('city', { ascending: true });

    if (error || !mirchiStations) {
      console.error('❌ Error fetching stations:', error);
      return [];
    }

    const candidates: MergeCandidate[] = [];

    // Group by city and look for duplicates
    const citiesMap = new Map<string, any[]>();

    mirchiStations.forEach(station => {
      if (station.city) {
        const normalizedCity = station.city.toLowerCase();
        if (!citiesMap.has(normalizedCity)) {
          citiesMap.set(normalizedCity, []);
        }
        citiesMap.get(normalizedCity)!.push(station);
      }
    });

    // Find potential duplicates within each city
    for (const [city, stations] of citiesMap.entries()) {
      if (stations.length > 1) {
        // Sort by quality: prefer stations with owner/network
        stations.sort((a, b) => {
          const aScore = (a.owner ? 2 : 0) + (a.network ? 2 : 0) + (a.stream_url ? 1 : 0);
          const bScore = (b.owner ? 2 : 0) + (b.network ? 2 : 0) + (b.stream_url ? 1 : 0);
          return bScore - aScore;
        });

        // First station (highest quality) is primary
        const primary = stations[0];

        // Others are potential duplicates
        for (let i = 1; i < stations.length; i++) {
          const duplicate = stations[i];

          candidates.push({
            primaryId: primary.id,
            duplicateId: duplicate.id,
            primaryName: primary.name,
            duplicateName: duplicate.name,
            confidence: 'HIGH',
            reason: `Same city (${city}), similar names`,
            streamUrl: duplicate.stream_url || undefined
          });
        }
      }
    }

    return candidates;
  }

  /**
   * Step 3: Enrich clean stations with Wikidata (SAFE - only updates NULL fields)
   */
  async enrichCleanStations(wikidataInfo: WikidataStation, dryRun: boolean = true): Promise<void> {
    console.log('\n📝 Enriching clean Radio Mirchi stations with Wikidata...');

    // Only update stations with proper naming (not "radiomirchibengaluru" style)
    const { data: stations, error } = await supabase
      .from('radio_stations')
      .select('id, name, city, wikidata_id, wikipedia_url, owner, network, homepage')
      .ilike('name', 'Radio Mirchi %')  // Only properly named stations
      .order('name');

    if (error || !stations) {
      console.error('❌ Error fetching stations:', error);
      return;
    }

    console.log(`\nFound ${stations.length} clean Radio Mirchi stations`);

    let enrichCount = 0;

    for (const station of stations) {
      const updates: any = {};
      let hasUpdates = false;

      // Only update NULL fields (SAFE!)
      if (!station.wikidata_id && wikidataInfo.wikidataId) {
        updates.wikidata_id = wikidataInfo.wikidataId;
        hasUpdates = true;
      }

      if (!station.wikipedia_url && wikidataInfo.wikipediaUrl) {
        updates.wikipedia_url = wikidataInfo.wikipediaUrl;
        hasUpdates = true;
      }

      if (!station.owner && wikidataInfo.owner) {
        updates.owner = wikidataInfo.owner;
        hasUpdates = true;
      }

      if (!station.network && wikidataInfo.network) {
        updates.network = wikidataInfo.network;
        hasUpdates = true;
      }

      if (!station.homepage && wikidataInfo.homepage) {
        updates.homepage = wikidataInfo.homepage;
        hasUpdates = true;
      }

      if (hasUpdates) {
        console.log(`\n  ✏️  ${station.name} (${station.city || 'no city'})`);
        console.log(`      Updates: ${Object.keys(updates).join(', ')}`);

        if (!dryRun) {
          const { error: updateError } = await supabase
            .from('radio_stations')
            .update(updates)
            .eq('id', station.id);

          if (updateError) {
            console.error(`      ❌ Error: ${updateError.message}`);
          } else {
            console.log(`      ✅ Updated successfully`);
            enrichCount++;
          }
        } else {
          console.log(`      🔍 DRY RUN - no changes made`);
        }
      }
    }

    console.log(`\n✅ Enrichment complete: ${enrichCount} stations updated`);
  }

  /**
   * Step 4: Handle duplicates - merge stream URLs if needed
   */
  async handleDuplicates(candidates: MergeCandidate[], dryRun: boolean = true): Promise<void> {
    if (candidates.length === 0) {
      console.log('\n✅ No duplicates found!');
      return;
    }

    console.log(`\n🔍 Found ${candidates.length} potential duplicate(s):\n`);

    for (const candidate of candidates) {
      console.log(`  Primary:   ${candidate.primaryName} (ID: ${candidate.primaryId.substring(0, 8)}...)`);
      console.log(`  Duplicate: ${candidate.duplicateName} (ID: ${candidate.duplicateId.substring(0, 8)}...)`);
      console.log(`  Confidence: ${candidate.confidence}`);
      console.log(`  Reason: ${candidate.reason}`);

      // Check if duplicate has a stream URL that primary doesn't have
      if (candidate.streamUrl) {
        console.log(`  Stream URL available: ${candidate.streamUrl.substring(0, 50)}...`);

        const { data: primaryStation } = await supabase
          .from('radio_stations')
          .select('stream_url')
          .eq('id', candidate.primaryId)
          .single();

        if (primaryStation && !primaryStation.stream_url) {
          console.log(`  💡 Action: Copy stream URL to primary station`);

          if (!dryRun) {
            const { error } = await supabase
              .from('radio_stations')
              .update({ stream_url: candidate.streamUrl })
              .eq('id', candidate.primaryId);

            if (error) {
              console.error(`  ❌ Error copying stream URL: ${error.message}`);
            } else {
              console.log(`  ✅ Stream URL copied successfully`);
            }
          } else {
            console.log(`  🔍 DRY RUN - no changes made`);
          }
        }
      }

      console.log(`  💡 Action: Mark duplicate for manual review (do not auto-delete)`);
      console.log('');
    }

    console.log('⚠️  IMPORTANT: Duplicates NOT deleted automatically.');
    console.log('   Review candidates manually and delete if appropriate.');
  }

  /**
   * Main execution
   */
  async run(dryRun: boolean = true): Promise<void> {
    console.log('🚀 Safe Radio Mirchi Enrichment Tool');
    console.log('=====================================');
    console.log(`Mode: ${dryRun ? '🔍 DRY RUN (no changes)' : '✏️  LIVE (making changes)'}\n`);

    // Step 1: Get Wikidata info
    const wikidataInfo = await this.fetchWikidataInfo();

    if (!wikidataInfo) {
      console.log('❌ Cannot proceed without Wikidata info');
      return;
    }

    // Step 2: Identify duplicates
    const duplicates = await this.identifyDuplicates();

    // Step 3: Enrich clean stations (SAFE - only NULL fields)
    await this.enrichCleanStations(wikidataInfo, dryRun);

    // Step 4: Handle duplicates (SAFE - only copy stream URLs, no deletions)
    await this.handleDuplicates(duplicates, dryRun);

    console.log('\n✅ Enrichment process complete!');
    if (dryRun) {
      console.log('\n💡 To apply changes, run with --apply flag:');
      console.log('   tsx scripts/enrich-radio-mirchi-safe.ts --apply');
    }
  }
}

// Execute
const dryRun = !process.argv.includes('--apply');
const enricher = new SafeRadioMirchiEnricher();
enricher.run(dryRun).catch(console.error);
