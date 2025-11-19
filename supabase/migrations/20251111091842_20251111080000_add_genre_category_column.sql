/*
  # Add genre_category column for standardized genres

  1. Purpose
    - Add clean, curated genre_category column
    - Store standardized genres (News, Rock, Jazz, etc.)
    - Replace messy genre/content_type fields with clean values

  2. Changes
    - Add genre_category column to stations table
    - Add index for efficient filtering
    - Column allows NULL (will be populated via enrichment script)

  3. Security
    - No RLS changes needed (inherits from stations table)
*/

-- Add genre_category column to stations table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stations' AND column_name = 'genre_category'
  ) THEN
    ALTER TABLE stations ADD COLUMN genre_category text;
  END IF;
END $$;

-- Create index for genre filtering
CREATE INDEX IF NOT EXISTS idx_stations_genre_category 
  ON stations(genre_category) 
  WHERE genre_category IS NOT NULL AND is_active = true;

-- Add comment
COMMENT ON COLUMN stations.genre_category IS 'Standardized genre category (News, Rock, Jazz, etc.) - curated list of ~30 core genres';
