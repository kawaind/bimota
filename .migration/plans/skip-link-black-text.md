# Specification Modal: Content Behind the Dialog Isn't Fully Hidden (ARC Toolkit)

**ARC Toolkit is right, and the cause is the cookie-consent widget.** When the specification modal opens on `/es/es/tesi-h2-tera`, the site hides four page areas from screen readers: the skip link, header, main and footer. The cookie-consent widget is injected into the page separately, after it loads, and it isn't on that list. Its "Cambiar el consentimiento" landmark and button stay exposed next to the dialog. Nothing has been changed yet; the fix needs Execute mode on a new branch from compliance.

## What I found (compliance preview, modal open)
| Element at the top level of the page | Hidden from screen readers while the modal is open? |
|---|---|
| Skip link | Yes |
| Header | Yes |
| Main content | Yes |
| Footer | Yes |
| **Cookie-consent widget**: "Cambiar el consentimiento" landmark (`role="complementary"`) with a button | **No** |
| The modal itself (`role="dialog"`, `aria-modal="true"`, named "Tesi H2 TERA") | Stays exposed, as it should |

- **What a screen-reader user can reach:** the dialog, plus the "Cambiar el consentimiento" landmark and button. With the virtual cursor or the landmark list, they can reach content behind the modal. That's exactly what ARC Toolkit reports.
- **Keyboard (Tab) is not affected:** the focus trap keeps Tab inside the modal.
- **Why it happens:** `scripts/modal-helper.js:150` hides a fixed list, `['.skip-link-wrapper', 'header', 'main', 'footer']`. The cookie widget is added by the consent script after the page loads, so the fixed list can't know about it. Anything else a third-party script injects at the top level would be missed the same way.
- **Same problem elsewhere:** the country-selector modal (header globe and footer "Cambio") uses the same code and has the same gap.

## Proposed fix (`scripts/modal-helper.js` only)
- **On open:** instead of the fixed list, set `aria-hidden="true"` on **every top-level element except the modal**. That covers the skip link, header, main, footer, the cookie widget and anything injected later. Elements that already have `aria-hidden` are skipped and remembered.
- **On close:** remove `aria-hidden` only from the elements the modal itself hid. Anything hidden for another reason stays hidden.
- **Unchanged:** the focus trap, Escape, focus returning to the button, the open/closed state on the button, the look and the animations.
- **Not included:** switching to `inert`. It would also block clicks and focus, but the header already uses `inert` for the mobile menu, so the two could conflict. `aria-hidden` on top of the existing focus trap is the standard approach, and it's what ARC Toolkit checks for.
- **Edge case (optional):** if the cookie widget is injected *while* a modal is open, a small observer could hide it too. This is rare, since the widget loads with the page, so I suggest skipping it unless you want it.

## Checklist
- [ ] **Decide:** use the generic "hide every top-level element except the modal" approach (recommended), and choose whether to add the observer for content injected while the modal is open.
- [ ] Execute mode: create a new branch from compliance.
- [ ] In `scripts/modal-helper.js`, replace the fixed `backgroundRegions` list:
  - [ ] on open, set `aria-hidden="true"` on every top-level element except the modal and remember which ones changed;
  - [ ] on close, restore only those.
- [ ] Run `npm run lint`, push, run a full code sync, and confirm the branch preview serves the new code.
- [ ] **Verify on `/es/es/tesi-h2-tera`** (desktop 1440px, mobile 390px), with the specification modal open:
  - [ ] the accessibility tree shows only the dialog: no "Cambiar el consentimiento" landmark or button and no page content;
  - [ ] after closing, everything is exposed again, including the cookie widget;
  - [ ] focus returns to the button and the button reports "collapsed".
- [ ] Repeat the check with the country-selector modal: the header globe and the footer "Cambio" link.
- [ ] Regression checks:
  - [ ] the rapid Enter/Escape sequence leaves no blur;
  - [ ] Tab goes Close → table area → Close;
  - [ ] the mobile menu still uses `inert` correctly.
- [ ] Run axe-core on the open modals and Lighthouse on `/es/es/tesi-h2-tera`, and confirm 0 violations and 100/100/100 (SEO 69 on preview).
- [ ] Ask you to re-run ARC Toolkit on the branch preview (I can't run that browser extension).
- [ ] Open a PR into compliance only when you give the go-ahead. Nothing is merged without it.
