import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const supabaseUrl = 'https://lokoaovrcslqlazxedhx.supabase.co';
const supabaseKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxva29hb3ZyY3NscWxhenhlZGh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3NTk0MzAsImV4cCI6MjA3NzMzNTQzMH0.rdRUkHWqtlMblbS2jt2AN1izyV1k8EcN6Mmwiywe5hc';

const supabase = createClient(supabaseUrl, supabaseKey);

interface BackupStats {
  version: string;
  timestamp: string;
  type: 'manual' | 'daily' | 'monthly' | 'pre-change';
  tables: Record<string, number>;
  totalRows: number;
  totalTables: number;
  fileSize: number;
  filePath: string;
  compressed: boolean;
  compressedSize?: number;
}

interface BackupOptions {
  version?: string;
  type?: 'manual' | 'daily' | 'monthly' | 'pre-change';
  compress?: boolean;
  description?: string;
}

function getVersion(): string {
  const packageJsonPath = path.join(process.cwd(), 'package.json');

  if (fs.existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    if (packageJson.version && packageJson.version !== '0.0.0') {
      return `v${packageJson.version}`;
    }
  }

  const gitVersion = getGitVersion();
  if (gitVersion) {
    return gitVersion;
  }

  return `v${Date.now()}`;
}

function getGitVersion(): string | null {
  try {
    const commitHash = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
    const commitCount = execSync('git rev-list --count HEAD', { encoding: 'utf8' }).trim();
    return `v${commitCount}-${commitHash}`;
  } catch {
    return null;
  }
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
  return { sql, count: totalExported };
}

