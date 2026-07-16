import {
  loadHeader,
  loadFooter,
  decorateButtons,
  decorateSections,
  decorateBlocks,
  decorateTemplateAndTheme,
  waitForFirstImage,
  loadSection,
  loadSections,
  loadCSS,
  sampleRUM,
  fetchPlaceholders,
  getRootPath,
  toClassName,
} from './aem.js';
import { customDecoreateIcons } from './decorate-icon-helper.js';
import { getLanguageFromPath } from './helpers.js';

function buildVideoBlock(main) {
  const videoLinks = [...main.querySelectorAll('a[href$=".mp4"]')];

  videoLinks.forEach((videoLink) => {
    const videoEl = document.createElement('video');
    const sourceEl = document.createElement('source');

    videoEl.classList.add('mp4-video');
    videoEl.muted = true;
    videoEl.autoplay = true;
    videoEl.loop = true;
    sourceEl.setAttribute('src', videoLink.href);
    sourceEl.setAttribute('type', 'video/mp4');

    videoEl.append(sourceEl);
    videoLink.replaceWith(videoEl);
  });
}

/**
 * load fonts.css and set a session storage flag
 */
async function loadFonts() {
  await loadCSS(`${window.hlx.codeBasePath}/styles/fonts.css`);
  try {
    if (!window.location.hostname.includes('localhost')) sessionStorage.setItem('fonts-loaded', 'true');
  } catch (e) {
    // do nothing
  }
}

/**
 * Builds all synthetic blocks in a container element.
 * @param {Element} main The container element
 */
function buildAutoBlocks(main) {
  try {
    buildVideoBlock(main);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Auto Blocking failed', error);
  }
}

function customDecorateSections(main) {
  main.querySelectorAll(':scope > div').forEach((section) => {
    // adding the 'heading-with-marker' to section will affect the first heading
    if (section.classList.contains('heading-with-marker')) {
      section.querySelector('h1, h2, h3, h4, h5, h6')?.classList.add('heading-with-marker');
      section.classList.remove('heading-with-marker');
    }
  });
}

export function customDecorateBlocks(main) {
  main.querySelectorAll('div.section > div > div').forEach((block) => {
    if (block.classList.contains('full-width')) {
      block.parentElement.classList.add('wrapper-full-width');
    }
  });
}

// Hash prefixes reserved by other features (modals, block swapping) that must
// not be treated as in-page anchor links.
const RESERVED_HASH_PREFIXES = ['modal-', 'id-'];

function isReservedHash(hash) {
  return RESERVED_HASH_PREFIXES.some((prefix) => hash.startsWith(prefix));
}

