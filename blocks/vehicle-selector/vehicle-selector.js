/* eslint-disable max-len */
import { createElement, stripEmptyTags, describeButton } from '../../scripts/helpers.js';
import { getTextLabel } from '../../scripts/scripts.js';

const blockName = 'vehicle-selector';

let idCounter = 0;
// Unique id prefix so multiple instances on a page don't collide.
const uid = () => {
  idCounter += 1;
  return `${blockName}-${idCounter}`;
};

const ARROW_PREV_SVG = `
  <svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 34 34" fill="none" aria-hidden="true" focusable="false">
    <path d="M20.764 9.65283C20.2223 9.11117 19.3473 9.11117 18.8057 9.65283L12.4307 16.0278C11.889 16.5695 11.889 17.4445 12.4307 17.9862L18.8057 24.3612C19.3473 24.9028 20.2223 24.9028 20.764 24.3612C21.3057 23.8195 21.3057 22.9445 20.764 22.4028L15.3751 17.0001L20.764 11.6112C21.3057 11.0695 21.2918 10.1806 20.764 9.65283Z" fill="currentColor"/>
  </svg>`;

const ARROW_NEXT_SVG = `
  <svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 34 34" fill="none" aria-hidden="true" focusable="false">
    <path d="M13.2363 9.65312C12.6947 10.1948 12.6947 11.0698 13.2363 11.6115L18.6252 17.0003L13.2363 22.3892C12.6947 22.9309 12.6947 23.8059 13.2363 24.3476C13.778 24.8892 14.653 24.8892 15.1947 24.3476L21.5697 17.9726C22.1113 17.4309 22.1113 16.5559 21.5697 16.0142L15.1947 9.63923C14.6669 9.11145 13.778 9.11145 13.2363 9.65312Z" fill="currentColor"/>
  </svg>`;

/**
 * Apply the selected state for a given tab index (ARIA Tabs pattern):
 * - the active tab gets aria-selected=true and is the only tab in the tab
 *   sequence (roving tabindex); the rest are aria-selected=false / tabindex=-1
 *   and are reachable with Left/Right/Home/End,
 * - the matching tabpanel is shown and made focusable; every other panel is
 *   removed from layout, the a11y tree AND the tab order with the native
 *   `hidden` attribute. `hidden` is used instead of aria-hidden because each
 *   panel contains a focusable "Discover" CTA — aria-hidden on focusable
 *   content is a WCAG 4.1.2 failure (a keyboard user could still tab into
 *   content the AT is told to ignore).
 *
 * @param {HTMLElement} block the block root
 * @param {number} index the tab/panel index to activate
 * @param {Object} [options]
 * @param {boolean} [options.moveFocus=false] move DOM focus onto the tab
 *   (used by the arrow-key / Home / End interactions, which move focus and
 *   activate together).
 * @param {boolean} [options.announce=false] mirror the vehicle name into the
 *   live region (used by the prev/next arrow controls, where focus stays on
 *   the arrow so the change would otherwise be silent to a screen reader).
 */
const getActiveIndex = (block) => {
  const tabs = [...block.querySelectorAll(`.${blockName}__navigation [role="tab"]`)];
  const current = tabs.findIndex((tab) => tab.getAttribute('aria-selected') === 'true');
  return current === -1 ? 0 : current;
};

const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const SLIDE_CLASSES = ['is-entering', 'is-leaving', 'from-right', 'from-left', 'to-left', 'to-right'];

/**
 * Visual-only directional cross-slide between panels. The direction follows the
 * order of the vehicles: moving forward (to a later vehicle) the incoming panel
 * slides in from the right while the outgoing one slides off to the left;
 * moving backward (to an earlier vehicle) the incoming panel slides in from the
 * left while the outgoing one slides off to the right. This runs purely for
 * appearance and never changes the accessibility state — `activate` has already
 * made the incoming panel the only one exposed to assistive tech. During its
 * exit the outgoing panel is marked `inert` so, even though it stays painted
 * for the animation, it is removed from the a11y tree and its focusable CTA
 * cannot be tabbed into. Skipped when the user prefers reduced motion.
 * @param {HTMLElement[]} panels all panel elements
 * @param {number} fromIndex the outgoing panel index
 * @param {number} toIndex the incoming (now active) panel index
 */
