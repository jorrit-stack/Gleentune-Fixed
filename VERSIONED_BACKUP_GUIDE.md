# Versioned Database Backup System

## Overview

This system allows you to create version-tagged database backups and restore to specific versions. Perfect for safely testing changes and being able to revert to any previous state.

---

## Quick Start

### Create a Backup

```bash
# Automatic version detection (uses git commit)
npm run backup

# Specify version manually
npm run backup -- --version v552

# Daily backup (auto-cleanup: keeps last 7 days)
npm run backup:daily

# Monthly backup (auto-cleanup: keeps last 12 months)
npm run backup:monthly

# Pre-change backup with description
npm run backup -- --version v553 --type pre-change --description "Before adding new feature"
```

### List All Backups

```bash
npm run restore:list
```

Output:
```
=== Available Backups ===

v553:
  2025-11-13  pre-change  45.23 MB  (compressed)
  2025-11-12  manual      44.89 MB  (compressed)

v552:
  2025-11-10  daily       44.12 MB  (compressed)
  2025-11-09  monthly     44.05 MB  (compressed)
```

### Restore a Backup

```bash
# Restore specific version
npm run restore -- --version v552

# Restore specific version and type
npm run restore -- --version v552 --type daily
```

This will:
1. Decompress the backup (if compressed)
2. Display restoration instructions
3. Show verification queries

---

## Version Detection

The system automatically detects versions in this order:

1. **Manual override**: `--version v552`
2. **package.json**: Uses `version` field (if not "0.0.0")
3. **Git commit**: Uses format `v<commit-count>-<short-hash>` (e.g., `v847-a3c2f1d`)
4. **Timestamp fallback**: Uses Unix timestamp as version

---

## Backup Types

### 1. Manual Backup (default)

```bash
npm run backup
npm run backup -- --version v552
```

- **Use case**: Before making significant changes
- **Retention**: Never auto-deleted (keep all versions)
- **Naming**: `radio_catalog_v552_manual_2025-11-13.sql.gz`

### 2. Daily Backup

```bash
npm run backup:daily
```

- **Use case**: Automated daily snapshots
- **Retention**: Keeps last 7 days
- **Naming**: `radio_catalog_v552_daily_2025-11-13.sql.gz`
- **Auto-cleanup**: Deletes backups older than 7 days

### 3. Monthly Backup

```bash
npm run backup:monthly
```

- **Use case**: Long-term snapshots
- **Retention**: Keeps last 12 months
- **Naming**: `radio_catalog_v552_monthly_2025-11-13.sql.gz`
- **Auto-cleanup**: Deletes backups older than 12 months

### 4. Pre-change Backup

```bash
npm run backup -- --type pre-change --description "Before schema migration"
```

- **Use case**: Before risky operations
- **Retention**: Never auto-deleted
- **Naming**: `radio_catalog_v552_pre-change_2025-11-13.sql.gz`

---

## Command Reference

### Backup Commands

```bash
# Basic backup (auto-version)
npm run backup

# Specify version
npm run backup -- --version v555

# Specify type
npm run backup -- --type pre-change

# Add description
npm run backup -- --description "Before major refactor"

# Don't compress (faster but larger)
npm run backup -- --no-compress

# Combine options
npm run backup -- --version v555 --type pre-change --description "Before DB migration"
```

### Restore Commands

```bash
# List all backups
npm run restore:list

# Restore specific version (latest type)
npm run restore -- --version v552

# Restore specific version and type
npm run restore -- --version v552 --type daily

# Short form
npm run restore -- -v v552 -t daily
```

---

## Backup Contents

Each backup includes:

### ✅ Included
- **All table schemas** (structure)
- **All table data** (181,000+ rows)
- **All indexes**
- **All constraints** (primary keys, foreign keys, unique, check)
- **Views** (stations_view)
- **Metadata** (row counts, timestamps)

### ❌ Not Included (By Design)
- **RLS policies** (recreated via migrations)
- **Functions & triggers** (Supabase auto-recreates)
- **Auth users** (separate Supabase auth system)
- **Storage files** (not in database)

---

## File Structure

```
backups/
├── radio_catalog_v552_manual_2025-11-13.sql.gz      # Compressed backup
├── radio_catalog_v552_manual_2025-11-13_report.json # Metadata
├── radio_catalog_v553_daily_2025-11-13.sql.gz
├── radio_catalog_v553_daily_2025-11-13_report.json
└── BACKUP_REPORT.md                                  # Historical docs
```

### Report File (JSON)

```json
{
  "version": "v552",
  "timestamp": "2025-11-13T10:30:00.000Z",
  "type": "manual",
  "tables": {
    "cities": 168038,
    "shortwave_stations": 7683,
    "stations": 1419,
    "radio_stations": 515
  },
  "totalRows": 181159,
  "totalTables": 11,
  "fileSize": 58631558,
  "compressed": true,
  "compressedSize": 8388608
}
```

---

## Restoration Process

### Step-by-Step

1. **List backups**
   ```bash
   npm run restore:list
   ```

2. **Choose version**
   ```bash
   npm run restore -- --version v552
   ```

3. **Follow instructions**
   - Option A: Supabase Dashboard (easiest)
   - Option B: psql command line

