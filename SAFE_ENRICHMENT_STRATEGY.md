# Safe Data Enrichment Strategy

## Problem Statement

When enriching radio station data from multiple sources, we face two critical challenges:

### 1. **Duplicate Records**
- Same station appears multiple times with different naming conventions
- Example: "Radio Mirchi Bangalore" vs "radiomirchibengaluru"
- One might have metadata, the other might have working stream URLs

### 2. **Missing Stream URLs**
- High-quality metadata from terrestrial/official sources
- But no live streaming URLs available
- Need to merge data without losing either metadata OR streams

## Solution: Safe Enrichment Strategy

### Core Principles

✅ **NEVER overwrite existing non-null data**
✅ **NEVER auto-delete duplicate records**
✅ **ALWAYS operate in dry-run mode first**
✅ **ALWAYS log what changes will be made**
✅ **ALWAYS preserve stream URLs when merging**

### Implementation: `enrich-radio-mirchi-safe.ts`

## How It Works

### Step 1: Fetch Authoritative Data (Wikidata)

```typescript
// Query Wikidata for Radio Mirchi (Q97063924)
// Get: owner, network, Wikipedia URL, homepage, description
// License: CC0 (Public Domain)
```

**Why Wikidata?**
- Community-verified, high-quality data
- Creative Commons CC0 license
- Structured, machine-readable
- Much better than Radio-Browser user submissions

### Step 2: Identify Duplicates

```typescript
// Scan database for stations with similar names in same city
// Score by data quality: owner + network + stream_url
// Primary = highest quality
// Duplicates = rest
```

**Quality Scoring:**
- Has owner/network: +4 points
- Has stream URL: +1 point
- Highest score = Primary record

### Step 3: Safe Enrichment (NULL fields only)

```typescript
// For each clean station (proper naming):
//   IF field is NULL:
//     UPDATE field with Wikidata value
//   ELSE:
//     SKIP (preserve existing data)
```

**What Gets Updated:**
- ✅ `wikidata_id` (if NULL)
- ✅ `wikipedia_url` (if NULL)
- ✅ `owner` (if NULL)
- ✅ `network` (if NULL)
- ✅ `homepage` (if NULL)

**What NEVER Gets Updated:**
- ❌ Existing non-NULL values
- ❌ Stream URLs
- ❌ Station names
- ❌ Frequencies
- ❌ Coordinates

### Step 4: Handle Duplicates (Safe Merge)

```typescript
// For each duplicate pair:
//   IF duplicate has stream_url AND primary doesn't:
//     COPY stream_url to primary
//   ELSE:
//     LOG for manual review
//
//   DO NOT DELETE duplicate automatically
```

**Actions Taken:**
1. Copy stream URL from duplicate → primary (if missing)
2. Log duplicate for manual review
3. **DO NOT** auto-delete anything

**Manual Review Required:**
- Admin reviews flagged duplicates
- Verifies data accuracy
- Manually deletes after verification

## Usage

### Dry Run (Safe, Read-Only)

```bash
# See what WOULD change without making changes
npx tsx scripts/enrich-radio-mirchi-safe.ts
```

**Output:**
```
🚀 Safe Radio Mirchi Enrichment Tool
Mode: 🔍 DRY RUN (no changes)

✅ Found Wikidata entry:
   Wikidata ID: Q97063924
   Owner: Entertainment Network India Ltd
   Wikipedia: https://en.wikipedia.org/wiki/Radio_Mirchi

📝 Enriching 15 stations...
  ✏️  Radio Mirchi Bangalore
      Updates: wikidata_id, wikipedia_url
      🔍 DRY RUN - no changes made

🔍 Found 1 duplicate:
  Primary: Radio Mirchi Bangalore
  Duplicate: radiomirchibengaluru
  Stream URL: https://...
  💡 Action: Copy stream URL to primary
  🔍 DRY RUN - no changes made
```

### Apply Changes (After Review)

```bash
# Actually make the changes
npx tsx scripts/enrich-radio-mirchi-safe.ts --apply
```

## Benefits

