/*
  # Add broadcaster logo source types
  
  1. Changes
    - Update logo_source constraint on shortwave_stations table
    - Add 'broadcaster-official' and 'broadcaster-favicon' as valid logo sources
    
  2. Notes
    - These are authentic broadcaster logos, not generic platform logos
    - broadcaster-official: Official logo from broadcaster's website
    - broadcaster-favicon: Broadcaster's favicon
*/

ALTER TABLE shortwave_stations 
DROP CONSTRAINT IF EXISTS shortwave_stations_logo_source_check;

ALTER TABLE shortwave_stations
ADD CONSTRAINT shortwave_stations_logo_source_check
CHECK (logo_source = ANY (ARRAY[
  'radio-browser'::text,
  'favicon'::text,
  'og-image'::text,
  'apple-touch-icon'::text,
  'link-icon'::text,
  'google-favicon'::text,
  'clearbit'::text,
  'social-platform'::text,
  'generated'::text,
  'manual'::text,
  'broadcaster-official'::text,
  'broadcaster-favicon'::text
]));
