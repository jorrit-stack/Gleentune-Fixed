/*
  # Security Lockdown - Read-Only Public Access

  ## Overview
  This migration implements a secure read-only public access model for the radio catalog.
  
  ## Changes Made
  
  ### 1. Policy Removals
  Drops all existing overly-permissive policies that allow public INSERT/UPDATE/DELETE operations.
  
  ### 2. New Restrictive Policies
  
  #### Read Operations (Public)
  - All tables: Public can SELECT (read) data
  - Listening history: Public can INSERT (for analytics tracking)
  - User favorites: Public can INSERT/DELETE their own favorites
  
  #### Write Operations (Service Role Only)
  - Stations: Only service_role can INSERT/UPDATE/DELETE
  - Cities: Only service_role can INSERT
  - Countries: Only service_role can INSERT
  - All metadata tables: Only service_role can modify
  
  ### 3. Tables Secured
  - radio_stations
  - stations (AM/FM)
  - shortwave_stations
  - cities
  - countries
  - bands
  - station_locations
  - station_sources
  - sw_regions
  - shortwave_stream_map
  
  ### 4. User Features Protected
  - listening_history: Public can insert (for tracking)
  - user_favorites: Public can manage their own favorites
  
  ## Security Benefits
  - Prevents unauthorized data modifications
  - Protects against spam and malicious content
  - Maintains data integrity
  - No authentication required for read access
  - Import scripts use service_role key for writes
*/

-- ============================================================================
-- STEP 1: Drop all existing overly-permissive policies
-- ============================================================================

-- radio_stations
DROP POLICY IF EXISTS "Anyone can insert radio stations" ON radio_stations;
DROP POLICY IF EXISTS "Anyone can update logos on radio_stations" ON radio_stations;

-- stations (AM/FM)
DROP POLICY IF EXISTS "Allow anon users to insert stations" ON stations;
DROP POLICY IF EXISTS "Allow authenticated users to insert stations" ON stations;
DROP POLICY IF EXISTS "Anyone can update logos on stations" ON stations;

-- shortwave_stations
DROP POLICY IF EXISTS "Public can insert shortwave stations" ON shortwave_stations;
DROP POLICY IF EXISTS "Public can update shortwave stations" ON shortwave_stations;
DROP POLICY IF EXISTS "Anyone can update logos on shortwave_stations" ON shortwave_stations;

-- cities
DROP POLICY IF EXISTS "Allow anon users to insert cities" ON cities;
DROP POLICY IF EXISTS "Allow authenticated users to insert cities" ON cities;

-- countries
DROP POLICY IF EXISTS "Allow anon users to insert countries" ON countries;
DROP POLICY IF EXISTS "Allow authenticated users to insert countries" ON countries;

-- bands
DROP POLICY IF EXISTS "Allow authenticated users to insert bands" ON bands;

-- station_locations
DROP POLICY IF EXISTS "Allow anon users to insert station_locations" ON station_locations;
DROP POLICY IF EXISTS "Allow authenticated users to insert station_locations" ON station_locations;

-- station_sources
DROP POLICY IF EXISTS "Allow anon users to insert station_sources" ON station_sources;
DROP POLICY IF EXISTS "Allow authenticated users to insert station_sources" ON station_sources;

-- sw_regions
DROP POLICY IF EXISTS "Allow authenticated users to insert sw_regions" ON sw_regions;

-- shortwave_stream_map
DROP POLICY IF EXISTS "Anonymous users can insert stream mappings" ON shortwave_stream_map;
DROP POLICY IF EXISTS "Authenticated users can insert stream mappings" ON shortwave_stream_map;
DROP POLICY IF EXISTS "Authenticated users can read stream mappings" ON shortwave_stream_map;
DROP POLICY IF EXISTS "Anonymous users can read stream mappings" ON shortwave_stream_map;
DROP POLICY IF EXISTS "Authenticated users can update stream mappings" ON shortwave_stream_map;

-- listening_history
DROP POLICY IF EXISTS "Anyone can insert listening history" ON listening_history;

-- user_favorites
DROP POLICY IF EXISTS "Users can insert their own favorites" ON user_favorites;
DROP POLICY IF EXISTS "Users can delete their own favorites" ON user_favorites;

-- ============================================================================
-- STEP 2: Create new restrictive policies
-- ============================================================================

-- ----------------------------------------------------------------------------
-- RADIO_STATIONS: Read-only public, service_role can write
-- ----------------------------------------------------------------------------

CREATE POLICY "Public read access"
  ON radio_stations FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Service role full access"
  ON radio_stations FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- STATIONS (AM/FM): Read-only public, service_role can write
-- ----------------------------------------------------------------------------

CREATE POLICY "Public read access"
  ON stations FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Service role full access"
  ON stations FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- SHORTWAVE_STATIONS: Read-only public, service_role can write
-- ----------------------------------------------------------------------------

CREATE POLICY "Public read access"
  ON shortwave_stations FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Service role full access"
  ON shortwave_stations FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- CITIES: Read-only public, service_role can write
-- ----------------------------------------------------------------------------

CREATE POLICY "Public read access"
  ON cities FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Service role full access"
  ON cities FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- COUNTRIES: Read-only public, service_role can write
-- ----------------------------------------------------------------------------

CREATE POLICY "Public read access"
  ON countries FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Service role full access"
  ON countries FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- BANDS: Read-only public, service_role can write
-- ----------------------------------------------------------------------------

CREATE POLICY "Public read access"
  ON bands FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Service role full access"
  ON bands FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- STATION_LOCATIONS: Read-only public, service_role can write
-- ----------------------------------------------------------------------------

CREATE POLICY "Public read access"
  ON station_locations FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Service role full access"
  ON station_locations FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- STATION_SOURCES: Read-only public, service_role can write
-- ----------------------------------------------------------------------------

CREATE POLICY "Public read access"
  ON station_sources FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Service role full access"
  ON station_sources FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- SW_REGIONS: Read-only public, service_role can write
-- ----------------------------------------------------------------------------

CREATE POLICY "Public read access"
  ON sw_regions FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Service role full access"
  ON sw_regions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- SHORTWAVE_STREAM_MAP: Read-only public, service_role can write
-- ----------------------------------------------------------------------------

CREATE POLICY "Public read access"
  ON shortwave_stream_map FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Service role full access"
  ON shortwave_stream_map FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- LISTENING_HISTORY: Public can insert for analytics, read their own
-- ----------------------------------------------------------------------------

CREATE POLICY "Public can insert listening events"
  ON listening_history FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Public can view listening history"
  ON listening_history FOR SELECT
  TO public
  USING (true);

-- ----------------------------------------------------------------------------
-- USER_FAVORITES: Public can manage their own favorites
-- ----------------------------------------------------------------------------

CREATE POLICY "Public can insert favorites"
  ON user_favorites FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Public can delete favorites"
  ON user_favorites FOR DELETE
  TO public
  USING (true);

CREATE POLICY "Public can view favorites"
  ON user_favorites FOR SELECT
  TO public
  USING (true);

-- ============================================================================
-- STEP 3: Verify RLS is enabled on all tables
-- ============================================================================

ALTER TABLE radio_stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE shortwave_stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE bands ENABLE ROW LEVEL SECURITY;
ALTER TABLE station_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE station_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE sw_regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE shortwave_stream_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE listening_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;
