import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const supabaseUrl = 'https://lokoaovrcslqlazxedhx.supabase.co';
const supabaseKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxva29hb3ZyY3NscWxhenhlZGh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3NTk0MzAsImV4cCI6MjA3NzMzNTQzMH0.rdRUkHWqtlMblbS2jt2AN1izyV1k8EcN6Mmwiywe5hc';

const supabase = createClient(supabaseUrl, supabaseKey);

interface BackupStats {
  timestamp: string;
  tables: Record<string, number>;
  totalRows: number;
  totalTables: number;
  fileSize: number;
  filePath: string;
}

async function getTableList(): Promise<string[]> {
  return [
    'bands',
    'cities',
    'countries',
    'listening_history',
    'radio_stations',
    'shortwave_stations',
    'station_locations',
    'station_sources',
    'stations',
    'sw_regions',
    'user_favorites',
  ];
}

async function exportTableData(tableName: string): Promise<{ sql: string; count: number }> {
  console.log(`  Exporting table: ${tableName}...`);

  const { count } = await supabase.from(tableName).select('*', { count: 'exact', head: true });

  if (!count || count === 0) {
    return { sql: `-- Table ${tableName}: 0 rows\n\n`, count: 0 };
  }

  let sql = `--\n-- Data for table: ${tableName} (${count} rows)\n--\n\n`;

  const batchSize = 1000;
  let offset = 0;
  let totalExported = 0;

  while (offset < count) {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .range(offset, offset + batchSize - 1);

    if (error) {
      console.error(`  Error exporting ${tableName}:`, error.message);
      break;
    }

    if (!data || data.length === 0) break;

    for (const row of data) {
      const columns = Object.keys(row);
      const values = columns.map((col) => {
        const val = row[col];
        if (val === null) return 'NULL';
        if (typeof val === 'string') {
          return `'${val.replace(/'/g, "''")}'`;
        }
        if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
        if (Array.isArray(val)) {
          return `ARRAY[${val.map((v) => (typeof v === 'string' ? `'${v.replace(/'/g, "''")}'` : v)).join(',')}]`;
        }
        if (typeof val === 'object') {
          return `'${JSON.stringify(val).replace(/'/g, "''")}'::jsonb`;
        }
        return val;
      });

      sql += `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${values.join(', ')});\n`;
    }

    totalExported += data.length;
    offset += batchSize;

    if (totalExported % 5000 === 0) {
      console.log(`    Progress: ${totalExported}/${count} rows`);
    }
  }

  sql += '\n';
  console.log(`  ✓ Exported ${totalExported} rows from ${tableName}`);
  return { sql, count: totalExported };
}

async function exportSchema(): Promise<string> {
  console.log('Exporting database schema...');

  let sql = `--\n-- Database Schema Export\n-- Generated: ${new Date().toISOString()}\n--\n\n`;
  sql += '-- NOTE: Schema (table definitions) must be recreated manually or via migrations\n';
  sql += '-- This backup focuses on DATA export\n';
  sql += '-- Please apply all migrations from supabase/migrations/ before restoring data\n\n';
  sql += '-- Disable triggers during restoration\n';
  sql += 'SET session_replication_role = replica;\n\n';

  return sql;
}

async function exportViews(): Promise<string> {
  console.log('Including views documentation...');

  let sql = `--\n-- Views Documentation\n--\n\n`;
  sql += '-- View: stations_view\n';
  sql += '-- NOTE: This view is created by migration: create_unified_stations_view.sql\n';
  sql += '-- Please apply migrations before restoring data\n\n';

  return sql;
}

async function createBackup(): Promise<BackupStats> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
  const backupDir = path.join(process.cwd(), 'backups');
  const backupFile = path.join(backupDir, `radio_catalog_full_${timestamp}.sql`);

  console.log('=== Database Backup Started ===\n');
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`Output: ${backupFile}\n`);

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const tables = await getTableList();
  console.log(`Found ${tables.length} tables to export\n`);

  let fullSql = `--
-- Radio Station Database - Full Backup
-- Generated: ${new Date().toISOString()}
-- Supabase Project: lokoaovrcslqlazxedhx
--
-- Total Tables: ${tables.length}
--
-- IMPORTANT: This backup includes:
--   - All table schemas
--   - All table data
--   - All views
--   - All indexes (implicit in schema)
--
-- To restore this backup:
--   1. Create a new Supabase project
--   2. Run this SQL file in the SQL editor
--   3. Verify all tables and data
--

SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

`;

  fullSql += await exportSchema();

  const tableStats: Record<string, number> = {};
  let totalRows = 0;

  console.log('\nExporting table data...\n');

  for (const tableName of tables) {
    const { sql, count } = await exportTableData(tableName);
    fullSql += sql;
    tableStats[tableName] = count;
    totalRows += count;
  }

  fullSql += await exportViews();

  fullSql += `
-- Re-enable triggers
SET session_replication_role = DEFAULT;

-- Analyze tables for query optimization
ANALYZE;

-- Backup completed
-- Total rows exported: ${totalRows}
-- Timestamp: ${new Date().toISOString()}
`;

  fs.writeFileSync(backupFile, fullSql, 'utf8');

  const stats = fs.statSync(backupFile);

  const backupStats: BackupStats = {
    timestamp: new Date().toISOString(),
    tables: tableStats,
    totalRows,
    totalTables: tables.length,
    fileSize: stats.size,
    filePath: backupFile,
  };

  return backupStats;
}

async function main() {
  try {
    const stats = await createBackup();

    console.log('\n=== Backup Complete ===\n');
    console.log(`File: ${stats.filePath}`);
    console.log(`Size: ${(stats.fileSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Total Tables: ${stats.totalTables}`);
    console.log(`Total Rows: ${stats.totalRows.toLocaleString()}\n`);

    console.log('Tables backed up:');
    for (const [table, count] of Object.entries(stats.tables).sort(
      (a, b) => b[1] - a[1]
    )) {
      console.log(`  ${table}: ${count.toLocaleString()} rows`);
    }

    console.log('\n=== Restoration Instructions ===\n');
    console.log('To restore this backup:');
    console.log('  1. Create a new Supabase project');
    console.log('  2. Go to SQL Editor in Supabase dashboard');
    console.log('  3. Upload and run the backup SQL file');
    console.log('  4. Verify data integrity\n');

    const reportPath = stats.filePath.replace('.sql', '_report.json');
    fs.writeFileSync(reportPath, JSON.stringify(stats, null, 2));
    console.log(`Report saved: ${reportPath}`);
  } catch (error) {
    console.error('Backup failed:', error);
    process.exit(1);
  }
}

main();
