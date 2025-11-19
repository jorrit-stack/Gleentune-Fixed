/*
  # Add city column to radio_stations table

  1. Changes
    - Add city column to store the city name for each radio station
    - This enables city-specific filtering for terrestrial radio stations
  
  2. Notes
    - Column is nullable to support existing stations without city data
    - Indexed for faster querying when filtering by city
*/

ALTER TABLE radio_stations
ADD COLUMN IF NOT EXISTS city text;

CREATE INDEX IF NOT EXISTS idx_radio_stations_city ON radio_stations(city);
