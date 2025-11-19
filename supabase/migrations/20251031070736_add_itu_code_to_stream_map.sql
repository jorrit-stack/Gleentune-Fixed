/*
  # Add ITU Code Support to Shortwave Stream Map

  1. Changes
    - Add `itu_code` column to shortwave_stream_map
    - Create unique constraint on (station_name, itu_code) for upsert support
    - Add index on itu_code for matching performance

  2. Purpose
    - Allows matching streams to stations using ITU code
    - Enables ON CONFLICT handling for safe re-seeding
    - Improves matching accuracy for international broadcasters
*/

-- Add itu_code column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'shortwave_stream_map' AND column_name = 'itu_code'
  ) THEN
    ALTER TABLE shortwave_stream_map ADD COLUMN itu_code text;
  END IF;
END $$;

-- Create index on itu_code for matching
CREATE INDEX IF NOT EXISTS idx_shortwave_stream_map_itu_code 
  ON shortwave_stream_map (itu_code);

-- Create unique constraint for upsert support
-- Note: Using station_name and itu_code combination
CREATE UNIQUE INDEX IF NOT EXISTS idx_shortwave_stream_map_unique_station
  ON shortwave_stream_map (station_name, COALESCE(itu_code, ''));
