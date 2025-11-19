/*
  # Add Radio Browser Metadata Fields

  1. New Columns Added
    - `url_resolved` (text) - Resolved stream URL after redirects
    - `hls` (boolean) - Whether stream uses HLS protocol
    - `is_active` (boolean) - Current operational status
    - `votes` (integer) - Community vote count
    - `clickcount` (integer) - Total click/play count
    - `clicktrend` (integer) - Recent popularity trend
    - `iso_3166_2` (varchar) - ISO subdivision code
    - `lastchecktime` (timestamptz) - Last health check timestamp
    - `lastcheckoktime` (timestamptz) - Last successful check timestamp
    - `last_check_error` (text) - Error message from last check
    - `source` (text) - Data source (manual, radio_browser, auto, eibi, Virtual Relay)

  2. Tables Modified
    - `radio_stations` - Primary table for AM/FM stations
    - `stations` - If exists, general stations table
    - `shortwave_stations` - If exists, shortwave stations (includes eibi and Virtual Relay sources)

  3. Performance
    - Indexes added for active status, country, source, and check time
    - Enables efficient filtering and sync operations

  4. Safety
    - Uses IF NOT EXISTS to prevent duplicate column errors
    - Checks for table existence before applying changes
    - All columns have sensible defaults
    - Source constraint includes existing values from shortwave data
*/

-- Apply to radio_stations
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'radio_stations') THEN
        ALTER TABLE public.radio_stations
        ADD COLUMN IF NOT EXISTS url_resolved TEXT,
        ADD COLUMN IF NOT EXISTS hls BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
        ADD COLUMN IF NOT EXISTS votes INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS clickcount INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS clicktrend INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS iso_3166_2 VARCHAR(10),
        ADD COLUMN IF NOT EXISTS lastchecktime TIMESTAMP WITH TIME ZONE,
        ADD COLUMN IF NOT EXISTS lastcheckoktime TIMESTAMP WITH TIME ZONE,
        ADD COLUMN IF NOT EXISTS last_check_error TEXT,
        ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';
        
        -- Add constraint only if column was just created
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.constraint_column_usage 
            WHERE table_name = 'radio_stations' AND column_name = 'source' AND constraint_name LIKE '%source_check%'
        ) THEN
            ALTER TABLE public.radio_stations 
            ADD CONSTRAINT radio_stations_source_check 
            CHECK (source IN ('manual', 'radio_browser', 'auto', 'eibi', 'Virtual Relay'));
        END IF;
    END IF;
END $$;

-- Apply to stations (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'stations') THEN
        ALTER TABLE public.stations
        ADD COLUMN IF NOT EXISTS url_resolved TEXT,
        ADD COLUMN IF NOT EXISTS hls BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
        ADD COLUMN IF NOT EXISTS votes INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS clickcount INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS clicktrend INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS iso_3166_2 VARCHAR(10),
        ADD COLUMN IF NOT EXISTS lastchecktime TIMESTAMP WITH TIME ZONE,
        ADD COLUMN IF NOT EXISTS lastcheckoktime TIMESTAMP WITH TIME ZONE,
        ADD COLUMN IF NOT EXISTS last_check_error TEXT,
        ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';
        
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.constraint_column_usage 
            WHERE table_name = 'stations' AND column_name = 'source' AND constraint_name LIKE '%source_check%'
        ) THEN
            ALTER TABLE public.stations 
            ADD CONSTRAINT stations_source_check 
            CHECK (source IN ('manual', 'radio_browser', 'auto', 'eibi', 'Virtual Relay'));
        END IF;
    END IF;
END $$;

-- Apply to shortwave_stations (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'shortwave_stations') THEN
        ALTER TABLE public.shortwave_stations
        ADD COLUMN IF NOT EXISTS url_resolved TEXT,
        ADD COLUMN IF NOT EXISTS hls BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
        ADD COLUMN IF NOT EXISTS votes INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS clickcount INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS clicktrend INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS iso_3166_2 VARCHAR(10),
        ADD COLUMN IF NOT EXISTS lastchecktime TIMESTAMP WITH TIME ZONE,
        ADD COLUMN IF NOT EXISTS lastcheckoktime TIMESTAMP WITH TIME ZONE,
        ADD COLUMN IF NOT EXISTS last_check_error TEXT,
        ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';
        
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.constraint_column_usage 
            WHERE table_name = 'shortwave_stations' AND column_name = 'source' AND constraint_name LIKE '%source_check%'
        ) THEN
            ALTER TABLE public.shortwave_stations 
            ADD CONSTRAINT shortwave_stations_source_check 
            CHECK (source IN ('manual', 'radio_browser', 'auto', 'eibi', 'Virtual Relay'));
        END IF;
    END IF;
END $$;

-- Create indexes for performance (only on radio_stations for now)
CREATE INDEX IF NOT EXISTS idx_radio_is_active ON public.radio_stations (is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_radio_country ON public.radio_stations (country);
CREATE INDEX IF NOT EXISTS idx_radio_source ON public.radio_stations (source);
CREATE INDEX IF NOT EXISTS idx_radio_lastchecktime ON public.radio_stations (lastchecktime) WHERE lastchecktime IS NOT NULL;