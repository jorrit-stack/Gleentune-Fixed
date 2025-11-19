export interface StreamValidationResult {
  isValid: boolean;
  contentType?: string;
  error?: string;
}

const VALID_AUDIO_TYPES = [
  'audio/mpeg',
  'audio/aac',
  'audio/aacp',
  'audio/mp3',
  'audio/mp4',
  'application/x-mpegurl',
  'application/vnd.apple.mpegurl',
  'audio/x-mpegurl',
  'application/octet-stream'
];

export async function validateStreamInBackground(
  url: string,
  onValidationResult: (result: StreamValidationResult) => void,
  timeoutMs: number = 7000
): Promise<void> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      mode: 'cors',
      cache: 'no-cache'
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      onValidationResult({
        isValid: false,
        error: `HTTP ${response.status}: ${response.statusText}`
      });
      return;
    }

    const contentType = response.headers.get('content-type')?.toLowerCase() || '';

    const isValidAudio = VALID_AUDIO_TYPES.some(type =>
      contentType.includes(type.toLowerCase())
    );

    if (!isValidAudio && contentType) {
      onValidationResult({
        isValid: false,
        contentType,
        error: `Invalid content type: ${contentType}`
      });
      return;
    }

    onValidationResult({
      isValid: true,
      contentType
    });
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        onValidationResult({
          isValid: false,
          error: 'Connection timeout'
        });
        return;
      }

      onValidationResult({
        isValid: false,
        error: error.message
      });
      return;
    }

    onValidationResult({
      isValid: false,
      error: 'Unknown error'
    });
  }
}

export function isShortWaveBand(band: string): boolean {
  return band === 'SW' || band === 'SW1' || band === 'SW2' || band === 'SW3';
}