const slidePanels = (panels, fromIndex, toIndex) => {
  const incoming = panels[toIndex];
  const outgoing = panels[fromIndex];

  // Clear any in-flight transition so rapid switches don't leave ghosts.
  panels.forEach((panel) => {
    panel.classList.remove(...SLIDE_CLASSES);
    panel.removeAttribute('inert');
  });

  if (prefersReducedMotion() || fromIndex === toIndex || !incoming || !outgoing) return;

  const forward = toIndex > fromIndex;

  incoming.classList.add('is-entering', forward ? 'from-right' : 'from-left');
  incoming.addEventListener('animationend', () => incoming.classList.remove(...SLIDE_CLASSES), { once: true });

  // Keep the outgoing panel painted (overriding its `hidden` display:none) only
  // for the duration of its slide-out, then let `hidden` take over again.
  outgoing.classList.add('is-leaving', forward ? 'to-left' : 'to-right');
  outgoing.setAttribute('inert', '');
  outgoing.addEventListener('animationend', () => {
    outgoing.classList.remove(...SLIDE_CLASSES);
    outgoing.removeAttribute('inert');
  }, { once: true });
};

const activate = (block, index, { moveFocus = false, announce = false } = {}) => {
  const tabs = [...block.querySelectorAll(`.${blockName}__navigation [role="tab"]`)];
  const panels = [...block.querySelectorAll(`.${blockName}__panel`)];
  if (!tabs.length || index < 0 || index >= tabs.length) return;

  // Remember which panel is leaving so we can animate the cross-slide after the
  // accessibility state is updated below.
  const previousIndex = getActiveIndex(block);

  tabs.forEach((tab, i) => {
    const selected = i === index;
    tab.setAttribute('aria-selected', selected ? 'true' : 'false');
    tab.setAttribute('tabindex', selected ? '0' : '-1');
    tab.closest(`.${blockName}__navigation-item`)?.classList.toggle('active', selected);
  });

  panels.forEach((panel, i) => {
    const selected = i === index;
    panel.hidden = !selected;
    // Active panel is focusable so Tab can move from the arrow into it; hidden
    // panels are inert regardless, but keep the sequence explicit.
    panel.setAttribute('tabindex', selected ? '0' : '-1');
  });

  // Visual cross-slide (appearance only; the a11y state above is already the
  // source of truth). No-op on the initial render and on resize (same index).
  slidePanels(panels, previousIndex, index);

  // Keep the active name in view within the horizontally-scrollable navigation.
  // Only scroll when the strip actually overflows, so with a handful of names
  // they simply stay left-aligned. When there are too many to fit, the strip
  // slides left as the user moves toward the end, keeping the active name a
  // little in from the left edge (rather than dead-centre) so it reads as the
  // names sliding in from the left.
  const nav = block.querySelector(`.${blockName}__navigation`);
  const activeItem = nav?.querySelector(`.${blockName}__navigation-item.active`);
  if (nav && activeItem && nav.scrollWidth > nav.clientWidth) {
    const { clientWidth: itemWidth, offsetLeft } = activeItem;
    const inset = Math.min(nav.clientWidth * 0.25, nav.clientWidth - itemWidth);
    const target = Math.max(0, offsetLeft - inset);
    nav.scrollTo({
      left: Math.min(target, nav.scrollWidth - nav.clientWidth),
      behavior: 'smooth',
    });
  }

  if (moveFocus) {
    tabs[index].focus();
  }

  // When the change is driven by the prev/next arrows, focus stays on the
  // arrow control, so scrolling a new vehicle into view announces nothing on
  // its own. Mirror the active vehicle name here so it is announced. Tab
  // navigation already announces the name via the focused tab, so we avoid
  // duplicating it there.
  const liveRegion = block.querySelector(`.${blockName}__live-region`);
  if (announce && liveRegion) {
    liveRegion.textContent = tabs[index]?.textContent ?? '';
  }
};

/**
 * Build the tablist (container that holds the tab elements) from the authored
 * vehicle titles. Returns the tablist element and its tab buttons.
 */
