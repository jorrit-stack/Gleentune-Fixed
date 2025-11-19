/*
  # Allow Anonymous Shortwave Station Inserts

  ## Overview
  Updates RLS policies on shortwave_stations to allow data imports using the anon key.
  This matches the pattern used for other tables (stations, station_locations, cities).

  ## Changes
  - Drop existing authenticated-only insert policy
  - Add new policy allowing public/anon inserts for data import scripts
*/

-- Drop existing authenticated insert policy
DROP POLICY IF EXISTS "Authenticated can insert shortwave stations" ON shortwave_stations;

-- Allow public/anon inserts for data imports
CREATE POLICY "Public can insert shortwave stations"
  ON shortwave_stations
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Also update the update policy
DROP POLICY IF EXISTS "Authenticated can update shortwave stations" ON shortwave_stations;

CREATE POLICY "Public can update shortwave stations"
  ON shortwave_stations
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);
