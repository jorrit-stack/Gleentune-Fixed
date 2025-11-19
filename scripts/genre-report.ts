import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

async function generateReport() {
  // Total stations
  const { count: totalCount } = await supabase
    .from('radio_stations')
    .select('*', { count: 'exact', head: true });

  // Stations with genre_category
  const { count: withGenre } = await supabase
    .from('radio_stations')
    .select('*', { count: 'exact', head: true })
    .not('genre_category', 'is', null);

  // Stations without genre_category
  const { count: withoutGenre } = await supabase
    .from('radio_stations')
    .select('*', { count: 'exact', head: true })
    .is('genre_category', null);

  // Genre breakdown
  const { data: genreBreakdown } = await supabase
    .from('radio_stations')
    .select('genre_category')
    .not('genre_category', 'is', null);

  const genreCounts: Record<string, number> = {};
  genreBreakdown?.forEach(row => {
    genreCounts[row.genre_category] = (genreCounts[row.genre_category] || 0) + 1;
  });

  console.log('\n=== GENRE ENRICHMENT REPORT ===\n');
  console.log(`Total Stations: ${totalCount}`);
  console.log(`With Genre: ${withGenre} (${((withGenre! / totalCount!) * 100).toFixed(1)}%)`);
  console.log(`Without Genre: ${withoutGenre} (${((withoutGenre! / totalCount!) * 100).toFixed(1)}%)`);
  
  console.log('\n--- Genre Breakdown ---');
  Object.entries(genreCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([genre, count]) => {
      console.log(`${genre}: ${count}`);
    });
}

generateReport();
