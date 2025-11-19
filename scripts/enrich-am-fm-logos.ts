import { config } from 'dotenv';
import { enrichAllAMFMLogos, type EnrichmentStats } from '../src/services/logoEnrichment';

config();

async function main() {
  console.log('🎨 Starting AM/FM Logo Enrichment Process');
  console.log('=========================================\n');
  console.log('This script will:');
  console.log('1. Respect robots.txt for all domains');
  console.log('2. Extract logos from favicon.ico, og:image, and apple-touch-icon');
  console.log('3. Validate image sizes (≤30KB, ≤100x100px equivalent)');
  console.log('4. Store attribution metadata for fair use compliance');
  console.log('5. Rate limit requests to 1 per second per domain\n');

  const startTime = Date.now();

  const results = await enrichAllAMFMLogos((bandType, stats) => {
    process.stdout.write(
      `\r${bandType} Progress: ${stats.processed}/${stats.total} | ` +
      `✅ ${stats.successful} | ❌ ${stats.failed} | ⏭️  ${stats.skipped}`
    );
  });

  const endTime = Date.now();
  const durationSec = ((endTime - startTime) / 1000).toFixed(2);

  console.log('\n\n📊 Final Results');
  console.log('================\n');

  console.log('AM Stations:');
  printStats(results.am);

  console.log('\nFM Stations:');
  printStats(results.fm);

  console.log(`\n⏱️  Total time: ${durationSec}s`);

  const totalProcessed = results.am.processed + results.fm.processed;
  const totalSuccessful = results.am.successful + results.fm.successful;
  const successRate = totalProcessed > 0
    ? ((totalSuccessful / totalProcessed) * 100).toFixed(1)
    : '0.0';

  console.log(`📈 Overall success rate: ${successRate}%`);
  console.log(`\n✅ Logo enrichment complete!`);
}

function printStats(stats: EnrichmentStats) {
  console.log(`  Total stations: ${stats.total}`);
  console.log(`  Processed: ${stats.processed}`);
  console.log(`  ✅ Successful: ${stats.successful}`);
  console.log(`  ❌ Failed: ${stats.failed}`);
  console.log(`  ⏭️  Skipped: ${stats.skipped}`);

  if (stats.processed > 0) {
    const successRate = ((stats.successful / stats.processed) * 100).toFixed(1);
    console.log(`  Success rate: ${successRate}%`);
  }
}

main().catch(console.error);
