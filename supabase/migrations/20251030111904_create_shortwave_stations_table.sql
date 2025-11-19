/*
  # Create Shortwave Stations Table

  ## Overview
  Creates a dedicated table for shortwave (HF/SW) broadcast stations from the EiBi database.
  Shortwave stations differ from FM/AM in that they:
  - Operate in HF bands (typically 2-30 MHz)
  - Have international reach and propagation
  - Include time schedules and target areas
  - Often relay from transmitter sites outside home country

  ## New Tables
  
  ### `shortwave_stations`
  - `sw_station_id` (uuid, primary key) - Unique identifier
  - `station_name` (text, required) - Broadcast station name
  - `frequency_khz` (integer, required) - Operating frequency in kHz
  - `power_kw` (numeric, nullable) - Transmitter power in kilowatts
  - `country_id` (uuid, nullable) - Reference to broadcaster's home country
  - `city_id` (uuid, nullable) - Nearest city to transmitter site
  - `transmitter_lat` (numeric, nullable) - Transmitter latitude
  - `transmitter_long` (numeric, nullable) - Transmitter longitude
  - `transmitter_site_code` (text, nullable) - EiBi site code (e.g., "b" for Bonaire)
  - `itu_code` (text, required) - ITU country code from EiBi
  - `target_area` (text, nullable) - Broadcast target area code
  - `language_code` (text, nullable) - Language code
  - `broadcast_times` (text, nullable) - UTC time schedule
  - `source` (text, default 'eibi') - Data source identifier
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ## Indexes
  - Primary key on sw_station_id
  - Index on frequency_khz for frequency lookups
  - Index on country_id for country filtering
  - Index on city_id for geographic queries
  - Geographic index on (transmitter_lat, transmitter_long)
  - Unique constraint on (station_name, frequency_khz, itu_code, transmitter_site_code)

  ## Security
  - Enable RLS on shortwave_stations table
  - Policy for public read access (shortwave data is publicly broadcast)
  - Policy for authenticated insert/update for data imports
*/

-- Create shortwave_stations table
CREATE TABLE IF NOT EXISTS shortwave_stations (
  sw_station_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  station_name text NOT NULL,
  frequency_khz integer NOT NULL CHECK (frequency_khz > 0),
  power_kw numeric(10,2),
  country_id uuid REFERENCES countries(country_id) ON DELETE SET NULL,
  city_id uuid REFERENCES cities(city_id) ON DELETE SET NULL,
  transmitter_lat numeric(9,6) CHECK (transmitter_lat >= -90 AND transmitter_lat <= 90),
  transmitter_long numeric(9,6) CHECK (transmitter_long >= -180 AND transmitter_long <= 180),
  transmitter_site_code text,
  itu_code text NOT NULL,
  target_area text,
  language_code text,
  broadcast_times text,
  source text DEFAULT 'eibi',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_sw_stations_frequency ON shortwave_stations(frequency_khz);
CREATE INDEX IF NOT EXISTS idx_sw_stations_country ON shortwave_stations(country_id);
CREATE INDEX IF NOT EXISTS idx_sw_stations_city ON shortwave_stations(city_id);
CREATE INDEX IF NOT EXISTS idx_sw_stations_location ON shortwave_stations(transmitter_lat, transmitter_long);
CREATE INDEX IF NOT EXISTS idx_sw_stations_itu ON shortwave_stations(itu_code);

-- Create unique constraint to prevent duplicates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'shortwave_stations_unique_broadcast'
  ) THEN
    ALTER TABLE shortwave_stations 
    ADD CONSTRAINT shortwave_stations_unique_broadcast 
    UNIQUE (station_name, frequency_khz, itu_code, transmitter_site_code);
  END IF;
END $$;

-- Enable RLS
ALTER TABLE shortwave_stations ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read shortwave station data
CREATE POLICY "Public can read shortwave stations"
  ON shortwave_stations
  FOR SELECT
  TO public
  USING (true);

-- Policy: Authenticated users can insert (for data imports)
CREATE POLICY "Authenticated can insert shortwave stations"
  ON shortwave_stations
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Authenticated users can update
CREATE POLICY "Authenticated can update shortwave stations"
  ON shortwave_stations
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Add helpful comments
COMMENT ON TABLE shortwave_stations IS 'HF/Shortwave broadcast stations from EiBi database with transmitter locations and schedules';
COMMENT ON COLUMN shortwave_stations.transmitter_site_code IS 'EiBi transmitter site code, see README.TXT for coordinate mappings';
COMMENT ON COLUMN shortwave_stations.itu_code IS 'ITU country code of broadcaster (not necessarily transmitter location)';
COMMENT ON COLUMN shortwave_stations.broadcast_times IS 'UTC time schedule in format HHMM-HHMM';
