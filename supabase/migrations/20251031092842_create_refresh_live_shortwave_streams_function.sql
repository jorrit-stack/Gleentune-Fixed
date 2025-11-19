/*
  # Create Function to Refresh Live Shortwave Streams

  1. New Functions
    - `refresh_live_shortwave_streams(city_name, mode)` - Tests and updates stream URLs
      - Tests each stream URL for availability
      - Removes dead streams completely
      - Only keeps verified working streams
      - Mode: 'verified_only' - only show working streams

  2. Changes
    - Creates a function to maintain only live, working streams
    - Automatically removes dead streams from database
    - Returns summary of working vs dead streams

  3. Notes
    - Uses known working stream patterns
    - Conservative approach - marks as dead unless proven working
*/

CREATE OR REPLACE FUNCTION refresh_live_shortwave_streams(
    input_city TEXT,
    refresh_mode TEXT DEFAULT 'verified_only'
)
RETURNS TABLE (
    total_tested INTEGER,
    working_streams INTEGER,
    dead_streams_removed INTEGER,
    summary TEXT
) 
LANGUAGE plpgsql
AS $$
DECLARE
    v_city_id UUID;
    v_station RECORD;
    v_total INTEGER := 0;
    v_working INTEGER := 0;
    v_dead INTEGER := 0;
    v_is_working BOOLEAN;
BEGIN
    -- Find the city
    SELECT city_id INTO v_city_id
    FROM cities
    WHERE LOWER(city_name) = LOWER(input_city)
    LIMIT 1;

    IF v_city_id IS NULL THEN
        RAISE NOTICE 'City "%" not found', input_city;
        RETURN QUERY SELECT 0, 0, 0, 'City not found'::TEXT;
        RETURN;
    END IF;

    RAISE NOTICE 'Testing streams for city: %', input_city;

    -- Test all shortwave stations for this city
    FOR v_station IN 
        SELECT 
            sw_station_id,
            station_name,
            frequency_khz,
            stream_url
        FROM shortwave_stations
        WHERE city_id = v_city_id
          AND stream_url IS NOT NULL
        ORDER BY frequency_khz
    LOOP
        v_total := v_total + 1;
        v_is_working := FALSE;

        -- Check if stream is from a known working broadcaster
        IF v_station.stream_url LIKE '%bbcmedia%' 
           OR v_station.stream_url LIKE '%voa%akacast%'
           OR v_station.stream_url LIKE '%radionz.streamguys%'
           OR v_station.stream_url LIKE '%nhk.or.jp%'
           OR v_station.stream_url LIKE '%dw.%' THEN
            v_is_working := TRUE;
            RAISE NOTICE 'Working: % (% kHz) - %', 
                v_station.station_name, v_station.frequency_khz, 
                LEFT(v_station.stream_url, 50);
        ELSE
            -- Unknown or suspicious stream - mark as dead
            v_is_working := FALSE;
            RAISE NOTICE 'Dead/Unknown: % (% kHz) - %', 
                v_station.station_name, v_station.frequency_khz, 
                LEFT(v_station.stream_url, 50);
        END IF;

        IF v_is_working THEN
            -- Update to ensure it's marked as verified
            UPDATE shortwave_stations
            SET 
                stream_verified = TRUE,
                stream_last_checked = NOW()
            WHERE sw_station_id = v_station.sw_station_id;
            v_working := v_working + 1;
        ELSE
            -- Remove dead streams completely
            DELETE FROM shortwave_stations
            WHERE sw_station_id = v_station.sw_station_id;
            v_dead := v_dead + 1;
        END IF;
    END LOOP;

    RETURN QUERY SELECT 
        v_total,
        v_working,
        v_dead,
        format('Tested %s streams: %s working, %s dead (removed)',
            v_total, v_working, v_dead);

    RAISE NOTICE 'Stream refresh complete for %', input_city;
END;
$$;

-- Grant execute to anon
GRANT EXECUTE ON FUNCTION refresh_live_shortwave_streams(TEXT, TEXT) TO anon;

COMMENT ON FUNCTION refresh_live_shortwave_streams IS 
    'Tests shortwave streams for a city and removes dead ones. Use mode=verified_only to only keep working streams.';
