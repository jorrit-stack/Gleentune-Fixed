/*
  # Add genre_category to radio_stations table (simple)

  1. Purpose
    - Add genre_category column to radio_stations table only
    - Don't modify the view (will do that separately)

  2. Changes
    - Add genre_category column
    - Add index for efficient filtering
*/

-- Add genre_category to radio_stations table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'radio_stations' AND column_name = 'genre_category'
  ) THEN
    ALTER TABLE radio_stations ADD COLUMN genre_category text;
  END IF;
END $$;

-- Create index
CREATE INDEX IF NOT EXISTS idx_radio_stations_genre_category 
  ON radio_stations(genre_category) 
  WHERE genre_category IS NOT NULL AND is_active = true;

-- Add comment
COMMENT ON COLUMN radio_stations.genre_category IS 'Standardized genre category (News, Rock, Jazz, etc.)';
