/*
  # Add Logo Attribution Fields

  1. New Columns
    - `source_url` (text) - URL of the website where logo was retrieved from
    - `retrieved_at` (timestamptz) - Timestamp when logo was retrieved
  
  2. Changes
    - Add source_url and retrieved_at to radio_stations table
    - Add source_url and retrieved_at to stations table (AM/FM)
    - Add source_url and retrieved_at to shortwave_stations table
  
  3. Purpose
    - Enable proper attribution for nominative fair use
    - Track when logos were retrieved for cache invalidation
    - Store original source for legal compliance
*/

-- Add to radio_stations table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'radio_stations' AND column_name = 'source_url'
  ) THEN
    ALTER TABLE radio_stations ADD COLUMN source_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'radio_stations' AND column_name = 'retrieved_at'
  ) THEN
    ALTER TABLE radio_stations ADD COLUMN retrieved_at timestamptz;
  END IF;
END $$;

-- Add to stations table (AM/FM)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stations' AND column_name = 'source_url'
  ) THEN
    ALTER TABLE stations ADD COLUMN source_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stations' AND column_name = 'retrieved_at'
  ) THEN
    ALTER TABLE stations ADD COLUMN retrieved_at timestamptz;
  END IF;
END $$;

-- Add to shortwave_stations table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'shortwave_stations' AND column_name = 'source_url'
  ) THEN
    ALTER TABLE shortwave_stations ADD COLUMN source_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'shortwave_stations' AND column_name = 'retrieved_at'
  ) THEN
    ALTER TABLE shortwave_stations ADD COLUMN retrieved_at timestamptz;
  END IF;
END $$;

-- Create index for efficient querying of stations needing logo updates
CREATE INDEX IF NOT EXISTS idx_radio_stations_logo_needs_update 
  ON radio_stations(logo_url) 
  WHERE logo_url IS NULL OR logo_source = 'generated';

CREATE INDEX IF NOT EXISTS idx_stations_logo_needs_update 
  ON stations(logo_url) 
  WHERE logo_url IS NULL OR logo_source = 'generated';

CREATE INDEX IF NOT EXISTS idx_shortwave_stations_logo_needs_update 
  ON shortwave_stations(logo_url) 
  WHERE logo_url IS NULL OR logo_source = 'generated';