const buildTabNavigation = (vehicles, instanceId, onSelect) => {
  const tabNavigation = createElement('ul', { classes: `${blockName}__navigation` });
  tabNavigation.setAttribute('role', 'tablist');
  tabNavigation.setAttribute('aria-label', getTextLabel('Vehicle selector'));

  const tabs = [];
  vehicles.forEach((vehicle, i) => {
    const listItem = createElement('li', { classes: `${blockName}__navigation-item` });
    // The <li> is only a layout wrapper, not part of the tablist semantics.
    listItem.setAttribute('role', 'presentation');

    const button = createElement('button');
    button.classList.add('h5');
    button.setAttribute('type', 'button');
    button.setAttribute('role', 'tab');
    button.id = `${instanceId}-tab-${i}`;
    button.setAttribute('aria-controls', `${instanceId}-panel-${i}`);
    // Roving tabindex: only the active tab is in the tab sequence; the rest are
    // reached with Left/Right/Home/End.
    button.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
    button.setAttribute('tabindex', i === 0 ? '0' : '-1');
    button.textContent = vehicle.title ? vehicle.title.textContent.trim() : '';
    button.addEventListener('click', () => onSelect(i));

    listItem.append(button);
    tabNavigation.append(listItem);
    tabs.push(button);
  });

  return { tabNavigation, tabs };
};

/**
 * Group the authored specification paragraphs into label/value stat blocks,
 * matching the visual treatment of the specification component.
 */
const decorateSpecifications = (description) => {
  description.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((heading) => {
    heading.classList.add('h6');
  });

  description.querySelectorAll('p').forEach((paragraph) => {
    const strongEls = paragraph.querySelectorAll('strong');
    const hasButton = paragraph.classList.contains('button-container');

    if (strongEls.length > 0) {
      paragraph.classList.add('font-small', 'description-value');
      strongEls.forEach((el) => el.classList.add('h6'));
    } else if (!hasButton) {
      paragraph.classList.add('font-small', 'description-label');
    }
  });

  [...description.querySelectorAll('.description-label')].reverse().forEach((label) => {
    const stat = createElement('div', { classes: 'description-stat' });
    const valueEl = label.nextElementSibling;
    stat.append(label);
    if (valueEl) stat.append(valueEl);
    description.prepend(stat);
  });
};

/**
 * Build one tabpanel per vehicle. Each panel groups the vehicle image, its
 * technical specifications and the "Discover more" CTA (in that reading order)
 * so a screen reader reads them sequentially once focus lands on the panel
 * (WCAG 1.3.1, 2.4.3).
 */
const buildPanels = (vehicles, instanceId, tabs) => {
  const panelsContainer = createElement('div', { classes: `${blockName}__panels` });

  vehicles.forEach((vehicle, i) => {
    const panel = createElement('div', { classes: `${blockName}__panel` });
    panel.setAttribute('role', 'tabpanel');
    panel.id = `${instanceId}-panel-${i}`;
    panel.setAttribute('aria-labelledby', `${instanceId}-tab-${i}`);

    // Image first so it is read before the specifications.
    if (vehicle.picture) {
      const media = createElement('div', { classes: `${blockName}__panel-media` });
      const img = vehicle.picture.querySelector('img');
      const vehicleName = tabs[i]?.textContent.trim();
      // Name the image after its vehicle so the slide is meaningful to AT
      // (the source images ship with empty/decorative alt text).
      if (img && vehicleName && !img.getAttribute('alt')) {
        img.setAttribute('alt', vehicleName);
      }
      media.appendChild(vehicle.picture);
      panel.appendChild(media);
    }

    // Specifications + CTA.
    if (vehicle.description) {
      const specs = vehicle.description;
      specs.classList.add(`${blockName}__panel-specs`);
      decorateSpecifications(specs);

      // Describe the CTA by its own text + the vehicle name (WCAG 2.4.6, 4.1.2).
      const ctaButton = specs.querySelector('a.button');
      if (ctaButton && tabs[i]) {
        describeButton(ctaButton, tabs[i]);
      }

      panel.appendChild(specs);
    }

    panelsContainer.appendChild(panel);
  });

  return panelsContainer;
};

/**
 * Create the previous / next arrow controls. Unlike a decorative carousel, the
 * arrows are real, keyboard-operable controls placed in the tab sequence
 * (Tab: first tab -> previous arrow -> panel -> CTA -> next arrow -> out), so
 * they are NOT hidden from assistive tech. They are split around the panels in
 * the DOM to produce that focus order, and positioned visually with CSS.
 */
