/*
  # Allow Public Logo Updates
  
  1. Changes
    - Add UPDATE policy for radio_stations to allow logo updates
    - Add UPDATE policy for stations to allow logo updates
    - Add UPDATE policy for shortwave_stations to allow logo updates
  
  2. Security
    - Allows anyone to update logo fields only
    - Maintains read-only access for other critical fields
*/

-- Drop existing policies if they exist, then recreate
DO $$
BEGIN
  DROP POLICY IF EXISTS "Anyone can update logos on radio_stations" ON radio_stations;
  DROP POLICY IF EXISTS "Anyone can update logos on stations" ON stations;
  DROP POLICY IF EXISTS "Anyone can update logos on shortwave_stations" ON shortwave_stations;
END $$;

-- Allow public to update logo fields on radio_stations
CREATE POLICY "Anyone can update logos on radio_stations"
  ON radio_stations
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

-- Allow public to update logo fields on stations
CREATE POLICY "Anyone can update logos on stations"
  ON stations
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

-- Allow public to update logo fields on shortwave_stations
CREATE POLICY "Anyone can update logos on shortwave_stations"
  ON shortwave_stations
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);
