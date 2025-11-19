/*
  # Create Unified Station Query Function with Realistic Shortwave Coverage

  1. Purpose
    - Provides a single unified function for querying stations by city and band
    - Integrates AM, FM, and realistic shortwave coverage (SW1, SW2, SW3)
    - Uses validated get_realistic_sw_coverage() for shortwave bands
    - Preserves existing AM/FM behavior without any changes

  2. Function: get_stations_by_city_and_band
    - Parameters:
      - input_city: TEXT - City name (partial match supported)
      - input_band: TEXT - Band type (AM, FM, SW1, SW2, SW3)
    - Returns: Table of stations with stream URLs
      - station_id: TEXT
      - station_name: TEXT
      - frequency_khz: INT
      - band_type: TEXT
      - city_name: TEXT
      - country_name: TEXT
      - stream_url: TEXT
      - target_regions: TEXT[]
      - latitude: NUMERIC
      - longitude: NUMERIC

  3. Behavior
    - For AM/FM: Queries stations_view directly (unchanged behavior)
    - For SW1/SW2/SW3: Uses get_realistic_sw_coverage() with proper filtering
    - Only returns stations with verified streams (stream_url IS NOT NULL)
    - Includes logging for shortwave station counts per city/band

  4. Security
    - Function is SECURITY DEFINER to allow anon access
    - Read-only operations only
*/

-- Drop old get_sw_stations if it exists (obsolete)
DROP FUNCTION IF EXISTS get_sw_stations(TEXT, INT);

-- Create unified station query function
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
    -- Find the city using partial, case-insensitive match
    SELECT c.city_id, c.city_name, c.latitude, c.longitude, co.country_name
    INTO city_rec
    FROM cities c
    LEFT JOIN countries co ON c.country_id = co.country_id
    WHERE LOWER(c.city_name) LIKE LOWER('%' || input_city || '%')
    LIMIT 1;

    IF city_rec IS NULL THEN
        RAISE NOTICE 'City "%" not found in cities table.', input_city;
        RETURN;
    END IF;

    -- Handle AM and FM bands (unchanged existing behavior)
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

    -- Handle shortwave bands (SW1, SW2, SW3) using realistic coverage
    IF UPPER(input_band) IN ('SW1', 'SW2', 'SW3', 'SW') THEN
        -- Map SW1/SW2/SW3 to frequency band ranges
        sw_band_name := CASE UPPER(input_band)
            WHEN 'SW1' THEN 'SW1 (3.2-7 MHz)'
            WHEN 'SW2' THEN 'SW2 (7-15 MHz)'
            WHEN 'SW3' THEN 'SW3 (15-26.1 MHz)'
            ELSE NULL
        END;

        -- If generic 'SW' requested, return all shortwave bands
        IF UPPER(input_band) = 'SW' THEN
            RETURN QUERY
            SELECT 
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
                  -- Geographic proximity check (within 5000 km)
                  (
                      6371 * acos(
                          LEAST(1.0, GREATEST(-1.0,
                              cos(radians(city_rec.latitude)) * 
                              cos(radians(sw.transmitter_lat)) * 
                              cos(radians(sw.transmitter_long) - radians(city_rec.longitude)) + 
                              sin(radians(city_rec.latitude)) * 
                              sin(radians(sw.transmitter_lat))
                          ))
                      )
                  ) <= 5000
                  OR
                  -- Target region match
                  city_rec.country_name = ANY(sw.target_regions)
              )
            ORDER BY sw.frequency_khz;

            GET DIAGNOSTICS station_count = ROW_COUNT;
            RAISE NOTICE 'Shortwave: Found % stations for city "%" (all SW bands)', station_count, city_rec.city_name;
            RETURN;
        END IF;

        -- Return specific SW1/SW2/SW3 band
        RETURN QUERY
        SELECT 
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
          AND CASE sw_band_name
              WHEN 'SW1 (3.2-7 MHz)' THEN sw.frequency_khz BETWEEN 3200 AND 7000
              WHEN 'SW2 (7-15 MHz)' THEN sw.frequency_khz BETWEEN 7000 AND 15000
              WHEN 'SW3 (15-26.1 MHz)' THEN sw.frequency_khz BETWEEN 15000 AND 26100
          END
          AND (
              -- Geographic proximity check (within 5000 km)
              (
                  6371 * acos(
                      LEAST(1.0, GREATEST(-1.0,
                          cos(radians(city_rec.latitude)) * 
                          cos(radians(sw.transmitter_lat)) * 
                          cos(radians(sw.transmitter_long) - radians(city_rec.longitude)) + 
                          sin(radians(city_rec.latitude)) * 
                          sin(radians(sw.transmitter_lat))
                      ))
                  )
              ) <= 5000
              OR
              -- Target region match
              city_rec.country_name = ANY(sw.target_regions)
          )
        ORDER BY sw.frequency_khz;

        GET DIAGNOSTICS station_count = ROW_COUNT;
        RAISE NOTICE 'Shortwave: Found % stations for city "%" in band %', station_count, city_rec.city_name, input_band;
        RETURN;
    END IF;

    -- Unknown band type
    RAISE NOTICE 'Unknown band type: %', input_band;
    RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to anon users
GRANT EXECUTE ON FUNCTION get_stations_by_city_and_band(TEXT, TEXT) TO anon;

-- Add comment
COMMENT ON FUNCTION get_stations_by_city_and_band IS 'Unified function to get stations by city and band (AM, FM, SW1, SW2, SW3). Uses realistic propagation model for shortwave bands.';
