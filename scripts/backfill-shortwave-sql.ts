import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lokoaovrcslqlazxedhx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxva29hb3ZyY3NscWxhenhlZGh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3NTk0MzAsImV4cCI6MjA3NzMzNTQzMH0.rdRUkHWqtlMblbS2jt2AN1izyV1k8EcN6Mmwiywe5hc';

const supabase = createClient(supabaseUrl, supabaseKey);

async function backfillWithSQL() {
  console.log('=== Backfilling Shortwave Metadata with SQL ===\n');

  // Create a PL/pgSQL function to do the enrichment
  const enrichFunction = `
    CREATE OR REPLACE FUNCTION enrich_shortwave_metadata()
    RETURNS void AS $$
    DECLARE
      station_record RECORD;
      prop_pattern TEXT;
      target_regs TEXT[];
      start_hr INTEGER;
      end_hr INTEGER;
      area_upper TEXT;
      updated_count INTEGER := 0;
    BEGIN
      FOR station_record IN
        SELECT sw_station_id, broadcast_times, target_area, itu_code
        FROM shortwave_stations
        WHERE propagation_pattern IS NULL
      LOOP
        -- Derive propagation pattern
        start_hr := SUBSTRING(station_record.broadcast_times FROM 1 FOR 2)::INTEGER;
        end_hr := SUBSTRING(station_record.broadcast_times FROM 6 FOR 2)::INTEGER;

        IF start_hr = 0 AND end_hr = 24 THEN
          prop_pattern := 'day_night';
        ELSIF start_hr >= 6 AND start_hr < 18 AND end_hr > 6 AND end_hr <= 18 THEN
          prop_pattern := 'day';
        ELSIF (start_hr >= 18 OR start_hr < 6) AND (end_hr <= 6 OR end_hr > 18) THEN
          prop_pattern := 'night';
        ELSE
          prop_pattern := 'day_night';
        END IF;

        -- Derive target regions
        target_regs := ARRAY['Global'];
        area_upper := UPPER(COALESCE(station_record.target_area, ''));

        IF area_upper ~ 'AF|AFR' THEN
          target_regs := array_append(target_regs, 'Africa');
        END IF;

        IF area_upper ~ 'AS|ASIA' THEN
          target_regs := array_append(target_regs, 'Asia');
        END IF;

        IF area_upper ~ 'EU|EUR' THEN
          target_regs := array_append(target_regs, 'Europe');
        END IF;

        IF area_upper ~ 'NAM|NA ' THEN
          target_regs := array_append(target_regs, 'North America');
        END IF;

        IF area_upper ~ 'SAM|SA ' THEN
          target_regs := array_append(target_regs, 'South America');
        END IF;

        IF area_upper ~ 'OC|PAC' THEN
          target_regs := array_append(target_regs, 'Oceania');
        END IF;

        -- Country-specific
        CASE station_record.itu_code
          WHEN 'IND' THEN target_regs := array_append(target_regs, 'India');
          WHEN 'CHN' THEN target_regs := array_append(target_regs, 'China');
          WHEN 'JPN' THEN target_regs := array_append(target_regs, 'Japan');
          WHEN 'AUS' THEN target_regs := array_append(target_regs, 'Australia');
          WHEN 'USA' THEN target_regs := array_append(target_regs, 'United States');
          WHEN 'GBR' THEN target_regs := array_append(target_regs, 'United Kingdom');
          ELSE NULL;
        END CASE;

        -- Update the station
        UPDATE shortwave_stations
        SET
          propagation_pattern = prop_pattern,
          target_regions = target_regs
        WHERE sw_station_id = station_record.sw_station_id;

        updated_count := updated_count + 1;

        IF updated_count % 1000 = 0 THEN
          RAISE NOTICE 'Updated % stations...', updated_count;
        END IF;
      END LOOP;

      RAISE NOTICE 'Total updated: %', updated_count;
    END;
    $$ LANGUAGE plpgsql;
  `;

  console.log('Creating enrichment function...');
  const { error: createError } = await supabase.rpc('exec_sql', {
    sql: enrichFunction
  }).single();

  if (createError) {
    console.log('Function might already exist, trying to execute directly...');
  }

  console.log('Running enrichment function...');
  const { error: execError } = await supabase.rpc('enrich_shortwave_metadata');

  if (execError) {
    console.error('Error running enrichment:', execError);

    // Fallback: Direct SQL update
    console.log('\nTrying direct SQL update...');
    const directUpdate = `
      UPDATE shortwave_stations
      SET
        propagation_pattern = CASE
          WHEN SUBSTRING(broadcast_times FROM 1 FOR 2)::INTEGER = 0
               AND SUBSTRING(broadcast_times FROM 6 FOR 2)::INTEGER = 24 THEN 'day_night'
          WHEN SUBSTRING(broadcast_times FROM 1 FOR 2)::INTEGER >= 6
               AND SUBSTRING(broadcast_times FROM 1 FOR 2)::INTEGER < 18
               AND SUBSTRING(broadcast_times FROM 6 FOR 2)::INTEGER > 6
               AND SUBSTRING(broadcast_times FROM 6 FOR 2)::INTEGER <= 18 THEN 'day'
          ELSE 'day_night'
        END,
        target_regions = ARRAY['Global',
          CASE WHEN UPPER(target_area) ~ 'AS|ASIA' THEN 'Asia' ELSE NULL END,
          CASE WHEN UPPER(target_area) ~ 'EU|EUR' THEN 'Europe' ELSE NULL END,
          CASE WHEN UPPER(target_area) ~ 'AF|AFR' THEN 'Africa' ELSE NULL END,
          CASE WHEN UPPER(target_area) ~ 'OC|PAC' THEN 'Oceania' ELSE NULL END
        ]::TEXT[]
      WHERE propagation_pattern IS NULL;
    `;

    const { error: updateError } = await supabase.rpc('exec_sql', {
      sql: directUpdate
    }).single();

    if (updateError) {
      console.error('Direct update failed:', updateError);
    }
  }

  // Check results
  console.log('\n=== Checking Results ===');
  const { data: counts } = await supabase
    .from('shortwave_stations')
    .select('propagation_pattern, target_regions', { count: 'exact', head: true });

  const { data: withData } = await supabase
    .from('shortwave_stations')
    .select('sw_station_id', { count: 'exact', head: true })
    .not('propagation_pattern', 'is', null);

  console.log(`Stations with metadata: ${withData || 0}`);

  // Show samples
  const { data: samples } = await supabase
    .from('shortwave_stations')
    .select('station_name, broadcast_times, propagation_pattern, target_area, target_regions')
    .not('propagation_pattern', 'is', null)
    .limit(10);

  console.log('\n=== Sample Results ===');
  console.table(samples);
}

backfillWithSQL().catch(console.error);
