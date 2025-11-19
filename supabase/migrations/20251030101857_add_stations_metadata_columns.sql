/*
  # Add Metadata Columns to Stations Table

  ## Overview
  This migration adds additional metadata fields to the stations table to support
  richer station information including streaming details, genre classification,
  launch dates, and descriptions.

  ## Changes

  ### New Columns Added to `stations` table:
  1. `bitrate_kbps` (integer)
     - Stream bitrate in kilobits per second
     - Optional field for internet streaming stations
     - Default: NULL

  2. `genre` (text)
     - Station genre/category (e.g., Rock, News, Classical, Talk)
     - Optional field for content classification
     - Default: NULL

  3. `launch_date` (date)
     - Date when the station first began broadcasting
     - Historical data for station timeline
     - Default: NULL

  4. `format_type` (text)
     - Broadcasting format (e.g., Commercial, Public, Community, Religious)
     - Describes the station's organizational type
     - Default: NULL

  5. `website_url` (text)
     - Station's official website URL
     - Separate from stream_url which is for audio streaming
     - Default: NULL

  6. `description` (text)
     - Detailed description of the station
     - Can include programming information, history, target audience
     - Default: NULL

  ## Notes
  - All new columns are nullable to support existing data
  - `stream_url` already exists in the table (added in previous migration)
  - `created_at` and `updated_at` timestamps are maintained automatically
  - No data migration needed as all columns default to NULL
  - Indexes not added as these fields are primarily for display, not filtering

  ## Security
  - No RLS policy changes needed
  - Columns follow same security model as existing station fields
*/

-- Add new metadata columns to stations table
DO $$ 
BEGIN
  -- Add bitrate_kbps column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'stations' AND column_name = 'bitrate_kbps'
  ) THEN
    ALTER TABLE stations ADD COLUMN bitrate_kbps integer;
  END IF;

  -- Add genre column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'stations' AND column_name = 'genre'
  ) THEN
    ALTER TABLE stations ADD COLUMN genre text;
  END IF;

  -- Add launch_date column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'stations' AND column_name = 'launch_date'
  ) THEN
    ALTER TABLE stations ADD COLUMN launch_date date;
  END IF;

  -- Add format_type column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'stations' AND column_name = 'format_type'
  ) THEN
    ALTER TABLE stations ADD COLUMN format_type text;
  END IF;

  -- Add website_url column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'stations' AND column_name = 'website_url'
  ) THEN
    ALTER TABLE stations ADD COLUMN website_url text;
  END IF;

  -- Add description column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'stations' AND column_name = 'description'
  ) THEN
    ALTER TABLE stations ADD COLUMN description text;
  END IF;
END $$;

-- Add helpful comment to the table
COMMENT ON COLUMN stations.bitrate_kbps IS 'Stream bitrate in kilobits per second for internet streams';
COMMENT ON COLUMN stations.genre IS 'Station genre/category (e.g., Rock, News, Classical, Talk)';
COMMENT ON COLUMN stations.launch_date IS 'Date when the station first began broadcasting';
COMMENT ON COLUMN stations.format_type IS 'Broadcasting format (e.g., Commercial, Public, Community, Religious)';
COMMENT ON COLUMN stations.website_url IS 'Station official website URL (separate from stream_url)';
COMMENT ON COLUMN stations.description IS 'Detailed description of the station including programming and target audience';
