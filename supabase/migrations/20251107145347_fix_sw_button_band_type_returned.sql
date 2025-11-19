/*
  # Fix: SW Button Returns NULL band_type

  1. Problem
    - SW button query calculates band_type but doesn't actually return it
    - Frontend filters by band_type === 'SW', but gets NULL
    - Result: All 237 stations are filtered out, showing empty list

  2. Solution
    - Return 'SW' as band_type for all SW button results
    - Keep SW1/SW2/SW3 as-is

  3. Changes
    - Set band_type to 'SW' explicitly for SW button query
*/

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
    power_kw NUMERIC
) AS $$
DECLARE
    city_rec RECORD;
    sw_band_name TEXT;
    station_count INT;
BEGIN
    -- Find the city and get its country region code
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

    -- If no exact match, try partial match
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

    -- Handle AM and FM bands (city-specific)
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
            sv.power_kw
        FROM stations_view sv
        WHERE sv.band_type = UPPER(input_band)
          AND sv.city_name = city_rec.city_name
          AND sv.stream_url IS NOT NULL
        ORDER BY sv.frequency_khz;
        RETURN;
    END IF;

    -- Handle SW1, SW2, SW3 buttons (city-specific, like AM/FM)
    IF UPPER(input_band) IN ('SW1', 'SW2', 'SW3') THEN
        sw_band_name := CASE UPPER(input_band)
            WHEN 'SW1' THEN 'SW1 (3.2-7 MHz)'
            WHEN 'SW2' THEN 'SW2 (7-15 MHz)'
            WHEN 'SW3' THEN 'SW3 (15-26.1 MHz)'
        END;

        -- City-specific matching only
        RETURN QUERY
        SELECT DISTINCT ON (sw.frequency_khz, sw.station_name)
            ('sw_' || sw.sw_station_id::TEXT)::TEXT,
            sw.station_name,
            sw.frequency_khz::INT,
            UPPER(input_band)::TEXT,  -- Return SW1, SW2, or SW3
            city_rec.city_name::TEXT,
            city_rec.country_name::TEXT,
            sw.stream_url,
            sw.target_regions,
            sw.transmitter_lat,
            sw.transmitter_long,
            sw.power_kw
        FROM shortwave_stations sw
        WHERE sw.stream_url IS NOT NULL
          AND sw.stream_verified = TRUE
          AND sw.city_id = city_rec.city_id  -- City-specific only
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

    -- Handle SW button ONLY (regional matching for all SW frequencies)
    IF UPPER(input_band) = 'SW' THEN
        RETURN QUERY
        SELECT DISTINCT ON (sw.frequency_khz, sw.station_name)
            ('sw_' || sw.sw_station_id::TEXT)::TEXT,
            sw.station_name,
            sw.frequency_khz::INT,
            'SW'::TEXT,  -- FIX: Return 'SW' as band_type for frontend filtering
            city_rec.city_name::TEXT,
            city_rec.country_name::TEXT,
            sw.stream_url,
            sw.target_regions,
            sw.transmitter_lat,
            sw.transmitter_long,
            sw.power_kw
        FROM shortwave_stations sw
        WHERE sw.stream_url IS NOT NULL
          AND sw.stream_verified = TRUE
          AND (
              -- Regional matching for SW button
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
