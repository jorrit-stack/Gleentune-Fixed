/*
  # Fix Frequency Field Overflow

  1. Changes
    - Alter `frequency` column in `radio_stations` to support larger values
    - Change from numeric(6,2) to numeric(8,2) to support shortwave frequencies up to 999999.99
    - This allows AM (530-1700), FM (88-108), and SW (5900-15600) frequencies

  2. Notes
    - No data loss - existing data is preserved
    - Backward compatible change
*/

-- Alter the frequency column to support larger values
DO $$
BEGIN
  ALTER TABLE radio_stations 
  ALTER COLUMN frequency TYPE numeric(8,2);
END $$;
