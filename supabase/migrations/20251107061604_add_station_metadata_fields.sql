/*
  # Add Station Metadata Fields

  ## Changes
  
  1. New Columns
    - `description` (text): Long-form description of the radio station
    - `established_year` (integer): Year the station was established/founded
  
  ## Notes
  - These fields are optional (nullable) as we'll enrich them over time
  - Description is useful for SEO and user information
  - Established year helps with station credibility and historical context
  - Both fields can be populated from various sources (websites, APIs, manual entry)
*/

-- Add description field for long-form station information
ALTER TABLE radio_stations 
ADD COLUMN IF NOT EXISTS description text;

-- Add established year field for station founding date
ALTER TABLE radio_stations 
ADD COLUMN IF NOT EXISTS established_year integer;

-- Add check constraint to ensure reasonable year values (1900-2100)
ALTER TABLE radio_stations 
ADD CONSTRAINT reasonable_established_year 
CHECK (established_year IS NULL OR (established_year >= 1900 AND established_year <= 2100));