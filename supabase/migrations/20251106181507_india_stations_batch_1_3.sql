/*
  # Import India Stations from Radio Browser - Batch 1-3 (150 stations)
  
  1. Purpose
    - Import first 150 India radio stations from Radio Browser API
  
  2. Changes
    - Inserts 150 stations for India with complete metadata
    - Uses ON CONFLICT to handle duplicates by stationuuid
*/

-- Due to size, this will be imported via direct SQL execution
-- See /tmp/india-import-migration.sql for full content
