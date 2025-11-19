/*
  # Improve genre filtering

  1. Purpose
    - Better filter out noise from genre data
    - Remove frequencies, station IDs, and other non-genre content

  2. Changes
    - Add more comprehensive filters
    - Exclude numeric patterns
    - Exclude frequency patterns (FM/AM numbers)
*/

DROP FUNCTION IF EXISTS get_distinct_genres();

CREATE OR REPLACE FUNCTION get_distinct_genres()
RETURNS TABLE (genre text)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  WITH genre_splits AS (
    SELECT DISTINCT
      LOWER(TRIM(unnest(string_to_array(
        COALESCE(s.genre, s.content_type, ''),
        ','
      )))) AS genre_value
    FROM stations s
    WHERE s.is_active = true
      AND s.stream_url IS NOT NULL
      AND s.stream_url != ''
      AND s.band_type = 'FM'
  )
  SELECT DISTINCT gs.genre_value
  FROM genre_splits gs
  WHERE gs.genre_value IS NOT NULL
    AND gs.genre_value != ''
    AND LENGTH(gs.genre_value) > 2
    AND LENGTH(gs.genre_value) < 30
    -- Filter out noise
    AND gs.genre_value NOT ILIKE '%unknown%'
    AND gs.genre_value NOT ILIKE '%various%'
    AND gs.genre_value NOT ILIKE '%misc%'
    AND gs.genre_value NOT ILIKE '%test%'
    -- No URLs
    AND gs.genre_value NOT LIKE '%http%'
    AND gs.genre_value NOT LIKE '%www.%'
    AND gs.genre_value NOT LIKE '%.com%'
    AND gs.genre_value NOT LIKE '%.org%'
    -- No pure numbers or frequencies
    AND gs.genre_value NOT SIMILAR TO '[0-9]+(\.[0-9]+)?%'
    AND gs.genre_value NOT SIMILAR TO '%[0-9]{2,3}\.[0-9]%'
    -- No frequency patterns
    AND gs.genre_value NOT LIKE '%mhz%'
    AND gs.genre_value NOT LIKE '%khz%'
    AND gs.genre_value NOT LIKE '%fm%[0-9]%'
    AND gs.genre_value NOT LIKE '%am%[0-9]%'
    AND gs.genre_value NOT LIKE '[0-9]%fm'
    AND gs.genre_value NOT LIKE '[0-9]%am'
    -- No special characters spam
    AND gs.genre_value NOT LIKE '%@%'
    AND gs.genre_value NOT LIKE '%#%'
    AND gs.genre_value NOT LIKE '%&%'
  ORDER BY gs.genre_value;
END;
$$;

COMMENT ON FUNCTION get_distinct_genres() IS 'Returns a clean, sorted list of unique genres from active FM stations';
