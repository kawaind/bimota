import {
  createElement, isReservedHash, scrollToAnchor,
} from '../../scripts/helpers.js';

const blockName = 'submenu';

// Background-colour variants the author can pick (added as a class on the block,
// e.g. "Submenu (dark-gray)"). The block defaults to `white` when none is set.
const COLOR_VARIANTS = ['dark-gray', 'light-gray', 'white', 'black'];

// Count instances so each <nav> landmark gets a unique accessible name when a
// page has more than one submenu (the first stays "Submenu", later ones are
// "Submenu 2", ...), keeping landmarks distinguishable (WCAG 1.3.1).
let instanceCount = 0;

// Scroll position at the last direction check, shared by every submenu instance
// so the show/hide tracks the page the same way the header does.
let lastScrollY = 0;
let scrollBound = false;

/**
 * Hide the sticky submenu(s) while the user scrolls down (past a small
 * threshold) and reveal them again on scroll-up — mirroring the main nav's
 * fade-out behaviour so the bar disappears and reappears together with it.
 * A single shared scroll listener toggles the `submenu-hidden` class on every
 * instance. Bound once, lazily, so multiple blocks don't stack listeners.
 */
function bindScrollHide() {
  if (scrollBound) return;
  scrollBound = true;
  lastScrollY = window.scrollY;

  document.addEventListener('scroll', () => {
    const { scrollY } = window;
    const bars = document.querySelectorAll(`.${blockName}`);
    // Scrolling down and past the header height: hide. Scrolling up: show.
    if (scrollY - lastScrollY > 0 && scrollY > 200) {
      bars.forEach((bar) => bar.classList.add(`${blockName}-hidden`));
    } else if (lastScrollY - scrollY > 0) {
      bars.forEach((bar) => bar.classList.remove(`${blockName}-hidden`));
    }
    lastScrollY = scrollY;
  }, { passive: true });
}

/**
 * Sub-menu header bar: a horizontal navigation strip of author-defined links.
 * Works both as an in-page block and when placed inside the nav fragment.
 * Supports three link kinds with no special authoring beyond the href:
 *  - external links (absolute URLs to other sites),
 *  - internal links to other pages in the same locale site,
 *  - in-page anchor links ("#id" / "/current-path#id"), which smooth-scroll to
 *    a target on the page — the same behaviour as the cookie page and the main
 *    nav. The block wires these itself (via the shared scrollToAnchor helper) so
 *    they work even inside the header fragment, where the site's global anchor
 *    decoration does not run.
 * Links are exposed as a <nav> landmark wrapping a <ul>/<li> list so the bar is
 * announced as navigation and its items as a list (WCAG 1.3.1, 4.1.2); the link
 * matching the current page is flagged with aria-current="page" (WCAG 2.4.8).
 * The bar is sticky and hides/shows in sync with the main nav on scroll.
 * @param {Element} block the submenu block element
 */
export default function decorate(block) {
  // Default the colour variant to `white` when the author picked none.
  if (!COLOR_VARIANTS.some((v) => block.classList.contains(v))) {
    block.classList.add('white');
  }

  // Gather the authored links in document order, wherever they were placed
  // (a list, separate cells, or inline), so the author model is forgiving.
  const links = [...block.querySelectorAll('a[href]')];

  instanceCount += 1;
  const navLabel = instanceCount === 1 ? 'Submenu' : `Submenu ${instanceCount}`;
  const nav = createElement('nav', {
    classes: `${blockName}-nav`,
    props: { 'aria-label': navLabel },
  });
  const list = createElement('ul', { classes: `${blockName}-list` });

  const currentPath = window.location.pathname.replace(/\/+$/, '');

  links.forEach((link) => {
    const item = createElement('li', { classes: `${blockName}-item` });
    link.classList.add(`${blockName}-link`);

    const url = new URL(link.href, window.location.href);
    const samePage = url.pathname.replace(/\/+$/, '') === currentPath;
    const targetId = url.hash.substring(1);
    const isAnchor = !!url.hash && samePage && targetId && !isReservedHash(targetId);

    if (isAnchor) {
      // In-page anchor: smooth-scroll to the target instead of navigating,
      // matching the main nav's anchor behaviour. Wired here (not left to the
      // global decorateAnchors) so it also works when the submenu lives in the
      // header fragment. No-op if the target is not present on the page.
      link.addEventListener('click', (e) => {
        if (!document.getElementById(targetId)) return;
        e.preventDefault();
        scrollToAnchor(targetId);
      });
    } else if (samePage && !url.hash) {
      // A plain link to the current page is exposed as the current item.
      link.setAttribute('aria-current', 'page');
    }

    item.append(link);
    list.append(item);
  });

  nav.append(list);
  block.textContent = '';
  block.append(nav);

  bindScrollHide();
}
