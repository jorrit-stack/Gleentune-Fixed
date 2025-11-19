/*
  # Update get_distinct_genres to query both tables

  1. Purpose
    - Query genre_category from both stations and radio_stations tables
    - Return unified list of all available genres

  2. Changes
    - Union results from both tables
    - Remove duplicates with DISTINCT
*/

DROP FUNCTION IF EXISTS get_distinct_genres();

CREATE OR REPLACE FUNCTION get_distinct_genres()
RETURNS TABLE (genre text)
LANGUAGE sql
STABLE
AS $$
  SELECT DISTINCT genre_category
  FROM (
    SELECT genre_category FROM stations 
    WHERE genre_category IS NOT NULL 
      AND is_active = true
      AND stream_url IS NOT NULL 
      AND stream_url != ''
    UNION ALL
    SELECT genre_category FROM radio_stations 
    WHERE genre_category IS NOT NULL 
      AND is_active = true
      AND stream_url IS NOT NULL 
      AND stream_url != ''
  ) combined
  ORDER BY genre_category;
$$;

COMMENT ON FUNCTION get_distinct_genres() IS 'Returns clean list of standardized genre categories from all active stations';
