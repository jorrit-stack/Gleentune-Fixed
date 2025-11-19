import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lokoaovrcslqlazxedhx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxva29hb3ZyY3NscWxhenhlZGh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3NTk0MzAsImV4cCI6MjA3NzMzNTQzMH0.rdRUkHWqtlMblbS2jt2AN1izyV1k8EcN6Mmwiywe5hc';

const supabase = createClient(supabaseUrl, supabaseKey);

// Map target area codes to regions
function deriveTargetRegions(targetArea: string, ituCode: string): string[] {
  const regions = new Set<string>();

  // Always include Global for broad coverage
  regions.add('Global');

  // Parse target area codes (examples: NAf, SEu, EAs, etc.)
  const areaUpper = targetArea.toUpperCase();

  // Continental/Regional patterns
  if (areaUpper.includes('AF') || areaUpper.includes('AFR')) regions.add('Africa');
  if (areaUpper.includes('AS') || areaUpper.includes('ASIA')) regions.add('Asia');
  if (areaUpper.includes('EU') || areaUpper.includes('EUR')) regions.add('Europe');
  if (areaUpper.includes('NAM') || areaUpper.includes('NA ')) regions.add('North America');
  if (areaUpper.includes('SAM') || areaUpper.includes('SA ')) regions.add('South America');
  if (areaUpper.includes('OC') || areaUpper.includes('PAC')) regions.add('Oceania');
  if (areaUpper.includes('ME') || areaUpper.includes('MIDEAST')) regions.add('Middle East');

  // Specific region codes from EiBi
  if (/^(N|S|E|W|C)?AF/i.test(targetArea)) regions.add('Africa');
  if (/^(N|S|E|W|C|SE|NE)?AS/i.test(targetArea)) regions.add('Asia');
  if (/^(N|S|E|W|C)?EU/i.test(targetArea)) regions.add('Europe');
  if (/^(N|S|E|W|C)?AM/i.test(targetArea)) regions.add('Americas');

  // Country-specific broadcasts
  const countryMap: Record<string, string> = {
    'IND': 'India', 'CHN': 'China', 'JPN': 'Japan', 'AUS': 'Australia',
    'USA': 'United States', 'CAN': 'Canada', 'GBR': 'United Kingdom',
    'DEU': 'Germany', 'FRA': 'France', 'RUS': 'Russia', 'BRA': 'Brazil'
  };

  if (countryMap[ituCode]) {
    regions.add(countryMap[ituCode]);
  }

  return Array.from(regions);
}

// Derive propagation pattern from broadcast times
function derivePropagationPattern(times: string): string {
  // Parse times like "0000-2400", "0600-1800", "1800-0600"
  const match = times.match(/(\d{4})-(\d{4})/);
  if (!match) return 'day_night';

  const startHour = parseInt(match[1].substring(0, 2));
  const endHour = parseInt(match[2].substring(0, 2));

  // 24-hour broadcast
  if (startHour === 0 && endHour === 24) return 'day_night';
  if (startHour === endHour) return 'day_night';

  // Determine if mostly day or night
  // Day: 06:00-17:59, Night: 18:00-05:59
  const isDayStart = startHour >= 6 && startHour < 18;
  const isDayEnd = endHour > 6 && endHour <= 18;

  if (isDayStart && isDayEnd) return 'day';
  if (!isDayStart && !isDayEnd) return 'night';

  // Mixed or crossing midnight
  return 'day_night';
}

async function backfillMetadata() {
  console.log('=== Backfilling Shortwave Metadata ===\n');

  // Fetch all stations with missing metadata
  const { data: stations, error: fetchError } = await supabase
    .from('shortwave_stations')
    .select('sw_station_id, target_area, itu_code, broadcast_times, propagation_pattern, target_regions')
    .is('propagation_pattern', null);

  if (fetchError) {
    console.error('Error fetching stations:', fetchError);
    return;
  }

  console.log(`Found ${stations?.length || 0} stations to update`);

  let updated = 0;
  let errors = 0;
  const batchSize = 100;

  for (let i = 0; i < (stations?.length || 0); i += batchSize) {
    const batch = stations!.slice(i, i + batchSize);

    // Update each station individually
    for (const station of batch) {
      const propagationPattern = derivePropagationPattern(station.broadcast_times || '0000-2400');
      const targetRegions = deriveTargetRegions(station.target_area || '', station.itu_code || '');

      const { error: updateError } = await supabase
        .from('shortwave_stations')
        .update({
          propagation_pattern: propagationPattern,
          target_regions: targetRegions,
        })
        .eq('sw_station_id', station.sw_station_id);

      if (updateError) {
        errors++;
      } else {
        updated++;
      }
    }

    if ((i + batchSize) % 1000 === 0 || i + batchSize >= (stations?.length || 0)) {
      console.log(`Progress: ${updated.toLocaleString()} / ${stations?.length.toLocaleString()}`);
    }
  }

  console.log('\n=== Backfill Complete ===');
  console.log(`Updated: ${updated.toLocaleString()}`);
  console.log(`Errors: ${errors}`);

  // Show sample results
  console.log('\n=== Sample Updated Stations ===');
  const { data: samples } = await supabase
    .from('shortwave_stations')
    .select('station_name, broadcast_times, propagation_pattern, target_area, target_regions')
    .not('propagation_pattern', 'is', null)
    .limit(5);

  console.table(samples);
}

backfillMetadata().catch(console.error);
