# Junior Dev Task: Add Cholesterol Tracking

## Background

This task implements [Issue #249 — Add cholesterol tracking](https://github.com/forketyfork/obsidian-food-tracker/issues/249).

Users want to track dietary cholesterol the same way they currently track sodium, fiber, sugar, etc. Cholesterol is a standard nutrient on food labels and is reported by [OpenFoodFacts](https://world.openfoodfacts.org/) (the database the plugin already integrates with) as `cholesterol_100g`, measured in **grams per 100g of product**. By convention nutrition labels show cholesterol in **milligrams** (typical daily values are 200–300 mg/day), so we will mirror how `sodium` is handled: store/display in **mg**, convert from OpenFoodFacts' grams by multiplying by 1000.

The parsing keyword in inline entries will be `chol` (kept short, like `prot`, `satfat`, `sodium`). Example:

```
#food Egg yolk 60kcal 5fat 2.7prot 0carbs 210chol
```

## Why this task is a good starter

- The pattern is already established in the codebase — you can mostly follow how `sodium` (which is also a milligram-unit nutrient) flows through every layer.
- It touches almost every module in `src/`, so by the end you will understand how the plugin is wired together.
- It is mostly mechanical changes to data structures, plus parser/regex updates, plus tests. No new architecture is required.

## High-level checklist

You will need to edit ~13 source files and ~6 test files. Work through them in roughly the order below — each section depends on the previous one having compiled, so commit incrementally.

1. Core data model (`NutritionCalculator.ts`)
2. Inline parsing regexes (`constants.ts`)
3. Nutrient file cache (`NutrientCache.ts`)
4. Goals service (`GoalsService.ts`)
5. Frontmatter totals (`FrontmatterTotalsService.ts`)
6. Settings — field names (`SettingsService.ts`)
7. Settings UI (`FoodTrackerSettingTab.ts`)
8. "Add nutrient" modal + OpenFoodFacts mapping (`NutrientModal.ts`)
9. Stats service (`StatsService.ts`)
10. Nutrition total UI / emoji bar (`NutritionTotal.ts`)
11. Autocomplete keywords (`FoodSuggestionCore.ts`)
12. Tests
13. README + Docs/PLAN.md

Pick a sensible emoji for cholesterol in the UI — recommendation: `🩸` (drop of blood) since blood cholesterol is the common medical association. If you prefer something else, just be consistent everywhere.

---

## Step-by-step plan

### 1. Core data model — `src/NutritionCalculator.ts`

Add `cholesterol?: number;` to:

- `NutrientData` interface (`src/NutritionCalculator.ts:3`) — this is the structural type used everywhere else.
- `NutrientGoals` interface (`src/NutritionCalculator.ts:16`).
- `InlineNutrientEntry` interface (`src/NutritionCalculator.ts:39`).

Then update the per-nutrient key arrays inside this file:

- `calculateGoalProgress` (`src/NutritionCalculator.ts:285`) — add `"cholesterol"` to the `nutrientKeys` array.

And add the parser keyword mapping:

- `nutrientKeyMap` (`src/NutritionCalculator.ts:231`) — add `chol: "cholesterol"`.

> **Why "chol"?** Look at the existing keys: `kcal`, `fat`, `satfat`, `prot`, `carbs`, `sugar`, `fiber`, `sodium`. They are short and lower-case. `chol` follows the same style. Document this in the README later (step 13).

### 2. Inline parsing regexes — `src/constants.ts`

The plugin compiles regexes that hard-code the list of nutrition keywords. Add `chol` to **every** keyword alternation:

- `createNutritionValueRegex` (`src/constants.ts:52`) — change `(?:kcal|fat|satfat|prot|carbs|sugar|fiber|sodium)` to `(?:kcal|fat|satfat|prot|carbs|sugar|fiber|sodium|chol)`.
- `createInlineNutritionRegex` (`src/constants.ts:71`) — same change, appears **twice** in the same regex.
- The internal helper `createInlineNutritionPattern` (`src/constants.ts:125`) — same change, also appears twice.

> **Why does the keyword appear twice in one regex?** Look at the structure: it matches `<first-value><keyword>` then a repeating group `(?:\s+<more-value><keyword>)*`. Both occurrences need the new keyword.
>
> **Tip:** consider extracting the keyword list into a single constant string used by all three regex factories. This is a small refactor that the junior may attempt **only after** the basic feature works and tests pass. If it's risky, just do the duplicated edits.

### 3. Nutrient file cache — `src/NutrientCache.ts`

Each nutrient `.md` file stores nutrition values in YAML frontmatter. Add `cholesterol`:

- Local `NutrientData` interface (`src/NutrientCache.ts:4`) — add `cholesterol?: number;`.
- `extractNutritionData.nutrientFields` array (`src/NutrientCache.ts:219`) — add `{ key: "cholesterol", aliases: ["cholesterol"] }`.

### 4. Goals service — `src/GoalsService.ts`

Users define daily goals in a plain text file (see README "Setting Up Nutrition Goals"). Cholesterol needs to be a recognized goal key:

- `NutrientGoals` interface (`src/GoalsService.ts:3`) — add `cholesterol?: number;`.
- `parseGoals` switch statement (`src/GoalsService.ts:59`) — add `case "cholesterol":` next to the existing nutrient cases.

### 5. Frontmatter totals — `src/FrontmatterTotalsService.ts`

The plugin writes nutrition totals back to daily-note frontmatter (`ft-calories`, `ft-protein`, …) and reads them back for the stats view.

- `FrontmatterTotals` interface (`src/FrontmatterTotalsService.ts:13`) — add `cholesterol?: number;`.
- `nutrientDataToFrontmatterTotals` (`src/FrontmatterTotalsService.ts:54`) — add a rounding line. Cholesterol is in **mg** like sodium, so follow the sodium pattern: `if (data.cholesterol !== undefined) totals.cholesterol = Math.round(data.cholesterol * 10) / 10;`.

### 6. Settings — field names — `src/SettingsService.ts`

The frontmatter key names are customizable. Add cholesterol as a configurable field with default `ft-cholesterol`:

- `FrontmatterFieldNames` interface (`src/SettingsService.ts:5`) — add `cholesterol: string;`.
- `FRONTMATTER_KEYS_ORDER` array (`src/SettingsService.ts:16`) — append `"cholesterol"`.
- `DEFAULT_FRONTMATTER_FIELD_NAMES` constant (`src/SettingsService.ts:27`) — add `cholesterol: "ft-cholesterol",`.

> **No migration code required:** existing user settings stored without `cholesterol` will be merged with defaults by `sanitizeFrontmatterFieldNames` (`src/SettingsService.ts:42`). Confirm this by reading that function carefully — it picks up the default for any missing key. Add a test for that behaviour in step 12.

### 7. Settings UI — `src/FoodTrackerSettingTab.ts`

The collapsible "Metadata field names" section lists each configurable frontmatter field. Add an entry:

- `fieldConfigs` array in `addFrontmatterFieldNamesSection` (`src/FoodTrackerSettingTab.ts:163`) — append:

```ts
{ key: "cholesterol", name: "Cholesterol field", desc: "Field name for total cholesterol (mg)" },
```

### 8. "Add nutrient" modal + OpenFoodFacts mapping — `src/NutrientModal.ts`

This is the modal users open via the "Add nutrient" command.

- Local `NutrientData` interface (`src/NutrientModal.ts:5`) — add `cholesterol: number;`.
- Constructor default (`src/NutrientModal.ts:78`) — initialize `cholesterol: 0`.
- `nutrientFields` array (`src/NutrientModal.ts:137`) — add `{ key: "cholesterol", name: "🩸 Cholesterol", unit: "mg" }`. Put it next to sodium (both mg).
- `OpenFoodFactsProduct.nutriments` shape (`src/NutrientModal.ts:34`) — add `cholesterol_100g?: number;`.
- `fillFromOpenFoodFacts` (`src/NutrientModal.ts:386`) — add a line that converts grams → milligrams just like sodium does:

```ts
this.nutrientData.cholesterol = Number(nutriments["cholesterol_100g"] ?? 0) * 1000;
```

- `createNutrientFile` content template (`src/NutrientModal.ts:223`) — add a `cholesterol: ${this.nutrientData.cholesterol}` line inside the YAML frontmatter block.

**Verify** the OpenFoodFacts field name in their API docs (https://wiki.openfoodfacts.org/Nutrition_facts_fields and https://world.openfoodfacts.org/data/data-fields.txt). The product API typically exposes `nutriments.cholesterol_100g` in **grams**. If you find it is already in mg for some products, do **not** add per-product unit handling — the canonical units in their `_100g` fields are grams. Stay consistent with how `sodium_100g` is handled (`src/NutrientModal.ts:397`).

### 9. Stats service — `src/StatsService.ts`

The monthly statistics modal reads frontmatter totals into `NutrientData`.

- `frontmatterTotalsToNutrientData` helper (`src/StatsService.ts:21`) — add `if (totals.cholesterol !== undefined) data.cholesterol = totals.cholesterol;`.

### 10. Nutrition total UI / emoji bar — `src/NutritionTotal.ts`

This file renders the nutrition bar shown in the status bar or in-document.

- `calculateGoalProgress.nutrientKeys` (`src/NutritionTotal.ts:32`) — append `"cholesterol"`.
- `formatTotal.formatConfig` (`src/NutritionTotal.ts:119`) — append:

```ts
{ key: "cholesterol", emoji: "🩸", name: "Cholesterol", unit: "mg", decimals: 1 },
```

Order is significant for display order in the bar — put it near `sodium` for visual consistency.

### 11. Autocomplete keywords — `src/FoodSuggestionCore.ts`

Add `chol` to the list of nutrition keywords used by autocomplete:

- `nutritionKeywords` array (`src/FoodSuggestionCore.ts:51`) — append `"chol"`.

That single change makes `#food Egg 60kcal 210ch…` suggest `210chol`.

### 12. Tests

The test infrastructure lives under `src/__tests__/`. Run with `yarn test:dev` (or `just test` in the Nix environment). **Always run `yarn build` after — it includes tests, typecheck and formatting.**

Add cases — don't bloat tests, but cover the new behaviour:

- `src/__tests__/NutritionCalculator.test.ts`
  - Parse inline `chol` keyword: `#food Egg 60kcal 210chol` produces `{ calories: 60, cholesterol: 210 }`.
  - Goals progress includes cholesterol when both consumed and goal are set.
- `src/__tests__/NutritionTotal.test.ts`
  - Mirror an existing `saturated_fats` or `sodium` test (see `src/__tests__/NutritionTotal.test.ts:719`) — add a case for cholesterol via inline entry and another via linked food entry.
- `src/__tests__/FrontmatterTotalsService.test.ts`
  - Round-trip `cholesterol` through `extractFrontmatterTotals` and `applyNutrientTotalsToFrontmatter` (use `src/__tests__/FrontmatterTotalsService.test.ts:68` as a template).
  - Custom field name: setting `cholesterol: "cholesterol-mg"` writes to that key.
- `src/__tests__/SettingsService.test.ts`
  - Loading a settings object that *omits* `cholesterol` should merge in the default `"ft-cholesterol"`.
  - Duplicate detection: if two field names collide on the new key, the default is restored (existing `sanitizeFrontmatterFieldNames` logic — confirm it handles the new key).
- `src/__tests__/NutrientCache.test.ts`
  - Loading a nutrient file with `cholesterol: 210` in frontmatter exposes `cholesterol: 210` via `getNutritionData`.
- `src/__tests__/NutrientModal.test.ts`
  - `fillFromOpenFoodFacts` with `cholesterol_100g: 0.21` populates `cholesterol = 210` (g → mg conversion).
  - Generated YAML body contains a `cholesterol:` line.
- `src/__tests__/FoodSuggestionCore.test.ts`
  - Typing `#food Egg 210ch` suggests `210chol`.
  - Workout tag does **not** suggest `chol` (existing logic filters to `kcal` only — verify the new keyword doesn't slip past that filter).

### 13. Docs

Update both:

- `README.md`
  - "Complete nutrition tracking" bullet (`README.md:28`) — add cholesterol.
  - "Comprehensive metrics" bullet (`README.md:54`) — add cholesterol.
  - "Flexible goal setting" bullet (`README.md:65`) — add cholesterol.
  - "Supported nutrition keywords" list (`README.md:137`) — add `` `chol` - cholesterol in milligrams (database entries and inline) ``.
  - Goals file example (`README.md:188`) — add `cholesterol: 300` to the YAML-ish snippet.
  - "Add nutrient" modal description (`README.md:97`) — mention cholesterol alongside sodium.

- `Docs/PLAN.md`
  - Remove "Add cholesterol tracking" from "Known gaps" if you find it there (currently absent — fine to skip).
  - Optionally add a note in the changelog/section that micronutrient set was extended.

---

## Acceptance criteria

Before opening a PR, all of the following must hold:

1. `yarn build` (or `just build`) passes — that includes `yarn typecheck`, `yarn lint`, `yarn format --check`, and `yarn test`.
2. In a real Obsidian vault (or via the dev workflow described in `README.md` Development section), the following all work end-to-end:
   - Open "Add nutrient" → search "egg" on OpenFoodFacts → the cholesterol field is populated in mg.
   - Save the nutrient → the resulting `.md` file has a `cholesterol:` line in frontmatter.
   - Add `#food [[egg]] 100g` to a daily note → the nutrition bar shows the cholesterol indicator with the correct value.
   - Add `#food Some custom item 60kcal 210chol` inline → cholesterol total reflects 210 mg.
   - Set a goal of `cholesterol: 300` in the goals file → the cholesterol indicator shows a progress ring and color-codes against the goal.
   - Open the monthly statistics modal → daily rows show cholesterol when the daily note has one.
   - Settings → "Metadata field names" → rename the cholesterol field → frontmatter writes use the new key.
3. Existing notes/settings continue to work (no migration needed; missing field falls back to default).
4. README and Docs are updated.

## Working tips

- **Commit per step.** One commit for the data-model changes, one for the parser/regex, one for the modal, one for tests, etc. Small commits make review easy and let you bisect if something breaks.
- **Run tests early and often.** `yarn test:dev` runs the dev build first and then Jest, so you'll catch type errors immediately.
- **Mirror an existing nutrient.** Whenever you're unsure, search the codebase for `sodium` (also a mg-unit nutrient) and copy its handling exactly. `grep -rn "sodium" src/` gets you most of the touchpoints in one shot.
- **Don't add fields you didn't need.** If `chol` doesn't fit somewhere `sodium` does fit, ask before adding.
- **Don't break the workout tag.** Cholesterol is irrelevant for workouts. Confirm that typing `#workout … 200chol` does not surface `chol` in the autocomplete (existing filter in `FoodSuggestionCore.getSuggestions` already enforces kcal-only for workout, but you should add a test to lock that in — see step 12).
- **Branch:** push to whatever branch your team conventions dictate; do **not** force-push or rebase the existing `main`.

## Estimated effort

Roughly 1–2 days for a junior developer comfortable with TypeScript. Expect the bulk of time to go into running through tests and verifying the modal in a live vault rather than into the edits themselves.
