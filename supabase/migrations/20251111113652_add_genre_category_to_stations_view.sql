/*
  # Add genre_category column to stations_view

  1. Purpose
    - Expose genre_category field from all tables in the unified view
    - Enable frontend genre filtering to work correctly

  2. Changes
    - Add genre_category column to all three UNION sections
    - Map from stations.genre_category
    - Map from shortwave_stations (NULL for now, can be populated later)
    - Map from radio_stations.genre_category
*/

DROP VIEW IF EXISTS stations_view CASCADE;

CREATE VIEW stations_view AS
 SELECT s.station_id::text AS station_id,
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
    s.genre_category,
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
    NULL::timestamp with time zone AS stream_last_checked,
    s.logo_url,
    s.logo_source,
    s.source_url,
    s.retrieved_at,
    s.logo_verified,
    s.logo_last_checked,
    'unknown'::text AS license_tier,
    COALESCE(s.status = 'Active'::text, true) AS is_active,
    'MP3'::text AS codec,
    'fm_am'::text AS source_table,
    'terrestrial'::text AS band_category,
    s.created_at,
    s.updated_at
   FROM stations s
     JOIN bands b ON s.band_id = b.band_id
     LEFT JOIN station_locations sl ON s.station_id = sl.station_id
     LEFT JOIN cities c ON sl.city_id = c.city_id
     LEFT JOIN countries co ON c.country_id = co.country_id
UNION ALL
 SELECT 'sw_'::text || sw.sw_station_id::text AS station_id,
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
    NULL::text AS genre_category,
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
    sw.source_url,
    sw.retrieved_at,
    sw.logo_verified,
    sw.logo_last_checked,
    COALESCE(sw.license_tier, 'unknown'::text) AS license_tier,
    true AS is_active,
    'MP3'::text AS codec,
    'shortwave'::text AS source_table,
    'terrestrial'::text AS band_category,
    sw.created_at,
    sw.updated_at
   FROM shortwave_stations sw
     LEFT JOIN cities c ON sw.city_id = c.city_id
     LEFT JOIN countries co ON sw.country_id = co.country_id
UNION ALL
 SELECT 'legacy_'::text || rs.id::text AS station_id,
    rs.name AS station_name,
    NULL::text AS call_sign,
    CASE
        WHEN rs.band_type = 'FM' THEN rs.frequency::numeric(10,3)
        ELSE (rs.frequency / 1000.0)::numeric(10,3)
    END AS frequency_mhz,
    CASE
        WHEN rs.band_type = 'FM' THEN (rs.frequency * 1000.0)::numeric
        ELSE rs.frequency::numeric
    END AS frequency_khz,
    rs.band_type,
    rs.city AS city_name,
    rs.country AS country_name,
    rs.country_code,
    rs.latitude,
    rs.longitude,
    rs.stream_url,
    rs.language,
    NULL::text AS genre,
    rs.genre_category,
    NULL::text AS content_type,
    NULL::numeric AS power_kw,
    NULL::text AS modulation_type,
    rs.owner,
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
    NULL::timestamp with time zone AS stream_last_checked,
    rs.logo_url,
    rs.logo_source,
    rs.source_url,
    rs.retrieved_at,
    rs.logo_verified,
    rs.logo_last_checked,
    COALESCE(rs.license_tier, 'unknown'::text) AS license_tier,
    COALESCE(rs.is_active, true) AS is_active,
    COALESCE(rs.codec, 'MP3'::text) AS codec,
    'legacy'::text AS source_table,
    COALESCE(rs.band_category, 'terrestrial'::text) AS band_category,
    rs.created_at,
    rs.created_at AS updated_at
   FROM radio_stations rs;

COMMENT ON VIEW stations_view IS 'Unified view of all radio stations (FM/AM/SW/Internet) with genre_category for filtering';
