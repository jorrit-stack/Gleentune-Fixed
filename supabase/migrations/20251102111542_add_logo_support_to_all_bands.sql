/*
  # Add Logo Support to All Radio Bands
  
  1. Changes to Tables
    - Add logo support columns to `radio_stations` (legacy AM/FM):
      - `logo_url` (text) - External hotlink to station logo
      - `logo_source` (text) - Source of logo (radio-browser, favicon, generated)
      - `logo_verified` (boolean) - Manual verification flag for quality control
      - `logo_last_checked` (timestamptz) - Last time logo was validated
    
    - Add logo support columns to `stations` (new AM/FM):
      - `logo_url` (text) - External hotlink to station logo
      - `logo_source` (text) - Source of logo (radio-browser, favicon, generated)
      - `logo_verified` (boolean) - Manual verification flag
      - `logo_last_checked` (timestamptz) - Last validation timestamp
    
    - Add logo support columns to `shortwave_stations` (SW1/SW2/SW3):
      - `logo_url` (text) - External hotlink to broadcaster logo
      - `logo_source` (text) - Source of logo (radio-browser, favicon, generated)
      - `logo_verified` (boolean) - Manual verification flag
      - `logo_last_checked` (timestamptz) - Last validation timestamp
  
  2. Important Notes
    - All logos are hotlinked (not stored locally) for copyright compliance
    - logo_source tracks attribution: 'radio-browser' (CC0), 'favicon' (editorial use), 'generated' (fallback)
    - logo_verified allows manual curation to ensure quality
    - logo_last_checked enables periodic revalidation of external URLs
  
  3. Legal Compliance
    - Only CC0, public domain, or editorial-use favicons are used
    - No copyrighted images are stored or redistributed
    - Attribution tracked in logo_source field
*/

-- Add logo columns to radio_stations (legacy table)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'radio_stations' AND column_name = 'logo_url'
  ) THEN
    ALTER TABLE radio_stations
    ADD COLUMN logo_url text,
    ADD COLUMN logo_source text CHECK (logo_source IN ('radio-browser', 'favicon', 'generated', 'manual')),
    ADD COLUMN logo_verified boolean DEFAULT false,
    ADD COLUMN logo_last_checked timestamptz;
  END IF;
END $$;

-- Add logo columns to stations (new AM/FM table)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stations' AND column_name = 'logo_url'
  ) THEN
    ALTER TABLE stations
    ADD COLUMN logo_url text,
    ADD COLUMN logo_source text CHECK (logo_source IN ('radio-browser', 'favicon', 'generated', 'manual')),
    ADD COLUMN logo_verified boolean DEFAULT false,
    ADD COLUMN logo_last_checked timestamptz;
  END IF;
END $$;

-- Add logo columns to shortwave_stations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'shortwave_stations' AND column_name = 'logo_url'
  ) THEN
    ALTER TABLE shortwave_stations
    ADD COLUMN logo_url text,
    ADD COLUMN logo_source text CHECK (logo_source IN ('radio-browser', 'favicon', 'generated', 'manual')),
    ADD COLUMN logo_verified boolean DEFAULT false,
    ADD COLUMN logo_last_checked timestamptz;
  END IF;
END $$;

-- Create indexes for efficient logo queries
CREATE INDEX IF NOT EXISTS idx_radio_stations_logo_verified ON radio_stations(logo_verified) WHERE logo_url IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_stations_logo_verified ON stations(logo_verified) WHERE logo_url IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sw_logo_verified ON shortwave_stations(logo_verified) WHERE logo_url IS NOT NULL;

-- Add comments for legal clarity
COMMENT ON COLUMN radio_stations.logo_url IS 'External hotlink to station logo - NOT stored locally. Sources: Radio Browser (CC0), station favicons (editorial use), or generated fallback.';
COMMENT ON COLUMN stations.logo_url IS 'External hotlink to station logo - NOT stored locally. Sources: Radio Browser (CC0), station favicons (editorial use), or generated fallback.';
COMMENT ON COLUMN shortwave_stations.logo_url IS 'External hotlink to broadcaster logo - NOT stored locally. Sources: Radio Browser (CC0), station favicons (editorial use), or generated fallback.';
