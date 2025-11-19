import type { RawStationData } from '../types';

const FCC_FM_API = 'https://publicfiles.fcc.gov/api-proxy/license-view/basicSearch/getLicenses';
const FCC_AM_API = 'https://publicfiles.fcc.gov/api-proxy/license-view/basicSearch/getLicenses';

interface FCCLicense {
  callSign: string;
  facilityId: string;
  serviceDesc: string;
  cityState: string;
  frequency: string;
  licensee: string;
  status: string;
}

export async function fetchFMStationsFromFCC(
  limit: number = 500
): Promise<RawStationData[]> {
  try {
    const response = await fetch(
      `${FCC_FM_API}?searchValue=&serviceCode=FM&statusCode=LICEN&sortColumn=callSign&pageSize=${limit}&pageNum=1`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      console.warn(`FCC API returned status ${response.status}`);
      return [];
    }

    const data = await response.json();

    if (!data.Licenses || !data.Licenses.License) {
      return [];
    }

    const licenses: FCCLicense[] = Array.isArray(data.Licenses.License)
      ? data.Licenses.License
      : [data.Licenses.License];

    return licenses
      .filter((license) => license.callSign && license.frequency)
      .map((license) => {
        const [city, state] = license.cityState?.split(',').map((s) => s.trim()) || [];
        const frequencyMhz = parseFloat(license.frequency);

        return {
          stationName: license.callSign,
          callSign: license.callSign,
          frequencyMhz: isNaN(frequencyMhz) ? undefined : frequencyMhz,
          bandName: 'FM' as const,
          country: 'United States',
          countryCode: 'US',
          city: city || undefined,
          state: state || undefined,
          owner: license.licensee,
          licenseType: license.serviceDesc,
          sourceName: 'FCC',
          sourceUrl: `https://publicfiles.fcc.gov/fm-profile/${license.callSign}`,
          sourceLicense: 'Public Domain (US Government)',
        };
      });
  } catch (error) {
    console.error('Error fetching from FCC:', error);
    return [];
  }
}

export async function fetchAMStationsFromFCC(
  limit: number = 500
): Promise<RawStationData[]> {
  try {
    const response = await fetch(
      `${FCC_AM_API}?searchValue=&serviceCode=AM&statusCode=LICEN&sortColumn=callSign&pageSize=${limit}&pageNum=1`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      console.warn(`FCC API returned status ${response.status}`);
      return [];
    }

    const data = await response.json();

    if (!data.Licenses || !data.Licenses.License) {
      return [];
    }

    const licenses: FCCLicense[] = Array.isArray(data.Licenses.License)
      ? data.Licenses.License
      : [data.Licenses.License];

    return licenses
      .filter((license) => license.callSign && license.frequency)
      .map((license) => {
        const [city, state] = license.cityState?.split(',').map((s) => s.trim()) || [];
        const frequencyKhz = parseFloat(license.frequency);

        return {
          stationName: license.callSign,
          callSign: license.callSign,
          frequencyKhz: isNaN(frequencyKhz) ? undefined : frequencyKhz,
          bandName: 'AM' as const,
          country: 'United States',
          countryCode: 'US',
          city: city || undefined,
          state: state || undefined,
          owner: license.licensee,
          licenseType: license.serviceDesc,
          sourceName: 'FCC',
          sourceUrl: `https://publicfiles.fcc.gov/am-profile/${license.callSign}`,
          sourceLicense: 'Public Domain (US Government)',
        };
      });
  } catch (error) {
    console.error('Error fetching from FCC:', error);
    return [];
  }
}
