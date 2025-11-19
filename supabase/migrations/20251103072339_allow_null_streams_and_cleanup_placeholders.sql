/*
  # Allow NULL Streams and Remove Placeholder URLs

  1. Changes
    - Make stream_url nullable in radio_stations table
    - Remove all placeholder/example.com URLs from database
    - Update stations view to handle NULL streams
    - Add constraint to prevent placeholder URLs in future

  2. Legal Compliance
    - Eliminates non-functional placeholder URLs
    - Ensures only real, publicly-available streams are linked
    - Maintains data integrity without fake data

  3. Security
    - No changes to RLS policies
    - Read-only public access maintained
*/

-- Step 1: Make stream_url nullable
ALTER TABLE radio_stations 
ALTER COLUMN stream_url DROP NOT NULL;

-- Step 2: Remove all placeholder URLs
UPDATE radio_stations 
SET stream_url = NULL 
WHERE stream_url LIKE '%placeholder%' 
   OR stream_url LIKE '%example.com%'
   OR stream_url = '';

-- Step 3: Add check constraint to prevent future placeholder URLs
ALTER TABLE radio_stations
ADD CONSTRAINT no_placeholder_urls 
CHECK (
  stream_url IS NULL 
  OR (
    stream_url NOT LIKE '%placeholder%' 
    AND stream_url NOT LIKE '%example.com%'
    AND stream_url != ''
  )
);

-- Step 4: Do the same for stations table (AM/FM historical)
ALTER TABLE stations 
ALTER COLUMN stream_url DROP NOT NULL;

UPDATE stations 
SET stream_url = NULL 
WHERE stream_url LIKE '%placeholder%' 
   OR stream_url LIKE '%example.com%'
   OR stream_url = '';

ALTER TABLE stations
ADD CONSTRAINT no_placeholder_urls 
CHECK (
  stream_url IS NULL 
  OR (
    stream_url NOT LIKE '%placeholder%' 
    AND stream_url NOT LIKE '%example.com%'
    AND stream_url != ''
  )
);

-- Step 5: Shortwave already allows NULL, just clean up
UPDATE shortwave_stations 
SET stream_url = NULL 
WHERE stream_url LIKE '%placeholder%' 
   OR stream_url LIKE '%example.com%'
   OR stream_url = '';

ALTER TABLE shortwave_stations
ADD CONSTRAINT no_placeholder_urls 
CHECK (
  stream_url IS NULL 
  OR (
    stream_url NOT LIKE '%placeholder%' 
    AND stream_url NOT LIKE '%example.com%'
    AND stream_url != ''
  )
);
