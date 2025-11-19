import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface WikidataResult {
  station: string;
  stationLabel: string;
  description?: string;
  owner?: string;
  ownerLabel?: string;
  network?: string;
  networkLabel?: string;
  inceptionDate?: string;
  website?: string;
  city?: string;
  cityLabel?: string;
  frequency?: string;
  wikipediaUrl?: string;
}

interface EnrichmentData {
  wikidata_id?: string;
  wikipedia_url?: string;
  description?: string;
  owner?: string;
  network?: string;
  established_year?: number;
  homepage?: string;
  city?: string;
  data_sources: Record<string, string>;
}

class WikidataEnricher {
  private sparqlEndpoint = 'https://query.wikidata.org/sparql';

  async searchStationByName(stationName: string, country: string = 'India'): Promise<WikidataResult[]> {
    const query = `
      SELECT DISTINCT ?station ?stationLabel ?description ?owner ?ownerLabel
                      ?network ?networkLabel ?inceptionDate ?website
                      ?city ?cityLabel ?frequency ?wikipediaUrl
      WHERE {
        # Search for radio stations
        ?station wdt:P31/wdt:P279* wd:Q14350 .  # instance of radio station or subclass

        # Filter by country
        ?station wdt:P17 wd:Q668 .  # country = India

        # Station name match (flexible)
        ?station rdfs:label ?stationLabel .
        FILTER(LANG(?stationLabel) = "en")
        FILTER(CONTAINS(LCASE(?stationLabel), LCASE("${stationName}")))

        # Get description
        OPTIONAL {
          ?station schema:description ?description .
          FILTER(LANG(?description) = "en")
        }

        # Get owner/operator
        OPTIONAL {
          ?station wdt:P137 ?owner .  # operator
          ?owner rdfs:label ?ownerLabel .
          FILTER(LANG(?ownerLabel) = "en")
        }

        # Get parent organization/network
        OPTIONAL {
          ?station wdt:P749 ?network .  # parent organization
          ?network rdfs:label ?networkLabel .
          FILTER(LANG(?networkLabel) = "en")
        }

        # Get inception date
        OPTIONAL { ?station wdt:P571 ?inceptionDate . }

        # Get official website
        OPTIONAL { ?station wdt:P856 ?website . }

        # Get city/headquarters
        OPTIONAL {
          ?station wdt:P159 ?city .  # headquarters location
          ?city rdfs:label ?cityLabel .
          FILTER(LANG(?cityLabel) = "en")
        }

        # Get frequency
        OPTIONAL { ?station wdt:P2568 ?frequency . }

        # Get Wikipedia article
        OPTIONAL {
          ?wikipediaUrl schema:about ?station .
          ?wikipediaUrl schema:isPartOf <https://en.wikipedia.org/> .
        }
      }
      LIMIT 10
    `;

    try {
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
      return data.results.bindings.map((binding: any) => ({
        station: binding.station?.value,
        stationLabel: binding.stationLabel?.value,
        description: binding.description?.value,
        owner: binding.owner?.value,
        ownerLabel: binding.ownerLabel?.value,
        network: binding.network?.value,
        networkLabel: binding.networkLabel?.value,
        inceptionDate: binding.inceptionDate?.value,
        website: binding.website?.value,
        city: binding.city?.value,
        cityLabel: binding.cityLabel?.value,
        frequency: binding.frequency?.value,
        wikipediaUrl: binding.wikipediaUrl?.value
      }));
    } catch (error) {
      console.error('SPARQL query error:', error);
      return [];
    }
  }

  async getWikipediaExtract(wikipediaUrl: string): Promise<string | null> {
    try {
      const title = wikipediaUrl.split('/wiki/')[1];
      if (!title) return null;

      const apiUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;

      const response = await fetch(apiUrl, {
        headers: {
          'User-Agent': 'RadioCatalogBot/1.0 (Wikipedia enrichment; educational use)'
        }
      });

      if (!response.ok) return null;

      const data = await response.json();
      return data.extract || null;
    } catch (error) {
      console.error('Wikipedia API error:', error);
      return null;
    }
  }

