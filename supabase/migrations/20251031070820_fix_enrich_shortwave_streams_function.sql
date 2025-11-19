/*
  # Fix Shortwave Stream Enrichment Function

  1. Changes
    - Correct column name from station_id to sw_station_id
    - Fix all column references to match actual table schema

  2. Purpose
    - Make the enrichment function work with correct column names
*/

-- Recreate the enrichment function with correct column names
CREATE OR REPLACE FUNCTION enrich_shortwave_streams()
RETURNS TABLE(
  stream_source text,
  stations_updated integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_updated integer := 0;
BEGIN
  -- Update shortwave_stations with stream data from shortwave_stream_map
  -- Only update where stream_url is null
  WITH updated_stations AS (
    UPDATE shortwave_stations sw
    SET 
      stream_url = sm.stream_url,
      stream_verified = sm.stream_verified,
      stream_last_checked = sm.checked_at
    FROM shortwave_stream_map sm
    WHERE sw.stream_url IS NULL
      AND (
        -- Match on ITU code if both exist
        (sw.itu_code IS NOT NULL AND sm.itu_code IS NOT NULL AND sw.itu_code = sm.itu_code)
        OR
        -- Match on station name (case-insensitive)
        LOWER(sw.station_name) = LOWER(sm.station_name)
        OR
        -- Fuzzy match on station name
        sw.station_name ILIKE '%' || sm.station_name || '%'
        OR
        sm.station_name ILIKE '%' || sw.station_name || '%'
      )
    RETURNING sw.sw_station_id, sm.stream_source
  )
  SELECT COUNT(*)
  INTO total_updated
  FROM updated_stations;

  -- Return grouped results by stream_source
  RETURN QUERY
  WITH updated_stations AS (
    SELECT sm.stream_source, COUNT(*)::integer as count
    FROM shortwave_stations sw
    JOIN shortwave_stream_map sm ON (
      (sw.itu_code IS NOT NULL AND sm.itu_code IS NOT NULL AND sw.itu_code = sm.itu_code)
      OR LOWER(sw.station_name) = LOWER(sm.station_name)
      OR sw.station_name ILIKE '%' || sm.station_name || '%'
      OR sm.station_name ILIKE '%' || sw.station_name || '%'
    )
    WHERE sw.stream_url IS NOT NULL
      AND sw.stream_last_checked IS NOT NULL
      AND sw.stream_last_checked >= (now() - interval '1 minute')
    GROUP BY sm.stream_source
  )
  SELECT 
    us.stream_source::text,
    us.count::integer
  FROM updated_stations us
  
  UNION ALL
  
  SELECT 
    'total'::text,
    total_updated::integer
  
  ORDER BY stream_source;
END;
$$;

COMMENT ON FUNCTION enrich_shortwave_streams() IS 
  'Enriches shortwave_stations with streaming URLs from shortwave_stream_map. Only updates stations with null stream_url. Returns count of updates grouped by stream_source.';
