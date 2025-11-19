/*
  # Add logo fields to shortwave query function
  
  1. Changes
    - Drop and recreate get_stations_by_city_and_band function
    - Add logo_url, logo_source, logo_verified, logo_last_checked to return type
    - Include logo fields in all SELECT queries (AM, FM, SW, SW1, SW2, SW3)
    
  2. Purpose
    - Frontend can now display shortwave station logos
    - Logos were enriched but not being returned by the function
*/

DROP FUNCTION IF EXISTS get_stations_by_city_and_band(TEXT, TEXT);

CREATE OR REPLACE FUNCTION get_stations_by_city_and_band(
    input_city TEXT,
    input_band TEXT
)
RETURNS TABLE(
    station_id TEXT,
    station_name TEXT,
    frequency_khz INT,
    band_type TEXT,
    city_name TEXT,
    country_name TEXT,
    stream_url TEXT,
    target_regions TEXT[],
    latitude NUMERIC,
    longitude NUMERIC,
    power_kw NUMERIC,
    source_url TEXT,
    license_tier TEXT,
    logo_url TEXT,
    logo_source TEXT,
    logo_verified BOOLEAN,
    logo_last_checked TIMESTAMPTZ
) AS $$
DECLARE
    city_rec RECORD;
    sw_band_name TEXT;
    station_count INT;
BEGIN
    SELECT 
        c.city_id, 
        c.city_name, 
        c.latitude, 
        c.longitude, 
        c.country_id,
        co.country_name,
        co.region as country_region_code
    INTO city_rec
    FROM cities c
    LEFT JOIN countries co ON c.country_id = co.country_id
    WHERE LOWER(c.city_name) = LOWER(input_city)
    LIMIT 1;

    IF city_rec IS NULL THEN
        SELECT 
            c.city_id, 
            c.city_name, 
            c.latitude, 
            c.longitude, 
            c.country_id,
            co.country_name,
            co.region as country_region_code
        INTO city_rec
        FROM cities c
        LEFT JOIN countries co ON c.country_id = co.country_id
        WHERE LOWER(c.city_name) LIKE LOWER('%' || input_city || '%')
        LIMIT 1;
    END IF;

    IF city_rec IS NULL THEN
        RAISE NOTICE 'City "%" not found in cities table.', input_city;
        RETURN;
    END IF;

    IF UPPER(input_band) IN ('AM', 'FM') THEN
        RETURN QUERY
        SELECT 
            sv.station_id::TEXT,
            sv.station_name,
            sv.frequency_khz::INT,
            sv.band_type,
            sv.city_name,
            sv.country_name,
            sv.stream_url,
            sv.target_regions,
            sv.latitude,
            sv.longitude,
            sv.power_kw,
            sv.source_url,
            sv.license_tier,
            sv.logo_url,
            sv.logo_source,
            sv.logo_verified,
            sv.logo_last_checked
        FROM stations_view sv
        WHERE sv.band_type = UPPER(input_band)
          AND sv.city_name = city_rec.city_name
          AND sv.stream_url IS NOT NULL
        ORDER BY sv.frequency_khz;
        RETURN;
    END IF;

    IF UPPER(input_band) IN ('SW1', 'SW2', 'SW3') THEN
        sw_band_name := CASE UPPER(input_band)
            WHEN 'SW1' THEN 'SW1 (3.2-7 MHz)'
            WHEN 'SW2' THEN 'SW2 (7-15 MHz)'
            WHEN 'SW3' THEN 'SW3 (15-26.1 MHz)'
        END;

        RETURN QUERY
        SELECT DISTINCT ON (sw.frequency_khz, sw.station_name)
            ('sw_' || sw.sw_station_id::TEXT)::TEXT,
            sw.station_name,
            sw.frequency_khz::INT,
            UPPER(input_band)::TEXT,
            city_rec.city_name::TEXT,
            city_rec.country_name::TEXT,
            sw.stream_url,
            sw.target_regions,
            sw.transmitter_lat,
            sw.transmitter_long,
            sw.power_kw,
            sw.source_url,
            sw.license_tier,
            sw.logo_url,
            sw.logo_source,
            sw.logo_verified,
            sw.logo_last_checked
        FROM shortwave_stations sw
        WHERE sw.stream_url IS NOT NULL
          AND sw.stream_verified = TRUE
          AND sw.city_id = city_rec.city_id
          AND CASE sw_band_name
              WHEN 'SW1 (3.2-7 MHz)' THEN sw.frequency_khz BETWEEN 3200 AND 7000
              WHEN 'SW2 (7-15 MHz)' THEN sw.frequency_khz BETWEEN 7000 AND 15000
              WHEN 'SW3 (15-26.1 MHz)' THEN sw.frequency_khz BETWEEN 15000 AND 26100
          END
        ORDER BY sw.frequency_khz, sw.station_name, sw.relay_source DESC NULLS LAST;

        GET DIAGNOSTICS station_count = ROW_COUNT;
        RAISE NOTICE 'Shortwave %: Found % city-specific stations for "%"', input_band, station_count, city_rec.city_name;
        RETURN;
    END IF;

    IF UPPER(input_band) = 'SW' THEN
        RETURN QUERY
        SELECT DISTINCT ON (sw.frequency_khz, sw.station_name)
            ('sw_' || sw.sw_station_id::TEXT)::TEXT,
            sw.station_name,
            sw.frequency_khz::INT,
            'SW'::TEXT,
            city_rec.city_name::TEXT,
            city_rec.country_name::TEXT,
            sw.stream_url,
            sw.target_regions,
            sw.transmitter_lat,
            sw.transmitter_long,
            sw.power_kw,
            sw.source_url,
            sw.license_tier,
            sw.logo_url,
            sw.logo_source,
            sw.logo_verified,
            sw.logo_last_checked
        FROM shortwave_stations sw
        WHERE sw.stream_url IS NOT NULL
          AND sw.stream_verified = TRUE
          AND (
              (sw.target_regions IS NOT NULL AND (
                  'Global' = ANY(sw.target_regions) OR
                  (city_rec.country_region_code = 'AS' AND 'Asia' = ANY(sw.target_regions)) OR
                  (city_rec.country_region_code = 'AF' AND 'Africa' = ANY(sw.target_regions)) OR
                  (city_rec.country_region_code = 'EU' AND 'Europe' = ANY(sw.target_regions)) OR
                  (city_rec.country_region_code = 'NA' AND 'North America' = ANY(sw.target_regions)) OR
                  (city_rec.country_region_code = 'SA' AND 'South America' = ANY(sw.target_regions)) OR
                  (city_rec.country_region_code = 'OC' AND 'Oceania' = ANY(sw.target_regions)) OR
                  'Americas' = ANY(sw.target_regions) OR
                  'Middle East' = ANY(sw.target_regions)
              ))
              OR sw.country_id = city_rec.country_id
              OR sw.city_id = city_rec.city_id
          )
        ORDER BY sw.frequency_khz, sw.station_name, sw.relay_source DESC NULLS LAST;

        GET DIAGNOSTICS station_count = ROW_COUNT;
        RAISE NOTICE 'SW button: Found % regional stations for "%"', station_count, city_rec.city_name;
        RETURN;
    END IF;

    RAISE NOTICE 'Unknown band type: %', input_band;
    RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
