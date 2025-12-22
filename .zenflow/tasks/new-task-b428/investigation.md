# Bug Investigation: Frontmatter Properties Deleted When No #food Entries

## Bug Summary

When a daily note has no `#food` entries, the FoodTracker plugin automatically deletes all frontmatter properties (`ft-calories`, `ft-protein`, etc.) instead of setting them to 0. This prevents users from:

- Having these metadata fields in their daily note templates
- Keeping consistency with notes that have no food entries
- Refactoring old notes to include this metadata

## Root Cause Analysis

The issue originates from two locations in the codebase:

### 1. NutritionCalculator.ts (lines 104-106)

```typescript
if (foodEntries.length === 0 && inlineEntries.length === 0 && workoutEntries.length === 0) {
	return null;
}
```

When there are no food/workout entries, `calculateNutritionTotals()` returns `null` instead of an object with zero values.

### 2. FrontmatterTotalsService.ts (lines 147-153)

```typescript
private updateFrontmatterValues(frontmatter: Record<string, unknown>, totals: NutrientData | null): void {
    if (!totals || Object.keys(totals).length === 0) {
        for (const frontmatterKey of Object.values(FRONTMATTER_KEYS)) {
            delete frontmatter[frontmatterKey];
        }
        return;
    }
    // ...
}
```

When `totals` is `null` (no entries found), all frontmatter properties are deleted.

### 3. StatsService.ts (lines 182-199)

Similar deletion logic exists in `writeFrontmatterTotals()`:

```typescript
if (value !== undefined && (value !== 0 || key === "calories")) {
	frontmatter[frontmatterKey] = value;
} else {
	delete frontmatter[frontmatterKey];
}
```

Note: The StatsService's `writeFrontmatterTotals` only gets called when there ARE entries (line 172 only calls it when `result` exists). The main issue is in `FrontmatterTotalsService`.

## Affected Components

1. **FrontmatterTotalsService.ts** - Primary component that needs fixing
2. **StatsService.ts** - Has similar logic but only called when entries exist (less critical)

## Proposed Solution

Modify `FrontmatterTotalsService.updateFrontmatterValues()` to set all frontmatter properties to 0 when `totals` is null or empty, instead of deleting them:

```typescript
private updateFrontmatterValues(frontmatter: Record<string, unknown>, totals: NutrientData | null): void {
    if (!totals || Object.keys(totals).length === 0) {
        // Set all values to 0 instead of deleting them
        for (const [key, frontmatterKey] of Object.entries(FRONTMATTER_KEYS)) {
            frontmatter[frontmatterKey] = key === "calories" ? 0 : 0;
        }
        return;
    }

    const formattedTotals = nutrientDataToFrontmatterTotals(totals);

    for (const [key, frontmatterKey] of Object.entries(FRONTMATTER_KEYS)) {
        const value = formattedTotals[key as FrontmatterKey];
        if (value !== undefined) {
            frontmatter[frontmatterKey] = value;
        } else {
            // Set missing properties to 0 instead of deleting
            frontmatter[frontmatterKey] = 0;
        }
    }
}
```

## Edge Cases to Consider

1. **Notes that are NOT daily notes**: The fix only applies to daily notes (checked via `isDailyNote()` in `updateFrontmatterTotals`)
2. **StatsService behavior**: The `writeFrontmatterTotals` in StatsService only gets called when there are entries, so it doesn't need changes for this specific bug
3. **Backward compatibility**: Users who currently have notes without these properties may suddenly get them added - this is acceptable since they would be set to 0, which is the expected behavior

## Test Cases Needed

1. When a daily note has no #food entries, all ft-\* properties should be set to 0
2. When a daily note has entries that sum to 0, all ft-\* properties should be set to 0
3. When a daily note has entries, ft-\* properties should reflect calculated values
4. Non-daily notes should not be affected (no frontmatter changes)

## Implementation Notes

### Changes Made

1. **Created new exported function `applyNutrientTotalsToFrontmatter`** in `FrontmatterTotalsService.ts`:
   - Extracted the frontmatter update logic into a testable exported function
   - When `totals` is null or empty, sets all ft-\* properties to 0 (instead of deleting them)
   - When `totals` has values, applies the formatted values and sets missing properties to 0

2. **Updated private `updateFrontmatterValues` method** in `FrontmatterTotalsService.ts`:
   - Now delegates to the new `applyNutrientTotalsToFrontmatter` function

3. **Updated `writeFrontmatterTotals` method** in `StatsService.ts`:
   - Now reuses `applyNutrientTotalsToFrontmatter` for consistency
   - Ensures frontmatter properties are set to 0 instead of deleted

4. **Added regression tests** in `FrontmatterTotalsService.test.ts`:
   - Test: sets all values to 0 when totals is null
   - Test: sets all values to 0 when totals is empty object
   - Test: applies calculated totals to frontmatter
   - Test: preserves non-ft properties in frontmatter
   - Test: rounds values according to nutrientDataToFrontmatterTotals
   - Test: handles negative calories from workout-only notes

### Test Results

All 258 tests pass, including 6 new tests for the `applyNutrientTotalsToFrontmatter` function.
