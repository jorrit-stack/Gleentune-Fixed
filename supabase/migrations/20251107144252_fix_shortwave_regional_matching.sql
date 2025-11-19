/*
  # Fix Shortwave Regional Matching for City Selection

  1. Problem
    - 489 out of 648 SW stations have no city_id
    - Stations targeting "Asia" don't appear for Indian cities
    - Current logic requires exact city_id match

  2. Solution - Multi-level Matching
    - Level 1: Match by target_regions (station targets user's region)
    - Level 2: Match by country_id (station in same country)
    - Level 3: Match by city_id (exact city match)
    - Level 4: Show "Global" broadcasts to everyone

  3. Region Mapping
    - "Asia" → "AS" (India's region code)
    - "Africa" → "AF"
    - "Europe" → "EU"
    - "North America" → "NA"
    - "South America" → "SA"
    - "Oceania" → "OC"
    - "Global" → matches all regions

  4. Changes
    - Update get_stations_by_city_and_band function
    - Add regional matching logic for shortwave
    - Keep AM/FM city-specific logic unchanged
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

    -- Handle AM and FM bands (city-specific, unchanged)
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

    -- Handle shortwave bands with regional matching
    IF UPPER(input_band) IN ('SW1', 'SW2', 'SW3', 'SW') THEN
        sw_band_name := CASE UPPER(input_band)
            WHEN 'SW1' THEN 'SW1 (3.2-7 MHz)'
            WHEN 'SW2' THEN 'SW2 (7-15 MHz)'
            WHEN 'SW3' THEN 'SW3 (15-26.1 MHz)'
            ELSE NULL
        END;

        -- Return shortwave stations with multi-level matching
        IF UPPER(input_band) = 'SW' THEN
            RETURN QUERY
            SELECT DISTINCT ON (sw.frequency_khz, sw.station_name)
                ('sw_' || sw.sw_station_id::TEXT)::TEXT,
                sw.station_name,
                sw.frequency_khz::INT,
                CASE 
                    WHEN sw.frequency_khz BETWEEN 3200 AND 7000 THEN 'SW1'
                    WHEN sw.frequency_khz BETWEEN 7000 AND 15000 THEN 'SW2'
                    WHEN sw.frequency_khz BETWEEN 15000 AND 26100 THEN 'SW3'
                END::TEXT,
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
                  -- Level 1: Regional match (Asia, Africa, Europe, etc.)
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
                  -- Level 2: Country match
                  OR sw.country_id = city_rec.country_id
                  -- Level 3: City match
                  OR sw.city_id = city_rec.city_id
              )
            ORDER BY sw.frequency_khz, sw.station_name, sw.relay_source DESC NULLS LAST;

            GET DIAGNOSTICS station_count = ROW_COUNT;
            RAISE NOTICE 'Shortwave: Found % stations for city "%" (all SW bands)', station_count, city_rec.city_name;
            RETURN;
        END IF;

        -- Specific band (SW1/SW2/SW3)
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
            sw.power_kw
        FROM shortwave_stations sw
        WHERE sw.stream_url IS NOT NULL
          AND sw.stream_verified = TRUE
          AND (
              -- Multi-level regional matching
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
          AND CASE sw_band_name
              WHEN 'SW1 (3.2-7 MHz)' THEN sw.frequency_khz BETWEEN 3200 AND 7000
              WHEN 'SW2 (7-15 MHz)' THEN sw.frequency_khz BETWEEN 7000 AND 15000
              WHEN 'SW3 (15-26.1 MHz)' THEN sw.frequency_khz BETWEEN 15000 AND 26100
          END
        ORDER BY sw.frequency_khz, sw.station_name, sw.relay_source DESC NULLS LAST;

        GET DIAGNOSTICS station_count = ROW_COUNT;
        RAISE NOTICE 'Shortwave: Found % stations for city "%" in band %', station_count, city_rec.city_name, input_band;
        RETURN;
    END IF;

    RAISE NOTICE 'Unknown band type: %', input_band;
    RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
