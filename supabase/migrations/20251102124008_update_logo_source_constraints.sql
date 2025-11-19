/*
  # Update Logo Source Constraints

  1. Changes
    - Drop existing logo_source check constraints
    - Recreate with expanded valid values including:
      - og-image
      - apple-touch-icon
      - link-icon
  
  2. Purpose
    - Allow storing different types of extracted logos
    - Support the 3-tier logo sourcing strategy
*/

-- Update radio_stations constraint
ALTER TABLE radio_stations DROP CONSTRAINT IF EXISTS radio_stations_logo_source_check;
ALTER TABLE radio_stations ADD CONSTRAINT radio_stations_logo_source_check 
  CHECK (logo_source = ANY (ARRAY[
    'radio-browser'::text,
    'favicon'::text,
    'og-image'::text,
    'apple-touch-icon'::text,
    'link-icon'::text,
    'generated'::text,
    'manual'::text
  ]));

-- Update stations constraint
ALTER TABLE stations DROP CONSTRAINT IF EXISTS stations_logo_source_check;
ALTER TABLE stations ADD CONSTRAINT stations_logo_source_check 
  CHECK (logo_source = ANY (ARRAY[
    'radio-browser'::text,
    'favicon'::text,
    'og-image'::text,
    'apple-touch-icon'::text,
    'link-icon'::text,
    'generated'::text,
    'manual'::text
  ]));

-- Update shortwave_stations constraint
ALTER TABLE shortwave_stations DROP CONSTRAINT IF EXISTS shortwave_stations_logo_source_check;
ALTER TABLE shortwave_stations ADD CONSTRAINT shortwave_stations_logo_source_check 
  CHECK (logo_source = ANY (ARRAY[
    'radio-browser'::text,
    'favicon'::text,
    'og-image'::text,
    'apple-touch-icon'::text,
    'link-icon'::text,
    'generated'::text,
    'manual'::text
  ]));
