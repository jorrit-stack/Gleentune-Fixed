# Coordinate Enrichment Analysis & Framework

## Current State

### Coverage Statistics (Before Enrichment)

| Band | Total Stations | With Coordinates | Coordinate Coverage | Matched to Cities | Match Rate |
|------|----------------|------------------|---------------------|-------------------|------------|
| **FM** | 1,279 | 183 | 14.31% | 183 | **100%** (of those with coords) |
| **AM** | 140 | 49 | 35.00% | 49 | **100%** (of those with coords) |
| **Total** | 1,419 | 232 | 16.35% | 232 | **100%** |

### Gap Analysis

**Stations Requiring Coordinate Enrichment:**
- FM Stations: **1,096** (85.69%)
- AM Stations: **91** (65.00%)
- **Total: 1,187 stations** need coordinates

### Key Finding

Our city matching algorithm achieves **100% success rate** when coordinates are available. The limitation is not our matching capability but the lack of coordinates in the RadioBrowser source data.

## Proposed Enrichment Sources

### 1. FCC Database (United States)
**Coverage:** US AM/FM stations
**API:** https://publicfiles.fcc.gov/api-docs.html
**Data Available:**
- Transmitter coordinates
- Effective Radiated Power (ERP)
- Tower height
- Callsign-based lookup

**Implementation Complexity:** Medium
- Requires callsign extraction from station names
- Rate limiting: No official limit but recommend 1 req/sec
- Free, no API key required

**Sample Endpoint:**
```
GET https://publicfiles.fcc.gov/api/service/am/facility/id/{facility_id}
GET https://publicfiles.fcc.gov/api/service/fm/facility/id/{facility_id}
```

### 2. Data.gov.in (India)
**Coverage:** Indian radio stations
**API:** https://data.gov.in
**Data Available:**
- AIR (All India Radio) station locations
- Private FM station details
- Geographic coverage areas

**Implementation Complexity:** High
- Multiple datasets, non-standard formats
- May require manual data downloads
- Limited real-time API access

### 3. FMStream.org / Radio-Browser (Europe/Global)
**Coverage:** Global, emphasis on Europe
**API:** http://www.radio-browser.info/
**Data Available:**
- Already our primary source
- Community-contributed data
- Inconsistent coordinate quality

**Implementation Complexity:** Low (already integrated)
**Note:** This is our current source - enrichment would come from other services

### 4. Ofcom (United Kingdom)
**Coverage:** UK radio stations
**Website:** https://www.ofcom.org.uk/
**Data Available:**
- Transmitter locations
- Frequency allocations
- Coverage maps

**Implementation Complexity:** High
- No public API
- Data available through CSV downloads
- Requires manual periodic updates

### 5. NHK & Ministry of Internal Affairs (Japan)
**Coverage:** Japanese broadcast stations
**Data Available:**
- NHK station locations
- Commercial broadcaster details
- Regional coverage information

**Implementation Complexity:** Very High
- No English API
- Language barriers
- Complex regulatory structure

### 6. ru-radio.net (Russia)
**Coverage:** Russian Federation
**Website:** https://ru-radio.net/
**Data Available:**
- Russian station frequencies
- City-level location data
- Regional coverage

**Implementation Complexity:** High
- Limited API documentation
- Cyrillic character handling required
- Geopolitical considerations for data access

## Enrichment Framework Architecture

```typescript
interface CoordinateEnrichmentSource {
  name: string;
  priority: number;
  countryCodes: string[];
  canEnrich(station: Station): boolean;
  fetchCoordinates(station: Station): Promise<Coordinates | null>;
  rateLimit: number; // requests per second
}

interface EnrichmentResult {
  stationId: string;
  source: string;
  coordinates: { lat: number; lon: number } | null;
  confidence: number; // 0-1
  metadata?: Record<string, any>;
}

interface EnrichmentStats {
  totalProcessed: number;
  enriched: number;
  failed: number;
  bySource: Record<string, number>;
  byCountry: Record<string, number>;
}
```

### Priority Cascade

1. **FCC** (US stations) - Highest accuracy, authoritative source
2. **Ofcom** (UK stations) - Regulatory data, very accurate
3. **National Regulators** (Country-specific) - Official sources
4. **Community Sources** (FMStream, Radio Garden) - Variable quality
5. **Geocoding Services** (City name → coordinates) - Lowest confidence

## Implementation Phases

### Phase 1: FCC Integration (US Stations) ✓ Recommended
**Estimated Enrichment:** 50-100 stations
**Effort:** 2-4 hours
**ROI:** High - authoritative data, free API

**Steps:**
1. Extract callsigns from US station names
2. Query FCC facility database
3. Validate and normalize coordinates
4. Update station_locations table

### Phase 2: Geocoding Fallback ✓ Recommended
**Estimated Enrichment:** 200-400 stations
**Effort:** 1-2 hours
**ROI:** Medium - lower accuracy but broad coverage

