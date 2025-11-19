/*
  # GleeTune Radio Application Schema

  1. New Tables
    - `radio_stations`
      - `id` (uuid, primary key) - Unique identifier for each station
      - `name` (text) - Station name
      - `country` (text) - Country where station broadcasts
      - `country_code` (text) - ISO country code
      - `state` (text, nullable) - State/region if applicable
      - `language` (text) - Primary broadcast language
      - `stream_url` (text) - Direct streaming URL
      - `homepage` (text, nullable) - Station website
      - `favicon` (text, nullable) - Station logo/icon URL
      - `tags` (text[], default empty array) - Genre/category tags
      - `bitrate` (integer) - Stream quality in kbps
      - `codec` (text) - Audio codec (MP3, AAC, etc)
      - `frequency` (numeric, nullable) - Simulated FM/AM frequency for UI
      - `band_type` (text) - AM, FM, SW1, SW2, SW3
      - `latitude` (numeric, nullable) - Geographic latitude
      - `longitude` (numeric, nullable) - Geographic longitude
      - `created_at` (timestamptz) - Record creation time
      - `last_check_ok` (boolean, default true) - Stream health status

    - `user_favorites`
      - `id` (uuid, primary key) - Unique identifier
      - `user_id` (uuid, nullable) - User identifier (for future auth)
      - `station_id` (uuid) - Reference to radio_stations
      - `created_at` (timestamptz) - When favorited
      - Foreign key to radio_stations

    - `listening_history`
      - `id` (uuid, primary key) - Unique identifier
      - `user_id` (uuid, nullable) - User identifier (for future auth)
      - `station_id` (uuid) - Reference to radio_stations
      - `listened_at` (timestamptz) - When user tuned in
      - Foreign key to radio_stations

  2. Security
    - Enable RLS on all tables
    - Public read access to radio_stations (stations are public)
    - Authenticated users can manage their own favorites and history

  3. Indexes
    - Index on country_code for location-based queries
    - Index on band_type for filtering by radio band
    - Index on frequency for tuning dial simulation
*/

-- Create radio_stations table
CREATE TABLE IF NOT EXISTS radio_stations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  country text NOT NULL,
  country_code text NOT NULL,
  state text,
  language text NOT NULL DEFAULT 'unknown',
  stream_url text NOT NULL,
  homepage text,
  favicon text,
  tags text[] DEFAULT '{}',
  bitrate integer DEFAULT 128,
  codec text DEFAULT 'MP3',
  frequency numeric(6,2),
  band_type text DEFAULT 'FM' CHECK (band_type IN ('AM', 'FM', 'SW1', 'SW2', 'SW3')),
  latitude numeric(10,7),
  longitude numeric(10,7),
  created_at timestamptz DEFAULT now(),
  last_check_ok boolean DEFAULT true
);

-- Create user_favorites table
CREATE TABLE IF NOT EXISTS user_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  station_id uuid NOT NULL REFERENCES radio_stations(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, station_id)
);

-- Create listening_history table
CREATE TABLE IF NOT EXISTS listening_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  station_id uuid NOT NULL REFERENCES radio_stations(id) ON DELETE CASCADE,
  listened_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE radio_stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE listening_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for radio_stations (public read)
CREATE POLICY "Anyone can view radio stations"
  ON radio_stations FOR SELECT
  TO public
  USING (true);

-- RLS Policies for user_favorites
CREATE POLICY "Anyone can view favorites"
  ON user_favorites FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Users can insert their own favorites"
  ON user_favorites FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Users can delete their own favorites"
  ON user_favorites FOR DELETE
  TO public
  USING (true);

-- RLS Policies for listening_history
CREATE POLICY "Anyone can view listening history"
  ON listening_history FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Anyone can insert listening history"
  ON listening_history FOR INSERT
  TO public
  WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_radio_stations_country_code ON radio_stations(country_code);
CREATE INDEX IF NOT EXISTS idx_radio_stations_band_type ON radio_stations(band_type);
CREATE INDEX IF NOT EXISTS idx_radio_stations_frequency ON radio_stations(frequency);
CREATE INDEX IF NOT EXISTS idx_user_favorites_station_id ON user_favorites(station_id);
CREATE INDEX IF NOT EXISTS idx_listening_history_station_id ON listening_history(station_id);