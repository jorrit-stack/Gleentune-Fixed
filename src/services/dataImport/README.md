# Radio Station Data Import Pipeline

This directory contains the complete data import pipeline for populating the global radio frequency database.

## Overview

The pipeline supports importing radio station data from multiple open-source APIs and datasets:

### FM (Frequency Modulation)
- **RadioBrowser API** - Community-driven database (Public Domain)
- **FCC FM Query** - US Federal Communications Commission (Public Domain)
- **Data.gov.in** - India government open data (Open Data License)

### AM/MW (Medium Wave)
- **FCC AM Query** - US Federal Communications Commission (Public Domain)

### SW (Shortwave) - Coming Soon
- **EiBi Shortwave List** - Schedule database
- **AOKI List** - Frequency coordination data

## Architecture

```
dataImport/
├── types.ts           # TypeScript interfaces
├── geocoding.ts       # City/country resolution via GeoNames
├── normalizer.ts      # Data transformation & deduplication
├── importer.ts        # Batch insert engine
├── fetchers/
│   ├── radioBrowser.ts   # RadioBrowser API client
│   ├── fcc.ts            # FCC API client
│   └── indiaGov.ts       # India Gov CSV parser
└── index.ts           # Main orchestration
```

## Usage

### Running FM Import

```typescript
import { runFMImport } from './services/dataImport';

// Import FM stations from all sources
const stats = await runFMImport();
console.log('Imported stations:', stats);
```

### Custom Import

```typescript
import {
  fetchFMStationsFromRadioBrowser,
  importStations,
} from './services/dataImport';

// Fetch data
const rawStations = await fetchFMStationsFromRadioBrowser(500);

// Import with custom config
const result = await importStations(rawStations, {
  batchSize: 50,
  deduplicateByFrequency: true,
  validateFrequency: true,
  skipInvalidCoordinates: false,
  logErrors: true,
});
```

## Data Flow

1. **Fetch** - Raw data retrieved from external APIs
2. **Normalize** - Convert to standard schema format
3. **Geocode** - Resolve cities/countries via GeoNames
4. **Deduplicate** - Remove duplicates by frequency + city + band
5. **Validate** - Check coordinates, frequencies, constraints
6. **Import** - Batch insert into Supabase tables

## Features

### Geocoding
- Automatic country/city resolution
- GeoNames API integration
- Coordinate validation
- Population data enrichment

### Deduplication
- Frequency + City + Band matching
- Prefer entries with stream URLs
- Skip existing stations

### Batch Processing
- Configurable batch sizes
- Progress tracking
- Error logging
- Transaction safety

### Data Quality
- Frequency validation (0-999999 kHz)
- Coordinate bounds checking (-90/90, -180/180)
- Station name normalization
- Source attribution

## Database Population

The pipeline populates these tables:
- `countries` - Country metadata with ISO codes
- `cities` - City locations with coordinates
- `bands` - Pre-populated (AM, FM, SW1-3)
- `stations` - Station details, frequencies, metadata
- `station_locations` - Transmitter coordinates
- `station_sources` - Data provenance tracking

## Import Statistics

After import, get statistics:

```typescript
import { getImportStats } from './services/dataImport';

const stats = await getImportStats();
// Returns:
// {
//   totalStations: 1234,
//   stationsByBand: { FM: 800, AM: 234, SW1: 50, ... },
//   stationsWithLocations: 950,
//   stationsWithSources: 1234
// }
```

## Next Steps

### Phase 2: AM Import
- Expand FCC AM fetcher
- Add international MW sources

### Phase 3: Shortwave Import
- Parse EiBi schedule files
- Map SW propagation regions
- Handle time-slot scheduling

### Phase 4: Enhancements
- Stream URL validation
- Power/coverage calculations
- Multi-language support
- Real-time verification

## Data Licenses

All sources use open, redistributable data:
- RadioBrowser: Public Domain
- FCC: US Government Public Domain
- Data.gov.in: Open Data License - India
- GeoNames: Creative Commons Attribution 4.0

## Notes

- GeoNames API requires username (currently using 'demo', get free account for production)
- FCC API may have rate limits
- RadioBrowser prefers User-Agent header
- All frequencies stored in kHz (FM: 88-108 MHz = 88000-108000 kHz)
