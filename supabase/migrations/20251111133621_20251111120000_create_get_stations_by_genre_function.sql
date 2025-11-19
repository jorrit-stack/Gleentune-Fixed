/*
  # Create function to get stations by genre

  1. Purpose
    - Return only stations for a specific genre
    - Reduce data transfer and API calls
    - Enable efficient genre-based filtering

  2. Changes
    - Create get_stations_by_genre function
    - Takes genre_category and optional limit
    - Returns filtered stations from unified view
*/

CREATE OR REPLACE FUNCTION get_stations_by_genre(
  p_genre_category text,
  p_limit integer DEFAULT 100
)
RETURNS TABLE (
  station_id text,
  station_name text,
  call_sign text,
  frequency_mhz numeric,
  frequency_khz numeric,
  band_type text,
  city_name text,
  country_name text,
  country_code text,
  latitude numeric,
  longitude numeric,
  stream_url text,
  language text,
  genre text,
  genre_category text,
  power_kw numeric,
  website_url text,
  bitrate_kbps integer,
  status text,
  logo_url text,
  logo_source text,
  license_tier text,
  codec text,
  source_table text,
  owner text
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    sv.station_id,
    sv.station_name,
    sv.call_sign,
    sv.frequency_mhz,
    sv.frequency_khz,
    sv.band_type,
    sv.city_name,
    sv.country_name,
    sv.country_code,
    sv.latitude,
    sv.longitude,
    sv.stream_url,
    sv.language,
    sv.genre,
    sv.genre_category,
    sv.power_kw,
    sv.website_url,
    sv.bitrate_kbps,
    sv.status,
    sv.logo_url,
    sv.logo_source,
    sv.license_tier,
    sv.codec,
    sv.source_table,
    sv.owner
  FROM stations_view sv
  WHERE sv.is_active = true
    AND sv.genre_category = p_genre_category
    AND sv.stream_url IS NOT NULL
    AND sv.stream_url != ''
  ORDER BY sv.station_name
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_stations_by_genre IS 'Returns stations filtered by genre category for efficient loading';
