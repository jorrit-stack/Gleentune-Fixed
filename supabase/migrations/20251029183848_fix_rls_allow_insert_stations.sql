/*
  # Fix RLS Policy for Radio Stations

  1. Changes
    - Add INSERT policy for radio_stations table
    - Allow public to insert stations so the radio browser API can populate initial data
    
  2. Security
    - This is safe as radio stations are public data
    - The app needs to populate stations from external API on first load
*/

-- Add INSERT policy for radio_stations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'radio_stations' 
    AND policyname = 'Anyone can insert radio stations'
  ) THEN
    CREATE POLICY "Anyone can insert radio stations"
      ON radio_stations FOR INSERT
      TO public
      WITH CHECK (true);
  END IF;
END $$;
