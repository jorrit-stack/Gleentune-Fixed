/*
  # Create Realistic Shortwave Coverage Analysis Function

  1. New Function
    - `get_realistic_sw_coverage(city_name TEXT)`
    - Returns playable shortwave coverage statistics by band
    - Uses city coordinates and local solar time for propagation
    - Filters by target_regions matching and verified streams

  2. Coverage Calculation
    - Uses longitude to calculate approximate local solar time
    - Day: 06:00-17:59 local solar time
    - Night: 18:00-05:59 local solar time
    - Matches stations by propagation pattern and target regions

  3. Band Classification
    - SW1: 3200-6999 kHz (Tropical bands)
    - SW2: 7000-14999 kHz (Mid-range bands)
    - SW3: 15000-26100 kHz (High-frequency bands)

  4. Geographic Matching
    - Matches city's region (AS, EU, AF, etc.)
    - Matches country name
    - Always includes 'Global' targets

  5. Output
    - Returns band-wise statistics:
      - playable_count: stations with streams
      - realistic_count: stations matching time/region
      - percent: coverage percentage

  6. Security
    - SECURITY DEFINER for cross-table access
    - Accessible to anon and authenticated users
*/

CREATE OR REPLACE FUNCTION get_realistic_sw_coverage(city_name_param TEXT)
RETURNS TABLE (
  city_name text,
  band text,
  playable_count bigint,
  realistic_count bigint,
  percent numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  city_lng numeric;
  city_lat numeric;
  city_region text;
  city_country text;
  local_hour integer;
  propagation_pattern text;
BEGIN
  -- Get city location and region info
  SELECT 
    c.longitude,
    c.latitude,
    co.region,
    co.country_name
  INTO 
    city_lng,
    city_lat,
    city_region,
    city_country
  FROM cities c
  JOIN countries co ON c.country_id = co.country_id
  WHERE c.city_name ILIKE city_name_param
  LIMIT 1;

  -- If city not found, return empty result
  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Calculate local solar time from longitude (rough approximation)
  -- longitude / 15 = hours from UTC
  local_hour := (EXTRACT(HOUR FROM now()) + ROUND(city_lng / 15))::integer;
  
  -- Normalize to 0-23 range
  IF local_hour < 0 THEN
    local_hour := local_hour + 24;
  ELSIF local_hour >= 24 THEN
    local_hour := local_hour - 24;
  END IF;

  -- Determine propagation pattern
  propagation_pattern := CASE
    WHEN local_hour BETWEEN 6 AND 17 THEN 'day'
    ELSE 'night'
  END;

  -- Return band-wise statistics
  RETURN QUERY
  WITH all_playable AS (
    SELECT 
      CASE 
        WHEN frequency_khz BETWEEN 3200 AND 6999 THEN 'SW1 (3.2-7 MHz)'
        WHEN frequency_khz BETWEEN 7000 AND 14999 THEN 'SW2 (7-15 MHz)'
        WHEN frequency_khz BETWEEN 15000 AND 26100 THEN 'SW3 (15-26.1 MHz)'
      END AS band,
      stream_url,
      propagation_pattern AS prop,
      target_regions
    FROM shortwave_stations
    WHERE stream_url IS NOT NULL
      AND frequency_khz BETWEEN 3200 AND 26100
  ),
  realistic_playable AS (
    SELECT 
      band,
      COUNT(*) AS count
    FROM all_playable
    WHERE (prop = propagation_pattern OR prop = 'day_night')
      AND (
        target_regions && ARRAY[city_region, city_country, 'Global']::text[]
      )
    GROUP BY band
  ),
  total_playable AS (
    SELECT 
      band,
      COUNT(*) AS count
    FROM all_playable
    GROUP BY band
  )
  SELECT 
    city_name_param::text,
    COALESCE(tp.band, rp.band) AS band,
    COALESCE(tp.count, 0) AS playable_count,
    COALESCE(rp.count, 0) AS realistic_count,
    ROUND(100.0 * COALESCE(rp.count, 0)::numeric / NULLIF(COALESCE(tp.count, 1), 0), 2) AS percent
  FROM total_playable tp
  FULL OUTER JOIN realistic_playable rp ON tp.band = rp.band
  ORDER BY 
    CASE 
      WHEN COALESCE(tp.band, rp.band) = 'SW1 (3.2-7 MHz)' THEN 1
      WHEN COALESCE(tp.band, rp.band) = 'SW2 (7-15 MHz)' THEN 2
      WHEN COALESCE(tp.band, rp.band) = 'SW3 (15-26.1 MHz)' THEN 3
    END;
END;
$$;

-- Grant access
GRANT EXECUTE ON FUNCTION get_realistic_sw_coverage(TEXT) TO anon, authenticated;

-- Add documentation
COMMENT ON FUNCTION get_realistic_sw_coverage(TEXT) IS 
'Returns realistic shortwave coverage statistics by band for a given city. Uses city coordinates for local solar time calculation, propagation patterns (day/night), and geographic targeting to determine realistically receivable stations with verified streams.';
