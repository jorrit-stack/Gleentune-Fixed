/*
  # Improve language filtering to remove invalid entries

  1. Updates
    - Enhanced get_distinct_languages() function
    - Filters out non-language entries like "+7 languages", "80s", "rock", etc.
    - Only includes actual language names
    - Better validation rules
  
  2. Filtering Rules
    - Must be at least 3 characters (excludes "en", "fr" codes)
    - Cannot start with digits or special characters
    - Cannot contain music genres or other noise
    - Must look like an actual language name
*/

CREATE OR REPLACE FUNCTION get_distinct_languages()
RETURNS TEXT[] AS $$
DECLARE
  unique_languages TEXT[];
BEGIN
  WITH split_languages AS (
    SELECT DISTINCT 
      LOWER(TRIM(unnest(string_to_array(language, ',')))) as lang
    FROM stations_view
    WHERE language IS NOT NULL 
      AND language != ''
  ),
  cleaned_languages AS (
    SELECT 
      REGEXP_REPLACE(lang, '^#+', '', 'g') as cleaned_lang
    FROM split_languages
    WHERE lang IS NOT NULL
      AND lang != ''
      AND LENGTH(lang) >= 3
      AND lang !~ '^\d'
      AND lang !~ '^\+'
      AND lang !~ '^http'
      AND lang !~ '\d{3,}'
      AND lang NOT IN (
        '80s', 'rock', 'chill', 'sing along', 'only music', 'online radio', 
        'public radio', 'meteo', 'discography', 'evergreens', 'classical',
        'eletrica', 'arabesk', 'n/a', 'music', 'various languages',
        'eight additional languages', 'various filipino languages'
      )
      AND lang !~ '\d+\s+(additional|other|addtional)\s+languages?'
      AND lang !~ '^(br|dr|en|es|fr|de|it|pt|ru|uk|ua|ps|ml|ha|ру)$'
  )
  SELECT ARRAY_AGG(DISTINCT cleaned_lang ORDER BY cleaned_lang)
  INTO unique_languages
  FROM cleaned_languages
  WHERE cleaned_lang IS NOT NULL 
    AND cleaned_lang != ''
    AND LENGTH(cleaned_lang) >= 3;

  RETURN COALESCE(unique_languages, ARRAY[]::TEXT[]);
END;
$$ LANGUAGE plpgsql STABLE;