### 1. **No Data Loss**
- Existing data is never overwritten
- Stream URLs are preserved
- Metadata is only added, never removed

### 2. **Audit Trail**
- Every change is logged
- Dry run shows exactly what will change
- Manual review before deletion

### 3. **Idempotent**
- Safe to run multiple times
- Won't re-update already enriched data
- Only fills in missing fields

### 4. **Quality Improvement**
- Replace low-quality Radio-Browser data
- Use authoritative Wikidata sources
- Maintain stream URLs from any source

## Example: Radio Mirchi Bangalore

**Before Enrichment:**

| Field | Radio Mirchi Bangalore | radiomirchibengaluru |
|-------|----------------------|---------------------|
| name | ✅ Clean | ❌ Messy |
| city | ✅ Bengaluru | ✅ Bengaluru |
| frequency | ✅ 98.3 | ❌ NULL |
| stream_url | ❌ NULL | ✅ Working URL |
| owner | ✅ ENIL | ❌ NULL |
| network | ✅ Radio Mirchi | ❌ NULL |
| wikidata_id | ❌ NULL | ❌ NULL |
| wikipedia_url | ❌ NULL | ❌ NULL |

**After Safe Enrichment:**

| Field | Radio Mirchi Bangalore | radiomirchibengaluru |
|-------|----------------------|---------------------|
| name | ✅ Clean | ❌ Messy |
| city | ✅ Bengaluru | ✅ Bengaluru |
| frequency | ✅ 98.3 | ❌ NULL |
| stream_url | ✅ **COPIED** | ✅ Working URL |
| owner | ✅ ENIL | ❌ NULL |
| network | ✅ Radio Mirchi | ❌ NULL |
| wikidata_id | ✅ **Q97063924** | ❌ NULL |
| wikipedia_url | ✅ **Wiki URL** | ❌ NULL |

**Action:** Duplicate flagged for manual review (not auto-deleted)

## Safety Guarantees

### ✅ What This Tool Will Do:
- Add missing metadata from Wikidata
- Copy stream URLs from duplicates to primary records
- Flag duplicates for manual review
- Log all actions with dry-run preview

### ❌ What This Tool Will NEVER Do:
- Overwrite existing non-NULL data
- Delete records automatically
- Modify stream URLs
- Change station names or frequencies
- Make changes without dry-run preview

## Extending to Other Stations

This pattern works for any station network:

```typescript
// Red FM
const redFmEnricher = new SafeStationEnricher('Red FM', 'Q12345...');

// Big FM
const bigFmEnricher = new SafeStationEnricher('Big FM', 'Q67890...');

// Radio City
const radioCityEnricher = new SafeStationEnricher('Radio City', 'Q11111...');
```

## Best Practices

1. **Always dry-run first** - Review changes before applying
2. **One network at a time** - Don't mix enrichment sources
3. **Manual duplicate review** - Never trust auto-deletion
4. **Preserve all stream URLs** - They're hard to find
5. **Document data sources** - Track where data came from

## Data Source Quality Ranking

| Source | Quality | Stream URLs | Metadata | License |
|--------|---------|-------------|----------|---------|
| **Wikidata** | ⭐⭐⭐⭐⭐ | ❌ | ✅ Excellent | CC0 |
| **Wikipedia** | ⭐⭐⭐⭐⭐ | ❌ | ✅ Excellent | CC BY-SA |
| **FCC Database** | ⭐⭐⭐⭐ | ❌ | ✅ Good | Public Domain |
| **Official Websites** | ⭐⭐⭐⭐ | ✅ Good | ✅ Good | Varies |
| **Curated Streams** | ⭐⭐⭐⭐ | ✅ Verified | ✅ Good | Self-curated |
| **Radio-Browser** | ⭐⭐ | ✅ Variable | ❌ Poor | Public Domain |

## Conclusion

This safe enrichment strategy ensures:
- No data loss
- Quality improvement
- Audit trail
- Manual oversight
- Preservation of rare stream URLs

It's the **right way** to merge data from multiple sources without breaking things.
