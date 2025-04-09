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
} from './aem.js';
import { customDecoreateIcons } from './decorate-icon-helper.js';

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
 * Decorates the main element.
 * @param {Element} main The main element
 */
// eslint-disable-next-line import/prefer-default-export
export function decorateMain(main) {
  // hopefully forward compatible button decoration
  decorateButtons(main);
  customDecoreateIcons(main);
  buildAutoBlocks(main);
  decorateSections(main);
  customDecorateSections(main);
  decorateBlocks(main);
  customDecorateBlocks(main);
  swappingPlacesBlock(main);
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
  document.documentElement.lang = 'en';
  decorateTemplateAndTheme();
  const main = doc.querySelector('main');
  if (main) {
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

async function loadPage() {
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
