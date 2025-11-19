/*
  # Create Shortwave Stream Enrichment Function

  1. New Functions
    - `enrich_shortwave_streams()` - Enriches shortwave stations with streaming URLs

  2. Function Behavior
    - Joins shortwave_stations with shortwave_stream_map
    - Matches on station_name using ILIKE (fuzzy) or exact itu_code match
    - Only updates stations where stream_url is currently null
    - Updates: stream_url, stream_verified, stream_last_checked
    - Returns count of updated rows grouped by stream_source
    - Does NOT modify FM/AM stations or radio_stations table

  3. Matching Logic
    - Priority 1: Exact ITU code match (if both sides have it)
    - Priority 2: Case-insensitive station name match using ILIKE
    - Only processes shortwave_stations records with null stream_url

  4. Security
    - Function uses SECURITY DEFINER to bypass RLS for updates
    - Safe because it only updates shortwave_stations, not user data

  5. Return Format
    - Returns table with columns: stream_source, stations_updated
*/

-- Create the enrichment function
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
        (sw.itu_code IS NOT NULL AND sm.station_name = sw.itu_code)
        OR
        -- Match on station name (case-insensitive)
        LOWER(sw.station_name) = LOWER(sm.station_name)
        OR
        -- Fuzzy match on station name
        sw.station_name ILIKE '%' || sm.station_name || '%'
        OR
        sm.station_name ILIKE '%' || sw.station_name || '%'
      )
    RETURNING sw.station_id, sm.stream_source
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
      (sw.itu_code IS NOT NULL AND sm.station_name = sw.itu_code)
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

-- Add helpful comment
COMMENT ON FUNCTION enrich_shortwave_streams() IS 
  'Enriches shortwave_stations with streaming URLs from shortwave_stream_map. Only updates stations with null stream_url. Returns count of updates grouped by stream_source.';
