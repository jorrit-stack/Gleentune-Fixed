/*
  # Create function to get distinct languages efficiently

  1. New Function
    - `get_distinct_languages()` - Returns array of unique languages from stations_view
    - Processes comma-separated language lists
    - Cleans and normalizes language names
    - Filters out invalid entries
  
  2. Performance
    - Processes data in PostgreSQL instead of client-side
    - Much faster than fetching 22k+ rows to JavaScript
    - Returns sorted, cleaned list
*/

CREATE OR REPLACE FUNCTION get_distinct_languages()
RETURNS TEXT[] AS $$
DECLARE
  languages TEXT[];
  unique_languages TEXT[];
BEGIN
  -- Get all distinct languages, split by comma, trim, lowercase, and clean
  WITH split_languages AS (
    SELECT DISTINCT 
      LOWER(TRIM(unnest(string_to_array(language, ',')))) as lang
    FROM stations_view
    WHERE language IS NOT NULL 
      AND language != ''
  ),
  cleaned_languages AS (
    SELECT 
      REGEXP_REPLACE(lang, '^#', '', 'g') as cleaned_lang
    FROM split_languages
    WHERE lang IS NOT NULL
      AND lang != ''
      AND LENGTH(lang) > 1
      AND lang !~ '^\d+$'
      AND lang !~ '^\d+\s+(additional|other)\s+languages?$'
  )
  SELECT ARRAY_AGG(DISTINCT cleaned_lang ORDER BY cleaned_lang)
  INTO unique_languages
  FROM cleaned_languages
  WHERE cleaned_lang IS NOT NULL AND cleaned_lang != '';

  RETURN COALESCE(unique_languages, ARRAY[]::TEXT[]);
END;
$$ LANGUAGE plpgsql STABLE;