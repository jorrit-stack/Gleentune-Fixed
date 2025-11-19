# GleeTune Logo Implementation Guide

## 🎯 Overview

This document outlines the complete logo system implementation for GleeTune, ensuring full legal compliance and sustainability across all 5 bands (AM, FM, SW1, SW2, SW3).

---

## ✅ Legal Compliance Strategy

### **Sources We Use:**

1. **Radio Browser API** (CC0 Licensed)
   - Public domain favicons
   - 100% safe to use and display
   - Primary source when available

2. **Station Website Favicons** (Editorial Use)
   - Hotlinked from original source (no redistribution)
   - Editorial use under fair use doctrine
   - Attribution tracked in database

3. **Auto-Generated Fallbacks** (Owned by GleeTune)
   - SVG badges with station initials
   - Gradient backgrounds based on station name hash
   - 100% original content

### **What We DON'T Do:**

❌ Store copyrighted logos locally
❌ Redistribute copyrighted images
❌ Use logos without attribution
❌ Scrape private/protected images

### **Safe Harbor Protection:**

The following footer is displayed on the main page:

> "Station logos and stream links are publicly sourced via RadioBrowser and official station websites. GleeTune does not host or redistribute copyrighted media. All streams are provided by their respective broadcasters."

This provides transparency and demonstrates good faith compliance.

---

## 🗄️ Database Schema

### **Logo Fields (All Station Tables):**

```sql
-- Added to: radio_stations, stations, shortwave_stations

logo_url              TEXT         -- External hotlink (NOT stored locally)
logo_source           TEXT         -- 'radio-browser' | 'favicon' | 'generated' | 'manual'
logo_verified         BOOLEAN      -- Manual quality verification flag
logo_last_checked     TIMESTAMPTZ  -- Last validation timestamp
```

### **Logo Source Attribution:**

| Source | Description | Legal Status | Verified by Default |
|--------|-------------|--------------|---------------------|
| `radio-browser` | CC0 licensed favicons from Radio Browser API | ✅ Public Domain | Yes |
| `favicon` | Hotlinked from station's official website | ✅ Editorial Use | No (needs validation) |
| `generated` | Auto-generated SVG by GleeTune | ✅ Original Content | Yes |
| `manual` | Manually curated/uploaded by admin | ⚠️ Requires verification | No |

---

## 🔧 Implementation Details

### **1. Database Migration**

Location: `supabase/migrations/add_logo_support_to_all_bands.sql`

- Adds logo fields to all station tables
- Creates indexes for efficient queries
- Adds comments for legal clarity

### **2. Logo Service**

Location: `src/services/logoService.ts`

**Key Functions:**

```typescript
// Fetch logo with priority: Radio Browser → Favicon → Generated
fetchStationLogo(stationName, homepage?, radioBrowserFavicon?)

// Generate fallback logo with station initials
generateFallbackLogo(stationName)

// Update station logo in database
updateStationLogo(table, stationId, logoData)

// Bulk populate logos (for scripts)
bulkPopulateLogos(table, limit)
```

### **3. UI Integration**

Location: `src/App.tsx`

**Station Grid Display:**
- Shows logo (40x40px) next to station name
- Fallback to initials badge if logo fails to load
- Error handling for broken images
- Responsive design (works on mobile)

**Logo Display Logic:**
```typescript
{station.logo_url ? (
  <img src={station.logo_url} alt={`${station.name} logo`} />
) : (
  <div>{station.name.substring(0, 2).toUpperCase()}</div>
)}
```

### **4. Logo Population Script**

Location: `scripts/populate-station-logos.ts`

**Usage:**
```bash
npx tsx scripts/populate-station-logos.ts
```

**What it does:**
1. Scans all station tables for missing logos
2. Prioritizes Radio Browser favicons (CC0)
3. Falls back to website favicon URLs
4. Generates SVG badges for remaining stations
5. Updates database with attribution metadata

---

## 📊 Logo Priority System

```
1. Radio Browser Favicon (CC0)
   └─ Safe, verified, public domain

2. Website Favicon (hotlinked)
   └─ Editorial use, attribution tracked

3. Generated SVG Badge
   └─ Fallback, 100% original
```

---

## 🎨 Fallback Logo Design

**Auto-generated logos feature:**
- Station initials (2 letters)
- Gradient background (8 color schemes)
- Deterministic colors (same station = same color)
- SVG format (scales perfectly)
- 120x120px base size

**Example:**
```
Station: "BBC World Service"
Initials: "BW"
Color: Blue gradient
```

---

## 🚀 How to Use

### **For New Stations:**

When adding stations via import scripts, logos are automatically populated based on available data (favicon field from Radio Browser).

### **For Existing Stations:**

Run the logo population script:
```bash
npx tsx scripts/populate-station-logos.ts
```

### **Manual Verification:**

To mark a logo as verified:
```sql
UPDATE radio_stations
SET logo_verified = true
WHERE id = 'station-id';
```

---

## 📋 Compliance Checklist

- ✅ All logos hotlinked (not hosted)
- ✅ Attribution tracked in `logo_source` field
- ✅ Fallback system for missing logos
- ✅ Footer disclaimer on main page
- ✅ No redistribution of copyrighted content
- ✅ Editorial use for station favicons
- ✅ CC0 preference for Radio Browser
- ✅ Verification flags for quality control

---

## 🔄 Maintenance

### **Periodic Tasks:**

1. **Revalidate Logo URLs** (monthly)
   - Check `logo_last_checked` timestamps
   - Verify external URLs still work
   - Update broken links

2. **Manual Verification** (as needed)
   - Review `logo_verified = false` entries
   - Validate favicon sources
   - Mark verified logos

3. **Copyright Monitoring** (ongoing)
   - Respect takedown requests
   - Monitor for logo policy changes
   - Update attribution as needed

---

## 🛡️ Legal Protection

### **Why This Approach is Safe:**

1. **Hotlinking (not hosting)** = No redistribution liability
2. **Attribution tracking** = Transparency & good faith
3. **CC0 preference** = Public domain when possible
4. **Editorial use** = Fair use for informational purpose
5. **Fallback system** = No dependency on copyrighted content
6. **Disclaimer footer** = Clear safe harbor statement

### **DMCA Compliance:**

If a station requests logo removal:
```sql
UPDATE [table]
SET logo_url = NULL,
    logo_source = NULL
WHERE id = 'station-id';
```

The station will automatically fall back to generated SVG badge.

---

## 📞 Support

For questions about logo implementation or legal compliance, refer to:
- `src/services/logoService.ts` - Core logo logic
- `scripts/populate-station-logos.ts` - Bulk population
- This document - Legal & implementation guide

---

**Last Updated:** 2025-11-02
**Status:** ✅ Production Ready
**Legal Review:** ✅ Compliant
