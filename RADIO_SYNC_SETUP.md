# Radio Weekly Refresh - Setup Complete ✅

## What Was Implemented

### 1. Database Migration
- Added metadata fields to `radio_stations`, `stations`, and `shortwave_stations` tables
- New fields: `url_resolved`, `hls`, `is_active`, `votes`, `clickcount`, `clicktrend`, `iso_3166_2`, `lastchecktime`, `lastcheckoktime`, `last_check_error`, `source`
- Created performance indexes on `radio_stations` table
- Migration file: `supabase/migrations/add_radio_browser_metadata_fields.sql`

### 2. Edge Function
- Name: `radio-weekly-refresh`
- Syncs stations from Radio Browser API for: India, US, UK, Canada, Germany
- Updates existing stations and inserts new ones
- Tracks votes, click counts, and stream health status
- Location: `supabase/functions/radio-weekly-refresh/index.ts`

### 3. Automated Scheduling
- **Schedule**: Every Monday at 3:00 AM UTC
- **Method**: PostgreSQL pg_cron extension
- **Job Name**: `weekly-radio-refresh`
- **Status**: Active ✅

## Verification

### Current Status
- ✅ Migration applied successfully
- ✅ Edge Function deployed
- ✅ pg_cron job created and active
- ✅ **38 stations** already synced from Radio Browser

### Sample Synced Stations
```
AIR Tuticorin (India) - 170 votes, 145 clicks
4 lobos bollywood radio (India) - 107 votes, 834 clicks
80s-tamil-hits (India) - 333 votes, 349 clicks
986malayalamradio (India) - 229 votes, 467 clicks
AIR FM Rainbow Kochi (India) - 157 votes, 224 clicks
```

## Monitoring

### Check Cron Job Status
```sql
SELECT jobid, schedule, command, jobname, active, nodename
FROM cron.job
WHERE jobname = 'weekly-radio-refresh';
```

### Check Last Run
```sql
SELECT jobid, runid, job_pid, database, username, command, status, return_message, start_time, end_time
FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'weekly-radio-refresh')
ORDER BY start_time DESC
LIMIT 5;
```

### Check Synced Stations Count
```sql
SELECT
  source,
  COUNT(*) as count,
  COUNT(CASE WHEN is_active THEN 1 END) as active_count
FROM radio_stations
GROUP BY source
ORDER BY count DESC;
```

### View Recent Radio Browser Updates
```sql
SELECT
  name,
  country,
  is_active,
  votes,
  clickcount,
  lastchecktime
FROM radio_stations
WHERE source = 'radio_browser'
ORDER BY lastchecktime DESC
LIMIT 10;
```

## Manual Testing

### Invoke Function Manually
```bash
npm run dev
npx tsx scripts/test-radio-refresh.ts
```

Or via curl:
```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  https://lokoaovrcslqlazxedhx.supabase.co/functions/v1/radio-weekly-refresh
```

### Check Function Logs
Go to Supabase Dashboard → Edge Functions → radio-weekly-refresh → Logs

## Managing the Schedule

### Pause the Job
```sql
UPDATE cron.job
SET active = false
WHERE jobname = 'weekly-radio-refresh';
```

### Resume the Job
```sql
UPDATE cron.job
SET active = true
WHERE jobname = 'weekly-radio-refresh';
```

### Change Schedule
```sql
UPDATE cron.job
SET schedule = '0 2 * * 0'  -- Sunday 2 AM UTC
WHERE jobname = 'weekly-radio-refresh';
```

### Delete the Job
```sql
SELECT cron.unschedule('weekly-radio-refresh');
```

## Next Steps

1. **Monitor First Automated Run**: Check on Monday after 3 AM UTC
2. **Review Logs**: Look for any errors or issues in Edge Function logs
3. **Extend to Other Tables**: After confirming stability, extend sync to `stations` and `shortwave_stations` tables if needed
4. **Add More Regions**: Modify `REFRESH_REGIONS` array in the Edge Function to include more countries

## Regions Currently Syncing
- 🇮🇳 India
- 🇺🇸 United States
- 🇬🇧 United Kingdom
- 🇨🇦 Canada
- 🇩🇪 Germany

## Performance Notes
- Function processes thousands of stations per region
- Expected runtime: 2-5 minutes per region
- Uses upsert logic (update if exists, insert if new)
- Safe to run multiple times (idempotent)
