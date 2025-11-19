import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { detectGenre, STANDARD_GENRES } from '../src/services/genreMapping';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface Station {
  id: string;
  name: string;
  tags?: string[];
  content_type?: string | null;
  genre?: string | null;
  genre_category?: string | null;
}

async function enrichGenres(batchSize: number = 100, limit?: number) {
  console.log('🎵 Starting genre enrichment...');
  console.log(`📊 Standard genres: ${STANDARD_GENRES.length}`);
  console.log(`📋 Genres: ${STANDARD_GENRES.join(', ')}\n`);

  let offset = 0;
  let totalProcessed = 0;
  let totalUpdated = 0;
  let totalExcluded = 0;
  let genreStats: Record<string, number> = {};

  while (true) {
    if (limit && totalProcessed >= limit) break;

    const actualBatchSize = limit ? Math.min(batchSize, limit - totalProcessed) : batchSize;

    const { data: stations, error } = await supabase
      .from('radio_stations')
      .select('id, name, tags, language, genre_category')
      .eq('is_active', true)
      .not('stream_url', 'is', null)
      .neq('stream_url', '')
      .range(offset, offset + actualBatchSize - 1);

    if (error) {
      console.error('Error fetching stations:', error);
      break;
    }

    if (!stations || stations.length === 0) {
      console.log('✅ No more stations to process');
      break;
    }

    console.log(`\n📦 Processing batch: ${offset + 1} to ${offset + stations.length}`);

    for (const station of stations as Station[]) {
      totalProcessed++;

      const detectedGenre = detectGenre(station);

      if (detectedGenre === null) {
        // Station has adult content or no clear genre
        if (station.name.toLowerCase().includes('adult')) {
          totalExcluded++;
          console.log(`  ❌ EXCLUDED (Adult content): ${station.name}`);
        }
        continue;
      }

      if (station.genre_category !== detectedGenre) {
        const { error: updateError } = await supabase
          .from('radio_stations')
          .update({ genre_category: detectedGenre })
          .eq('id', station.id);

        if (!updateError) {
          totalUpdated++;
          genreStats[detectedGenre] = (genreStats[detectedGenre] || 0) + 1;
          console.log(`  ✓ ${station.name.substring(0, 40).padEnd(40)} → ${detectedGenre}`);
        } else {
          console.error(`  ✗ Failed to update ${station.id}:`, updateError.message);
        }
      }
    }

    offset += actualBatchSize;

    if (stations.length < actualBatchSize) {
      console.log('✅ Reached end of stations');
      break;
    }
  }

  console.log('\n═══════════════════════════════════════════');
  console.log('📊 GENRE ENRICHMENT SUMMARY');
  console.log('═══════════════════════════════════════════');
  console.log(`Total stations processed: ${totalProcessed}`);
  console.log(`Total stations updated: ${totalUpdated}`);
  console.log(`Total stations excluded (adult content): ${totalExcluded}`);
  console.log('\n📈 Genre Distribution:');

  const sortedGenres = Object.entries(genreStats)
    .sort(([, a], [, b]) => b - a);

  for (const [genre, count] of sortedGenres) {
    const percentage = ((count / totalUpdated) * 100).toFixed(1);
    console.log(`  ${genre.padEnd(25)} ${count.toString().padStart(5)} (${percentage}%)`);
  }

  console.log('═══════════════════════════════════════════\n');
}

const args = process.argv.slice(2);
const batchSize = args[0] ? parseInt(args[0]) : 100;
const limit = args[1] ? parseInt(args[1]) : undefined;

console.log(`Batch size: ${batchSize}`);
if (limit) {
  console.log(`Limit: ${limit} stations`);
}

enrichGenres(batchSize, limit)
  .then(() => {
    console.log('✅ Genre enrichment complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
