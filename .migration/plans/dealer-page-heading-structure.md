# Heading structure proposal: Dealer page (`/es/en/dealer`), WCAG 1.3.1

> **Ready to build. Plan mode is still on, so I can only read and plan right now.** Switch to Execute mode and I'll make the change on a new branch from the compliance branch, following the checklist below. Nothing changes in Document Authoring, and I'll ask before opening a PR.

## What the page has now
I checked the page on the compliance preview at desktop and mobile widths. The page has no authored headings. The dealer block builds them all, and the site script then moves every level up by one, because the page has no h1.

| Level now | Text | Visual size | Problem |
|---|---|---|---|
| h1 | "Spain" | 40px | It's a country name, not the page topic. Every other country on the page ends up under "Spain". |
| *(none)* | Dealer names, e.g. "Pekus Motor" | 26px, bold | They look like headings but are paragraphs. |
| *(none)* | Region tabs (Europe, Americas, Asia, Oceania) | — | The second list has no heading, so its countries look like part of the Spain list. |
| h2 | Belgium, France … United Kingdom (expandable rows) | 16px | They sit at the same level as "Spain" even though they belong to a different list. |
| *(none)* | Dealer names inside each country | 26px | Same problem as the Spain dealers. |
| h3 (footer) | Models, About bimota, Resources, Social, Mobile Application | 14px | Fine as is. |

The block's code already expects a region heading at h2 with the countries at h3. The content never provides that h2, which is why the levels get moved up.

The "Choose your country" dialog has its own h1, but screen readers can't reach it while the dialog is closed. When it's open, the rest of the page is hidden from them. So it doesn't affect this page's outline, and I'll leave it as it is.

## Proposed structure (strictly sequential, no skipped levels)

```
h1  Dealers                          ← new, read by screen readers only (no visual change)
  h2  Spain                          ← was h1; stays 40px
    h3  Pekus Motor                  ← was a paragraph; stays 26px
    h3  … (each dealer in the visitor's country)
  h2  Dealer locations by region     ← new, read by screen readers only; also names the region tabs
      [tabs: Europe | Americas | Asia | Oceania]
    h3  Belgium                      ← was h2; stays 16px
      h4  Kockelmann Motos & Fils    ← was a paragraph, when the country is open; stays 26px
      h4  Moto Center Mertens
    h3  France …
footer
  h3  Models / About bimota / …      ← unchanged (moving back up a level is allowed)
```

**Why:**
- **One h1 for the page topic ("Dealers"):** this is the same translated word the page already uses as its browser tab title.
- **Two h2 sections for the two lists:** "your country" and "all other countries by region". The countries are no longer siblings of "Spain".
- **Dealer names become headings:** they already look like headings (26px, bold), and with 100+ dealers they give screen-reader users a quick way to jump between them.
- **Nothing changes visually:** the new h1 and the region h2 are hidden on screen, and every other heading keeps its current size.

**Translations:**
- "Dealers" already exists in the block for all site languages.
- "Dealer locations by region" already comes from the shared translation sheet (it's the current name of the tab list), so no new translations are needed.

## Where the change lives
- **Code only, in the dealer list block.** Nothing changes in Document Authoring, because these headings are built by the block, not authored.
- **All dealer pages that use this block, in every country and language, get the same structure.**
- **Left unchanged:** header, footer, map, country-selector dialog, the page's automatic heading shift, and the dealer page content in Document Authoring.

## How it will be built
- **Visitor's-country list:**
  - Add a screen-reader-only h1 "Dealers" (translated) just before the "Spain" heading, unless the page already has an h1.
  - "Spain" stays an h2 with its current 40px look.
- **Region tabs:**
  - Add a screen-reader-only h2 before the tabs, with the existing "Dealer locations by region" text.
  - The tab list takes its name from that heading instead of a separate label.
- **Dealer names:**
  - Each dealer card can take a heading level: h3 in the visitor's-country list, h4 inside the countries in the region tabs.
  - The name keeps its current styling, so it looks exactly as now.
- **Automatic heading shift:** no change. Once the page has its own h1, the shift no longer applies.

## Checklist
- [ ] Switch to Execute mode, then create a new branch from the compliance branch.
- [ ] Country list: when the page has no h1, add the hidden "Dealers" h1 before the country heading. Keep "Spain" at h2 and its 40px size. Skip this if the page already has an h1, so there are never two.
- [ ] Region tabs: add the hidden h2 "Dealer locations by region" and use it to name the tab list. Keep the countries at h3.
- [ ] Dealer names: make them headings. h3 in the visitor's-country list, h4 inside the expandable countries. Same look as now.
- [ ] Sync the branch preview and check that every code file is up to date.
- [ ] Confirm the automatic level shift no longer applies, now that the page has its own h1.
- [ ] Check the heading outline at desktop and mobile, with every tab selected and the countries expanded: exactly one h1, no skipped levels, no empty headings.
- [ ] Check the look is identical before and after: heading fonts, sizes, weights, spacing, colours and positions, plus page height.
- [ ] Run an automated accessibility scan (0 violations), a Lighthouse audit (mobile and desktop) and the code style check.
- [ ] Spot-check another country and language (e.g. Italy in Italian) for translated text and the same outline.
- [ ] Ask before opening the PR; don't merge without your go-ahead.
