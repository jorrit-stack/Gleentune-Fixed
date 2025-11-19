import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

interface BackupInfo {
  filename: string;
  version: string;
  type: string;
  date: string;
  size: number;
  compressed: boolean;
  reportPath?: string;
}

function listBackups(): BackupInfo[] {
  const backupDir = path.join(process.cwd(), 'backups');
  if (!fs.existsSync(backupDir)) {
    console.log('No backups directory found.');
    return [];
  }

  const files = fs.readdirSync(backupDir);
  const backupFiles = files.filter(f =>
    f.startsWith('radio_catalog_') && (f.endsWith('.sql') || f.endsWith('.sql.gz'))
  );

  const backups: BackupInfo[] = [];

  for (const file of backupFiles) {
    const match = file.match(/radio_catalog_(.+?)_(.+?)_(\d{4}-\d{2}-\d{2})\.(sql|sql\.gz)$/);
    if (match) {
      const [, version, type, date, ext] = match;
      const filePath = path.join(backupDir, file);
      const stats = fs.statSync(filePath);
      const reportPath = path.join(backupDir, file.replace(/\.sql(\.gz)?$/, '_report.json'));

      backups.push({
        filename: file,
        version,
        type,
        date,
        size: stats.size,
        compressed: ext === 'sql.gz',
        reportPath: fs.existsSync(reportPath) ? reportPath : undefined,
      });
    }
  }

  return backups.sort((a, b) => b.date.localeCompare(a.date) || b.version.localeCompare(a.version));
}

function displayBackupList(backups: BackupInfo[]) {
  console.log('\n=== Available Backups ===\n');

  if (backups.length === 0) {
    console.log('No backups found.\n');
    return;
  }

  const byVersion = new Map<string, BackupInfo[]>();

  for (const backup of backups) {
    if (!byVersion.has(backup.version)) {
      byVersion.set(backup.version, []);
    }
    byVersion.get(backup.version)!.push(backup);
  }

  for (const [version, versionBackups] of Array.from(byVersion.entries()).sort((a, b) => b[0].localeCompare(a[0]))) {
    console.log(`\n${version}:`);
    for (const backup of versionBackups) {
      const size = (backup.size / 1024 / 1024).toFixed(2);
      const type = backup.type.padEnd(10);
      console.log(`  ${backup.date}  ${type}  ${size} MB  ${backup.compressed ? '(compressed)' : ''}`);
    }
  }

  console.log('\n');
}

function findBackup(version: string, type?: string): BackupInfo | null {
  const backups = listBackups();

  let filtered = backups.filter(b => b.version === version);

  if (type) {
    filtered = filtered.filter(b => b.type === type);
  }

  if (filtered.length === 0) return null;

  return filtered[0];
}

function decompressBackup(backupPath: string): string {
  if (!backupPath.endsWith('.gz')) {
    return backupPath;
  }

  console.log('Decompressing backup...');
  const decompressed = backupPath.replace('.gz', '');

  if (fs.existsSync(decompressed)) {
    console.log('Decompressed file already exists, using existing file.');
    return decompressed;
  }

  try {
    execSync(`gunzip -k "${backupPath}"`, { stdio: 'inherit' });
    console.log('✓ Decompressed\n');
    return decompressed;
  } catch (error) {
    throw new Error('Failed to decompress backup file');
  }
}

function displayRestoreInstructions(backupPath: string, backup: BackupInfo) {
  console.log('\n=== Restore Instructions ===\n');
  console.log(`Version: ${backup.version}`);
  console.log(`Type: ${backup.type}`);
  console.log(`Date: ${backup.date}\n`);

  console.log('IMPORTANT: This will replace your current database with the backup!\n');

  console.log('To restore using Supabase Dashboard:');
  console.log('  1. Open Supabase Dashboard → SQL Editor');
  console.log('  2. Create a new query');
  console.log(`  3. Copy contents of: ${path.basename(backupPath)}`);
  console.log('  4. Paste and run the query');
  console.log('  5. Wait for completion (may take several minutes)\n');

  console.log('To restore using psql:');
  console.log('  psql -h db.lokoaovrcslqlazxedhx.supabase.co \\');
  console.log('       -U postgres \\');
  console.log('       -d postgres \\');
  console.log(`       -f "${backupPath}"\n`);

  if (backup.reportPath && fs.existsSync(backup.reportPath)) {
    const report = JSON.parse(fs.readFileSync(backup.reportPath, 'utf8'));
    console.log('Expected data after restoration:');
    console.log(`  Total rows: ${report.totalRows.toLocaleString()}`);
    console.log(`  Total tables: ${report.totalTables}`);
    console.log('\n  Top tables:');
    const sortedTables = Object.entries(report.tables as Record<string, number>)
      .sort((a, b) => (b[1] as number) - (a[1] as number))
      .slice(0, 5);
    for (const [table, count] of sortedTables) {
      console.log(`    ${table}: ${(count as number).toLocaleString()} rows`);
    }
  }

  console.log('\n=== Verification Query ===\n');
  console.log('After restoration, run this to verify:');
  console.log(`
SELECT
  schemaname,
  tablename,
  n_live_tup as row_count
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY n_live_tup DESC;
`);
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--list') || args.includes('-l')) {
    const backups = listBackups();
    displayBackupList(backups);
    return;
  }

  let version: string | null = null;
  let type: string | null = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--version' || args[i] === '-v') {
      version = args[++i];
    } else if (args[i] === '--type' || args[i] === '-t') {
      type = args[++i];
    }
  }

  if (!version) {
    console.error('Error: --version is required\n');
    console.log('Usage:');
    console.log('  npm run restore -- --list                    # List all backups');
    console.log('  npm run restore -- --version v552            # Restore specific version');
    console.log('  npm run restore -- --version v552 --type daily  # Restore specific type\n');
    process.exit(1);
  }

  const backup = findBackup(version, type || undefined);

  if (!backup) {
    console.error(`Error: No backup found for version "${version}"${type ? ` with type "${type}"` : ''}\n`);
    console.log('Available backups:');
    displayBackupList(listBackups());
    process.exit(1);
  }

  const backupPath = path.join(process.cwd(), 'backups', backup.filename);
  const sqlPath = decompressBackup(backupPath);

  displayRestoreInstructions(sqlPath, backup);
}

main();
