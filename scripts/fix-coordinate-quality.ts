import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface CoordinateIssue {
  stationuuid: string;
  name: string;
  country: string;
  country_code: string;
  latitude: string;
  longitude: string;
  homepage: string;
  issue_type: string;
}

interface RepairResult {
  stationuuid: string;
  name: string;
  original_lat: number;
  original_lon: number;
  new_lat: number | null;
  new_lon: number | null;
  issue_type: string;
  repair_method: string;
  success: boolean;
}

// Country bounding boxes for validation
const COUNTRY_BOUNDS: Record<string, { minLat: number; maxLat: number; minLon: number; maxLon: number }> = {
  US: { minLat: 25, maxLat: 50, minLon: -125, maxLon: -66 },
  CA: { minLat: 42, maxLat: 70, minLon: -141, maxLon: -52 },
  MX: { minLat: 14, maxLat: 33, minLon: -118, maxLon: -86 },
  RU: { minLat: 41, maxLat: 82, minLon: 19, maxLon: 180 },
  IN: { minLat: 8, maxLat: 35, minLon: 68, maxLon: 97 },
  GB: { minLat: 50, maxLat: 59, minLon: -8, maxLon: 2 },
  FR: { minLat: 42, maxLat: 51, minLon: -5, maxLon: 10 },
  DE: { minLat: 47, maxLat: 55, minLon: 6, maxLon: 15 },
  IT: { minLat: 36, maxLat: 47, minLon: 6, maxLon: 19 },
  ES: { minLat: 28, maxLat: 44, minLon: -18, maxLon: 5 }, // Includes Canary Islands
  PT: { minLat: 32, maxLat: 42, minLon: -32, maxLon: -6 }, // Includes Azores
  AU: { minLat: -44, maxLat: -10, minLon: 112, maxLon: 154 },
  BR: { minLat: -34, maxLat: 5, minLon: -74, maxLon: -34 },
  AR: { minLat: -55, maxLat: -22, minLon: -74, maxLon: -53 },
  CN: { minLat: 18, maxLat: 54, minLon: 73, maxLon: 135 },
  JP: { minLat: 24, maxLat: 46, minLon: 123, maxLon: 146 },
};

function isWithinBounds(lat: number, lon: number, countryCode: string): boolean {
  const bounds = COUNTRY_BOUNDS[countryCode];
  if (!bounds) return true; // Unknown country, assume OK

  return lat >= bounds.minLat && lat <= bounds.maxLat &&
         lon >= bounds.minLon && lon <= bounds.maxLon;
}

function attemptRepair(
  lat: number,
  lon: number,
  countryCode: string,
  issueType: string
): { lat: number | null; lon: number | null; method: string } {

  // Method 1: Try inverting latitude sign (south → north or vice versa)
  if (issueType.includes('LATITUDE')) {
    const invertedLat = -lat;
    if (isWithinBounds(invertedLat, lon, countryCode)) {
      return { lat: invertedLat, lon, method: 'inverted_latitude_sign' };
    }
  }

  // Method 2: Try inverting longitude sign (east → west or vice versa)
  if (issueType.includes('LONGITUDE')) {
    const invertedLon = -lon;
    if (isWithinBounds(lat, invertedLon, countryCode)) {
      return { lat, lon: invertedLon, method: 'inverted_longitude_sign' };
    }
  }

  // Method 3: Try swapping lat/lon
  if (isWithinBounds(lon, lat, countryCode)) {
    return { lat: lon, lon: lat, method: 'swapped_lat_lon' };
  }

  // Method 4: Try inverting both signs
  const invertedLat = -lat;
  const invertedLon = -lon;
  if (isWithinBounds(invertedLat, invertedLon, countryCode)) {
    return { lat: invertedLat, lon: invertedLon, method: 'inverted_both_signs' };
  }

  // Method 5: Try swap + invert combinations
  if (isWithinBounds(-lon, -lat, countryCode)) {
    return { lat: -lon, lon: -lat, method: 'swapped_and_inverted' };
  }

  if (isWithinBounds(lon, -lat, countryCode)) {
    return { lat: lon, lon: -lat, method: 'swapped_and_inverted_lon' };
  }

  if (isWithinBounds(-lon, lat, countryCode)) {
    return { lat: -lon, lon: lat, method: 'swapped_and_inverted_lat' };
  }

  // Cannot repair
  return { lat: null, lon: null, method: 'unfixable' };
}

