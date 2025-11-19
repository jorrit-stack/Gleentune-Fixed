import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabaseUrl = 'https://lokoaovrcslqlazxedhx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxva29hb3ZyY3NscWxhenhlZGh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3NTk0MzAsImV4cCI6MjA3NzMzNTQzMH0.rdRUkHWqtlMblbS2jt2AN1izyV1k8EcN6Mmwiywe5hc';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('Importing cities from /tmp/cities500.txt...\n');

  const content = readFileSync('/tmp/cities500.txt', 'utf-8');
  const lines = content.split('\n');

  console.log(`Found ${lines.length} lines\n`);

  const { data: countriesData } = await supabase
    .from('countries')
    .select('country_id, iso_code');

  const countryMap = new Map<string, string>();
  if (countriesData) {
    for (const country of countriesData) {
      countryMap.set(country.iso_code, country.country_id);
    }
  }

  console.log(`Mapped ${countryMap.size} countries\n`);

  let imported = 0;
  let skipped = 0;
  const batchSize = 100;
  const citiesToInsert = [];

  for (const line of lines) {
    if (line.trim() === '') continue;
    const parts = line.split('\t');
    if (parts.length < 19) continue;

    const name = parts[1];
    const latitude = parseFloat(parts[4]);
    const longitude = parseFloat(parts[5]);
    const countryCode = parts[8];
    const population = parseInt(parts[14]);

    if (isNaN(latitude) || isNaN(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      skipped++;
      continue;
    }

    if (!name || name.trim() === '') {
      skipped++;
      continue;
    }

    const countryId = countryMap.get(countryCode);
    if (!countryId) {
      skipped++;
      continue;
    }

    citiesToInsert.push({
      city_name: name,
      country_id: countryId,
      latitude,
      longitude,
      population: isNaN(population) ? null : population,
    });

    if (citiesToInsert.length >= batchSize) {
      const { error } = await supabase.from('cities').insert(citiesToInsert);

      if (error) {
        console.error('Batch error:', error.message);
        skipped += citiesToInsert.length;
      } else {
        imported += citiesToInsert.length;
      }

      citiesToInsert.length = 0;

      if (imported % 1000 === 0) {
        console.log(`Processed ${imported + skipped} cities...`);
      }
    }
  }

  if (citiesToInsert.length > 0) {
    const { error } = await supabase.from('cities').insert(citiesToInsert);

    if (error) {
      console.error('Final batch error:', error.message);
      skipped += citiesToInsert.length;
    } else {
      imported += citiesToInsert.length;
    }
  }

  const { count: cityCount } = await supabase
    .from('cities')
    .select('*', { count: 'exact', head: true });

  console.log(`\n=== Import Complete ===`);
  console.log(`Imported: ${imported}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Total cities in database: ${cityCount || 0}`);
}

main();
