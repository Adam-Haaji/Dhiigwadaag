# Donor Matching Engine

## Overview

The matching engine finds available donors by **two priorities**:
1. **Location proximity** – nearest district first (same district, then neighbor map).
2. **Blood compatibility** – exact blood first, then compatible types per recipient.

## Matching Rules (3 steps)

### Step 1: Exact blood + same district

- **Filter:** `bloodGroup == requestedBlood`, `district == requestedDistrict`, `availabilityStatus === 'available'`, `isActive === true`, `nextAvailableDate <= today` (or not set).
- **If any donor found** → return match; no special user message.

### Step 2: Exact blood + nearest districts

- If no donor in requested district, search **same blood** in **nearest districts** (from predefined neighbor map).
- Order: requested district first (already tried), then `neighbors[requestedDistrict]` in order.
- **If found** → return match; user message: *"Not available in [requestedDistrict], found in [nearestDistrict]."*

### Step 3: Blood compatibility fallback

- If requested blood is not found in **any** district, use **blood compatibility** table.
- For each **compatible** blood type (in priority order), search **requested district first**, then nearest districts.
- **If found** → return match; user message: *"Requested [X] not available. Found compatible blood [Y] in [district]."*
- **If none** → return *"No compatible blood available."*

---

## 1) Blood compatibility table (recipient → compatible donor types)

| Recipient | Compatible donors (in priority order) |
|-----------|--------------------------------------|
| **O-**    | O- |
| **O+**    | O+, O- |
| **A-**    | A-, O- |
| **A+**    | A+, A-, O+, O- |
| **B-**    | B-, O- |
| **B+**    | B+, B-, O+, O- |
| **AB-**   | AB-, A-, B-, O- |
| **AB+**   | AB+, A+, A-, B+, B-, O+, O-, AB- |

Implementation: `backend/src/utils/bloodPriority.js` → `getPriorityTiers(patientBlood)`.

---

## 2) District neighbor map (how to extend)

Nearest districts are defined in **`backend/src/utils/districtNeighbors.js`** as `DISTRICT_PRIORITY`:

```js
const DISTRICT_PRIORITY = {
  "Hodan": ["Howlwadaag", "Waaberi", "Wadajir", "Dharkenley"],
  "Waaberi": ["Hodan", "Howlwadaag", "Xamar Jajab", "Dharkenley"],
  // ... one entry per district
};
```

- **Structure:** `{ [districtName]: string[] }` – each key is a district; value is an ordered list of **nearest** neighboring districts (first = closest).
- **Canonical list:** All keys and values must exist in `LOCATIONS` (`backend/src/utils/locations.js`).
- **To extend:** Add a new district to `LOCATIONS`, then add a key to `DISTRICT_PRIORITY` with an array of neighboring district names in proximity order. Ensure those neighbors also list this district if bidirectional.

`getDistrictExpansionOrder(startDistrict, urgencyLevel)` returns: `[startDistrict, ...neighbors]`; for `urgencyLevel === 'critical'` it can append all remaining districts.

---

## 3) Matching function (input / output)

**Function:** `matchDonors(requestedBlood, requestedDistrict, opts?)`

**Input:**

- `requestedBlood`: string, e.g. `"A+"`, `"O-"`
- `requestedDistrict`: string, e.g. `"Hodan"`
- `opts.urgencyLevel`: `"normal"` | `"critical"` (optional)

**Output:** `matchResult`

```ts
{
  match: boolean;
  bloodGroupUsed: string | null;   // blood type actually matched
  districtUsed: string | null;     // district where match was found
  reason: 'exact_same_district' | 'exact_nearest_district' | 'compatible' | 'not_available';
  userMessage: string | null;      // message to show user (no donor PII)
  donorCount?: number;
}
```

**User message rules:**

- Match in same district (exact): `userMessage: null` (no extra text).
- Match in different district (exact): *"Not available in [requestedDistrict], found in [nearestDistrict]."*
- Match with compatible blood: *"Requested [requestedBlood] not available. Found compatible blood [bloodGroupUsed] in [districtUsed]."*
- No match: *"No compatible blood available."*

---

## 4) Test matrix and expected outputs

| # | Scenario | requestedBlood | requestedDistrict | DB state | Expected result |
|---|----------|----------------|-------------------|----------|------------------|
| 1 | Exact match in same district | A+ | Hodan | A+ available in Hodan | `match: true`, `bloodGroupUsed: "A+"`, `districtUsed: "Hodan"`, `reason: "exact_same_district"`, `userMessage: null` |
| 2 | Exact match in nearest district | A+ | Hodan | A+ not in Hodan; A+ in Waaberi (neighbor) | `match: true`, `bloodGroupUsed: "A+"`, `districtUsed: "Waaberi"`, `reason: "exact_nearest_district"`, `userMessage: "Not available in Hodan, found in Waaberi."` |
| 3 | Compatible blood in nearest district | A+ | Hodan | No A+ anywhere; O+ in Waaberi | `match: true`, `bloodGroupUsed: "O+"`, `districtUsed: "Waaberi"`, `reason: "compatible"`, `userMessage: "Requested A+ not available. Found compatible blood O+ in Waaberi."` |
| 4 | No compatible blood | A+ | Hodan | No A+, O+, O-, A- in any district | `match: false`, `bloodGroupUsed: null`, `districtUsed: null`, `reason: "not_available"`, `userMessage: "No compatible blood available."` |

**DB filter for “available” donor:** `availabilityStatus === 'available'`, `isActive === true`, `nextAvailableDate <= today` (or null/absent).

---

## Files

- **Engine:** `backend/src/services/matchingEngine.js` – `matchDonors()`, `matchDonorsWithList()`
- **Blood tiers:** `backend/src/utils/bloodPriority.js`
- **District order:** `backend/src/utils/districtNeighbors.js`
- **Locations:** `backend/src/utils/locations.js`
