/*
  # Update Stations View to Include License Tier

  1. Changes
    - Drop existing stations_view
    - Recreate with license_tier field from both source tables
    - Maintain all existing fields for backward compatibility

  2. Purpose
    - Enable frontend to filter stations by license tier
    - Support legal compliance for embedded playback
*/

-- Drop existing view
DROP VIEW IF EXISTS stations_view;

-- Recreate view with license_tier
CREATE VIEW stations_view AS
SELECT
  rs.id AS station_id,
  rs.name AS station_name,
  rs.call_sign,
  rs.frequency AS frequency_mhz,
  CASE
    WHEN rs.band_type = 'FM' THEN rs.frequency * 1000
    WHEN rs.band_type = 'AM' THEN rs.frequency
    ELSE rs.frequency * 1000
  END AS frequency_khz,
  rs.band_type,
  c.name AS city_name,
  c.country AS country_name,
  c.country_code,
  c.latitude,
  c.longitude,
  rs.stream_url,
  rs.language,
  rs.genre,
  rs.power_kw,
  rs.website_url,
  rs.bitrate_kbps,
  rs.status,
  rs.logo_url,
  rs.logo_source,
  rs.logo_verified,
  rs.logo_last_checked,
  rs.license_tier,
  'fm_am' AS source_table,
  rs.created_at
FROM radio_stations rs
LEFT JOIN cities c ON rs.city_id = c.id

UNION ALL

SELECT
  'sw_' || sw.id AS station_id,
  sw.station_name,
  NULL AS call_sign,
  sw.frequency_mhz,
  sw.frequency_mhz * 1000 AS frequency_khz,
  'SW' AS band_type,
  c.name AS city_name,
  c.country AS country_name,
  sw.itu_code AS country_code,
  c.latitude,
  c.longitude,
  sw.stream_url,
  sw.language,
  NULL AS genre,
  sw.power_kw,
  NULL AS website_url,
  NULL AS bitrate_kbps,
  'Active' AS status,
  sw.logo_url,
  sw.logo_source,
  sw.logo_verified,
  sw.logo_last_checked,
  sw.license_tier,
  'shortwave' AS source_table,
  sw.created_at
FROM shortwave_stations sw
LEFT JOIN cities c ON sw.transmitter_site ILIKE '%' || c.name || '%'
WHERE sw.frequency_mhz IS NOT NULL;
