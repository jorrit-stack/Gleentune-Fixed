/*
  # Create test station import table

  1. New Tables
    - `test_station_import`
      - `id` (uuid, primary key)
      - `station_name` (text)
      - `city` (text)
      - `state` (text)
      - `country` (text, default 'India')
      - `frequencies_am` (text[]) - AM frequencies
      - `frequencies_fm` (text[]) - FM frequencies
      - `stream_url` (text)
      - `website` (text)
      - `broadcaster` (text) - network/broadcaster name
      - `genre` (text[]) - style/genre tags
      - `slogan` (text)
      - `description` (text)
      - `codec` (text)
      - `bitrate` (integer)
      - `source` (text) - import source
      - `raw_data` (jsonb) - original data
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `test_station_import` table
    - Add policy for public read access (testing only)
    - Add policy for service role writes
*/

CREATE TABLE IF NOT EXISTS test_station_import (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  station_name text NOT NULL,
  city text,
  state text,
  country text DEFAULT 'India',
  frequencies_am text[],
  frequencies_fm text[],
  stream_url text,
  website text,
  broadcaster text,
  genre text[],
  slogan text,
  description text,
  codec text,
  bitrate integer,
  source text DEFAULT 'unknown',
  raw_data jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE test_station_import ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read test station imports"
  ON test_station_import
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Service role can insert test station imports"
  ON test_station_import
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update test station imports"
  ON test_station_import
  FOR UPDATE
  TO service_role
  USING (true);

CREATE POLICY "Service role can delete test station imports"
  ON test_station_import
  FOR DELETE
  TO service_role
  USING (true);

CREATE INDEX IF NOT EXISTS idx_test_import_name ON test_station_import(station_name);
CREATE INDEX IF NOT EXISTS idx_test_import_city ON test_station_import(city);
CREATE INDEX IF NOT EXISTS idx_test_import_source ON test_station_import(source);
CREATE INDEX IF NOT EXISTS idx_test_import_stream ON test_station_import(stream_url) WHERE stream_url IS NOT NULL;
