export { importStations, getImportStats } from './importer';
export {
  fetchFMStationsFromRadioBrowser,
  fetchFMStationsByCountry,
} from './fetchers/radioBrowser';
export { fetchFMStationsFromFCC, fetchAMStationsFromFCC } from './fetchers/fcc';
export {
  fetchFMStationsFromIndiaGov,
  parseIndiaGovCSV,
} from './fetchers/indiaGov';
export { prepopulateGeoData } from './fetchers/geonames';
export type { RawStationData, ImportResult, BatchImportConfig } from './types';

export async function runFMImport() {
  console.log('=== Starting FM Import ===');

  const { fetchFMStationsFromRadioBrowser } = await import(
    './fetchers/radioBrowser'
  );
  const { importStations, getImportStats } = await import('./importer');

  console.log('Fetching stations from RadioBrowser...');
  const radioBrowserStations = await fetchFMStationsFromRadioBrowser(100);
  console.log(`Fetched ${radioBrowserStations.length} stations from RadioBrowser`);

  if (radioBrowserStations.length > 0) {
    console.log('Importing RadioBrowser stations...');
    const result = await importStations(radioBrowserStations, {
      batchSize: 20,
      deduplicateByFrequency: true,
      logErrors: true,
    });

    console.log('Import result:', result);
  }

  const stats = await getImportStats();
  console.log('=== Import Statistics ===');
  console.log(`Total stations: ${stats.totalStations}`);
  console.log(`Stations by band:`, stats.stationsByBand);
  console.log(`Stations with locations: ${stats.stationsWithLocations}`);
  console.log(`Stations with sources: ${stats.stationsWithSources}`);

  return stats;
}
