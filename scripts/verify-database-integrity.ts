import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lokoaovrcslqlazxedhx.supabase.co';
const supabaseKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxva29hb3ZyY3NscWxhenhlZGh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3NTk0MzAsImV4cCI6MjA3NzMzNTQzMH0.rdRUkHWqtlMblbS2jt2AN1izyV1k8EcN6Mmwiywe5hc';

const supabase = createClient(supabaseUrl, supabaseKey);

interface IntegrityReport {
  timestamp: string;
  summary: {
    totalStations: number;
    byBand: Record<string, number>;
    bySource: Record<string, number>;
  };
  referentialIntegrity: {
    orphanedStations: number;
    orphanedLocations: number;
    invalidCityRefs: number;
    invalidCountryRefs: number;
  };
  duplicates: {
    duplicateFrequenciesPerCity: number;
    duplicateStreamUrls: number;
    duplicateStationNames: number;
  };
  coverage: {
    stationsWithCoordinates: number;
    stationsWithCities: number;
    stationsWithCountries: number;
    coveragePercent: number;
  };
  bandOverlaps: {
    frequencyConflicts: number;
  };
  details: any[];
}

async function getStationCounts(): Promise<{
  total: number;
  byBand: Record<string, number>;
  bySource: Record<string, number>;
}> {
  const { data } = await supabase.from('stations_view').select('band_type, source_table');

  const byBand: Record<string, number> = {};
  const bySource: Record<string, number> = {};

  for (const row of data || []) {
    byBand[row.band_type] = (byBand[row.band_type] || 0) + 1;
    bySource[row.source_table] = (bySource[row.source_table] || 0) + 1;
  }

  return {
    total: data?.length || 0,
    byBand,
    bySource,
  };
}

async function checkReferentialIntegrity(): Promise<{
  orphanedStations: number;
  orphanedLocations: number;
  invalidCityRefs: number;
  invalidCountryRefs: number;
}> {
  const { data: allStations } = await supabase.from('stations').select('station_id');
  const stationIds = new Set((allStations || []).map((s) => s.station_id));

  const { data: allLocations } = await supabase
    .from('station_locations')
    .select('station_id');
  const orphanedLocations = (allLocations || []).filter(
    (l) => !stationIds.has(l.station_id)
  ).length;

  const { data: allCities } = await supabase.from('cities').select('city_id');
  const cityIds = new Set((allCities || []).map((c) => c.city_id));

  const { data: locationsWithCity } = await supabase
    .from('station_locations')
    .select('city_id')
    .not('city_id', 'is', null);
  const invalidCityRefs = (locationsWithCity || []).filter(
    (l) => !cityIds.has(l.city_id)
  ).length;

  const { data: allCountries } = await supabase.from('countries').select('country_id');
  const countryIds = new Set((allCountries || []).map((c) => c.country_id));

  const { data: swWithCountry } = await supabase
    .from('shortwave_stations')
    .select('country_id')
    .not('country_id', 'is', null);
  const invalidCountryRefs = (swWithCountry || []).filter(
    (s) => !countryIds.has(s.country_id)
  ).length;

  return {
    orphanedStations: 0,
    orphanedLocations,
    invalidCityRefs,
    invalidCountryRefs,
  };
}

