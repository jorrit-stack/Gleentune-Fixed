/*
  # Global Radio Frequency Database Schema (AM, FM, SW1–SW3)

  ## Overview
  This migration creates a comprehensive, normalized schema for storing global radio station data
  across AM, FM, and Shortwave (SW1–SW3) bands. The schema supports:
  - Multi-band station tracking with accurate frequency data
  - Geographic hierarchy (Countries → Cities → Transmitter Locations)
  - Shortwave propagation characteristics
  - Data source tracking and verification

  ## 1. New Tables

  ### countries
  - `country_id` (uuid, primary key)
  - `country_name` (text, required)
  - `iso_code` (text, 2-3 char ISO code)
  - `region` (text, geographic region)
  - `created_at`, `updated_at` (timestamptz)

  ### cities
  - `city_id` (uuid, primary key)
  - `city_name` (text, required)
  - `country_id` (uuid, FK to countries)
  - `latitude` (numeric(9,6), for geolocation)
  - `longitude` (numeric(9,6), for geolocation)
  - `population` (integer, optional)
  - `created_at`, `updated_at` (timestamptz)

  ### bands
  - `band_id` (uuid, primary key)
  - `band_name` (text, one of: AM, FM, SW1, SW2, SW3)
  - `frequency_range_min_khz` (numeric(10,3), minimum frequency in kHz)
  - `frequency_range_max_khz` (numeric(10,3), maximum frequency in kHz)
  - `wavelength_m` (numeric(10,3), wavelength in meters)
  - `created_at`, `updated_at` (timestamptz)

  ### stations
  - `station_id` (uuid, primary key)
  - `station_name` (text, required)
  - `call_sign` (text, optional station identifier)
  - `band_id` (uuid, FK to bands)
  - `frequency_khz` (numeric(10,3), frequency in kHz)
  - `modulation_type` (text, e.g., AM, FM, DRM)
  - `power_kw` (numeric(10,2), transmitter power in kilowatts)
  - `language` (text, broadcast language)
  - `content_type` (text, e.g., News, Music, Religious)
  - `owner` (text, station owner/operator)
  - `license_type` (text, broadcast license type)
  - `coverage_radius_km` (numeric(6,2), estimated coverage)
  - `status` (text, one of: Active, Inactive)
  - `last_verified` (date, last verification date)
  - `stream_url` (text, optional online stream URL)
  - `created_at`, `updated_at` (timestamptz)

  ### station_locations
  - `id` (uuid, primary key)
  - `station_id` (uuid, FK to stations)
  - `city_id` (uuid, FK to cities)
  - `transmitter_lat` (numeric(9,6), transmitter latitude)
  - `transmitter_long` (numeric(9,6), transmitter longitude)
  - `altitude_m` (numeric(8,2), transmitter altitude)
  - `notes` (text, optional notes)
  - `created_at`, `updated_at` (timestamptz)

  ### sw_regions
  - `sw_region_id` (uuid, primary key)
  - `band_id` (uuid, FK to bands)
  - `typical_coverage_area` (text, e.g., Asia-Pacific, Europe, Global)
  - `time_of_day_effect` (text, one of: Day, Night, Both)
  - `propagation_notes` (text, technical propagation details)
  - `created_at`, `updated_at` (timestamptz)

  ### station_sources
  - `source_id` (uuid, primary key)
  - `station_id` (uuid, FK to stations)
  - `source_name` (text, data source name)
  - `url` (text, source URL)
  - `license` (text, data license e.g., CC-BY, Public Domain)
  - `last_updated` (date, last update from source)
  - `created_at`, `updated_at` (timestamptz)

  ## 2. Indexes
  - Composite index on stations (frequency_khz, band_id) for fast frequency lookups
  - Index on cities.country_id for country-based queries
  - Index on station_locations (station_id, city_id) for location queries
  - Geographic indexes on latitude/longitude columns

  ## 3. Security
  - Enable RLS on all tables
  - Add public read policies for all tables (radio data is generally public)

  ## 4. Notes
  - All frequencies stored in kHz for consistency (FM 88-108 MHz = 88000-108000 kHz)
  - CHECK constraints enforce valid ENUM-like values
  - Timestamps track data creation and modification
  - UUID primary keys for distributed system compatibility
*/

-- 1. Create countries table
CREATE TABLE IF NOT EXISTS countries (
  country_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_name text NOT NULL,
  iso_code text NOT NULL CHECK (length(iso_code) >= 2 AND length(iso_code) <= 3),
  region text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(iso_code)
);

-- 2. Create cities table
CREATE TABLE IF NOT EXISTS cities (
  city_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city_name text NOT NULL,
  country_id uuid NOT NULL REFERENCES countries(country_id) ON DELETE CASCADE,
  latitude numeric(9,6) NOT NULL,
  longitude numeric(9,6) NOT NULL,
  population integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(city_name, country_id)
);

