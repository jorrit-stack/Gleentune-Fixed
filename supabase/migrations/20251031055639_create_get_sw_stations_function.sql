/*
  # Create Dynamic Shortwave Logic Function

  1. New Function
    - `get_sw_stations(city_id uuid)`
    - Returns shortwave stations based on:
      - Current local time (day/night propagation)
      - Geographic targeting (region/country matching)
      - Station availability and streaming data
  
  2. Logic Flow
    - Step 1: Determine city's local time from UTC
    - Step 2: Calculate propagation pattern (day/night/day_night)
    - Step 3: Filter stations by propagation and target regions
    - Step 4: Return ordered results by frequency
  
  3. Geographic Matching
    - Matches against city's region, country, or "Global" targets
    - Uses array overlap operator (&&) for flexible matching
  
  4. Time-Based Propagation
    - Day: 06:00-17:59 local time
    - Night: 18:00-05:59 local time
    - Always includes 'day_night' stations (24h propagation)
  
  5. Security
    - SECURITY DEFINER to allow timezone calculations
    - Accessible to anon and authenticated users
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
  local_time timestamp;
  local_hour integer;
  pattern text;
  city_region text;
  city_country text;
BEGIN
  -- Step 1: Get city's local time and geographic info
  SELECT 
    COALESCE(timezone(co.timezone, now()), now()) AS lt,
    EXTRACT(HOUR FROM COALESCE(timezone(co.timezone, now()), now()))::integer AS lh,
    co.region_name,
    co.country_name
  INTO 
    local_time,
    local_hour,
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

-- Grant access to anon and authenticated users
GRANT EXECUTE ON FUNCTION get_sw_stations(uuid) TO anon, authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION get_sw_stations(uuid) IS 
'Returns shortwave stations for a given city, filtered by local time-based propagation patterns and geographic targeting. Respects day/night ionospheric conditions and regional broadcasting targets.';