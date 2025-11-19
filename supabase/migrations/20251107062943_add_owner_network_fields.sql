/*
  # Add Owner and Network Fields to Radio Stations

  ## Changes
  
  1. New Columns
    - `owner` (text): The company or organization that owns/operates the station
      Examples: "All India Radio", "Entertainment Network India Ltd (ENIL)", "HT Media Ltd"
    
    - `network` (text): The brand/network name the station is part of
      Examples: "Radio Mirchi", "Red FM", "Big FM", "Fever FM", "AIR FM Gold"
  
  ## Notes
  - Both fields are optional (nullable) as we'll enrich them over time
  - `network` is the consumer-facing brand (Radio Mirchi, Red FM)
  - `owner` is the corporate entity (ENIL, HT Media)
  - Useful for grouping stations, attribution, and network branding
  - Can be populated from station names, websites, and external sources
*/

-- Add owner field for company/organization that operates the station
ALTER TABLE radio_stations 
ADD COLUMN IF NOT EXISTS owner text;

-- Add network field for brand/network name
ALTER TABLE radio_stations 
ADD COLUMN IF NOT EXISTS network text;

-- Create index for efficient network-based queries
CREATE INDEX IF NOT EXISTS idx_radio_stations_network 
ON radio_stations(network) 
WHERE network IS NOT NULL;

-- Create index for efficient owner-based queries
CREATE INDEX IF NOT EXISTS idx_radio_stations_owner 
ON radio_stations(owner) 
WHERE owner IS NOT NULL;