/*
  # Fix Shortwave Stream Validation Function

  1. Changes
    - Use correct column name `sw_station_id` instead of `id`
    - Compute band from frequency_khz
    - Update function to work with actual schema
*/

CREATE OR REPLACE FUNCTION validate_shortwave_streams()
RETURNS TABLE (
  total_checked INTEGER,
  valid_count INTEGER,
  invalid_count INTEGER,
  valid_percentage NUMERIC,
  summary TEXT
) 
LANGUAGE plpgsql
AS $$
DECLARE
  v_station RECORD;
  v_total INTEGER := 0;
  v_valid INTEGER := 0;
  v_invalid INTEGER := 0;
  v_is_valid BOOLEAN;
  v_band TEXT;
BEGIN
  RAISE NOTICE 'Starting shortwave stream validation...';

  FOR v_station IN 
    SELECT 
      sw_station_id, 
      station_name, 
      frequency_khz, 
      stream_url,
      CASE 
        WHEN frequency_khz BETWEEN 5900 AND 6200 THEN 'SW1'
        WHEN frequency_khz BETWEEN 9500 AND 9900 THEN 'SW2'
        WHEN frequency_khz BETWEEN 15100 AND 15600 THEN 'SW3'
        ELSE 'OTHER'
      END as band
    FROM shortwave_stations
    WHERE stream_url IS NOT NULL
      AND stream_url != ''
      AND frequency_khz IN (
        SELECT frequency_khz FROM shortwave_stations
        WHERE (frequency_khz BETWEEN 5900 AND 6200)
           OR (frequency_khz BETWEEN 9500 AND 9900)
           OR (frequency_khz BETWEEN 15100 AND 15600)
      )
    ORDER BY frequency_khz
  LOOP
    v_total := v_total + 1;
    v_is_valid := FALSE;
    v_band := v_station.band;

    BEGIN
      IF v_station.stream_url LIKE '%rri.broadcastradio.com%' THEN
        v_is_valid := FALSE;
        RAISE NOTICE 'Dead domain: % (%, % kHz)', 
          v_station.station_name, v_band, v_station.frequency_khz;
      
      ELSIF v_station.stream_url LIKE '%bbcmedia%' 
         OR v_station.stream_url LIKE '%voa%akacast%'
         OR v_station.stream_url LIKE '%dw.com%'
         OR v_station.stream_url LIKE '%rti.org.tw%'
         OR v_station.stream_url LIKE '%nhk.or.jp%'
         OR v_station.stream_url LIKE '%radionz%' THEN
        v_is_valid := TRUE;
        RAISE NOTICE 'Potentially valid: % (%, % kHz)', 
          v_station.station_name, v_band, v_station.frequency_khz;
      
      ELSE
        v_is_valid := FALSE;
        RAISE NOTICE 'Unknown pattern: % (%, % kHz)', 
          v_station.station_name, v_band, v_station.frequency_khz;
      END IF;

      IF v_is_valid THEN
        UPDATE shortwave_stations
        SET 
          stream_verified = TRUE,
          stream_last_checked = NOW()
        WHERE sw_station_id = v_station.sw_station_id;
        v_valid := v_valid + 1;
      ELSE
        UPDATE shortwave_stations
        SET 
          stream_verified = FALSE,
          stream_url = NULL,
          stream_last_checked = NOW()
        WHERE sw_station_id = v_station.sw_station_id;
        v_invalid := v_invalid + 1;
      END IF;

    EXCEPTION WHEN OTHERS THEN
      UPDATE shortwave_stations
      SET 
        stream_verified = FALSE,
        stream_url = NULL,
        stream_last_checked = NOW()
      WHERE sw_station_id = v_station.sw_station_id;
      v_invalid := v_invalid + 1;
      RAISE NOTICE 'Error validating %: %', v_station.station_name, SQLERRM;
    END;

    IF v_total % 100 = 0 THEN
      RAISE NOTICE 'Processed % stations...', v_total;
    END IF;
  END LOOP;

  RETURN QUERY SELECT 
    v_total,
    v_valid,
    v_invalid,
    CASE WHEN v_total > 0 
      THEN ROUND((v_valid::NUMERIC / v_total::NUMERIC) * 100, 2)
      ELSE 0 
    END,
    format('Validated %s shortwave stations: %s valid (%.1f%%), %s invalid',
      v_total,
      v_valid,
      CASE WHEN v_total > 0 
        THEN (v_valid::NUMERIC / v_total::NUMERIC) * 100
        ELSE 0 
      END,
      v_invalid
    );

  RAISE NOTICE 'Validation complete!';
END;
$$;
