/*
  # Better filtering of multi-language entries

  1. Updates
    - Filters entries with "/" like "english/spanish"
    - Filters entries with space between language names like "english spanish"
    - Keeps single languages and proper names
  
  2. Strategy
    - Check if entry contains multiple known language names
    - Filter those out from the list
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
      AND lang !~ '/'
      AND lang !~ '\s+(spanish|french|german|italian|portuguese|russian|arabic|chinese|hindi|english|tagalog|indonesian|malay|turkish|polish|ukrainian|dutch|swedish|norwegian|danish)$'
      AND lang !~ '^(spanish|french|german|italian|portuguese|russian|arabic|chinese|hindi|tagalog|indonesian|malay|turkish|polish|ukrainian|dutch|swedish|norwegian|danish)\s+'
      AND lang NOT IN (
        '80s', 'rock', 'chill', 'sing along', 'only music', 'online radio', 
        'public radio', 'meteo', 'discography', 'evergreens', 'classical',
        'eletrica', 'arabesk', 'n/a', 'music', 'various languages',
        'eight additional languages', 'various filipino languages',
        'english spanish', 'english hindi', 'english tagalog', 'english russian'
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