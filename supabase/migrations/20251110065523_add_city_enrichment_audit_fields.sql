/*
  # Add City Enrichment Audit Fields

  1. Purpose
    - Track when and how city data was enriched/updated
    - Enable audit trail for data quality verification
    - Support rollback of enrichment if needed

  2. New Fields
    - `city_source` (text): How the city was determined
      Values: 'original', 'name_parse', 'reverse_geocode', 'state_field', 'tags', 'api', 'manual'
    - `city_confidence` (text): Confidence level of the city assignment
      Values: 'high' (95%+), 'medium' (75-95%), 'low' (<75%)
    - `city_enriched_at` (timestamptz): When the city was enriched/updated
    - `city_verified` (boolean): Whether the city has been manually verified
    - `city_original` (text): Original city value before enrichment (for rollback)

  3. Indexes
    - Index on city_source for filtering by enrichment method
    - Index on city_confidence for quality filtering
    - Index on city_enriched_at for temporal queries

  4. Notes
    - Existing city values (231 Indian stations) will be marked as 'original' with 'high' confidence
    - All future enrichment will populate these audit fields
    - This enables transparent data quality tracking
*/

-- Add audit fields for city enrichment
ALTER TABLE radio_stations 
  ADD COLUMN IF NOT EXISTS city_source text DEFAULT 'original',
  ADD COLUMN IF NOT EXISTS city_confidence text DEFAULT 'high',
  ADD COLUMN IF NOT EXISTS city_enriched_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS city_verified boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS city_original text DEFAULT NULL;

-- Add check constraint for valid source values
ALTER TABLE radio_stations 
  DROP CONSTRAINT IF EXISTS valid_city_source;

ALTER TABLE radio_stations
  ADD CONSTRAINT valid_city_source 
  CHECK (city_source IN ('original', 'name_parse', 'reverse_geocode', 'state_field', 'tags', 'api', 'manual', 'unknown'));

-- Add check constraint for valid confidence values
ALTER TABLE radio_stations 
  DROP CONSTRAINT IF EXISTS valid_city_confidence;

ALTER TABLE radio_stations
  ADD CONSTRAINT valid_city_confidence 
  CHECK (city_confidence IN ('high', 'medium', 'low'));

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_radio_stations_city_source 
  ON radio_stations(city_source);

CREATE INDEX IF NOT EXISTS idx_radio_stations_city_confidence 
  ON radio_stations(city_confidence);

CREATE INDEX IF NOT EXISTS idx_radio_stations_city_enriched_at 
  ON radio_stations(city_enriched_at);

-- Mark existing cities as 'original' with high confidence
UPDATE radio_stations 
SET 
  city_source = 'original',
  city_confidence = 'high',
  city_verified = true,
  city_enriched_at = created_at
WHERE city IS NOT NULL;

-- Add helpful comment
COMMENT ON COLUMN radio_stations.city_source IS 'How the city was determined: original, name_parse, reverse_geocode, state_field, tags, api, manual';
COMMENT ON COLUMN radio_stations.city_confidence IS 'Confidence level: high (95%+), medium (75-95%), low (<75%)';
COMMENT ON COLUMN radio_stations.city_enriched_at IS 'Timestamp when city was enriched/updated';
COMMENT ON COLUMN radio_stations.city_verified IS 'Whether the city has been manually verified';
COMMENT ON COLUMN radio_stations.city_original IS 'Original city value before enrichment (for rollback)';
