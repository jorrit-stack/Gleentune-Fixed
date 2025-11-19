/*
  # Add Shortwave Propagation and Stream Fields

  1. Changes to shortwave_stations table
    - Add `propagation_pattern` (text) - Stores day/night propagation info
    - Add `target_regions` (text array) - Geographic regions this station targets
    - Add `stream_url` (text) - Online stream URL if available
    - Add `stream_verified` (boolean) - Whether stream URL has been verified
    - Add `stream_last_checked` (timestamptz) - Last verification timestamp

  2. Notes
    - No changes to FM/AM station logic
    - No columns dropped or renamed
    - Propagation patterns: 'day', 'night', 'day_night'
    - Target regions example: ['Asia', 'Europe', 'Middle East']
*/

-- Add propagation and stream columns to shortwave_stations
ALTER TABLE shortwave_stations
  ADD COLUMN IF NOT EXISTS propagation_pattern text,
  ADD COLUMN IF NOT EXISTS target_regions text[],
  ADD COLUMN IF NOT EXISTS stream_url text,
  ADD COLUMN IF NOT EXISTS stream_verified boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS stream_last_checked timestamptz;

-- Add check constraint for propagation_pattern
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'shortwave_stations' 
    AND constraint_name = 'valid_propagation_pattern'
  ) THEN
    ALTER TABLE shortwave_stations
      ADD CONSTRAINT valid_propagation_pattern 
      CHECK (propagation_pattern IN ('day', 'night', 'day_night'));
  END IF;
END $$;