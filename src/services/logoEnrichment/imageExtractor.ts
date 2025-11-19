import { checkRobotsTxt, isRateLimited } from './robotsChecker';

export interface ExtractedLogo {
  url: string;
  source: 'favicon' | 'og-image' | 'apple-touch-icon' | 'link-icon';
  size?: number;
  sourceUrl: string;
}

const MAX_IMAGE_SIZE = 30 * 1024;
const TIMEOUT_MS = 10000;

export async function extractFavicon(websiteUrl: string): Promise<ExtractedLogo | null> {
  try {
    const urlObj = new URL(websiteUrl);
    const domain = urlObj.hostname;

    if (isRateLimited(domain)) {
      console.log(`Rate limited for ${domain}, skipping...`);
      return null;
    }

    const robotsCheck = await checkRobotsTxt(websiteUrl);
    if (!robotsCheck.allowed) {
      console.log(`Robots.txt disallows: ${websiteUrl} - ${robotsCheck.reason}`);
      return null;
    }

    const faviconUrl = `${urlObj.protocol}//${urlObj.host}/favicon.ico`;

    const response = await fetch(faviconUrl, {
      method: 'HEAD',
      signal: AbortSignal.timeout(TIMEOUT_MS)
    });

    if (!response.ok) {
      return null;
    }

    const contentType = response.headers.get('content-type');
    if (!contentType?.startsWith('image/')) {
      return null;
    }

    const contentLength = response.headers.get('content-length');
    const size = contentLength ? parseInt(contentLength) : 0;

    if (size > MAX_IMAGE_SIZE) {
      console.log(`Favicon too large: ${size} bytes for ${websiteUrl}`);
      return null;
    }

    return {
      url: faviconUrl,
      source: 'favicon',
      size,
      sourceUrl: websiteUrl
    };
  } catch (error) {
    return null;
  }
}

export async function extractMetaImages(websiteUrl: string): Promise<ExtractedLogo | null> {
  try {
    const urlObj = new URL(websiteUrl);
    const domain = urlObj.hostname;

    if (isRateLimited(domain)) {
      console.log(`Rate limited for ${domain}, skipping...`);
      return null;
    }

    const robotsCheck = await checkRobotsTxt(websiteUrl);
    if (!robotsCheck.allowed) {
      console.log(`Robots.txt disallows: ${websiteUrl} - ${robotsCheck.reason}`);
      return null;
    }

    const response = await fetch(websiteUrl, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: {
        'User-Agent': 'RadioCatalogBot/1.0 (Logo Attribution Bot)'
      }
    });

    if (!response.ok) {
      return null;
    }

    const html = await response.text();

    const ogImageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i) ||
                        html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i);

    if (ogImageMatch) {
      const imageUrl = resolveUrl(ogImageMatch[1], websiteUrl);
      const validation = await validateImage(imageUrl);
      if (validation.valid) {
        return {
          url: imageUrl,
          source: 'og-image',
          size: validation.size,
          sourceUrl: websiteUrl
        };
      }
    }

    const appleTouchMatch = html.match(/<link[^>]*rel=["']apple-touch-icon["'][^>]*href=["']([^"']+)["']/i) ||
                           html.match(/<link[^>]*href=["']([^"']+)["'][^>]*rel=["']apple-touch-icon["']/i);

    if (appleTouchMatch) {
      const imageUrl = resolveUrl(appleTouchMatch[1], websiteUrl);
      const validation = await validateImage(imageUrl);
      if (validation.valid) {
        return {
          url: imageUrl,
          source: 'apple-touch-icon',
          size: validation.size,
          sourceUrl: websiteUrl
        };
      }
    }

    const linkIconMatch = html.match(/<link[^>]*rel=["']icon["'][^>]*href=["']([^"']+)["']/i) ||
                         html.match(/<link[^>]*href=["']([^"']+)["'][^>]*rel=["']icon["']/i);

    if (linkIconMatch) {
      const imageUrl = resolveUrl(linkIconMatch[1], websiteUrl);
      const validation = await validateImage(imageUrl);
      if (validation.valid) {
        return {
          url: imageUrl,
          source: 'link-icon',
          size: validation.size,
          sourceUrl: websiteUrl
        };
      }
    }

    return null;
  } catch (error) {
    return null;
  }
}

async function validateImage(imageUrl: string): Promise<{ valid: boolean; size?: number }> {
  try {
    const response = await fetch(imageUrl, {
      method: 'HEAD',
      signal: AbortSignal.timeout(5000)
    });

    if (!response.ok) {
      return { valid: false };
    }

    const contentType = response.headers.get('content-type');
    if (!contentType?.startsWith('image/')) {
      return { valid: false };
    }

    const contentLength = response.headers.get('content-length');
    const size = contentLength ? parseInt(contentLength) : 0;

    if (size > MAX_IMAGE_SIZE) {
      return { valid: false };
    }

    return { valid: true, size };
  } catch (error) {
    return { valid: false };
  }
}

function resolveUrl(relativeUrl: string, baseUrl: string): string {
  try {
    return new URL(relativeUrl, baseUrl).href;
  } catch {
    return relativeUrl;
  }
}

export async function extractLogo(websiteUrl: string): Promise<ExtractedLogo | null> {
  if (!websiteUrl || !websiteUrl.startsWith('http')) {
    return null;
  }

  const metaImage = await extractMetaImages(websiteUrl);
  if (metaImage) {
    return metaImage;
  }

  const favicon = await extractFavicon(websiteUrl);
  if (favicon) {
    return favicon;
  }

  return null;
}
