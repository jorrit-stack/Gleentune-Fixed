/*
  # Create Shortwave Stream Mapping Table

  1. New Tables
    - `shortwave_stream_map`
      - `map_id` (uuid, primary key) - Unique identifier for each stream mapping
      - `station_name` (text, not null) - Station name for matching
      - `stream_url` (text, not null) - The streaming URL
      - `stream_source` (text, not null) - Source type: 'official', 'proxy', or 'community'
      - `stream_verified` (boolean) - Whether the stream has been verified to work
      - `checked_at` (timestamptz) - When the stream was last checked
      - `notes` (text) - Additional notes about the stream

  2. Indexes
    - Index on `station_name` for fuzzy matching performance
    - Index on `stream_source` for filtering by source type

  3. Security
    - Enable RLS on `shortwave_stream_map` table
    - Add policy for anonymous users to read stream mappings
    - Add policy for authenticated users to insert/update stream mappings

  4. Important Notes
    - Stream source is constrained to valid values: 'official', 'proxy', 'community'
    - This table is used to enrich shortwave_stations with streaming URLs
    - Does not affect FM/AM stations or legacy radio_stations table
*/

-- Create the shortwave stream mapping table
CREATE TABLE IF NOT EXISTS shortwave_stream_map (
  map_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  station_name text NOT NULL,
  stream_url text NOT NULL,
  stream_source text NOT NULL CHECK (stream_source IN ('official', 'proxy', 'community')),
  stream_verified boolean DEFAULT false,
  checked_at timestamptz DEFAULT now(),
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for efficient matching
CREATE INDEX IF NOT EXISTS idx_shortwave_stream_map_station_name 
  ON shortwave_stream_map (station_name);

CREATE INDEX IF NOT EXISTS idx_shortwave_stream_map_station_name_lower 
  ON shortwave_stream_map (LOWER(station_name));

CREATE INDEX IF NOT EXISTS idx_shortwave_stream_map_stream_source 
  ON shortwave_stream_map (stream_source);

-- Enable Row Level Security
ALTER TABLE shortwave_stream_map ENABLE ROW LEVEL SECURITY;

-- Allow anonymous users to read stream mappings
CREATE POLICY "Anonymous users can read stream mappings"
  ON shortwave_stream_map
  FOR SELECT
  TO anon
  USING (true);

-- Allow authenticated users to read stream mappings
CREATE POLICY "Authenticated users can read stream mappings"
  ON shortwave_stream_map
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow anonymous users to insert stream mappings
CREATE POLICY "Anonymous users can insert stream mappings"
  ON shortwave_stream_map
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Allow authenticated users to insert stream mappings
CREATE POLICY "Authenticated users can insert stream mappings"
  ON shortwave_stream_map
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow authenticated users to update stream mappings
CREATE POLICY "Authenticated users can update stream mappings"
  ON shortwave_stream_map
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);
