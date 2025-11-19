import { supabase } from '../../lib/supabase';
import type {
  RawStationData,
  ImportResult,
  BatchImportConfig,
  NormalizedStation,
} from './types';
import {
  normalizeRawStation,
  deduplicateStations,
  checkExistingStation,
} from './normalizer';

const DEFAULT_CONFIG: BatchImportConfig = {
  batchSize: 50,
  validateFrequency: true,
  deduplicateByFrequency: true,
  skipInvalidCoordinates: false,
  logErrors: true,
};

export async function importStations(
  rawData: RawStationData[],
  config: Partial<BatchImportConfig> = {}
): Promise<ImportResult> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const result: ImportResult = {
    success: true,
    imported: 0,
    skipped: 0,
    errors: [],
    details: {
      stations: 0,
      locations: 0,
      sources: 0,
    },
  };

  console.log(`Starting import of ${rawData.length} raw stations...`);

  const normalized = [];
  for (const raw of rawData) {
    try {
      const norm = await normalizeRawStation(raw);
      if (norm) {
        normalized.push(norm);
      } else {
        result.skipped++;
      }
    } catch (error) {
      result.skipped++;
      if (finalConfig.logErrors) {
        result.errors.push(
          `Normalization error for ${raw.stationName}: ${error}`
        );
      }
    }
  }

  console.log(`Normalized ${normalized.length} stations`);

  const deduplicated = finalConfig.deduplicateByFrequency
    ? deduplicateStations(normalized)
    : normalized;

  console.log(`After deduplication: ${deduplicated.length} stations`);

  for (let i = 0; i < deduplicated.length; i += finalConfig.batchSize) {
    const batch = deduplicated.slice(i, i + finalConfig.batchSize);

    try {
      await importBatch(batch, result, finalConfig);
      console.log(
        `Processed batch ${Math.floor(i / finalConfig.batchSize) + 1}/${Math.ceil(deduplicated.length / finalConfig.batchSize)}`
      );
    } catch (error) {
      result.success = false;
      if (finalConfig.logErrors) {
        result.errors.push(`Batch import error: ${error}`);
      }
    }
  }

  console.log('Import complete:', result);
  return result;
}

async function importBatch(
  batch: Array<{
    station: NormalizedStation;
    location?: any;
    source: any;
    cityId?: string;
  }>,
  result: ImportResult,
  config: BatchImportConfig
): Promise<void> {
  for (const item of batch) {
    try {
      const existingStationId = await checkExistingStation(
        item.station.frequencyKhz,
        item.station.bandId,
        item.cityId
      );

      if (existingStationId) {
        result.skipped++;
        continue;
      }

      const { data: stationData, error: stationError } = await supabase
        .from('stations')
        .insert({
          station_name: item.station.stationName,
          call_sign: item.station.callSign,
          band_id: item.station.bandId,
          frequency_khz: item.station.frequencyKhz,
          modulation_type: item.station.modulationType,
          power_kw: item.station.powerKw,
          language: item.station.language,
          content_type: item.station.contentType,
          owner: item.station.owner,
          license_type: item.station.licenseType,
          coverage_radius_km: item.station.coverageRadiusKm,
          status: item.station.status,
          last_verified: item.station.lastVerified,
          stream_url: item.station.streamUrl,
        })
        .select('station_id')
        .single();

      if (stationError) {
        throw stationError;
      }

      const stationId = stationData.station_id;
      result.imported++;
      result.details.stations++;

      if (item.location && item.cityId) {
        const { error: locationError } = await supabase
          .from('station_locations')
          .insert({
            station_id: stationId,
            city_id: item.cityId,
            transmitter_lat: item.location.transmitterLat,
            transmitter_long: item.location.transmitterLong,
            altitude_m: item.location.altitudeM,
            notes: item.location.notes,
          });

        if (!locationError) {
          result.details.locations++;
        }
      }

      const { error: sourceError } = await supabase
        .from('station_sources')
        .insert({
          station_id: stationId,
          source_name: item.source.sourceName,
          url: item.source.url,
          license: item.source.license,
          last_updated: item.source.lastUpdated,
        });

      if (!sourceError) {
        result.details.sources++;
      }
    } catch (error) {
      result.skipped++;
      if (config.logErrors) {
        result.errors.push(
          `Error importing ${item.station.stationName}: ${error}`
        );
      }
    }
  }
}

export async function getImportStats(): Promise<{
  totalStations: number;
  stationsByBand: Record<string, number>;
  stationsWithLocations: number;
  stationsWithSources: number;
}> {
  const { data: stations } = await supabase
    .from('stations')
    .select('station_id, band_id, bands(band_name)');

  const { data: locations } = await supabase
    .from('station_locations')
    .select('station_id');

  const { data: sources } = await supabase
    .from('station_sources')
    .select('station_id');

  const stationsByBand: Record<string, number> = {};

  if (stations) {
    for (const station of stations) {
      const bandName = (station.bands as any)?.band_name || 'Unknown';
      stationsByBand[bandName] = (stationsByBand[bandName] || 0) + 1;
    }
  }

  return {
    totalStations: stations?.length || 0,
    stationsByBand,
    stationsWithLocations: new Set(locations?.map((l) => l.station_id)).size,
    stationsWithSources: new Set(sources?.map((s) => s.station_id)).size,
  };
}