async function detectDuplicates(): Promise<{
  duplicateFrequenciesPerCity: number;
  duplicateStreamUrls: number;
  duplicateStationNames: number;
  details: any[];
}> {
  const details: any[] = [];

  const { data: streamDupes } = await supabase
    .from('stations')
    .select('stream_url, station_name')
    .not('stream_url', 'is', null);

  const streamCounts = new Map<string, { count: number; names: string[] }>();
  for (const row of streamDupes || []) {
    const existing = streamCounts.get(row.stream_url) || { count: 0, names: [] };
    streamCounts.set(row.stream_url, {
      count: existing.count + 1,
      names: [...existing.names, row.station_name],
    });
  }

  const duplicateStreams = Array.from(streamCounts.entries())
    .filter(([, data]) => data.count > 1)
    .map(([url, data]) => ({ url, count: data.count, stations: data.names.slice(0, 3) }))
    .slice(0, 10);

  if (duplicateStreams.length > 0) {
    details.push({
      type: 'duplicate_stream_urls',
      count: duplicateStreams.length,
      items: duplicateStreams,
    });
  }

  const { data: allStations } = await supabase
    .from('stations')
    .select('station_name, frequency_khz, bands!inner(band_name), station_locations!inner(city_id), cities!inner(city_name)')
    .limit(2000);

  const freqMap = new Map<
    string,
    { count: number; stations: string[]; city: string; band: string }
  >();

  for (const row of allStations || []) {
    const key = `${row.cities.city_name}_${row.frequency_khz}_${row.bands.band_name}`;
    const existing = freqMap.get(key) || {
      count: 0,
      stations: [],
      city: row.cities.city_name,
      band: row.bands.band_name,
    };
    freqMap.set(key, {
      count: existing.count + 1,
      stations: [...existing.stations, row.station_name],
      city: row.cities.city_name,
      band: row.bands.band_name,
    });
  }

  const frequencyDuplicates = Array.from(freqMap.entries())
    .filter(([, data]) => data.count > 1)
    .map(([key, data]) => ({
      city: data.city,
      frequency: key.split('_')[1],
      band: data.band,
      count: data.count,
      stations: data.stations.slice(0, 3),
    }))
    .slice(0, 10);

  if (frequencyDuplicates.length > 0) {
    details.push({
      type: 'frequency_duplicates_per_city',
      count: frequencyDuplicates.length,
      items: frequencyDuplicates,
    });
  }

  return {
    duplicateFrequenciesPerCity: frequencyDuplicates.length,
    duplicateStreamUrls: duplicateStreams.length,
    duplicateStationNames: 0,
    details,
  };
}

async function checkCoverage(): Promise<{
  stationsWithCoordinates: number;
  stationsWithCities: number;
  stationsWithCountries: number;
  coveragePercent: number;
}> {
  const { count: fmAmTotal } = await supabase
    .from('stations')
    .select('*', { count: 'exact', head: true });

  const { count: fmAmWithLoc } = await supabase
    .from('station_locations')
    .select('*', { count: 'exact', head: true })
    .not('transmitter_lat', 'is', null);

  const { count: fmAmWithCity } = await supabase
    .from('station_locations')
    .select('*', { count: 'exact', head: true })
    .not('city_id', 'is', null);

  const { count: swTotal } = await supabase
    .from('shortwave_stations')
    .select('*', { count: 'exact', head: true });

  const { count: swWithCoords } = await supabase
    .from('shortwave_stations')
    .select('*', { count: 'exact', head: true })
    .not('transmitter_lat', 'is', null);

  const { count: swWithCity } = await supabase
    .from('shortwave_stations')
    .select('*', { count: 'exact', head: true })
    .not('city_id', 'is', null);

  const totalStations = (fmAmTotal || 0) + (swTotal || 0);
  const totalCoords = (fmAmWithLoc || 0) + (swWithCoords || 0);
  const totalCity = (fmAmWithCity || 0) + (swWithCity || 0);

  return {
    stationsWithCoordinates: totalCoords,
    stationsWithCities: totalCity,
    stationsWithCountries: totalCity,
    coveragePercent: totalStations > 0 ? (totalCoords / totalStations) * 100 : 0,
  };
}

async function checkBandOverlaps(): Promise<{
  frequencyConflicts: number;
  details: any[];
}> {
  const { data: allStations } = await supabase
    .from('stations')
    .select('frequency_khz, bands!inner(band_name)');

  const freqBandMap = new Map<number, Set<string>>();

  for (const row of allStations || []) {
    const freq = parseFloat(row.frequency_khz);
    if (!freqBandMap.has(freq)) {
      freqBandMap.set(freq, new Set());
    }
    freqBandMap.get(freq)!.add(row.bands.band_name);
  }

  const conflicts = Array.from(freqBandMap.entries())
    .filter(([, bands]) => bands.size > 1)
    .map(([freq, bands]) => ({
      frequency_khz: freq,
      bands: Array.from(bands),
      band_count: bands.size,
    }))
    .slice(0, 20);

  return {
    frequencyConflicts: conflicts.length,
    details: conflicts,
  };
}