async function identifyIssues(): Promise<CoordinateIssue[]> {
  console.log('🔍 Identifying coordinate quality issues...\n');

  const { data, error } = await supabase
    .from('radio_stations')
    .select('stationuuid, name, country, country_code, latitude, longitude, homepage')
    .not('latitude', 'is', null)
    .not('longitude', 'is', null);

  if (error) {
    console.error('Error fetching stations:', error);
    return [];
  }

  const issues: CoordinateIssue[] = [];

  for (const station of data) {
    const lat = parseFloat(station.latitude);
    const lon = parseFloat(station.longitude);
    const cc = station.country_code;

    let issueType = 'OK';

    // Check hemisphere issues
    if (['US', 'CA', 'MX'].includes(cc) && lon > 0) {
      issueType = 'WRONG_HEMISPHERE_LONGITUDE';
    } else if (['RU', 'IN'].includes(cc) && lat < 0) {
      issueType = 'WRONG_HEMISPHERE_LATITUDE';
    } else if (cc === 'AU' && lat > 0) {
      issueType = 'WRONG_HEMISPHERE_LATITUDE';
    } else if (['BR', 'AR', 'CL', 'PE', 'CO', 'VE', 'EC', 'BO', 'PY', 'UY'].includes(cc) && lat > 10) {
      issueType = 'SUSPICIOUS_LATITUDE';
    } else if (!isWithinBounds(lat, lon, cc)) {
      issueType = 'OUT_OF_BOUNDS';
    }

    if (issueType !== 'OK') {
      issues.push({
        ...station,
        issue_type: issueType,
      });
    }
  }

  return issues;
}

async function repairCoordinates(issues: CoordinateIssue[]): Promise<RepairResult[]> {
  console.log(`🔧 Attempting to repair ${issues.length} coordinate issues...\n`);

  const results: RepairResult[] = [];
  let repairedCount = 0;
  let nulledCount = 0;

  for (const issue of issues) {
    const lat = parseFloat(issue.latitude);
    const lon = parseFloat(issue.longitude);

    const repair = attemptRepair(lat, lon, issue.country_code, issue.issue_type);

    const result: RepairResult = {
      stationuuid: issue.stationuuid,
      name: issue.name,
      original_lat: lat,
      original_lon: lon,
      new_lat: repair.lat,
      new_lon: repair.lon,
      issue_type: issue.issue_type,
      repair_method: repair.method,
      success: repair.lat !== null,
    };

    results.push(result);

    if (repair.lat !== null) {
      // Apply repair
      const { error } = await supabase
        .from('radio_stations')
        .update({
          latitude: repair.lat.toString(),
          longitude: repair.lon!.toString(),
        })
        .eq('stationuuid', issue.stationuuid);

      if (error) {
        console.error(`❌ Failed to update ${issue.name}:`, error);
      } else {
        repairedCount++;
        console.log(`✅ Repaired: ${issue.name}`);
        console.log(`   ${lat}, ${lon} → ${repair.lat}, ${repair.lon} (${repair.method})`);
      }
    } else {
      // NULL out unfixable coordinates
      const { error } = await supabase
        .from('radio_stations')
        .update({
          latitude: null,
          longitude: null,
        })
        .eq('stationuuid', issue.stationuuid);

      if (error) {
        console.error(`❌ Failed to null ${issue.name}:`, error);
      } else {
        nulledCount++;
        console.log(`⚠️  Nulled: ${issue.name} (unfixable)`);
        console.log(`   Original: ${lat}, ${lon}`);
      }
    }
  }

  console.log(`\n📊 Repair Summary:`);
  console.log(`   ✅ Repaired: ${repairedCount}`);
  console.log(`   ⚠️  Nulled (unfixable): ${nulledCount}`);
  console.log(`   📝 Total processed: ${issues.length}`);

  return results;
}

function generateReport(results: RepairResult[]): void {
  console.log('\n\n📋 DETAILED REPAIR REPORT\n');
  console.log('='.repeat(80));

  // Group by repair method
  const byMethod: Record<string, RepairResult[]> = {};
  for (const result of results) {
    if (!byMethod[result.repair_method]) {
      byMethod[result.repair_method] = [];
    }
    byMethod[result.repair_method].push(result);
  }

  for (const [method, stations] of Object.entries(byMethod)) {
    console.log(`\n## ${method.toUpperCase()} (${stations.length} stations)`);
    console.log('-'.repeat(80));

    for (const station of stations.slice(0, 5)) {
      console.log(`\n${station.name}`);
      console.log(`  Original: ${station.original_lat}, ${station.original_lon}`);
      if (station.new_lat !== null) {
        console.log(`  Fixed:    ${station.new_lat}, ${station.new_lon}`);
      } else {
        console.log(`  Action:   NULLED (unfixable)`);
      }
      console.log(`  Issue:    ${station.issue_type}`);
    }

    if (stations.length > 5) {
      console.log(`\n  ... and ${stations.length - 5} more`);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('\n✅ Coordinate repair complete!\n');
}

async function main() {
  console.log('🚀 Starting Coordinate Quality Repair\n');
  console.log('='.repeat(80));

  // Step 1: Identify issues
  const issues = await identifyIssues();

  if (issues.length === 0) {
    console.log('✅ No coordinate issues found! All coordinates are valid.\n');
    return;
  }

  console.log(`Found ${issues.length} coordinate issues:\n`);

  // Count by type
  const byType: Record<string, number> = {};
  for (const issue of issues) {
    byType[issue.issue_type] = (byType[issue.issue_type] || 0) + 1;
  }

  for (const [type, count] of Object.entries(byType)) {
    console.log(`  - ${type}: ${count}`);
  }

  console.log('\n' + '='.repeat(80) + '\n');

  // Step 2: Repair coordinates
  const results = await repairCoordinates(issues);

  // Step 3: Generate report
  generateReport(results);
}

main().catch(console.error);