const buildArrowControls = (block) => {
  const prev = createElement('button', { classes: `${blockName}__arrow`, props: { type: 'button' } });
  prev.classList.add(`${blockName}__arrow--prev`);
  prev.setAttribute('aria-label', getTextLabel('Previous vehicle'));
  prev.innerHTML = ARROW_PREV_SVG;
  prev.addEventListener('click', () => {
    const tabs = block.querySelectorAll(`.${blockName}__navigation [role="tab"]`);
    const index = getActiveIndex(block);
    const next = index === 0 ? tabs.length - 1 : index - 1;
    activate(block, next, { announce: true });
  });

  const next = createElement('button', { classes: `${blockName}__arrow`, props: { type: 'button' } });
  next.classList.add(`${blockName}__arrow--next`);
  next.setAttribute('aria-label', getTextLabel('Next vehicle'));
  next.innerHTML = ARROW_NEXT_SVG;
  next.addEventListener('click', () => {
    const tabs = block.querySelectorAll(`.${blockName}__navigation [role="tab"]`);
    const index = getActiveIndex(block);
    const target = index === tabs.length - 1 ? 0 : index + 1;
    activate(block, target, { announce: true });
  });

  return { prev, next };
};

/**
 * Keyboard interaction for the tablist (ARIA Tabs pattern):
 * Left/Right wrap around; Home/End jump to the first/last tab. Focus moves to
 * the newly focused tab and it is activated together.
 */
const addTablistKeyboard = (block, tablist) => {
  const tabs = [...tablist.querySelectorAll('[role="tab"]')];

  tablist.addEventListener('keydown', (e) => {
    const currentIndex = tabs.indexOf(document.activeElement);
    if (currentIndex === -1) return;

    let newIndex;
    switch (e.key) {
      case 'ArrowRight':
        newIndex = currentIndex === tabs.length - 1 ? 0 : currentIndex + 1;
        break;
      case 'ArrowLeft':
        newIndex = currentIndex === 0 ? tabs.length - 1 : currentIndex - 1;
        break;
      case 'Home':
        newIndex = 0;
        break;
      case 'End':
        newIndex = tabs.length - 1;
        break;
      default:
        return;
    }

    e.preventDefault();
    activate(block, newIndex, { moveFocus: true });
  });
};

export default function decorate(block) {
  const instanceId = uid();

  // Parse the authored rows: each row = [title, image, description].
  const rows = [...block.querySelectorAll(':scope > div')];
  const vehicles = rows.map((row) => {
    const cells = [...row.children];
    return {
      title: cells[0]?.querySelector('h1, h2, h3, h4, h5, h6') || null,
      picture: cells[1]?.querySelector('picture') || null,
      description: cells[2] || null,
    };
  }).filter((vehicle) => vehicle.title || vehicle.picture || vehicle.description);

  // Build the three parts of the ARIA Tabs pattern.
  const { tabNavigation, tabs } = buildTabNavigation(vehicles, instanceId, (index) => {
    activate(block, index);
  });
  const panelsContainer = buildPanels(vehicles, instanceId, tabs);
  const { prev, next } = buildArrowControls(block);

  // Wrapper that positions the arrows over the panel media.
  const sliderWrapper = createElement('div', { classes: `${blockName}__slider-wrapper` });
  // DOM order produces the required focus order:
  // tab -> previous arrow -> panel -> CTA -> next arrow -> out.
  sliderWrapper.append(prev, panelsContainer, next);

  // Replace the original authored rows with the refactored structure.
  block.textContent = '';
  block.append(tabNavigation, sliderWrapper);

  addTablistKeyboard(block, tabNavigation);

  // Prune any empty wrappers left over from authoring.
  block.querySelectorAll('p, div').forEach((item) => stripEmptyTags(block, item));

  // Visually-hidden live region for arrow-driven changes (focus stays on the
  // arrow, so the new vehicle would otherwise be announced by nothing). Added
  // after the strip loop above so this intentionally-empty element survives.
  const liveRegion = createElement('div', { classes: `${blockName}__live-region` });
  liveRegion.setAttribute('aria-live', 'polite');
  liveRegion.setAttribute('role', 'status');
  block.append(liveRegion);

  // Set the initial active/selected state (tab 0 + its panel).
  activate(block, 0);

  // Re-center the active tab when the viewport changes size.
  window.addEventListener('resize', () => {
    activate(block, getActiveIndex(block));
  });

  block.classList.add('full-width');
}
