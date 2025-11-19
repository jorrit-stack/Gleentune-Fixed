/*
  # Create function to get distinct genres

  1. Purpose
    - Returns a clean list of unique genres from stations
    - Filters out invalid/placeholder genres
    - Used to populate genre dropdown in the UI

  2. Behavior
    - Extracts genres from both `genre` and `content_type` fields
    - Splits comma-separated values
    - Removes empty strings and common noise
    - Returns sorted list of unique genres

  3. Security
    - Function is marked as STABLE (can be cached)
    - Public access allowed (read-only data)
*/

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS get_distinct_genres();

-- Create function to get all unique genres
CREATE OR REPLACE FUNCTION get_distinct_genres()
RETURNS TABLE (genre text)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  WITH genre_splits AS (
    -- Get genres from stations table
    SELECT DISTINCT
      TRIM(unnest(string_to_array(
        COALESCE(s.genre, s.content_type, ''),
        ','
      ))) AS genre_value
    FROM stations s
    WHERE s.is_active = true
      AND s.stream_url IS NOT NULL
      AND s.stream_url != ''
  )
  SELECT DISTINCT gs.genre_value
  FROM genre_splits gs
  WHERE gs.genre_value IS NOT NULL
    AND gs.genre_value != ''
    AND LENGTH(gs.genre_value) > 1
    AND LENGTH(gs.genre_value) < 50
    -- Filter out common noise patterns
    AND gs.genre_value NOT ILIKE '%unknown%'
    AND gs.genre_value NOT ILIKE '%various%'
    AND gs.genre_value NOT ILIKE '%misc%'
    AND gs.genre_value NOT ILIKE '%other%'
    -- No URLs or codes
    AND gs.genre_value NOT LIKE '%http%'
    AND gs.genre_value NOT LIKE '%www.%'
    AND gs.genre_value NOT SIMILAR TO '[0-9]+'
  ORDER BY gs.genre_value;
END;
$$;

-- Add helpful comment
COMMENT ON FUNCTION get_distinct_genres() IS 'Returns a clean, sorted list of unique genres from active stations';
