/*
  # Fix Cities Table Unique Constraint

  ## Overview
  Modify the cities table unique constraint to allow cities with the same name
  in the same country but different coordinates. This is necessary because:
  - Many cities share names within countries (e.g., multiple "Springfield" in USA)
  - GeoNames data includes ~150,000 cities with coordinate precision
  - We need to distinguish cities by (name, country, lat, lon) not just (name, country)

  ## Changes
  1. Drop existing unique constraint on (city_name, country_id)
  2. Add new unique constraint on (city_name, country_id, latitude, longitude)

  ## Impact
  - Allows importing multiple cities with same name in same country
  - Prevents true duplicates (same name, country, and exact coordinates)
  - Existing data remains valid
*/

-- Drop the old unique constraint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'cities_city_name_country_id_key'
  ) THEN
    ALTER TABLE cities DROP CONSTRAINT cities_city_name_country_id_key;
  END IF;
END $$;

-- Add new unique constraint on (city_name, country_id, latitude, longitude)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'cities_unique_name_country_coords'
  ) THEN
    ALTER TABLE cities 
    ADD CONSTRAINT cities_unique_name_country_coords 
    UNIQUE (city_name, country_id, latitude, longitude);
  END IF;
END $$;

-- Add helpful comment
COMMENT ON CONSTRAINT cities_unique_name_country_coords ON cities IS 
  'Allows same city names in same country if coordinates differ';
