# Logo Enrichment Service

A legal and compliant logo enrichment system for AM/FM radio stations that respects robots.txt, implements rate limiting, and provides proper attribution for nominative fair use.

## Features

### 3-Tier Logo Sourcing Strategy

1. **Radio Browser** (existing) - CC0 licensed logos
2. **Favicon** - Standard favicon.ico files from station websites
3. **Meta Images** - Open Graph images and Apple touch icons

### Legal Compliance

- ✅ **Respects robots.txt** for all domains
- ✅ **Rate limiting** (1 request per second per domain)
- ✅ **Small thumbnails** (≤30KB, validates image sizes)
- ✅ **Attribution metadata** stored (source_url, retrieved_at)
- ✅ **Nominative fair use** - logos used only for identification
- ✅ **Display attribution** - UI shows "Logo © [Station Name] • Used for identification only"

## Usage

### Run Logo Enrichment

```bash
npm run build
tsx scripts/enrich-am-fm-logos.ts
```

### Programmatic Usage

```typescript
import { enrichAllAMFMLogos, enrichAMFMLogos } from './services/logoEnrichment';

// Enrich all AM and FM stations
const results = await enrichAllAMFMLogos((bandType, stats) => {
  console.log(`${bandType}: ${stats.successful}/${stats.total} successful`);
});

// Enrich only FM stations (limit 100)
const fmStats = await enrichAMFMLogos('FM', 100);
```

## How It Works

### 1. robots.txt Checker (`robotsChecker.ts`)

- Fetches and parses robots.txt
- Caches rules for 24 hours
- Implements rate limiting per domain
- Returns whether a URL is allowed to be crawled

### 2. Image Extractor (`imageExtractor.ts`)

Attempts logo extraction in this order:

1. **Open Graph Image** (`<meta property="og:image">`)
2. **Apple Touch Icon** (`<link rel="apple-touch-icon">`)
3. **Link Icon** (`<link rel="icon">`)
4. **Favicon** (`/favicon.ico`)

Validates each image:
- Must be ≤30KB
- Must be valid image content-type
- Must be accessible (HEAD request)

### 3. Main Service (`index.ts`)

- Processes stations in batches
- Updates database with logo metadata
- Stores attribution information:
  - `logo_url` - The image URL
  - `logo_source` - Where it came from (favicon, og-image, etc.)
  - `source_url` - Original website URL
  - `retrieved_at` - Timestamp
  - `logo_verified` - Validation status
  - `logo_last_checked` - Last check timestamp

## Database Schema

### Logo Attribution Fields

```sql
ALTER TABLE radio_stations ADD COLUMN source_url text;
ALTER TABLE radio_stations ADD COLUMN retrieved_at timestamptz;
ALTER TABLE stations ADD COLUMN source_url text;
ALTER TABLE stations ADD COLUMN retrieved_at timestamptz;
ALTER TABLE shortwave_stations ADD COLUMN source_url text;
ALTER TABLE shortwave_stations ADD COLUMN retrieved_at timestamptz;
```

### Unified View

The `stations_view` includes all logo attribution fields:
- `logo_url`
- `logo_source`
- `source_url`
- `retrieved_at`
- `logo_verified`
- `logo_last_checked`

## Legal Compliance Checklist

### Nominative Fair Use Requirements ✅

1. ✅ **Product not identifiable without trademark** - Radio stations need their logos for identification
2. ✅ **Use only what's necessary** - Small thumbnails, typically ≤100x100px equivalent
3. ✅ **No implied endorsement** - Clear "Used for identification only" disclaimer
4. ✅ **Proper attribution** - "Logo © [Station Name]" displayed
5. ✅ **Link back to source** - Source URL stored and can be linked

### Technical Safeguards ✅

- Respects robots.txt (won't crawl if disallowed)
- Rate limiting (max 1 req/sec per domain)
- Validates image sizes (≤30KB)
- Stores source attribution
- Only uses logos for identification, not branding
- Non-commercial context (informational directory)

## Example Output

```
🎨 Starting AM/FM Logo Enrichment Process
=========================================

AM Progress: 198/198 | ✅ 38 | ❌ 140 | ⏭️ 20
FM Progress: 1638/1638 | ✅ 652 | ❌ 715 | ⏭️ 271

📊 Final Results
================

AM Stations:
  Total stations: 198
  Processed: 198
  ✅ Successful: 38
  ❌ Failed: 140
  ⏭️ Skipped: 20
  Success rate: 19.2%

FM Stations:
  Total stations: 1638
  Processed: 1638
  ✅ Successful: 652
  ❌ Failed: 715
  ⏭️ Skipped: 271
  Success rate: 39.8%

⏱️ Total time: 2847.3s
📈 Overall success rate: 37.6%

✅ Logo enrichment complete!
```

## UI Attribution Display

Logos are displayed with attribution in the VintageRadio component:

```tsx
{currentStation.logo_url && currentStation.logo_source &&
 currentStation.logo_source !== 'generated' && (
  <div className="text-[10px] text-amber-400/70 mt-1 truncate"
       title={`Logo source: ${currentStation.source_url || '...'}`}>
    Logo © {currentStation.name} • Used for identification only
  </div>
)}
```

## Limitations

- Only processes stations with `website_url` field populated
- Skips stations that already have Radio Browser logos
- Cannot extract logos from sites that block automated access
- May fail for sites with non-standard HTML structure
- Rate limiting means processing takes time (~1 second per station)

## Future Improvements

- Add retry logic for failed requests
- Implement caching of successful logo extractions
- Add support for more image formats
- Batch processing optimization
- Periodic re-validation of existing logos
