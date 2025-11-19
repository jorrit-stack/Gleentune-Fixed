/*
  # Fix get_sw_stations Function - Schema Compatibility

  1. Changes
    - Remove reference to non-existent `co.timezone` column
    - Use `co.region` instead of `co.region_name`
    - Calculate approximate local time from longitude (15° = 1 hour)
    - Fallback to UTC when city data unavailable
  
  2. Timezone Approximation
    - Uses longitude to estimate UTC offset: offset_hours = longitude / 15
    - Not perfect but reasonable for day/night propagation patterns
    - More accurate timezone data can be added later if needed
  
  3. Geographic Matching
    - Uses actual `region` column from countries table
    - Matches against region code (e.g., 'AS', 'EU', 'NA', 'OC')
    - Also matches country name and 'Global'
*/

CREATE OR REPLACE FUNCTION get_sw_stations(city_id uuid)
RETURNS TABLE (
  station_id text,
  station_name text,
  frequency_khz numeric,
  frequency_mhz numeric,
  propagation_pattern text,
  target_regions text[],
  stream_url text,
  stream_verified boolean,
  country_name text,
  language text,
  target_area text,
  broadcast_times text,
  source_table text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  local_hour integer;
  pattern text;
  city_region text;
  city_country text;
  city_longitude numeric;
  utc_offset numeric;
BEGIN
  -- Step 1: Get city's geographic info and calculate approximate local time
  SELECT 
    c.longitude,
    co.region,
    co.country_name
  INTO 
    city_longitude,
    city_region,
    city_country
  FROM cities c
  JOIN countries co ON c.country_id = co.country_id
  WHERE c.city_id = get_sw_stations.city_id;

  -- Handle case where city not found
  IF NOT FOUND THEN
    local_hour := EXTRACT(HOUR FROM now())::integer;
    city_region := 'Global';
    city_country := 'Global';
  ELSE
    -- Calculate approximate UTC offset from longitude (15 degrees = 1 hour)
    utc_offset := city_longitude / 15.0;
    -- Calculate local hour
    local_hour := (EXTRACT(HOUR FROM now()) + utc_offset::integer) % 24;
    IF local_hour < 0 THEN
      local_hour := local_hour + 24;
    END IF;
  END IF;

  -- Step 2: Determine propagation pattern based on local hour
  pattern := CASE
    WHEN local_hour BETWEEN 6 AND 17 THEN 'day'
    WHEN local_hour BETWEEN 18 AND 23 OR local_hour BETWEEN 0 AND 5 THEN 'night'
    ELSE 'day_night'
  END;

  -- Step 3 & 4: Query stations with propagation and geographic filtering
  RETURN QUERY
  SELECT 
    sv.station_id,
    sv.station_name,
    sv.frequency_khz,
    sv.frequency_mhz,
    sv.propagation_pattern,
    sv.target_regions,
    sv.stream_url,
    sv.stream_verified,
    sv.country_name,
    sv.language,
    sv.target_area,
    sv.broadcast_times,
    sv.source_table
  FROM stations_view sv
  WHERE sv.band_type = 'SW'
    AND (
      sv.propagation_pattern = pattern
      OR sv.propagation_pattern = 'day_night'
    )
    AND (
      sv.target_regions && ARRAY[
        city_region,
        city_country,
        'Global'
      ]::text[]
    )
  ORDER BY sv.frequency_khz ASC;
END;
$$;

-- Grant access remains the same
GRANT EXECUTE ON FUNCTION get_sw_stations(uuid) TO anon, authenticated;

-- Update comment
COMMENT ON FUNCTION get_sw_stations(uuid) IS 
'Returns shortwave stations for a given city, filtered by approximate local time-based propagation patterns (calculated from longitude) and geographic targeting. Respects day/night ionospheric conditions and regional broadcasting targets.';