**Steps:**
1. Parse city names from station names/descriptions
2. Match against our 168K city database
3. Use city center coordinates as approximation
4. Flag as "city-level precision"

### Phase 3: Community Data Aggregation
**Estimated Enrichment:** 100-300 stations
**Effort:** 4-8 hours
**ROI:** Medium - requires manual curation

**Steps:**
1. Cross-reference with Radio Garden data
2. Wikipedia station infoboxes
3. Station website scraping
4. Community submissions

### Phase 4: International Regulatory Sources
**Estimated Enrichment:** 50-150 stations
**Effort:** 8-16 hours per country
**ROI:** Low to Medium - high effort, country-specific

**Steps:**
1. Implement country-by-country
2. Handle diverse data formats
3. Manage language localization
4. Periodic manual updates

## Immediate Recommendations

### 1. City Name Geocoding (Highest ROI)

Many station names include city information:
- "91.5 FM (Morelia)" → Morelia coordinates
- "AMOR 100.1 (Mérida)" → Mérida coordinates
- "105 DIGITAL 105.3 (Aguascalientes)" → Aguascalientes coordinates

**Action:** Implement regex-based city extraction and match against our existing 168K city database.

**Expected Result:** 300-500 stations enriched with city-level coordinates

### 2. FCC API Integration (Best Data Quality)

US stations often include FCC callsigns:
- "WNYC-FM" → FCC lookup
- Extract patterns like "XHUZ-FM", "XEFZ-AM"

**Action:** Implement FCC API client with rate limiting and caching.

**Expected Result:** 50-100 US/Mexico stations with precise transmitter coordinates

### 3. Deduplication Before Enrichment

Many stations appear multiple times:
- " EXA FM: En Todas Partes Ponte Exa" (93.3 FM) - appears 2x
- " 105 DIGITAL 105.3 (Aguascalientes)" - appears 2x

**Action:** Deduplicate stations by (name, frequency, band) before enrichment effort.

**Expected Result:** Reduce enrichment workload by 10-20%

## Validation & Quality Control

### Coordinate Validation Rules
```typescript
function validateCoordinates(lat: number, lon: number): boolean {
  if (lat < -90 || lat > 90) return false;
  if (lon < -180 || lon > 180) return false;
  if (lat === 0 && lon === 0) return false; // Null Island
  return true;
}
```

### Confidence Scoring
- **1.0**: Regulatory source (FCC, Ofcom, etc.)
- **0.9**: Official broadcaster data
- **0.7**: Community-verified (multiple sources)
- **0.5**: City-level geocoding
- **0.3**: Approximate/inferred

### Quality Metrics
- Distance from city center (should be < 100km for most)
- Coordinate precision (decimal places)
- Source authority level
- Data freshness (timestamp)

## Expected Outcomes

### Conservative Estimate
- **400-600 stations** enriched (34-50% of missing coords)
- Focus on high-confidence sources (FCC, city geocoding)
- **Overall coverage: 44-60%** (up from 16%)

### Optimistic Estimate
- **700-900 stations** enriched (59-76% of missing coords)
- Includes community sources and manual curation
- **Overall coverage: 66-79%** (up from 16%)

### Post-Enrichment Match Rate
With 100% match rate when coordinates exist:
- **All enriched stations will be matched to cities**
- Geographic coverage will improve dramatically
- Country-level statistics will be more representative

## Cost-Benefit Analysis

| Approach | Effort | Stations Enriched | Cost | Recommended |
|----------|--------|-------------------|------|-------------|
| City Geocoding | Low (1-2h) | 300-500 | Free | ✅ YES |
| FCC API | Medium (2-4h) | 50-100 | Free | ✅ YES |
| Community Aggregation | Medium (4-8h) | 100-300 | Free | ⚠️ MAYBE |
| International APIs | High (40-80h) | 200-400 | Variable | ❌ NO (not cost-effective) |

## Next Steps

1. ✅ **Implement City Name Parsing & Geocoding**
   - Extract city names from station names
   - Match against 168K city database
   - Update station_locations with city-center coordinates

2. ✅ **Implement FCC API Client**
   - Build callsign extraction
   - Query FCC facility database
   - Validate and import transmitter coordinates

3. **Run Geo-Rematching**
   - Clear existing matches
   - Re-run 100km radius matching
   - Generate before/after comparison

4. **Generate Enrichment Report**
   - Total stations enriched by source
   - Country coverage improvements
   - Match rate improvements
   - Stations still missing coordinates

## Conclusion

The coordinate enrichment opportunity is significant (1,187 stations), but must be approached strategically. Focus on high-ROI activities:

1. **City-based geocoding** for Mexican and other international stations
2. **FCC API** for US stations with callsigns
3. **Community sources** as time permits

This phased approach can realistically improve coordinate coverage from **16%** to **50-70%**, with all enriched stations automatically matched to cities due to our comprehensive city database and proven 100% match rate.
