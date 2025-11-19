/*
  # Allow Anonymous Station Data Inserts

  ## Changes
  This migration adds RLS policies to allow anonymous (public) users to insert
  data into stations, station_locations, and station_sources tables. This is needed
  for the data import scripts to work.

  ## Security Considerations
  - This is for initial data population from open data sources
  - Radio station data is public domain information
  - After bulk import is complete, these policies can be restricted
*/

-- Allow anon/public users to insert stations
CREATE POLICY "Allow anon users to insert stations"
  ON stations FOR INSERT
  TO anon
  WITH CHECK (true);

-- Allow anon/public users to insert station_locations
CREATE POLICY "Allow anon users to insert station_locations"
  ON station_locations FOR INSERT
  TO anon
  WITH CHECK (true);

-- Allow anon/public users to insert station_sources
CREATE POLICY "Allow anon users to insert station_sources"
  ON station_sources FOR INSERT
  TO anon
  WITH CHECK (true);
