/*
  # Add Logo Fields to stations_view
  
  1. Changes
    - Add logo_url column to view output
    - Add logo_source column to view output
    - Add logo_verified column to view output
    - Add logo_last_checked column to view output
  
  2. Notes
    - Pulls logo data from all three source tables
    - Maintains all existing fields and functionality
*/

-- Drop and recreate stations_view with logo fields
DROP VIEW IF EXISTS stations_view CASCADE;

CREATE VIEW stations_view AS
-- FM/AM stations from the stations table
SELECT 
  s.station_id::text AS station_id,
  s.station_name,
  s.call_sign,
  (s.frequency_khz / 1000.0)::numeric(10,3) AS frequency_mhz,
  s.frequency_khz::numeric AS frequency_khz,
  b.band_name AS band_type,
  c.city_name,
  co.country_name,
  co.iso_code AS country_code,
  sl.transmitter_lat AS latitude,
  sl.transmitter_long AS longitude,
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
  NULL::text AS broadcast_times,
  NULL::text AS target_area,
  NULL::text AS itu_code,
  NULL::text AS propagation_pattern,
  NULL::text[] AS target_regions,
  NULL::boolean AS stream_verified,
  NULL::timestamptz AS stream_last_checked,
  s.logo_url,
  s.logo_source,
  s.logo_verified,
  s.logo_last_checked,
  'fm_am'::text AS source_table,
  s.created_at,
  s.updated_at
FROM stations s
JOIN bands b ON s.band_id = b.band_id
LEFT JOIN station_locations sl ON s.station_id = sl.station_id
LEFT JOIN cities c ON sl.city_id = c.city_id
LEFT JOIN countries co ON c.country_id = co.country_id

UNION ALL

-- Shortwave stations
SELECT 
  'sw_'::text || sw.sw_station_id::text AS station_id,
  sw.station_name,
  NULL::text AS call_sign,
  (sw.frequency_khz::numeric / 1000.0)::numeric(10,3) AS frequency_mhz,
  sw.frequency_khz::numeric AS frequency_khz,
  'SW'::text AS band_type,
  c.city_name,
  co.country_name,
  co.iso_code AS country_code,
  sw.transmitter_lat AS latitude,
  sw.transmitter_long AS longitude,
  sw.stream_url,
  sw.language_code AS language,
  NULL::text AS genre,
  NULL::text AS content_type,
  sw.power_kw,
  NULL::text AS modulation_type,
  NULL::text AS owner,
  NULL::text AS license_type,
  NULL::text AS format_type,
  NULL::text AS website_url,
  NULL::integer AS bitrate_kbps,
  'Active'::text AS status,
  NULL::date AS last_verified,
  NULL::numeric AS coverage_radius_km,
  sw.broadcast_times,
  sw.target_area,
  sw.itu_code,
  sw.propagation_pattern,
  sw.target_regions,
  sw.stream_verified,
  sw.stream_last_checked,
  sw.logo_url,
  sw.logo_source,
  sw.logo_verified,
  sw.logo_last_checked,
  'shortwave'::text AS source_table,
  sw.created_at,
  sw.updated_at
FROM shortwave_stations sw
LEFT JOIN cities c ON sw.city_id = c.city_id
LEFT JOIN countries co ON sw.country_id = co.country_id

UNION ALL

-- Legacy radio_stations
SELECT 
  'legacy_'::text || rs.id::text AS station_id,
  rs.name AS station_name,
  NULL::text AS call_sign,
  (rs.frequency / 1000.0)::numeric(10,3) AS frequency_mhz,
  rs.frequency::numeric AS frequency_khz,
  rs.band_type,
  rs.city AS city_name,
  rs.country AS country_name,
  rs.country_code,
  rs.latitude,
  rs.longitude,
  rs.stream_url,
  rs.language,
  NULL::text AS genre,
  NULL::text AS content_type,
  NULL::numeric AS power_kw,
  NULL::text AS modulation_type,
  NULL::text AS owner,
  NULL::text AS license_type,
  NULL::text AS format_type,
  rs.homepage AS website_url,
  rs.bitrate AS bitrate_kbps,
  CASE 
    WHEN rs.last_check_ok THEN 'Active'::text
    ELSE 'Inactive'::text
  END AS status,
  NULL::date AS last_verified,
  NULL::numeric AS coverage_radius_km,
  NULL::text AS broadcast_times,
  NULL::text AS target_area,
  NULL::text AS itu_code,
  NULL::text AS propagation_pattern,
  NULL::text[] AS target_regions,
  NULL::boolean AS stream_verified,
  NULL::timestamptz AS stream_last_checked,
  rs.logo_url,
  rs.logo_source,
  rs.logo_verified,
  rs.logo_last_checked,
  'legacy'::text AS source_table,
  rs.created_at,
  rs.created_at AS updated_at
FROM radio_stations rs;

-- Grant access
GRANT SELECT ON stations_view TO anon, authenticated;
