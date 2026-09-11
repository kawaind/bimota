import { createElement } from '../../scripts/helpers.js';

const blockName = 'submenu';

// Background-colour variants the author can pick (added as a class on the block,
// e.g. "Submenu (dark-gray)"). The block defaults to `white` when none is set.
const COLOR_VARIANTS = ['dark-gray', 'light-gray', 'white', 'black'];

// Count instances so each <nav> landmark gets a unique accessible name when a
// page has more than one submenu (the first stays "Submenu", later ones are
// "Submenu 2", ...), keeping landmarks distinguishable (WCAG 1.3.1).
let instanceCount = 0;

/**
 * Sub-menu header bar: a horizontal navigation strip of author-defined links.
 * Supports three link kinds with no special authoring beyond the href:
 *  - external links (absolute URLs to other sites),
 *  - internal links to other pages in the same locale site,
 *  - in-page anchor links ("#id"), which the site's global anchor handling
 *    (decorateAnchors in scripts.js) already wires for smooth-scroll — the
 *    block lives inside <main>, so no per-block anchor code is needed.
 * Links are exposed as a <nav> landmark wrapping a <ul>/<li> list so the bar is
 * announced as navigation and its items as a list (WCAG 1.3.1, 4.1.2); the link
 * matching the current page is flagged with aria-current="page" (WCAG 2.4.8).
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

    // A plain link to the current page (no hash) is exposed as the current item
    // (WCAG 2.4.8). In-page anchor links are handled by the site's global anchor
    // decoration, and external/internal links navigate normally.
    const url = new URL(link.href, window.location.href);
    const samePage = url.pathname.replace(/\/+$/, '') === currentPath;
    if (samePage && !url.hash) {
      link.setAttribute('aria-current', 'page');
    }

    item.append(link);
    list.append(item);
  });

  nav.append(list);
  block.textContent = '';
  block.append(nav);
}
