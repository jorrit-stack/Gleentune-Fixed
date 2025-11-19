import { config } from 'dotenv';
import { supabase } from './lib/supabase-node';
import { extractLogo } from '../src/services/logoEnrichment/imageExtractor';

config();

interface EnrichmentStats {
  total: number;
  processed: number;
  successful: number;
  failed: number;
  skipped: number;
}

async function enrichStationsWithLogos(bandType: 'AM' | 'FM', limit?: number) {
  console.log(`\n🎨 Enriching ${bandType} stations...`);

  const stats: EnrichmentStats = {
    total: 0,
    processed: 0,
    successful: 0,
    failed: 0,
    skipped: 0
  };

  const query = supabase
    .from('radio_stations')
    .select('id, name, homepage, logo_url, logo_source')
    .eq('band_type', bandType)
    .is('logo_url', null)
    .not('homepage', 'is', null);

  if (limit) {
    query.limit(limit);
  }

  const { data: stations, error } = await query;

  if (error) {
    console.error(`Error fetching ${bandType} stations:`, error);
    return stats;
  }

  if (!stations || stations.length === 0) {
    console.log(`No ${bandType} stations need enrichment`);
    return stats;
  }

  stats.total = stations.length;
  console.log(`Found ${stats.total} ${bandType} stations to enrich`);

  for (const station of stations) {
    stats.processed++;

    process.stdout.write(
      `\r${bandType} Progress: ${stats.processed}/${stats.total} | ` +
      `✅ ${stats.successful} | ❌ ${stats.failed} | ⏭️ ${stats.skipped}`
    );

    try {
      const extractedLogo = await extractLogo(station.homepage!);

      if (!extractedLogo) {
        stats.failed++;
        continue;
      }

      const { error: updateError } = await supabase
        .from('radio_stations')
        .update({
          logo_url: extractedLogo.url,
          logo_source: extractedLogo.source,
          source_url: extractedLogo.sourceUrl,
          retrieved_at: new Date().toISOString(),
          logo_verified: true,
          logo_last_checked: new Date().toISOString()
        })
        .eq('id', station.id);

      if (updateError) {
        console.error(`\nError updating ${station.name}:`, updateError);
        stats.failed++;
      } else {
        stats.successful++;
      }

    } catch (err) {
      stats.failed++;
    }

    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n');
  return stats;
}

async function main() {
  console.log('🎨 Starting AM/FM Logo Enrichment Process');
  console.log('=========================================\n');
  console.log('This script will:');
  console.log('1. Respect robots.txt for all domains');
  console.log('2. Extract logos from favicon.ico, og:image, and apple-touch-icon');
  console.log('3. Validate image sizes (≤30KB)');
  console.log('4. Store attribution metadata for fair use compliance');
  console.log('5. Rate limit requests to 1 per second per domain\n');

  const startTime = Date.now();

  const amStats = await enrichStationsWithLogos('AM', 50);
  const fmStats = await enrichStationsWithLogos('FM', 100);

  const endTime = Date.now();
  const durationSec = ((endTime - startTime) / 1000).toFixed(1);

  console.log('\n📊 Final Results');
  console.log('================\n');

  console.log('AM Stations:');
  console.log(`  Total: ${amStats.total}`);
  console.log(`  ✅ Successful: ${amStats.successful}`);
  console.log(`  ❌ Failed: ${amStats.failed}`);
  console.log(`  ⏭️  Skipped: ${amStats.skipped}`);
  console.log(`  Success rate: ${amStats.total > 0 ? ((amStats.successful / amStats.total) * 100).toFixed(1) : 0}%\n`);

  console.log('FM Stations:');
  console.log(`  Total: ${fmStats.total}`);
  console.log(`  ✅ Successful: ${fmStats.successful}`);
  console.log(`  ❌ Failed: ${fmStats.failed}`);
  console.log(`  ⏭️  Skipped: ${fmStats.skipped}`);
  console.log(`  Success rate: ${fmStats.total > 0 ? ((fmStats.successful / fmStats.total) * 100).toFixed(1) : 0}%\n`);

  console.log(`⏱️  Total time: ${durationSec}s`);
  console.log('✅ Logo enrichment complete!');
}

main().catch(console.error);
