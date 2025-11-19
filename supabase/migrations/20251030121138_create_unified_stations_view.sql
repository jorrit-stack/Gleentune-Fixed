/*
  # Create Unified Stations View

  ## Overview
  Creates a comprehensive view that unifies all radio stations across different bands:
  - FM/AM stations from `stations` table
  - Shortwave stations from `shortwave_stations` table
  - Legacy stations from `radio_stations` table (for backward compatibility)

  ## Purpose
  Provides a single queryable interface for all radio stations regardless of band,
  with standardized columns for frequency, location, metadata, and streaming info.

  ## View Structure
  - station_id: Unique identifier (with band prefix for distinction)
  - station_name: Station name
  - frequency_mhz: Standardized frequency in MHz
  - frequency_khz: Original frequency in kHz
  - band_type: AM, FM, or SW (shortwave)
  - city_name: Associated city
  - country_name: Country
  - country_code: ISO country code
  - latitude: Transmitter/city latitude
  - longitude: Transmitter/city longitude
  - stream_url: Internet stream URL
  - language: Broadcast language
  - genre: Station genre/format
  - power_kw: Transmitter power
  - modulation_type: AM, FM, SSB, etc.
  - status: Active/Inactive
  - created_at: Record creation timestamp
*/

-- Drop existing view if it exists
DROP VIEW IF EXISTS stations_view;

-- Create unified stations view
CREATE VIEW stations_view AS

-- FM/AM Stations from 'stations' table
SELECT 
  s.station_id::text as station_id,
  s.station_name,
  s.call_sign,
  (s.frequency_khz / 1000.0)::numeric(10,3) as frequency_mhz,
  s.frequency_khz::numeric as frequency_khz,
  b.band_name as band_type,
  c.city_name,
  co.country_name,
  co.iso_code as country_code,
  sl.transmitter_lat as latitude,
  sl.transmitter_long as longitude,
  s.stream_url,
  s.language,
  s.genre,
  s.content_type,
  s.power_kw,
  s.modulation_type,
  s.owner,
  s.license_type,
  s.format_type,
  s.website_url,
  s.bitrate_kbps,
  s.status,
  s.last_verified,
  s.coverage_radius_km,
  NULL::text as broadcast_times,
  NULL::text as target_area,
  NULL::text as itu_code,
  'fm_am'::text as source_table,
  s.created_at,
  s.updated_at
FROM stations s
JOIN bands b ON s.band_id = b.band_id
LEFT JOIN station_locations sl ON s.station_id = sl.station_id
LEFT JOIN cities c ON sl.city_id = c.city_id
LEFT JOIN countries co ON c.country_id = co.country_id

UNION ALL

-- Shortwave Stations from 'shortwave_stations' table
SELECT 
  ('sw_' || sw.sw_station_id::text) as station_id,
  sw.station_name,
  NULL::text as call_sign,
  (sw.frequency_khz / 1000.0)::numeric(10,3) as frequency_mhz,
  sw.frequency_khz::numeric as frequency_khz,
  'SW'::text as band_type,
  c.city_name,
  co.country_name,
  co.iso_code as country_code,
  sw.transmitter_lat as latitude,
  sw.transmitter_long as longitude,
  NULL::text as stream_url,
  sw.language_code as language,
  NULL::text as genre,
  NULL::text as content_type,
  sw.power_kw,
  NULL::text as modulation_type,
  NULL::text as owner,
  NULL::text as license_type,
  NULL::text as format_type,
  NULL::text as website_url,
  NULL::integer as bitrate_kbps,
  'Active'::text as status,
  NULL::date as last_verified,
  NULL::numeric as coverage_radius_km,
  sw.broadcast_times,
  sw.target_area,
  sw.itu_code,
  'shortwave'::text as source_table,
  sw.created_at,
  sw.updated_at
FROM shortwave_stations sw
LEFT JOIN cities c ON sw.city_id = c.city_id
LEFT JOIN countries co ON sw.country_id = co.country_id

UNION ALL

-- Legacy stations from 'radio_stations' table (for backward compatibility)
SELECT 
  ('legacy_' || rs.id::text) as station_id,
  rs.name as station_name,
  NULL::text as call_sign,
  (rs.frequency / 1000.0)::numeric(10,3) as frequency_mhz,
  rs.frequency::numeric as frequency_khz,
  rs.band_type,
  rs.city,
  rs.country as country_name,
  rs.country_code,
  rs.latitude,
  rs.longitude,
  rs.stream_url,
  rs.language,
  NULL::text as genre,
  NULL::text as content_type,
  NULL::numeric as power_kw,
  NULL::text as modulation_type,
  NULL::text as owner,
  NULL::text as license_type,
  NULL::text as format_type,
  rs.homepage as website_url,
  rs.bitrate as bitrate_kbps,
  CASE WHEN rs.last_check_ok THEN 'Active' ELSE 'Inactive' END as status,
  NULL::date as last_verified,
  NULL::numeric as coverage_radius_km,
  NULL::text as broadcast_times,
  NULL::text as target_area,
  NULL::text as itu_code,
  'legacy'::text as source_table,
  rs.created_at,
  rs.created_at as updated_at
FROM radio_stations rs;

-- Add helpful comment
COMMENT ON VIEW stations_view IS 'Unified view of all radio stations (FM, AM, SW) with standardized schema';

-- Create indexes on underlying tables if not exists (for view performance)
CREATE INDEX IF NOT EXISTS idx_stations_frequency ON stations(frequency_khz);
CREATE INDEX IF NOT EXISTS idx_stations_band ON stations(band_id);
CREATE INDEX IF NOT EXISTS idx_shortwave_frequency ON shortwave_stations(frequency_khz);
CREATE INDEX IF NOT EXISTS idx_radio_stations_frequency ON radio_stations(frequency);
