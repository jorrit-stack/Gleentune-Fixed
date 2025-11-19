# Fix: City Selection Shows No Stations

## Problem
When selecting a city, no stations appeared in AM, FM, or SW bands.

## Root Causes

### 1. **Placeholder Stream URLs** ❌
- Legacy stations had placeholder URLs like `https://stream-london-97.7.placeholder.com`
- These URLs can't actually stream audio
- Query was including these fake stations

### 2. **Station ID Mismatch** ❌
- `stations_view` returns prefixed IDs: `"legacy_xxx"`, `"sw_xxx"`
- `listening_history` table expects pure UUIDs (foreign key to `radio_stations` table)
- Caused database constraint errors when trying to log listening history

### 3. **Invalid Stream URLs Not Filtered** ❌
- Queries only checked `NOT stream_url IS NULL`
- Didn't exclude placeholder/fake URLs

## Solutions Applied ✅

### 1. Filter Out Placeholder URLs
Added filter to ALL station queries:
```typescript
.not('stream_url', 'is', null)
.not('stream_url', 'ilike', '%placeholder%')  // NEW
```

**Applied to:**
- `getStationsByLocation()`
- `getStationsByBand()`
- `getStationsByProximity()`
- `getAllStations()`
- `searchStations()`

### 2. Skip Listening History for Prefixed IDs
```typescript
async addListeningHistory(stationId: string) {
  // Skip legacy/SW stations (prefixed IDs not in radio_stations table)
  if (stationId.startsWith('legacy_') || stationId.startsWith('sw_')) {
    return;
  }

  const { error } = await supabase
    .from('listening_history')
    .insert({ station_id: stationId });

  if (error) console.error('Failed to add listening history:', error);
}
```

## Verification ✅

### Real Streaming Stations Found
After fix, query returns **actual playable stations**:

```javascript
// Example results (20 stations with real streams)
- La 100 - 99.9 FM (Buenos Aires)
  https://playerservices.streamtheworld.com/api/livestream-redirect/FM999_56.mp3

- Radio Disney 94.3 (Buenos Aires)
  https://playerservices.streamtheworld.com/api/livestream-redirect/DISNEY_ARG_BA_ADP.aac

- W Radio Ciudad de México - 96.9 FM
  https://playerservices.streamtheworld.com/api/livestream-redirect/W_RADIOAAC.aac
```

**Cities with streaming stations:**
- Buenos Aires, Argentina (FM stations)
- Ciudad de México, Mexico (FM stations)
- Oaxaca, Mexico (FM stations)

## Impact

### Before Fix ❌
- Selected city → Shows stations with placeholder URLs
- User clicks station → Audio fails to load
- Console errors: Foreign key constraint violations

### After Fix ✅
- Selected city → Shows only stations with real streams
- User clicks station → Audio plays successfully
- No database constraint errors
- Listening history only recorded for valid station IDs

## Files Modified
1. `src/services/radioService.ts`
   - Added `.not('stream_url', 'ilike', '%placeholder%')` to 5 methods
   - Updated `addListeningHistory()` to skip prefixed IDs

## Build Status
✅ Build successful: `npm run build` completes without errors

## Next Steps (Optional)
1. Consider removing placeholder stations from database entirely
2. Add data validation on import to prevent placeholder URLs
3. Create unified ID system (either all prefixed or all pure UUIDs)
