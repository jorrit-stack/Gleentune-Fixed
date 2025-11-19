/*
  # Add unique constraint to radio_stations

  1. Changes
    - Remove duplicate stations based on stream_url
    - Add unique constraint to stream_url column to prevent future duplicates
  
  2. Notes
    - This ensures each radio stream URL appears only once in the database
    - Existing duplicates are removed before adding the constraint
*/

-- Remove duplicates, keeping only the first occurrence
DELETE FROM radio_stations a
USING radio_stations b
WHERE a.id > b.id
AND a.stream_url = b.stream_url;

-- Add unique constraint
ALTER TABLE radio_stations
ADD CONSTRAINT radio_stations_stream_url_unique UNIQUE (stream_url);