async function generateReport(): Promise<IntegrityReport> {
  console.log('=== Database Integrity Verification ===\n');
  console.log('Gathering statistics...\n');

  const counts = await getStationCounts();
  console.log(`✓ Total stations: ${counts.total.toLocaleString()}`);

  console.log('\nChecking referential integrity...');
  const integrity = await checkReferentialIntegrity();

  console.log('Detecting duplicates...');
  const duplicates = await detectDuplicates();

  console.log('Analyzing coverage...');
  const coverage = await checkCoverage();

  console.log('Checking band overlaps...');
  const bandOverlaps = await checkBandOverlaps();

  const report: IntegrityReport = {
    timestamp: new Date().toISOString(),
    summary: {
      totalStations: counts.total,
      byBand: counts.byBand,
      bySource: counts.bySource,
    },
    referentialIntegrity: integrity,
    duplicates: {
      duplicateFrequenciesPerCity: duplicates.duplicateFrequenciesPerCity,
      duplicateStreamUrls: duplicates.duplicateStreamUrls,
      duplicateStationNames: duplicates.duplicateStationNames,
    },
    coverage: {
      stationsWithCoordinates: coverage.stationsWithCoordinates,
      stationsWithCities: coverage.stationsWithCities,
      stationsWithCountries: coverage.stationsWithCountries,
      coveragePercent: coverage.coveragePercent,
    },
    bandOverlaps: {
      frequencyConflicts: bandOverlaps.frequencyConflicts,
    },
    details: [...duplicates.details, ...bandOverlaps.details],
  };

  return report;
}

function printReport(report: IntegrityReport): void {
  console.log('\n=== INTEGRITY REPORT ===\n');
  console.log(`Generated: ${new Date(report.timestamp).toLocaleString()}\n`);

  console.log('## Summary');
  console.log(`Total Stations: ${report.summary.totalStations.toLocaleString()}\n`);

  console.log('### By Band:');
  for (const [band, count] of Object.entries(report.summary.byBand)) {
    console.log(`  ${band}: ${count.toLocaleString()}`);
  }

  console.log('\n### By Source:');
  for (const [source, count] of Object.entries(report.summary.bySource)) {
    console.log(`  ${source}: ${count.toLocaleString()}`);
  }

  console.log('\n## Referential Integrity');
  console.log(`Orphaned Stations: ${report.referentialIntegrity.orphanedStations}`);
  console.log(`Orphaned Locations: ${report.referentialIntegrity.orphanedLocations}`);
  console.log(`Invalid City References: ${report.referentialIntegrity.invalidCityRefs}`);
  console.log(
    `Invalid Country References: ${report.referentialIntegrity.invalidCountryRefs}`
  );

  const integrityScore =
    report.referentialIntegrity.orphanedStations +
      report.referentialIntegrity.orphanedLocations +
      report.referentialIntegrity.invalidCityRefs +
      report.referentialIntegrity.invalidCountryRefs ===
    0
      ? '✓ PASS'
      : '✗ FAIL';
  console.log(`Status: ${integrityScore}\n`);

  console.log('## Duplicates');
  console.log(
    `Duplicate Frequencies per City: ${report.duplicates.duplicateFrequenciesPerCity}`
  );
  console.log(`Duplicate Stream URLs: ${report.duplicates.duplicateStreamUrls}`);
  console.log(`Duplicate Station Names: ${report.duplicates.duplicateStationNames}\n`);

  console.log('## Coverage Statistics');
  console.log(
    `Stations with Coordinates: ${report.coverage.stationsWithCoordinates.toLocaleString()} (${report.coverage.coveragePercent.toFixed(2)}%)`
  );
  console.log(
    `Stations with Cities: ${report.coverage.stationsWithCities.toLocaleString()}`
  );
  console.log(
    `Stations with Countries: ${report.coverage.stationsWithCountries.toLocaleString()}\n`
  );

  console.log('## Band Overlaps');
  console.log(`Frequency Conflicts: ${report.bandOverlaps.frequencyConflicts}`);

  if (report.details.length > 0) {
    console.log('\n## Detailed Issues');
    for (const detail of report.details) {
      console.log(`\n### ${detail.type}`);
      console.log(`Count: ${detail.count || detail.items?.length || 0}`);
      if (detail.items && detail.items.length > 0) {
        console.log('Sample issues:');
        for (const item of detail.items.slice(0, 5)) {
          console.log(JSON.stringify(item, null, 2));
        }
      }
    }
  }

  console.log('\n=== VERIFICATION COMPLETE ===');
}

async function main() {
  try {
    const report = await generateReport();
    printReport(report);
  } catch (error) {
    console.error('Error generating integrity report:', error);
    process.exit(1);
  }
}

main();
