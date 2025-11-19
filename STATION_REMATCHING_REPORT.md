# Station Re-matching Report

## Executive Summary

After expanding the global city database from ~15,000 to **168,038 cities** across 246 countries, all radio stations with geographic coordinates have been successfully matched to cities within a 100km radius.

## Before/After Comparison

### Match Rate Improvement

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| **FM Stations with Coordinates** | 183 | 183 | - |
| **FM Matched to Cities** | 45 (25%) | 183 (100%) | **+138 stations** |
| **FM Match Rate** | 24.6% | **100%** | **+75.4%** |
| | | | |
| **AM Stations with Coordinates** | 49 | 49 | - |
| **AM Matched to Cities** | 14 (29%) | 49 (100%) | **+35 stations** |
| **AM Match Rate** | 28.6% | **100%** | **+71.4%** |
| | | | |
| **Total Stations with Coordinates** | 232 | 232 | - |
| **Total Matched** | 59 (25%) | 232 (100%) | **+173 stations** |
| **Overall Match Rate** | 25.4% | **100%** | **+74.6%** |

### Station Inventory

#### Total Stations in Database: **1,419**

**By Band:**
- FM Stations: 1,279 total
  - With coordinates: 183 (14.3%)
  - Matched to cities: 183 (100% of those with coords)
  - Without coordinates: 1,096 (85.7%)

- AM Stations: 140 total
  - With coordinates: 49 (35.0%)
  - Matched to cities: 49 (100% of those with coords)
  - Without coordinates: 91 (65.0%)

**Key Finding:** 83.7% of all stations (1,187 out of 1,419) lack geographic coordinates in RadioBrowser data, preventing city matching.

## Top 20 Countries by Total Stations

| Rank | Country | ISO | Total | Matched | Unmatched | Match Rate |
|------|---------|-----|-------|---------|-----------|------------|
| 1 | Mexico | MX | 217 | 217 | 0 | 100% |
| 2 | Argentina | AR | 6 | 6 | 0 | 100% |
| 3 | France | FR | 3 | 3 | 0 | 100% |
| 4 | Ecuador | EC | 2 | 2 | 0 | 100% |
| 5 | Spain | ES | 2 | 2 | 0 | 100% |
| 6 | Bulgaria | BG | 1 | 1 | 0 | 100% |
| 7 | Canada | CA | 1 | 1 | 0 | 100% |

**Note:** 1,187 stations (83.7%) could not be matched to any country because RadioBrowser did not provide geographic coordinates for them.

## Top 10 Countries by Unmatched Stations

**None.** All stations with geographic coordinates have been successfully matched to cities.

Stations without matches lack coordinates in the source data (RadioBrowser), not because of missing city coverage.

## City Database Coverage

### Before Expansion:
- Total cities: ~15,000
- Countries covered: ~12 major countries
- Geographic gaps: United States, Russia, most of Asia, Africa, South America

### After Expansion:
- Total cities: **168,038**
- Countries covered: **246 countries**
- Top coverage by country:
  1. United States: 17,304 cities
  2. Italy: 10,269 cities
  3. France: 10,047 cities
  4. Mexico: 9,091 cities
  5. Germany: 7,586 cities
  6. Spain: 7,285 cities
  7. India: 6,929 cities
  8. Brazil: 5,872 cities
  9. China: 5,230 cities
  10. Russia: 4,885 cities

## Technical Details

### Matching Algorithm
- **Radius:** 100 kilometers
- **Method:** Haversine distance calculation
- **Priority:** Nearest city within radius
- **Deduplication:** By (frequency_khz, city_id, band_id)

### Database Changes
1. Modified unique constraint on cities table from `(city_name, country_id)` to `(city_name, country_id, latitude, longitude)`
2. Imported 138,138 new cities from GeoNames cities1000.txt dataset
3. Re-indexed geographic lookup indexes for optimal performance
4. Updated all 232 station_locations records with matched city_id values

### Performance
- Import time: ~5 minutes for 162,885 city records
- Re-matching time: ~2 minutes for 1,419 stations
- Match success rate: **100%** for stations with coordinates

## Recommendations

1. **Improve RadioBrowser Data Quality:** 83.7% of stations lack coordinates. Consider:
   - Supplementing with FCC data for US stations
   - Using government radio frequency databases for other countries
   - Crowdsourcing coordinate data

2. **Alternative Matching Strategies:** For stations without coordinates:
   - Parse city names from station names/descriptions
   - Use text-based city matching
   - Manual curation for major stations

3. **Data Maintenance:**
   - Regular updates from GeoNames (quarterly recommended)
   - Monitor new station additions for coordinate availability
   - Implement automatic re-matching when new cities are added

## Conclusion

The city database expansion was **highly successful**, achieving a **100% match rate** for all stations with geographic coordinates. The match rate improvement from 25.4% to 100% represents a **+173 station** increase in successfully geocoded stations.

The primary limitation is now the RadioBrowser data source itself, which lacks coordinates for 83.7% of stations. Future improvements should focus on supplementing or replacing this data source with more complete geographic information.
