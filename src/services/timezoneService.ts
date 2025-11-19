const TIMEZONE_CACHE = new Map<string, string>();

export async function getTimezoneForCoordinates(latitude: number, longitude: number): Promise<string> {
  const cacheKey = `${latitude.toFixed(2)},${longitude.toFixed(2)}`;

  if (TIMEZONE_CACHE.has(cacheKey)) {
    return TIMEZONE_CACHE.get(cacheKey)!;
  }

  try {
    const response = await fetch(
      `https://api.wheretheiss.at/v1/coordinates/${latitude},${longitude}`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch timezone');
    }

    const data = await response.json();
    const timezone = data.timezone_id || 'UTC';

    TIMEZONE_CACHE.set(cacheKey, timezone);
    return timezone;
  } catch (error) {
    console.error('Failed to fetch timezone:', error);
    return 'UTC';
  }
}

export function getCurrentTimeInTimezone(timezone: string): Date {
  try {
    const dateString = new Date().toLocaleString('en-US', { timeZone: timezone });
    return new Date(dateString);
  } catch (error) {
    console.error('Failed to convert to timezone:', error);
    return new Date();
  }
}
