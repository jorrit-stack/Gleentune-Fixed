/*
  # Add Wikidata and Attribution Fields

  ## Changes
  
  1. New Columns
    - `wikidata_id` (text): Wikidata entity ID (e.g., "Q12345")
      Used to link station to its Wikidata entry for verifiable data
    
    - `wikipedia_url` (text): Link to Wikipedia article about the station
      For attribution and user reference (e.g., "https://en.wikipedia.org/wiki/Radio_Mirchi")
    
    - `data_sources` (jsonb): Tracks which fields came from which sources
      Example: {"description": "wikipedia", "owner": "wikidata", "established_year": "wikidata"}
      Ensures proper attribution and audit trail
  
  ## Attribution & Legal Compliance
  - Wikidata: CC0 (Public Domain) - no attribution required but tracked for quality
  - Wikipedia: CC BY-SA 4.0 - requires attribution, tracked in data_sources
  - Enables proper "Source: Wikipedia" links in UI
  - Maintains data provenance for verification
  
  ## Use Cases
  - Fill 100% missing descriptions via Wikipedia/Wikidata
  - Enrich 82% missing owner/network data
  - Add establishment dates, broadcast areas, and other metadata
  - Provide citations for credibility
*/

-- Add Wikidata entity ID for linking
ALTER TABLE radio_stations 
ADD COLUMN IF NOT EXISTS wikidata_id text;

-- Add Wikipedia article URL for attribution
ALTER TABLE radio_stations 
ADD COLUMN IF NOT EXISTS wikipedia_url text;

-- Add JSON field to track data sources per field
ALTER TABLE radio_stations 
ADD COLUMN IF NOT EXISTS data_sources jsonb DEFAULT '{}'::jsonb;

-- Create index for Wikidata lookups
CREATE INDEX IF NOT EXISTS idx_radio_stations_wikidata_id 
ON radio_stations(wikidata_id) 
WHERE wikidata_id IS NOT NULL;

-- Create GIN index for efficient JSONB queries on data sources
CREATE INDEX IF NOT EXISTS idx_radio_stations_data_sources 
ON radio_stations USING GIN(data_sources);

-- Add comment explaining the data_sources structure
COMMENT ON COLUMN radio_stations.data_sources IS 
'JSON object tracking the source of each enriched field. Example: {"description": "wikipedia", "owner": "wikidata", "established_year": "wikidata"}. Used for attribution compliance (CC BY-SA 4.0) and data quality auditing.';