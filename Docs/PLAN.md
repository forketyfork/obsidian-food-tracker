# Food Tracker Plugin Plan (updated 2026-01-05)

## Current capabilities

- Nutrient database with YAML frontmatter and OpenFoodFacts lookup by name or barcode via the "Add nutrient" modal; filenames are normalized and cached with auto-refresh on vault changes.
- Smart entry parsing: configurable `#food`/`#workout` tags, linked or inline entries, unit conversion (g, kg, ml, l, oz, lb, cup, tbsp, tsp, pc), negative calories allowed only on the food tag, and autocomplete for food names plus nutrition/measure keywords (workout tag suggests calories only).
- Real-time totals: status bar or in-document display with goals-aware progress bars, calorie hints, and totals clamped to zero; nutrition totals are written to frontmatter using customizable property names and backfilled when missing.
- Goals and daily notes: goals file loader with highlight support; daily note matching via configurable filename pattern (e.g., `YYYY-MM-DD`) feeds totals and stats.
- Monthly statistics: ribbon command opens a month picker/table that aggregates frontmatter totals per day; falls back to recalculation when frontmatter is missing.
- Settings UX: type-ahead folder/file selectors, tag/workout tag/directory configuration, link style toggle (wikilink/markdown), and choice of showing totals in status bar or document.

## Known gaps vs previous roadmap

- No charting/dashboard view or trend graphs (current stats are table-only).
- Only a single default serving size per nutrient; no named reusable portion presets or quick-pick portions.
- No meal timestamps or eating-window analytics.
- No hydration or symptom logging.
- Barcode lookup exists, but there is no camera-based scanning flow.
- No exports (CSV/JSON/PDF), API/webhooks, or third-party integrations.
- No properties-based entry parser, recipes/meal templates, or smart recommendations/AI.

## Prioritized roadmap (realistic next steps)

1. **Custom portions & entry polish**  
   Keep the existing per-nutrient `serving_size`, and add user-named portion presets (e.g., "bowl", "scoop") that can be reused across entries and suggested in autocomplete.
2. **Time-aware logging**  
   Optional `@HH:mm`/`@breakfast` tokens on entries; persist timestamps to frontmatter and surface basic eating-window/frequency views in the stats modal (enables per-meal export and correlations).
3. **Symptom capture**  
   Simple `#symptom`/properties syntax with severity and notes; store alongside meal timestamps so users can manually correlate (no AI analysis yet).
4. **Lightweight exports**  
   CSV export per meal or per day/date-range using the frontmatter cache; copy-to-clipboard from the statistics modal for external analysis.
5. **Trend visuals**  
   Add small line/stacked-bar charts to the stats modal using a lightweight chart library (evaluate bundle size before choosing Chart.js vs. micro libs); reuse existing totals, no new storage.
6. **Barcode UX upgrade**  
   Keep current OpenFoodFacts lookup; add a "Scan barcode" action on mobile that opens the camera (QuaggaJS or native mobile hook) and pipes the result into the existing lookup.
7. **Properties-based entry option**  
   Allow meals, timestamps, portions, and symptoms to be logged via note properties as an alternative to tags; maintain both modes for compatibility.
8. **Fluid intake tracking (MVP)**  
   `#drink`/properties entries with volume and caffeine/alcohol fields; include in daily totals and optional hydration goal.

## Deferred ideas (re-evaluate after the above)

- Hydration tracking, symptom logger, micronutrient expansion, recipes/templates, API/webhooks, AI suggestions.
- Full dashboard view with drag-and-drop widgets.

## Delivery cadence

- Ship one scoped feature per release: custom portions (next), then time-aware logging, then exports. Reorder based on user feedback and performance impact.
