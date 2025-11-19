/*
  # Allow Anonymous Geodata Inserts

  ## Changes
  This migration adds RLS policies to allow anonymous (public) users to insert
  data into countries and cities tables. This is needed for the GeoNames
  prepopulation script to work.

  ## Security Considerations
  - This is a temporary measure for initial data population
  - After geodata is populated, these policies can be removed
  - Countries and cities data is public domain information
*/

-- Allow anon/public users to insert countries
CREATE POLICY "Allow anon users to insert countries"
  ON countries FOR INSERT
  TO anon
  WITH CHECK (true);

-- Allow anon/public users to insert cities
CREATE POLICY "Allow anon users to insert cities"
  ON cities FOR INSERT
  TO anon
  WITH CHECK (true);
