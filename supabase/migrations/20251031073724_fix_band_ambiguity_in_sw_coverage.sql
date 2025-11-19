/*
  # Fix Band Column Ambiguity

  1. Issue
    - Multiple ambiguous column references in CTEs
    - "band" conflicts between different query levels

  2. Solution
    - Use explicit table qualifiers
    - Rename CTE columns to avoid conflicts
    - Properly scope all column references
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
  target_propagation text;
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
  local_hour := (EXTRACT(HOUR FROM now()) + ROUND(city_lng / 15))::integer;
  
  -- Normalize to 0-23 range
  IF local_hour < 0 THEN
    local_hour := local_hour + 24;
  ELSIF local_hour >= 24 THEN
    local_hour := local_hour - 24;
  END IF;

  -- Determine propagation pattern
  target_propagation := CASE
    WHEN local_hour BETWEEN 6 AND 17 THEN 'day'
    ELSE 'night'
  END;

  -- Return band-wise statistics
  RETURN QUERY
  WITH all_playable AS (
    SELECT 
      CASE 
        WHEN ss.frequency_khz BETWEEN 3200 AND 6999 THEN 'SW1 (3.2-7 MHz)'
        WHEN ss.frequency_khz BETWEEN 7000 AND 14999 THEN 'SW2 (7-15 MHz)'
        WHEN ss.frequency_khz BETWEEN 15000 AND 26100 THEN 'SW3 (15-26.1 MHz)'
      END AS band_name,
      ss.stream_url,
      ss.propagation_pattern AS prop,
      ss.target_regions
    FROM shortwave_stations ss
    WHERE ss.stream_url IS NOT NULL
      AND ss.frequency_khz BETWEEN 3200 AND 26100
  ),
  realistic_playable AS (
    SELECT 
      ap.band_name,
      COUNT(*) AS count
    FROM all_playable ap
    WHERE (ap.prop = target_propagation OR ap.prop = 'day_night')
      AND (
        ap.target_regions && ARRAY[city_region, city_country, 'Global']::text[]
      )
    GROUP BY ap.band_name
  ),
  total_playable AS (
    SELECT 
      ap.band_name,
      COUNT(*) AS count
    FROM all_playable ap
    GROUP BY ap.band_name
  )
  SELECT 
    city_name_param::text,
    COALESCE(tp.band_name, rp.band_name) AS band,
    COALESCE(tp.count, 0) AS playable_count,
    COALESCE(rp.count, 0) AS realistic_count,
    ROUND(100.0 * COALESCE(rp.count, 0)::numeric / NULLIF(COALESCE(tp.count, 1), 0), 2) AS percent
  FROM total_playable tp
  FULL OUTER JOIN realistic_playable rp ON tp.band_name = rp.band_name
  ORDER BY 
    CASE 
      WHEN COALESCE(tp.band_name, rp.band_name) = 'SW1 (3.2-7 MHz)' THEN 1
      WHEN COALESCE(tp.band_name, rp.band_name) = 'SW2 (7-15 MHz)' THEN 2
      WHEN COALESCE(tp.band_name, rp.band_name) = 'SW3 (15-26.1 MHz)' THEN 3
    END;
END;
$$;
