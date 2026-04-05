

# Fix PDF Report: Image Size, Financial Details, and Progress Readability

## Root Causes Identified

After inspecting the full codebase, the issues stem from three areas:

1. **Image still too large** -- The max width is currently set to 150px (line 431). Needs to be reduced to 110px max.

2. **Financial Details missing** -- The `ProjectDetail.tsx` page builds its own `mappedProject` object (lines 104-151) that does NOT use the `normalizeProject` helper from `projects.ts`. Critically, it maps `contractValueNGN` from `data.contractValueNGN` but the backend returns **snake_case** fields like `contract_value_ngn`. The mapping at lines 127-138 is missing the snake_case fallback for financial fields, so they come through as `undefined`. Meanwhile, the report generator's `fmtCurrency` function returns `'—'` for `undefined`, and `hasVisibleValue` filters out `'—'` values. The `showAll: true` option converts them to `'—'` strings -- which then display as dashes, making it look like no data exists.

3. **Progress text color** -- Already set to `rgb(55,65,81)` which is correct, but could be reinforced.

## Plan

### File 1: `src/pages/ProjectDetail.tsx` (lines 127-138)
**Fix financial field mapping** to include snake_case fallbacks, matching how `normalizeProject` in `projects.ts` works:

```typescript
contractValueNGN: parseFloat(data.contractValueNGN ?? data.contract_value_ngn) || 0,
contractValueUSD: parseFloat(data.contractValueUSD ?? data.contract_value_usd) || 0,
marginPercentNGN: parseFloat(data.marginPercentNGN ?? data.margin_percent_ngn) || 0,
marginPercentUSD: parseFloat(data.marginPercentUSD ?? data.margin_percent_usd) || 0,
marginValueNGN: parseFloat(data.marginValueNGN ?? data.margin_value_ngn) || ...,
marginValueUSD: parseFloat(data.marginValueUSD ?? data.margin_value_usd) || ...,
```

This ensures that when the backend returns `contract_value_ngn: "22300000.00"` (a decimal-cast string), it gets parsed into a number before being passed to the report generator.

### File 2: `src/lib/reportGenerator.ts`

**A. Reduce image max size** (line 431-432):
- Change `maxImgW` from `150` to `110`
- Change `maxImgH` from `100` to `80`
- Keep centering logic as-is (it already centers correctly)

**B. Add debug logging** before Financial Details render to trace whether data is reaching the PDF generator. Add a `console.log` with the six financial field values right before the `drawSectionTitle('Financial Details')` call.

**C. Replace the `fmtCurrency` zero-handling**: Currently `fmtCurrency(0, 'USD ')` returns `'USD 0.00'` which is correct, but the issue is upstream -- values arrive as `undefined` because of the mapping bug in ProjectDetail.tsx. Once the mapping is fixed, the existing `showAll: true` + `fmtCurrency` logic will work correctly.

**D. Add fallback safety**: After building the financial rows array, add a check: if ALL six values are `'—'` but the project object has any raw financial property set, log a warning so the mapping issue can be traced.

### Summary of Changes

| File | Change | Lines |
|------|--------|-------|
| `src/pages/ProjectDetail.tsx` | Add snake_case fallbacks + parseFloat for all 6 financial fields | ~127-138 |
| `src/lib/reportGenerator.ts` | Reduce image max to 110x80px | ~431-432 |
| `src/lib/reportGenerator.ts` | Add diagnostic log before financial section | ~470 |

### Expected Result

- Project image renders at max 110px wide, centered, compact
- Financial Details section shows all 6 rows with correct values from the backend
- Progress text remains high-contrast at `#374151`
- All sections (title, status, pipeline, image, overview, timeline, financials, progress, notes) render when data exists

