/*
  # Add Band Category for Hybrid Radio Model
  
  1. Changes
    - Add `band_category` column to distinguish:
      - 'terrestrial' = AM/FM/SW with physical transmitters (requires coordinates)
      - 'internet' = Internet-only streams (coordinates optional)
    - Default to 'terrestrial' for existing data
    - Add index for efficient filtering
  
  2. Purpose
    - Enable hybrid product: realistic radio simulation + internet radio directory
    - Maintain propagation model integrity for terrestrial stations
    - Allow internet-only stations without breaking location-based features
  
  3. Notes
    - Existing stations default to 'terrestrial' (they all have coordinates)
    - Future imports will set based on coordinate availability
*/

-- Add band_category to radio_stations
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'radio_stations' AND column_name = 'band_category'
  ) THEN
    ALTER TABLE radio_stations 
    ADD COLUMN band_category text 
    CHECK (band_category IN ('terrestrial', 'internet'))
    DEFAULT 'terrestrial';
  END IF;
END $$;

-- Set existing stations to terrestrial (they all have coordinates)
UPDATE radio_stations 
SET band_category = 'terrestrial' 
WHERE band_category IS NULL;

-- Create index for efficient filtering
CREATE INDEX IF NOT EXISTS idx_radio_stations_band_category 
ON radio_stations(band_category);

-- Create combined index for common queries (band_type exists, not band)
CREATE INDEX IF NOT EXISTS idx_radio_stations_category_bandtype_country 
ON radio_stations(band_category, band_type, country);