async function createVersionedBackup(options: BackupOptions = {}): Promise<BackupStats> {
  const version = options.version || getVersion();
  const type = options.type || 'manual';
  const compress = options.compress !== false;

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
  const backupDir = path.join(process.cwd(), 'backups');
  const filename = `radio_catalog_${version}_${type}_${timestamp}.sql`;
  const backupFile = path.join(backupDir, filename);

  console.log('=== Versioned Database Backup ===\n');
  console.log(`Version: ${version}`);
  console.log(`Type: ${type}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`Output: ${backupFile}\n`);

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const tables = await getTableList();
  console.log(`Found ${tables.length} tables to export\n`);

  let fullSql = `--
-- Radio Station Database - Versioned Backup
-- Version: ${version}
-- Type: ${type}
-- Generated: ${new Date().toISOString()}
${options.description ? `-- Description: ${options.description}\n` : ''}--
-- Total Tables: ${tables.length}
--
-- To restore this backup:
--   npm run restore -- --version ${version}
--

SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;
SET session_replication_role = replica;

`;

  const tableStats: Record<string, number> = {};
  let totalRows = 0;

  console.log('Exporting table data...\n');

  for (const tableName of tables) {
    process.stdout.write(`  ${tableName}...`);
    const { sql, count } = await exportTableData(tableName);
    fullSql += sql;
    tableStats[tableName] = count;
    totalRows += count;
    console.log(` ✓ ${count.toLocaleString()} rows`);
  }

  fullSql += `
-- Re-enable triggers
SET session_replication_role = DEFAULT;

-- Analyze tables for query optimization
ANALYZE;

-- Backup completed
-- Version: ${version}
-- Type: ${type}
-- Total rows exported: ${totalRows}
-- Timestamp: ${new Date().toISOString()}
`;

  fs.writeFileSync(backupFile, fullSql, 'utf8');

  const stats = fs.statSync(backupFile);
  let compressedSize: number | undefined;

  if (compress) {
    console.log('\nCompressing backup...');
    try {
      execSync(`gzip -9 "${backupFile}"`, { stdio: 'inherit' });
      const compressedFile = `${backupFile}.gz`;
      const compressedStats = fs.statSync(compressedFile);
      compressedSize = compressedStats.size;
      console.log(`✓ Compressed: ${(compressedSize / 1024 / 1024).toFixed(2)} MB`);
    } catch (error) {
      console.warn('Warning: Compression failed, keeping uncompressed backup');
    }
  }

  const backupStats: BackupStats = {
    version,
    timestamp: new Date().toISOString(),
    type,
    tables: tableStats,
    totalRows,
    totalTables: tables.length,
    fileSize: stats.size,
    filePath: compress && fs.existsSync(`${backupFile}.gz`) ? `${backupFile}.gz` : backupFile,
    compressed: compress && fs.existsSync(`${backupFile}.gz`),
    compressedSize,
  };

  return backupStats;
}

function cleanupOldBackups() {
  const backupDir = path.join(process.cwd(), 'backups');
  if (!fs.existsSync(backupDir)) return;

  const files = fs.readdirSync(backupDir);
  const backups = files.filter(f => f.startsWith('radio_catalog_') && (f.endsWith('.sql') || f.endsWith('.sql.gz')));

  const dailyBackups = backups.filter(f => f.includes('_daily_')).sort().reverse();
  const monthlyBackups = backups.filter(f => f.includes('_monthly_')).sort().reverse();

  const KEEP_DAILY = 7;
  const KEEP_MONTHLY = 12;

  const dailyToDelete = dailyBackups.slice(KEEP_DAILY);
  const monthlyToDelete = monthlyBackups.slice(KEEP_MONTHLY);

  const toDelete = [...dailyToDelete, ...monthlyToDelete];

  if (toDelete.length > 0) {
    console.log('\nCleaning up old backups...');
    for (const file of toDelete) {
      const filePath = path.join(backupDir, file);
      fs.unlinkSync(filePath);
      console.log(`  Deleted: ${file}`);

      const reportFile = filePath.replace(/\.sql(\.gz)?$/, '_report.json');
      if (fs.existsSync(reportFile)) {
        fs.unlinkSync(reportFile);
      }
    }
  }
}

async function main() {
  try {
    const args = process.argv.slice(2);
    const options: BackupOptions = {};

    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--version' || args[i] === '-v') {
        options.version = args[++i];
      } else if (args[i] === '--type' || args[i] === '-t') {
        options.type = args[++i] as any;
      } else if (args[i] === '--no-compress') {
        options.compress = false;
      } else if (args[i] === '--description' || args[i] === '-d') {
        options.description = args[++i];
      }
    }

    const stats = await createVersionedBackup(options);

    console.log('\n=== Backup Complete ===\n');
    console.log(`Version: ${stats.version}`);
    console.log(`Type: ${stats.type}`);
    console.log(`File: ${path.basename(stats.filePath)}`);
    console.log(`Size: ${(stats.fileSize / 1024 / 1024).toFixed(2)} MB (uncompressed)`);
    if (stats.compressed && stats.compressedSize) {
      console.log(`Compressed: ${(stats.compressedSize / 1024 / 1024).toFixed(2)} MB`);
      const ratio = ((1 - stats.compressedSize / stats.fileSize) * 100).toFixed(1);
      console.log(`Compression: ${ratio}% reduction`);
    }
    console.log(`Total Tables: ${stats.totalTables}`);
    console.log(`Total Rows: ${stats.totalRows.toLocaleString()}\n`);

    console.log('Top tables by row count:');
    const sortedTables = Object.entries(stats.tables).sort((a, b) => b[1] - a[1]).slice(0, 5);
    for (const [table, count] of sortedTables) {
      console.log(`  ${table}: ${count.toLocaleString()} rows`);
    }

    const reportPath = stats.filePath.replace(/\.sql(\.gz)?$/, '_report.json');
    fs.writeFileSync(reportPath, JSON.stringify(stats, null, 2));
    console.log(`\nReport saved: ${path.basename(reportPath)}`);

    cleanupOldBackups();

    console.log('\n=== Restoration Instructions ===\n');
    console.log(`To restore this version:`);
    console.log(`  npm run restore -- --version ${stats.version}\n`);
  } catch (error) {
    console.error('Backup failed:', error);
    process.exit(1);
  }
}

main();
