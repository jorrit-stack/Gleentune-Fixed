/*
  # Optimize Region Mode Query Performance

  1. Indexes Added
    - Composite index on cities (country_id, city_id) to speed up country filtering
    - Composite index on station_locations (city_id, station_id) for faster joins
    - Index on countries (iso_code) for faster country code lookups
    
  2. Purpose
    - Speed up the stations_view query when filtering by country_code
    - Reduce query time for Region mode from 3-5 seconds to under 1 second
    
  3. Impact
    - Improves JOIN performance in stations_view
    - Enables efficient country-based filtering
*/

-- Index for faster country lookups by ISO code
CREATE INDEX IF NOT EXISTS idx_countries_iso_code 
ON countries(iso_code) 
WHERE iso_code IS NOT NULL;

-- Composite index for cities with country_id first (for country-based filtering)
CREATE INDEX IF NOT EXISTS idx_cities_country_id_city_id 
ON cities(country_id, city_id) 
WHERE country_id IS NOT NULL;

-- Composite index for station_locations with city_id first (for city-based joins)
CREATE INDEX IF NOT EXISTS idx_station_locations_city_id_station_id 
ON station_locations(city_id, station_id) 
WHERE city_id IS NOT NULL;

-- Index on stations status for active filtering
CREATE INDEX IF NOT EXISTS idx_stations_is_active 
ON stations(is_active) 
WHERE is_active = true;
