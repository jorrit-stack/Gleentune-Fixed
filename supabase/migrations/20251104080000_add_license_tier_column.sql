/*
  # Add License Tier Column for Safe Playback

  1. Changes
    - Add `license_tier` column to `radio_stations` table
    - Add `license_tier` column to `shortwave_stations` table
    - Add check constraint to enforce valid values: 'safe', 'restricted', 'unknown'
    - Set default value to 'unknown' for existing stations
    - Add indexes for efficient filtering by license tier

  2. Security
    - Maintains existing RLS policies
    - No changes to access permissions

  3. Purpose
    - Track which stations have safe licenses (Public Domain, CC-BY, CC-BY-SA)
    - Enable filtering for legally embeddable/monetizable content
    - Support "Play on Official Site" fallback for restricted stations
*/

-- Add license_tier to radio_stations
ALTER TABLE radio_stations
ADD COLUMN IF NOT EXISTS license_tier TEXT
CHECK (license_tier IN ('safe', 'restricted', 'unknown'))
DEFAULT 'unknown';

-- Add license_tier to shortwave_stations
ALTER TABLE shortwave_stations
ADD COLUMN IF NOT EXISTS license_tier TEXT
CHECK (license_tier IN ('safe', 'restricted', 'unknown'))
DEFAULT 'unknown';

-- Add indexes for efficient filtering
CREATE INDEX IF NOT EXISTS idx_radio_stations_license_tier ON radio_stations(license_tier);
CREATE INDEX IF NOT EXISTS idx_shortwave_stations_license_tier ON shortwave_stations(license_tier);

-- Add comment explaining the tiers
COMMENT ON COLUMN radio_stations.license_tier IS 'License tier: safe (Public Domain/CC-BY/CC-BY-SA), restricted (requires official site playback), unknown (not yet classified)';
COMMENT ON COLUMN shortwave_stations.license_tier IS 'License tier: safe (Public Domain/CC-BY/CC-BY-SA), restricted (requires official site playback), unknown (not yet classified)';