4. **Verify restoration**
   ```sql
   SELECT
     schemaname,
     tablename,
     n_live_tup as row_count
   FROM pg_stat_user_tables
   WHERE schemaname = 'public'
   ORDER BY n_live_tup DESC;
   ```

### Supabase Dashboard Method

1. Open Supabase Dashboard
2. Go to SQL Editor
3. Create new query
4. Copy contents of decompressed `.sql` file
5. Click "Run"
6. Wait for completion (2-5 minutes for full database)

### psql Command Line Method

```bash
# Get connection details from .env
psql -h db.lokoaovrcslqlazxedhx.supabase.co \
     -U postgres \
     -d postgres \
     -f backups/radio_catalog_v552_manual_2025-11-13.sql
```

---

## Automated Backup Schedule (Recommended)

### Development Environment

```bash
# Manual backups before changes only
npm run backup -- --version v555 --type pre-change
```

### Production Environment

Use cron jobs or GitHub Actions:

```bash
# Daily backup at 2 AM
0 2 * * * cd /path/to/project && npm run backup:daily

# Monthly backup on 1st of month at 2 AM
0 2 1 * * cd /path/to/project && npm run backup:monthly
```

Or GitHub Actions workflow (`.github/workflows/backup.yml`):

```yaml
name: Database Backup
on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM UTC
  workflow_dispatch:       # Manual trigger

jobs:
  backup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm run backup:daily
      - uses: actions/upload-artifact@v3
        with:
          name: database-backup
          path: backups/*.sql.gz
          retention-days: 7
```

---

## Storage Requirements

### Current Database Size

- **Uncompressed**: ~56 MB per backup
- **Compressed (gzip -9)**: ~8 MB per backup
- **Compression ratio**: 85.7% reduction

### Storage Estimates

**Development (version backups only):**
- ~10 versions × 8 MB = **80 MB**

**Production (with daily/monthly):**
- 7 daily backups: 7 × 8 MB = 56 MB
- 12 monthly backups: 12 × 8 MB = 96 MB
- 10 version backups: 10 × 8 MB = 80 MB
- **Total: ~232 MB**

---

## Use Cases & Examples

### Before Making Changes

```bash
# Tag with your current version
npm run backup -- --version v552 --type pre-change --description "Before adding payment system"

# Make your changes...
# If something breaks:
npm run restore -- --version v552
```

### Development Workflow

```bash
# Monday: v1.0.0
npm run backup -- --version v1.0.0

# Work on feature...

# Tuesday: v1.1.0
npm run backup -- --version v1.1.0

# Friday: Oh no, need to revert!
npm run restore:list
npm run restore -- --version v1.0.0
```

### Production Deployment

```bash
# Before deploy
npm run backup -- --version v2.5.0 --type pre-change --description "Before production deploy"

# Deploy...

# If deploy fails
npm run restore -- --version v2.5.0
```

---

## Troubleshooting

### "No backups found"

```bash
# Check if backups directory exists
ls -la backups/

# Create first backup
npm run backup -- --version v1
```

### "Backup failed: error exporting table"

- Check Supabase connection in `.env`
- Verify API keys are correct
- Check network connectivity

### "Compression failed"

- Ensure `gzip` is installed
- Use `--no-compress` flag to skip compression
- Check disk space

### "Version not found when restoring"

```bash
# List all available versions
npm run restore:list

# Use exact version string from list
npm run restore -- --version v847-a3c2f1d
```

---

## Security Considerations

### Backup Files Contain

- ✅ **Public data**: Station names, frequencies, locations
- ⚠️ **User activity**: Listening history (if users exist)
- ⚠️ **No passwords**: Auth handled separately by Supabase

### Recommendations

**For Production:**
1. **Encrypt backups**: Use GPG or AES-256
2. **Off-site storage**: Upload to AWS S3, Google Cloud Storage
3. **Access control**: Limit who can create/restore backups
4. **Audit logging**: Track all backup operations

**Sample Encryption:**
```bash
# Encrypt
gpg --symmetric --cipher-algo AES256 radio_catalog_v552.sql.gz

# Decrypt
gpg --decrypt radio_catalog_v552.sql.gz.gpg > radio_catalog_v552.sql.gz
```

---

## FAQ

**Q: Can I restore to a different Supabase project?**
A: Yes! Backups are portable. Just run the SQL in any Supabase project.

**Q: Will restoring delete my current data?**
A: Yes. Restoration replaces all data. Always backup current state first.

**Q: Can I restore just one table?**
A: Yes. Open the `.sql` file and copy only the INSERT statements for that table.

**Q: How long does backup take?**
A: ~20-30 seconds for current database size (181k rows).

**Q: How long does restore take?**
A: ~2-5 minutes via Supabase Dashboard, ~1-2 minutes via psql.

**Q: Can I automate backups?**
A: Yes! Use cron jobs, GitHub Actions, or cloud schedulers.

**Q: What if I lose all backups?**
A: Supabase has its own backup system. Contact their support for emergency recovery.

---

## Summary

### Create Backup
```bash
npm run backup -- --version v552
```

### List Backups
```bash
npm run restore:list
```

### Restore Backup
```bash
npm run restore -- --version v552
```

### Daily Cleanup
Automatic! Daily backups keep last 7 days, monthly keep last 12 months.

---

**That's it!** You can now safely experiment with changes and revert to any version at any time. 🎉
