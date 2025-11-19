/*
  # Add google-favicon to logo_source constraint

  1. Changes
    - Update logo_source constraints to include 'google-favicon'
    - Allows using Google's favicon service as a logo source

  2. Purpose
    - Enable comprehensive logo coverage using Google's favicon API
    - Support automated logo enrichment for stations with websites
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
    'google-favicon'::text,
    'clearbit'::text,
    'social-platform'::text,
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
    'google-favicon'::text,
    'clearbit'::text,
    'social-platform'::text,
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
    'google-favicon'::text,
    'clearbit'::text,
    'social-platform'::text,
    'generated'::text,
    'manual'::text
  ]));
