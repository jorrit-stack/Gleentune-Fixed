/*
  # Update get_distinct_genres to use genre_category

  1. Purpose
    - Use the new genre_category column
    - Return clean, curated list of ~30 genres
    - Much simpler and cleaner than previous version

  2. Changes
    - Replace function to query genre_category directly
    - No need for complex filtering (data is already clean)
    - Sort alphabetically for consistent ordering
*/

DROP FUNCTION IF EXISTS get_distinct_genres();

CREATE OR REPLACE FUNCTION get_distinct_genres()
RETURNS TABLE (genre text)
LANGUAGE sql
STABLE
AS $$
  SELECT DISTINCT genre_category
  FROM stations
  WHERE genre_category IS NOT NULL
    AND is_active = true
    AND stream_url IS NOT NULL
    AND stream_url != ''
  ORDER BY genre_category;
$$;

COMMENT ON FUNCTION get_distinct_genres() IS 'Returns clean list of standardized genre categories from active stations';
