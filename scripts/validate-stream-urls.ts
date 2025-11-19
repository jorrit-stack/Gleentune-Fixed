import { supabase } from './lib/supabase-node.js';

interface StreamValidationResult {
  totalStations: number;
  withStreams: number;
  withoutStreams: number;
  placeholderStreams: number;
  validStreams: number;
  streamUrlPatterns: Record<string, number>;
  bandDistribution: Record<string, { total: number; withStreams: number }>;
}

async function validateStreamUrls(): Promise<StreamValidationResult> {
  console.log('=== Stream URL Validation ===\n');

  // Get all stations
  const { data: allStations, error } = await supabase
    .from('stations_view')
    .select('station_id, band_type, stream_url')
    .limit(10000);

  if (error) {
    console.error('Error fetching stations:', error);
    throw error;
  }

  const totalStations = allStations?.length || 0;
  console.log(`Total stations sampled: ${totalStations}\n`);

  // Analyze stream URLs
  const withStreams = allStations?.filter(s => s.stream_url && s.stream_url.trim() !== '') || [];
  const withoutStreams = totalStations - withStreams.length;
  const placeholderStreams = withStreams.filter(s =>
    s.stream_url.includes('placeholder') ||
    s.stream_url.includes('example.com')
  );
  const validStreams = withStreams.length - placeholderStreams.length;

  console.log('Stream URL Statistics:');
  console.log(`  With streams: ${withStreams.length} (${((withStreams.length / totalStations) * 100).toFixed(1)}%)`);
  console.log(`  Without streams: ${withoutStreams} (${((withoutStreams / totalStations) * 100).toFixed(1)}%)`);
  console.log(`  Placeholder URLs: ${placeholderStreams.length} (${((placeholderStreams.length / totalStations) * 100).toFixed(1)}%)`);
  console.log(`  Valid stream URLs: ${validStreams} (${((validStreams / totalStations) * 100).toFixed(1)}%)\n`);

  // Analyze stream URL patterns
  const patterns: Record<string, number> = {};
  withStreams.forEach(s => {
    try {
      const url = new URL(s.stream_url);
      const domain = url.hostname;
      patterns[domain] = (patterns[domain] || 0) + 1;
    } catch {
      patterns['invalid-url'] = (patterns['invalid-url'] || 0) + 1;
    }
  });

  console.log('Top Stream URL Providers:');
  Object.entries(patterns)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([domain, count]) => {
      console.log(`  ${domain}: ${count} stations`);
    });

  // Band distribution
  const bandDistribution: Record<string, { total: number; withStreams: number }> = {};
  allStations?.forEach(s => {
    const band = s.band_type || 'Unknown';
    if (!bandDistribution[band]) {
      bandDistribution[band] = { total: 0, withStreams: 0 };
    }
    bandDistribution[band].total++;
    if (s.stream_url && !s.stream_url.includes('placeholder')) {
      bandDistribution[band].withStreams++;
    }
  });

  console.log('\nStream Coverage by Band:');
  Object.entries(bandDistribution)
    .sort((a, b) => b[1].total - a[1].total)
    .forEach(([band, stats]) => {
      const percentage = stats.total > 0 ? ((stats.withStreams / stats.total) * 100).toFixed(1) : '0.0';
      console.log(`  ${band}: ${stats.withStreams}/${stats.total} (${percentage}%)`);
    });

  return {
    totalStations,
    withStreams: withStreams.length,
    withoutStreams,
    placeholderStreams: placeholderStreams.length,
    validStreams,
    streamUrlPatterns: patterns,
    bandDistribution
  };
}

async function testSampleStreams() {
  console.log('\n=== Testing Sample Stream URLs ===\n');

  const { data: sampleStations } = await supabase
    .from('stations_view')
    .select('station_id, station_name, stream_url, band_type')
    .not('stream_url', 'is', null)
    .not('stream_url', 'ilike', '%placeholder%')
    .limit(10);

  console.log('Sample valid stream URLs:');
  sampleStations?.forEach((station, i) => {
    console.log(`\n${i + 1}. ${station.station_name} (${station.band_type})`);
    console.log(`   URL: ${station.stream_url}`);
    console.log(`   Format: ${station.stream_url.match(/\.(mp3|aac|m3u8|pls)$/i)?.[1] || 'stream'}`);
  });
}

async function main() {
  const results = await validateStreamUrls();
  await testSampleStreams();

  console.log('\n=== Validation Summary ===\n');

  const streamCoverage = (results.validStreams / results.totalStations) * 100;
  let grade = 'F';
  if (streamCoverage >= 80) grade = 'A';
  else if (streamCoverage >= 60) grade = 'B';
  else if (streamCoverage >= 40) grade = 'C';
  else if (streamCoverage >= 20) grade = 'D';

  console.log(`Stream Coverage: ${streamCoverage.toFixed(1)}%`);
  console.log(`Grade: ${grade}`);

  if (results.validStreams > 500) {
    console.log('\n✅ Sufficient streaming stations for production demo');
  } else if (results.validStreams > 100) {
    console.log('\n⚠️  Limited streaming stations - consider importing more');
  } else {
    console.log('\n❌ Insufficient streaming stations for demo');
  }
}

main().catch(console.error);
