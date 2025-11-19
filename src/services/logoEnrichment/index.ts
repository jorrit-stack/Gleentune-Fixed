import { supabase } from '../../lib/supabase';
import { extractLogo } from './imageExtractor';

export interface LogoEnrichmentResult {
  stationId: string;
  stationName: string;
  success: boolean;
  logoUrl?: string;
  logoSource?: string;
  error?: string;
}

export interface EnrichmentStats {
  total: number;
  processed: number;
  successful: number;
  failed: number;
  skipped: number;
}

export async function enrichStationLogo(
  stationId: string,
  stationName: string,
  website: string | null,
  tableName: 'radio_stations' | 'stations' | 'shortwave_stations',
  existingLogoUrl: string | null,
  existingLogoSource: string | null
): Promise<LogoEnrichmentResult> {

  if (existingLogoUrl && existingLogoSource === 'radio-browser') {
    return {
      stationId,
      stationName,
      success: false,
      error: 'Already has Radio Browser logo (skipped)'
    };
  }

  if (!website) {
    return {
      stationId,
      stationName,
      success: false,
      error: 'No website URL available'
    };
  }

  try {
    const extractedLogo = await extractLogo(website);

    if (!extractedLogo) {
      return {
        stationId,
        stationName,
        success: false,
        error: 'No logo found'
      };
    }

    const { error } = await supabase
      .from(tableName)
      .update({
        logo_url: extractedLogo.url,
        logo_source: extractedLogo.source,
        source_url: extractedLogo.sourceUrl,
        retrieved_at: new Date().toISOString(),
        logo_verified: true,
        logo_last_checked: new Date().toISOString()
      })
      .eq('id', stationId);

    if (error) {
      return {
        stationId,
        stationName,
        success: false,
        error: `Database update failed: ${error.message}`
      };
    }

    return {
      stationId,
      stationName,
      success: true,
      logoUrl: extractedLogo.url,
      logoSource: extractedLogo.source
    };
  } catch (error) {
    return {
      stationId,
      stationName,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function enrichAMFMLogos(
  bandType: 'AM' | 'FM',
  limit = 100,
  onProgress?: (stats: EnrichmentStats) => void
): Promise<EnrichmentStats> {
  const stats: EnrichmentStats = {
    total: 0,
    processed: 0,
    successful: 0,
    failed: 0,
    skipped: 0
  };

  const tableName = bandType === 'AM' ? 'stations' : 'radio_stations';

  const { data: stations, error } = await supabase
    .from(tableName)
    .select('id, name, website, logo_url, logo_source, band_type')
    .eq('band_type', bandType)
    .or('logo_url.is.null,logo_source.eq.generated')
    .not('website', 'is', null)
    .limit(limit);

  if (error || !stations) {
    console.error('Failed to fetch stations:', error);
    return stats;
  }

  stats.total = stations.length;

  for (const station of stations) {
    const result = await enrichStationLogo(
      station.id,
      station.name,
      station.website,
      tableName as 'radio_stations' | 'stations',
      station.logo_url,
      station.logo_source
    );

    stats.processed++;

    if (result.success) {
      stats.successful++;
      console.log(`✅ ${station.name}: Found ${result.logoSource} logo`);
    } else if (result.error?.includes('skipped')) {
      stats.skipped++;
      console.log(`⏭️  ${station.name}: ${result.error}`);
    } else {
      stats.failed++;
      console.log(`❌ ${station.name}: ${result.error}`);
    }

    if (onProgress) {
      onProgress(stats);
    }

    await delay(1000);
  }

  return stats;
}

export async function enrichAllAMFMLogos(
  onProgress?: (bandType: 'AM' | 'FM', stats: EnrichmentStats) => void
): Promise<{ am: EnrichmentStats; fm: EnrichmentStats }> {
  console.log('Starting AM station logo enrichment...');
  const amStats = await enrichAMFMLogos('AM', 1000, (stats) => {
    if (onProgress) onProgress('AM', stats);
  });

  console.log('\nStarting FM station logo enrichment...');
  const fmStats = await enrichAMFMLogos('FM', 1000, (stats) => {
    if (onProgress) onProgress('FM', stats);
  });

  return { am: amStats, fm: fmStats };
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
