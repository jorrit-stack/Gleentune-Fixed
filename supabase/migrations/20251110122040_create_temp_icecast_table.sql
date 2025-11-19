/*
  # Create temporary Icecast test table

  1. New Tables
    - `temp_icecast_stations`
      - `id` (uuid, primary key)
      - `station_name` (text)
      - `city` (text)
      - `state` (text)
      - `country` (text, default 'India')
      - `frequency` (numeric)
      - `frequency_mhz` (text) - raw frequency string
      - `transmitter_power_kw` (numeric)
      - `stream_url` (text)
      - `source` (text) - which directory it came from
      - `raw_data` (jsonb) - store original data for debugging
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `temp_icecast_stations` table
    - Add policy for public read access (testing only)
    - Add policy for service role writes
*/

CREATE TABLE IF NOT EXISTS temp_icecast_stations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  station_name text NOT NULL,
  city text,
  state text,
  country text DEFAULT 'India',
  frequency numeric(6,2),
  frequency_mhz text,
  transmitter_power_kw numeric(6,3),
  stream_url text,
  source text DEFAULT 'unknown',
  raw_data jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE temp_icecast_stations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read temp icecast stations"
  ON temp_icecast_stations
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Service role can insert temp icecast stations"
  ON temp_icecast_stations
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update temp icecast stations"
  ON temp_icecast_stations
  FOR UPDATE
  TO service_role
  USING (true);

CREATE POLICY "Service role can delete temp icecast stations"
  ON temp_icecast_stations
  FOR DELETE
  TO service_role
  USING (true);

-- Create index for matching against existing stations
CREATE INDEX IF NOT EXISTS idx_temp_icecast_name_city ON temp_icecast_stations(station_name, city);
CREATE INDEX IF NOT EXISTS idx_temp_icecast_frequency ON temp_icecast_stations(frequency);
CREATE INDEX IF NOT EXISTS idx_temp_icecast_source ON temp_icecast_stations(source);
