# Radio Sync Monitoring Checklist

## ⏰ Next Scheduled Run
**Monday, 3:00 AM UTC**

## ✅ Quick Health Check

Run this in Supabase SQL Editor:

```sql
-- Overall sync health
SELECT
  'Total Stations' as metric,
  COUNT(*) as value
FROM radio_stations

UNION ALL

SELECT
  'Radio Browser Synced' as metric,
  COUNT(*) as value
FROM radio_stations
WHERE source = 'radio_browser'

UNION ALL

SELECT
  'Active Stations' as metric,
  COUNT(*) as value
FROM radio_stations
WHERE is_active = true

UNION ALL

SELECT
  'Last Sync Time' as metric,
  MAX(lastchecktime)::text as value
FROM radio_stations
WHERE source = 'radio_browser';
```

## 📊 Expected Results After First Run

- India: ~1,000+ stations
- US: ~10,000+ stations
- UK: ~1,000+ stations
- Canada: ~500+ stations
- Germany: ~5,000+ stations

**Total Expected**: ~17,000+ stations synced

## 🔍 Check Last Cron Execution

```sql
SELECT
  status,
  return_message,
  start_time,
  end_time,
  end_time - start_time as duration
FROM cron.job_run_details
WHERE jobid = 1
ORDER BY start_time DESC
LIMIT 1;
```

## 🚨 Troubleshooting

### If No Stations Are Syncing
1. Check Edge Function logs in Supabase Dashboard
2. Verify pg_cron job is active:
   ```sql
   SELECT active FROM cron.job WHERE jobname = 'weekly-radio-refresh';
   ```
3. Manually trigger the function to see error details:
   ```bash
   npx tsx scripts/test-radio-refresh.ts
   ```

### If Some Regions Fail
- Check Radio Browser API status: https://api.radio-browser.info/
- Review Edge Function logs for specific error messages
- Some regions may have temporary API issues

## 📈 Success Metrics

- ✅ Cron job runs successfully every Monday
- ✅ 15,000+ stations synced from Radio Browser
- ✅ Active status updated based on stream health
- ✅ Vote and click counts refreshed weekly
- ✅ No duplicate stations created

## 📝 What to Monitor

1. **Monday 3 AM UTC**: Check if cron job executed
2. **Weekly**: Review station count growth
3. **Monthly**: Verify data quality and accuracy
4. **As Needed**: Add more regions or adjust schedule
