import type { RawStationData } from '../types';

export async function fetchFMStationsFromIndiaGov(): Promise<RawStationData[]> {
  console.log('Note: Data.gov.in FM dataset requires manual CSV download and parsing');
  console.log('Dataset URL: https://data.gov.in/catalog/fm-radio-stations-india');

  return [];
}

export function parseIndiaGovCSV(csvContent: string): RawStationData[] {
  const lines = csvContent.split('\n');
  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());

  const stations: RawStationData[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = line.split(',').map((v) => v.trim());
    const row: Record<string, string> = {};

    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });

    const frequencyStr = row['frequency'] || row['frequency (mhz)'] || row['freq'];
    const frequencyMhz = parseFloat(frequencyStr);

    if (isNaN(frequencyMhz)) {
      continue;
    }

    stations.push({
      stationName: row['station name'] || row['name'] || `FM ${frequencyMhz}`,
      callSign: row['call sign'] || undefined,
      frequencyMhz,
      bandName: 'FM' as const,
      country: 'India',
      countryCode: 'IN',
      city: row['city'] || row['location'] || undefined,
      state: row['state'] || undefined,
      owner: row['operator'] || row['owner'] || undefined,
      sourceName: 'Data.gov.in',
      sourceUrl: 'https://data.gov.in/catalog/fm-radio-stations-india',
      sourceLicense: 'Open Data License - India',
    });
  }

  return stations;
}
