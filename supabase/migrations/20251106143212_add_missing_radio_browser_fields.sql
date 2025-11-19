/*
  # Add Missing Radio Browser Fields
  
  This migration adds all missing fields from Radio Browser API to ensure complete data capture
  during enrichment operations. No existing fields are renamed or removed.
  
  ## New Fields Added
  
  ### Identity & Tracking
  - `stationuuid` - Radio Browser's unique station identifier (critical for deduplication)
  - `changeuuid` - Tracks the last change made to station data
  - `serveruuid` - Identifies the streaming server
  
  ### Timestamps & History
  - `lastchangetime` - When station info was last modified in Radio Browser
  - `lastlocalchecktime` - Last verification by Radio Browser servers
  - `clicktimestamp` - Most recent playback timestamp (popularity tracking)
  
  ### Metadata & Quality
  - `languagecodes` - ISO 639 language codes (supplements existing language field)
  - `has_extended_info` - Boolean flag indicating rich stream metadata availability
  - `ssl_error` - Tracks SSL/TLS certificate issues for HTTPS streams
  
  ## Data Preservation Strategy
  
  All new fields are nullable to preserve existing data. During sync operations:
  - Radio Browser fields only update from Radio Browser source
  - Manual fields (frequency, band_type, city, logo_*) remain untouched during RB sync
  - Each source maintains its own set of fields
  
  ## Notes
  
  1. `stationuuid` should be used as the primary deduplication key for Radio Browser imports
  2. ISO 8601 timestamp variants (_iso8601 suffix) are omitted as we store proper timestamps
  3. `geo_distance` is omitted as it's calculated on-demand for proximity queries
*/

-- Add Radio Browser identity fields
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'radio_stations' AND column_name = 'stationuuid'
  ) THEN
    ALTER TABLE radio_stations ADD COLUMN stationuuid text;
    COMMENT ON COLUMN radio_stations.stationuuid IS 'Radio Browser unique station identifier';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'radio_stations' AND column_name = 'changeuuid'
  ) THEN
    ALTER TABLE radio_stations ADD COLUMN changeuuid text;
    COMMENT ON COLUMN radio_stations.changeuuid IS 'Radio Browser change tracking identifier';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'radio_stations' AND column_name = 'serveruuid'
  ) THEN
    ALTER TABLE radio_stations ADD COLUMN serveruuid text;
    COMMENT ON COLUMN radio_stations.serveruuid IS 'Radio Browser streaming server identifier';
  END IF;
END $$;

-- Add timestamp fields
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'radio_stations' AND column_name = 'lastchangetime'
  ) THEN
    ALTER TABLE radio_stations ADD COLUMN lastchangetime timestamptz;
    COMMENT ON COLUMN radio_stations.lastchangetime IS 'Last modification time in Radio Browser';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'radio_stations' AND column_name = 'lastlocalchecktime'
  ) THEN
    ALTER TABLE radio_stations ADD COLUMN lastlocalchecktime timestamptz;
    COMMENT ON COLUMN radio_stations.lastlocalchecktime IS 'Last verification by Radio Browser servers';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'radio_stations' AND column_name = 'clicktimestamp'
  ) THEN
    ALTER TABLE radio_stations ADD COLUMN clicktimestamp timestamptz;
    COMMENT ON COLUMN radio_stations.clicktimestamp IS 'Most recent playback time for popularity tracking';
  END IF;
END $$;

-- Add metadata fields
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'radio_stations' AND column_name = 'languagecodes'
  ) THEN
    ALTER TABLE radio_stations ADD COLUMN languagecodes text;
    COMMENT ON COLUMN radio_stations.languagecodes IS 'ISO 639 language codes (comma-separated)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'radio_stations' AND column_name = 'has_extended_info'
  ) THEN
    ALTER TABLE radio_stations ADD COLUMN has_extended_info boolean DEFAULT false;
    COMMENT ON COLUMN radio_stations.has_extended_info IS 'Whether stream provides rich HTTP header metadata';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'radio_stations' AND column_name = 'ssl_error'
  ) THEN
    ALTER TABLE radio_stations ADD COLUMN ssl_error boolean DEFAULT false;
    COMMENT ON COLUMN radio_stations.ssl_error IS 'Indicates SSL/TLS certificate issues';
  END IF;
END $$;

-- Create index on stationuuid for fast lookups during sync
CREATE INDEX IF NOT EXISTS idx_radio_stations_stationuuid ON radio_stations(stationuuid) 
WHERE stationuuid IS NOT NULL;

-- Create index on source field for filtering by data source
CREATE INDEX IF NOT EXISTS idx_radio_stations_source ON radio_stations(source);

-- Create composite index for Radio Browser sync operations
CREATE INDEX IF NOT EXISTS idx_radio_stations_rb_sync ON radio_stations(source, lastchangetime) 
WHERE source = 'radio-browser';
