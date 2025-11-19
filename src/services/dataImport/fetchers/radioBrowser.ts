import type { RawStationData } from '../types';
import { detectLicenseTier } from '../../licenseChecker';

const RADIO_BROWSER_API = 'https://de1.api.radio-browser.info/json';

interface RadioBrowserStation {
  name: string;
  url: string;
  url_resolved: string;
  homepage: string;
  favicon: string;
  country: string;
  countrycode: string;
  state: string;
  language: string;
  languagecodes: string;
  tags: string;
  codec: string;
  bitrate: number;
  geo_lat: number | null;
  geo_long: number | null;
  stationuuid: string;
}

export async function fetchFMStationsFromRadioBrowser(
  limit: number = 1000
): Promise<RawStationData[]> {
  try {
    const response = await fetch(
      `${RADIO_BROWSER_API}/stations/search?limit=${limit}&order=votes&reverse=true&hidebroken=true&has_geo_info=true`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'RadioFrequencyApp/1.0',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`RadioBrowser API error: ${response.status}`);
    }

    const stations: RadioBrowserStation[] = await response.json();

    return stations
      .filter(
        (s) =>
          s.geo_lat !== null &&
          s.geo_long !== null &&
          s.countrycode &&
          s.name
      )
      .map((station) => {
        const tags = station.tags ? station.tags.split(',') : [];
        const licenseTier = detectLicenseTier({
          name: station.name,
          tags,
          homepage: station.homepage
        });

        return {
          stationName: station.name,
          callSign: undefined,
          frequencyKhz: undefined,
          bandName: 'FM' as const,
          country: station.country,
          countryCode: station.countrycode,
          city: station.state,
          state: station.state,
          latitude: station.geo_lat!,
          longitude: station.geo_long!,
          language: station.languagecodes || station.language || 'unknown',
          contentType: station.tags?.split(',')[0] || undefined,
          streamUrl: station.url_resolved || station.url,
          sourceName: 'RadioBrowser',
          sourceUrl: 'https://www.radio-browser.info',
          sourceLicense: 'Public Domain',
          licenseTier,
        };
      });
  } catch (error) {
    console.error('Error fetching from RadioBrowser:', error);
    return [];
  }
}

export async function fetchFMStationsByCountry(
  countryCode: string,
  limit: number = 500
): Promise<RawStationData[]> {
  try {
    const response = await fetch(
      `${RADIO_BROWSER_API}/stations/bycountrycodeexact/${countryCode}?limit=${limit}&hidebroken=true&has_geo_info=true`,
      {
        method: 'GET',
        headers: {
          'User-Agent': 'RadioFrequencyApp/1.0',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`RadioBrowser API error: ${response.status}`);
    }

    const stations: RadioBrowserStation[] = await response.json();

    return stations
      .filter(
        (s) =>
          s.geo_lat !== null &&
          s.geo_long !== null &&
          s.countrycode &&
          s.name
      )
      .map((station) => {
        const tags = station.tags ? station.tags.split(',') : [];
        const licenseTier = detectLicenseTier({
          name: station.name,
          tags,
          homepage: station.homepage
        });

        return {
          stationName: station.name,
          callSign: undefined,
          frequencyKhz: undefined,
          bandName: 'FM' as const,
          country: station.country,
          countryCode: station.countrycode,
          city: station.state,
          state: station.state,
          latitude: station.geo_lat!,
          longitude: station.geo_long!,
          language: station.languagecodes || station.language || 'unknown',
          contentType: station.tags?.split(',')[0] || undefined,
          streamUrl: station.url_resolved || station.url,
          sourceName: 'RadioBrowser',
          sourceUrl: 'https://www.radio-browser.info',
          sourceLicense: 'Public Domain',
          licenseTier,
        };
      });
  } catch (error) {
    console.error('Error fetching from RadioBrowser:', error);
    return [];
  }
}