-- 3. Create bands table
CREATE TABLE IF NOT EXISTS bands (
  band_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  band_name text NOT NULL CHECK (band_name IN ('AM', 'FM', 'SW1', 'SW2', 'SW3')),
  frequency_range_min_khz numeric(10,3) NOT NULL,
  frequency_range_max_khz numeric(10,3) NOT NULL,
  wavelength_m numeric(10,3),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(band_name),
  CHECK (frequency_range_max_khz > frequency_range_min_khz)
);

-- 4. Create stations table
CREATE TABLE IF NOT EXISTS stations (
  station_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  station_name text NOT NULL,
  call_sign text,
  band_id uuid NOT NULL REFERENCES bands(band_id) ON DELETE RESTRICT,
  frequency_khz numeric(10,3) NOT NULL,
  modulation_type text,
  power_kw numeric(10,2),
  language text,
  content_type text,
  owner text,
  license_type text,
  coverage_radius_km numeric(6,2),
  status text DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
  last_verified date,
  stream_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CHECK (frequency_khz > 0),
  CHECK (power_kw IS NULL OR power_kw > 0)
);

-- 5. Create station_locations table
CREATE TABLE IF NOT EXISTS station_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id uuid NOT NULL REFERENCES stations(station_id) ON DELETE CASCADE,
  city_id uuid NOT NULL REFERENCES cities(city_id) ON DELETE CASCADE,
  transmitter_lat numeric(9,6) NOT NULL,
  transmitter_long numeric(9,6) NOT NULL,
  altitude_m numeric(8,2),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 6. Create sw_regions table
CREATE TABLE IF NOT EXISTS sw_regions (
  sw_region_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  band_id uuid NOT NULL REFERENCES bands(band_id) ON DELETE CASCADE,
  typical_coverage_area text NOT NULL,
  time_of_day_effect text CHECK (time_of_day_effect IN ('Day', 'Night', 'Both', NULL)),
  propagation_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 7. Create station_sources table
CREATE TABLE IF NOT EXISTS station_sources (
  source_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id uuid NOT NULL REFERENCES stations(station_id) ON DELETE CASCADE,
  source_name text NOT NULL,
  url text,
  license text,
  last_updated date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_stations_frequency_band ON stations(frequency_khz, band_id);
CREATE INDEX IF NOT EXISTS idx_stations_band ON stations(band_id);
CREATE INDEX IF NOT EXISTS idx_stations_status ON stations(status);
CREATE INDEX IF NOT EXISTS idx_cities_country ON cities(country_id);
CREATE INDEX IF NOT EXISTS idx_cities_location ON cities(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_station_locations_station ON station_locations(station_id);
CREATE INDEX IF NOT EXISTS idx_station_locations_city ON station_locations(city_id);
CREATE INDEX IF NOT EXISTS idx_station_locations_coords ON station_locations(transmitter_lat, transmitter_long);
CREATE INDEX IF NOT EXISTS idx_sw_regions_band ON sw_regions(band_id);
CREATE INDEX IF NOT EXISTS idx_station_sources_station ON station_sources(station_id);

-- Enable Row Level Security on all tables
ALTER TABLE countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE bands ENABLE ROW LEVEL SECURITY;
ALTER TABLE stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE station_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE sw_regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE station_sources ENABLE ROW LEVEL SECURITY;

-- Create public read policies (radio frequency data is generally public)
CREATE POLICY "Allow public read access to countries"
  ON countries FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public read access to cities"
  ON cities FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public read access to bands"
  ON bands FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public read access to stations"
  ON stations FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public read access to station_locations"
  ON station_locations FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public read access to sw_regions"
  ON sw_regions FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public read access to station_sources"
  ON station_sources FOR SELECT
  TO public
  USING (true);

-- Create policies for authenticated users to insert/update data
CREATE POLICY "Allow authenticated users to insert countries"
  ON countries FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to insert cities"
  ON cities FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to insert bands"
  ON bands FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to insert stations"
  ON stations FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to insert station_locations"
  ON station_locations FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to insert sw_regions"
  ON sw_regions FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to insert station_sources"
  ON station_sources FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Insert initial band data
INSERT INTO bands (band_name, frequency_range_min_khz, frequency_range_max_khz, wavelength_m)
VALUES
  ('AM', 530, 1700, 566.0),
  ('FM', 88000, 108000, 2.8),
  ('SW1', 5900, 6200, 49.0),
  ('SW2', 9500, 9900, 31.0),
  ('SW3', 15100, 15600, 19.0)
ON CONFLICT (band_name) DO NOTHING;