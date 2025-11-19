import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { detectGenre } from '../src/services/genreMapping.js';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

async function enrichGenres() {
  console.log('Fetching all stations...');
  
  const { data: stations, error } = await supabase
    .from('radio_stations')
    .select('id, name, tags')
    .is('genre_category', null);

  if (error) {
    console.error('Error fetching stations:', error);
    return;
  }

  console.log(`Processing ${stations.length} stations without genre_category...`);

  let updated = 0;
  let skipped = 0;

  for (const station of stations) {
    const detectedGenre = detectGenre({
      name: station.name,
      tags: station.tags
    });

    if (detectedGenre) {
      const { error: updateError } = await supabase
        .from('radio_stations')
        .update({ genre_category: detectedGenre })
        .eq('id', station.id);

      if (!updateError) {
        updated++;
        if (updated % 100 === 0) {
          console.log(`Updated ${updated}...`);
        }
      }
    } else {
      skipped++;
    }
  }

  console.log(`\nCompleted!`);
  console.log(`Updated: ${updated}`);
  console.log(`Skipped (no clear genre): ${skipped}`);
}

enrichGenres();
