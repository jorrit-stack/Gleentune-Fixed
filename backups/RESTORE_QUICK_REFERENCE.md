# Quick Restoration Reference

## Fast Restoration Commands

### Decompress Backup
```bash
gunzip radio_catalog_full_2025-10-30.sql.gz
```

### Verify Integrity
```bash
sha256sum radio_catalog_full_2025-10-30.sql
# Expected: 3f4131bcd802296ff37df90d24d73ef8cd726e512b3da4c0540dfb700d4570ad
```

### Restore to Supabase

**Option 1: Supabase Dashboard (Easiest)**
1. Open Supabase Dashboard → SQL Editor
2. Create new query
3. Copy/paste contents of `.sql` file
4. Run query

**Option 2: Local PostgreSQL**
```bash
psql -h db.lokoaovrcslqlazxedhx.supabase.co \
     -U postgres \
     -d postgres \
     -f radio_catalog_full_2025-10-30.sql
```

### Verify Restoration
```sql
-- Check row counts
SELECT 'stations' as table, COUNT(*) FROM stations
UNION ALL SELECT 'shortwave_stations', COUNT(*) FROM shortwave_stations
UNION ALL SELECT 'cities', COUNT(*) FROM cities;

-- Check unified view
SELECT COUNT(*) FROM stations_view;
-- Expected: 9,617
```

## File Information

**File:** `radio_catalog_full_2025-10-30.sql.gz`
**Size:** 8.0 MB (compressed) / 55.91 MB (uncompressed)
**Date:** October 30, 2025
**Rows:** 181,159
**Tables:** 11

**SHA-256:** `3f4131bcd802296ff37df90d24d73ef8cd726e512b3da4c0540dfb700d4570ad`
**MD5:** `70a08cadc7744a48776b762bf806292b`

## Emergency Contact

**Documentation:** See `BACKUP_REPORT.md` for complete details
**Migrations:** All 15 migrations in `supabase/migrations/`
**Coverage Report:** `GLOBAL_COVERAGE_SUMMARY.md`