  buildEnrichmentData(wikidataResults: WikidataResult[], existingData: any): EnrichmentData | null {
    if (wikidataResults.length === 0) return null;

    const result = wikidataResults[0];
    const enrichment: EnrichmentData = {
      data_sources: {}
    };

    const wikidataId = result.station?.split('/').pop();
    if (wikidataId) {
      enrichment.wikidata_id = wikidataId;
      enrichment.data_sources.wikidata_id = 'wikidata';
    }

    if (result.wikipediaUrl) {
      enrichment.wikipedia_url = result.wikipediaUrl;
      enrichment.data_sources.wikipedia_url = 'wikidata';
    }

    if (result.description && !existingData.description) {
      enrichment.description = result.description;
      enrichment.data_sources.description = 'wikidata';
    }

    if (result.ownerLabel && !existingData.owner) {
      enrichment.owner = result.ownerLabel;
      enrichment.data_sources.owner = 'wikidata';
    }

    if (result.networkLabel && !existingData.network) {
      enrichment.network = result.networkLabel;
      enrichment.data_sources.network = 'wikidata';
    }

    if (result.inceptionDate && !existingData.established_year) {
      const year = new Date(result.inceptionDate).getFullYear();
      if (year > 1900 && year <= new Date().getFullYear()) {
        enrichment.established_year = year;
        enrichment.data_sources.established_year = 'wikidata';
      }
    }

    if (result.website && !existingData.homepage) {
      enrichment.homepage = result.website;
      enrichment.data_sources.homepage = 'wikidata';
    }

    if (result.cityLabel && !existingData.city) {
      enrichment.city = result.cityLabel;
      enrichment.data_sources.city = 'wikidata';
    }

    return Object.keys(enrichment.data_sources).length > 0 ? enrichment : null;
  }

  async enrichStation(stationId: string, stationName: string, dryRun: boolean = true): Promise<void> {
    console.log(`\n🔍 Searching Wikidata for: "${stationName}"`);

    const { data: existingStation, error: fetchError } = await supabase
      .from('radio_stations')
      .select('*')
      .eq('id', stationId)
      .single();

    if (fetchError || !existingStation) {
      console.error('❌ Station not found in database');
      return;
    }

    const wikidataResults = await this.searchStationByName(stationName);

    if (wikidataResults.length === 0) {
      console.log('❌ No results found in Wikidata');
      return;
    }

    console.log(`\n✅ Found ${wikidataResults.length} potential matches:\n`);
    wikidataResults.forEach((result, index) => {
      console.log(`${index + 1}. ${result.stationLabel}`);
      console.log(`   Wikidata ID: ${result.station?.split('/').pop()}`);
      if (result.description) console.log(`   Description: ${result.description}`);
      if (result.ownerLabel) console.log(`   Owner: ${result.ownerLabel}`);
      if (result.cityLabel) console.log(`   City: ${result.cityLabel}`);
      if (result.wikipediaUrl) console.log(`   Wikipedia: ${result.wikipediaUrl}`);
      console.log('');
    });

    const enrichment = this.buildEnrichmentData(wikidataResults, existingStation);

    if (!enrichment) {
      console.log('ℹ️  No new data to enrich (all fields already populated)');
      return;
    }

    if (enrichment.wikipedia_url) {
      const extract = await this.getWikipediaExtract(enrichment.wikipedia_url);
      if (extract && !existingStation.description) {
        enrichment.description = extract;
        enrichment.data_sources.description = 'wikipedia';
      }
    }

    console.log('\n📊 Enrichment data to be applied:');
    console.log(JSON.stringify(enrichment, null, 2));

    if (dryRun) {
      console.log('\n⚠️  DRY RUN - No changes written to database');
      console.log('Run with dryRun=false to apply changes');
    } else {
      const mergedDataSources = {
        ...existingStation.data_sources,
        ...enrichment.data_sources
      };

      const { error: updateError } = await supabase
        .from('radio_stations')
        .update({
          ...enrichment,
          data_sources: mergedDataSources
        })
        .eq('id', stationId);

      if (updateError) {
        console.error('❌ Error updating station:', updateError);
      } else {
        console.log('\n✅ Station successfully enriched!');
      }
    }
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.log(`
Usage: tsx scripts/enrich-from-wikidata.ts <station-id> <station-name> [--apply]

Examples:
  # Dry run (preview changes only)
  tsx scripts/enrich-from-wikidata.ts "abc-123" "Radio Mirchi"

  # Apply changes to database
  tsx scripts/enrich-from-wikidata.ts "abc-123" "Radio Mirchi" --apply

Options:
  --apply    Write changes to database (default: dry run)
    `);
    process.exit(1);
  }

  const stationId = args[0];
  const stationName = args[1];
  const dryRun = !args.includes('--apply');

  const enricher = new WikidataEnricher();
  await enricher.enrichStation(stationId, stationName, dryRun);
}

main().catch(console.error);