function decorateAnchors(main) {
  // Matches a trailing custom-slug marker like "{#tech-notes}" in heading text.
  const customSlugRegex = /\{#([a-z0-9-]+)\}/i;
  const idCounts = {};

  const registerId = (base) => {
    let id = base;
    if (idCounts[base]) {
      idCounts[base] += 1;
      id = `${base}-${idCounts[base]}`;
    } else {
      idCounts[base] = 1;
    }
    return id;
  };

  // 1) Custom slug override: an author appends "{#custom-slug}" to any heading
  //    or bold paragraph. The marker is stripped from the visible text and the
  //    slug becomes the element id (e.g. "5. Long Header {#tech-notes}").
  main.querySelectorAll('h1, h2, h3, h4, h5, h6, p').forEach((el) => {
    const match = el.textContent.match(customSlugRegex);
    if (match) {
      const slug = match[1].toLowerCase();
      el.innerHTML = el.innerHTML.replace(/\s*\{#[a-z0-9-]+\}/i, '');
      if (!isReservedHash(slug) && !el.id) {
        el.id = registerId(slug);
        el.classList.add('anchor-target');
      }
    }
  });

  // 2) Auto-generate IDs on any heading (h1-h6) that has no id yet, so authors
  //    can link to "#heading-as-a-slug" without extra markup.
  main.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((heading) => {
    if (!heading.id) {
      heading.id = registerId(toClassName(heading.textContent));
      heading.classList.add('anchor-target');
    }
  });

  // 3) Explicit anchor markers: a standalone link whose href and visible text
  //    match (e.g. text "#contact" pointing to "#contact") becomes an invisible
  //    anchor point. Reserved hashes (modals, block swapping) are left alone.
  main.querySelectorAll('a[href^="#"]').forEach((link) => {
    const hash = link.getAttribute('href').substring(1);
    const text = link.textContent.trim().replace(/^#/, '');
    if (hash && !isReservedHash(hash) && text === hash) {
      const parent = link.parentElement;
      const isOnlyChild = parent && parent.childNodes.length === 1
        && (parent.tagName === 'P' || parent.tagName === 'DIV');

      const anchor = document.createElement('span');
      anchor.id = hash;
      anchor.className = 'anchor-point';

      if (isOnlyChild) {
        parent.replaceWith(anchor);
      } else {
        link.replaceWith(anchor);
      }
    }
  });

  // 4) Smooth scroll for in-page anchor links, skipping reserved hashes so
  //    modal triggers and block-swapping links keep their own behavior.
  main.querySelectorAll('a[href^="#"]').forEach((link) => {
    const targetId = link.getAttribute('href').substring(1);
    if (!targetId || isReservedHash(targetId)) return;
    link.addEventListener('click', (e) => {
      const target = document.getElementById(targetId);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth' });
        window.history.pushState(null, '', `#${targetId}`);
      }
    });
  });
}

function swappingPlacesBlock(main) {
  const idLinks = [...main.querySelectorAll('a[href*="#id-"]')];
  const elWithId = [...main.querySelectorAll('.block, .section')]
    .filter((el) => [...el.classList].find((className) => className.startsWith('id-')));

  idLinks.forEach((link) => {
    const id = link.href.split('#')[1];
    const selectedEl = elWithId.find((el) => el.classList.contains(id));
    let targetEl = link;

    if (link.closest('.button-container')) {
      targetEl = link.closest('.button-container');
    }

    targetEl.replaceWith(selectedEl);
  });
}

/**
 * Inline button/new-tab authoring shortcut for links written in open text.
 *
 * Authors can turn a plain inline link into a secondary button by prefixing its
 * text with `$`, and make it open in a new tab by suffixing the text with `+`:
 *   - `$Discover`   -> secondary button, same tab
 *   - `$Discover+`  -> secondary button, opens in a new tab
 *   - `Read more+`  -> plain inline link that opens in a new tab
 *
 * The marker characters are stripped from the visible/accessible label. Links
 * opening in a new tab get rel="noopener noreferrer" (security) and a
 * visually-hidden "(opens in a new tab)" hint so screen-reader users are warned
 * (WCAG 3.2.5). Runs after decorateButtons so it does not fight the existing
 * paragraph-wrapping button convention.
 * @param {Element} main The container element
 */
function decorateInlineButtons(main) {
  main.querySelectorAll('a:any-link').forEach((a) => {
    // Only act on text links (skip image links) and use the trimmed label.
    if (a.querySelector('img')) return;
    const label = a.textContent.trim();
    if (!label) return;

    const isButton = label.startsWith('$');
    const newTab = label.endsWith('+');
    if (!isButton && !newTab) return;

    // Strip the markers from the visible text.
    const cleanLabel = label.replace(/^\$/, '').replace(/\+$/, '').trim();
    a.textContent = cleanLabel;
    if (a.title === label) a.title = cleanLabel;

    if (isButton && !a.classList.contains('button')) {
      a.classList.add('button', 'secondary');
    }

    if (newTab) {
      a.setAttribute('target', '_blank');
      a.setAttribute('rel', 'noopener noreferrer');
      // Warn AT users the link opens in a new tab (WCAG 3.2.5).
      const hint = document.createElement('span');
      hint.className = 'sr-only';
      hint.textContent = ' (opens in a new tab)';
      a.append(hint);
    }
  });
}

/**
 * Decorates the main element.
 * @param {Element} main The main element
 */
// eslint-disable-next-line import/prefer-default-export
export function decorateMain(main) {
  // hopefully forward compatible button decoration
  decorateButtons(main);
  decorateInlineButtons(main);
  customDecoreateIcons(main);
  buildAutoBlocks(main);
  decorateSections(main);
  customDecorateSections(main);
  decorateBlocks(main);
  customDecorateBlocks(main);
  swappingPlacesBlock(main);
}

// English fallback shown until the translated label resolves (or if the sheet
// is unavailable), so the skip link is never unlabelled.
const SKIP_LINK_FALLBACK = 'Skip to content';

/**
 * Resolves the translated "Skip to content" label from the global lanconfig.json
 * multi-sheet. The `sr-skipbutton` sheet has a `skipToContent` row with one
 * column per language code (en, it, fr, de, nl, es, ja, lu); the column matching
 * the current URL's language wins, else `en`. Adding a language is an authoring
 * change: add a column. Falls back to the English default on any error.
 * @returns {Promise<string>} the language-appropriate skip link label
 */
async function getSkipLinkLabel() {
  try {
    const resp = await fetch('/lanconfig.json?sheet=sr-skipbutton');
    if (!resp.ok) return SKIP_LINK_FALLBACK;
    const json = await resp.json();
    const data = json['sr-skipbutton']?.data || json.data || [];
    const row = data.find((r) => r.Key === 'skipToContent');
    if (!row) return SKIP_LINK_FALLBACK;
    const lang = getLanguageFromPath();
    return row[lang] || row.en || SKIP_LINK_FALLBACK;
  } catch (e) {
    return SKIP_LINK_FALLBACK;
  }
}

/**
 * Injects a "skip to content" link as the very first focusable element on the
 * page so keyboard and screen-reader users can bypass the repeated header/menu
 * and jump straight to the main content (WCAG 2.4.1 Bypass Blocks, EAA/ADA).
 * The link is visually hidden until focused; on activation it moves focus to
 * <main> (tabindex="-1" so it is programmatically focusable but not in the tab
 * order) rather than only scrolling, so assistive tech follows along. The label
 * is created with an English fallback and swapped for the translated value once
 * the lanconfig.json sheet resolves, so it is present in time for LCP.
 * @param {Document} doc the document
 * @param {Element} main the main element
 */
function decorateSkipLink(doc, main) {
  if (!main || doc.querySelector('.skip-link')) return;

  main.id = main.id || 'main-content';
  main.setAttribute('tabindex', '-1');

  const skipLink = doc.createElement('a');
  skipLink.className = 'skip-link';
  skipLink.href = `#${main.id}`;
  skipLink.textContent = SKIP_LINK_FALLBACK;

  skipLink.addEventListener('click', (e) => {
    e.preventDefault();
    main.scrollIntoView();
    main.focus();
  });

  doc.body.prepend(skipLink);

  getSkipLinkLabel().then((label) => {
    skipLink.textContent = label;
  });
}

function setMainPosition(main) {
  if (main.querySelector(':scope > .section:first-child > .hero-wrapper:first-child')) {
    main.classList.add('no-top-margin');
  }
}

/**
 * Loads everything needed to get to LCP.
 * @param {Element} doc The container element
 */
async function loadEager(doc) {
  const pathTokens = window.location.pathname.split('/');
  const lang = pathTokens.length >= 3 ? pathTokens[2].split('-')[0] : 'en';
  document.documentElement.lang = lang;

  if (pathTokens[1] === 'us' && pathTokens[2] === 'en-us') {
    document.body.classList.add('locale-us');
  }

  decorateTemplateAndTheme();
  const main = doc.querySelector('main');
  if (main) {
    decorateSkipLink(doc, main);
    decorateMain(main);
    setMainPosition(main);
    document.body.classList.add('appear');
    await loadSection(main.querySelector('.section'), waitForFirstImage);
  }

  sampleRUM.enhance();

  try {
    /* if desktop (proxy for fast connection) or fonts already loaded, load fonts.css */
    if (window.innerWidth >= 900 || sessionStorage.getItem('fonts-loaded')) {
      loadFonts();
    }
  } catch (e) {
    // do nothing
  }
}

/**
 * Loads everything that doesn't need to be delayed.
 * @param {Element} doc The container element
 */
async function loadLazy(doc) {
  const main = doc.querySelector('main');
  await loadSections(main);

  decorateAnchors(main);

  const { hash } = window.location;
  const element = hash ? doc.getElementById(hash.substring(1)) : false;
  if (hash && element) element.scrollIntoView();

  loadHeader(doc.querySelector('header'));
  loadFooter(doc.querySelector('footer'));

  loadCSS(`${window.hlx.codeBasePath}/styles/lazy-styles.css`);
  loadFonts();
}

/**
 * Loads everything that happens a lot later,
 * without impacting the user experience.
 */
function loadDelayed() {
  // eslint-disable-next-line import/no-cycle
  window.setTimeout(() => import('./delayed.js'), 3000);
  // load anything that can be postponed to the latest here
}

async function fetch404Content(path) {
  const resp = await fetch(`${path}.plain.html`);
  if (!resp.ok) return null;
  return resp.text();
}

async function load404Fragment() {
  if (!window.isErrorPage) return;
  const main = document.querySelector('main');
  const rootPath = getRootPath();
  let html = null;

  if (rootPath) {
    html = await fetch404Content(`${rootPath}/404`);
  }

  if (!html) {
    html = await fetch404Content('/fragments/404');
  }

  if (html) {
    main.innerHTML = html;
  }
}

async function loadPage() {
  await load404Fragment();
  await loadEager(document);
  await loadLazy(document);
  loadDelayed();
}

let placeholders;

export function getTextLabel(key) {
  if (!placeholders) {
    return key;
  }

  return placeholders[key] || key;
}

fetchPlaceholders().then((p) => {
  placeholders = p;
});

loadPage();

(async function loadDa() {
  if (!new URL(window.location.href).searchParams.get('dapreview')) return;
  // eslint-disable-next-line import/no-unresolved
  import('https://da.live/scripts/dapreview.js').then(({ default: daPreview }) => daPreview(loadPage));
  document.documentElement.classList.add('da-preview');
}());
