# Per-country Google Analytics G-Tag

All Bimota country sites share one `.com` domain (e.g. `/jp/jp/`, `/it/it/`,
`/us/en-us/`), and one Adobe Launch property serves them all. Out of the box
that means a single GA4 Measurement ID tracks every country. This feature lets
each country send its analytics to its **own** GA4 property, controlled by an
author — no code deploy and no Launch republish per country.

## How it works

1. **Placeholder sheet (`/gtag-config.json`)** — authored in Document Authoring.
   One row per country, mapping the country segment to its GA4 Measurement ID,
   plus an optional `default` row.
2. **`scripts/delayed.js`** — before Adobe Launch loads, the code reads the
   current country from the URL (`getLocale()`), looks up its row in the sheet,
   and pushes the ID onto the Adobe Client Data Layer:
   `window.adobeDataLayer.push({ gaMeasurementId: 'G-JP1234567', country: 'jp' })`.
3. **Adobe Launch** — a Data Element reads `gaMeasurementId` from the data layer,
   and a single GA4 rule uses that value as its Measurement ID. Because the ID is
   dynamic, one rule covers every country.

If the sheet is missing, or has no row for the current country and no `default`,
nothing is pushed and Launch loads exactly as before (tracking degrades safely
rather than firing the wrong property).

## Author half — the `gtag-config.json` sheet

Create a single-sheet workbook in Document Authoring at the site root so it is
served as `/gtag-config.json`. Columns: **key** and **measurementId**.

| key       | measurementId |
| --------- | ------------- |
| jp        | G-JP1234567   |
| it        | G-IT2345678   |
| us        | G-US3456789   |
| de        | G-DE4567890   |
| default   | G-DEFAULT000  |

- **key** — the country segment as it appears in the URL (the first path
  segment: `/jp/jp/` → `jp`). Matching is exact.
- **measurementId** — that country's GA4 Measurement ID (`G-XXXXXXXXXX`).
- **default** *(optional)* — used for any country without its own row. Omit it
  if countries with no row should not be tracked at all.

Adding, changing, or removing a country's tag is a pure authoring change: edit
the sheet, then preview and publish it. No code change is required.

## Launch half — one-time setup (Launch admin, in the Launch UI)

This is configured once in the Adobe Launch property that this site loads
(`assets.adobedtm.com/53c8e773d591/...`). It cannot be done from this repo.

1. **Create a Data Element**
   - Name: `gaMeasurementId`
   - Type: **Data Layer** (Adobe Client Data Layer) — path `gaMeasurementId`
   - (Alternatively type *JavaScript variable* reading the same value.)

2. **Point the GA4 tag at the Data Element**
   - In the GA4 / Google tag extension (or the "Set up Google tag" action),
     replace the hard-coded Measurement ID with `%gaMeasurementId%`.

3. **Guard the rule (recommended)**
   - On the Page-load rule that fires GA4, add a **Value Comparison** condition:
     `%gaMeasurementId%` *is not blank*. This prevents GA4 from firing with an
     empty ID for countries that have no row and no `default`.

4. **Publish** the Launch library (staging first, then production). This is a
   one-time change — after it's live, all future per-country changes happen in
   the spreadsheet only.

## Testing

- On a country page, open the console and check
  `window.adobeDataLayer.find(e => e && e.gaMeasurementId)` — it should show the
  expected ID for that country.
- In Launch's debug/Assurance view, confirm the GA4 hit uses the country's
  Measurement ID.
- Switch countries (e.g. `/jp/jp/` vs `/it/it/`) and confirm the ID changes.
