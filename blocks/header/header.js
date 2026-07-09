import { getMetadata, getRootPath } from '../../scripts/aem.js';
import { addAnimateInOut } from '../../scripts/modal-helper.js';
import { customDecoreateIcons } from '../../scripts/decorate-icon-helper.js';
import { getLanguageFromPath } from '../../scripts/helpers.js';
import { loadFragment } from '../fragment/fragment.js';

/**
 * Resolves the translated logo alt text from the global logoconfig.json sheet.
 * The sheet has one row per label: a `key` (e.g. "logoAlt"), a `value` (default
 * fallback) and one column per language code (en, fr, de, es, ja, nl, it...).
 * The column matching the current URL's language wins; otherwise `value` is
 * used. Adding a new language is purely an authoring change: add a column.
 * @returns {Promise<string>} the resolved, language-appropriate logo alt text
 */
async function getLogoAlt() {
  const fallback = 'Bimota - Home';
  try {
    const resp = await fetch('/logoconfig.json');
    if (!resp.ok) return fallback;
    const { data = [] } = await resp.json();
    const row = data.find((r) => r.key === 'logoAlt');
    if (!row) return fallback;
    const lang = getLanguageFromPath();
    return row[lang] || row.value || fallback;
  } catch (e) {
    return fallback;
  }
}

// media query match that indicates mobile/tablet width
const isDesktop = window.matchMedia('(min-width: 1025px)');
const fadeTransitionTime = 300;

function closeOnEscape(e) {
  if (e.code === 'Escape') {
    const nav = document.getElementById('nav');
    const navSections = nav.querySelector('.nav-sections');
    const navSectionExpanded = navSections.querySelector('[aria-expanded="true"]');
    if (navSectionExpanded && isDesktop.matches) {
      // Route through toggleSubNav so the megamenu fully closes: runs the
      // fade-out animation and restores body scroll. toggleAllNavSections alone
      // only flips aria-expanded, leaving the page scroll-locked.
      // eslint-disable-next-line no-use-before-define
      toggleSubNav(navSectionExpanded, navSections);
      navSectionExpanded.focus();
    } else if (!isDesktop.matches) {
      // eslint-disable-next-line no-use-before-define
      toggleMenu(nav, navSections);
      nav.querySelector('button').focus();
    }
  }
}

function openOnKeydown(e) {
  const focused = document.activeElement;
  const isNavDrop = focused.classList.contains('nav-drop');
  if (isNavDrop && (e.code === 'Enter' || e.code === 'Space')) {
    // Prevent the Space key from scrolling the page when acting as a button.
    e.preventDefault();
    // Route through the same handler the mouse uses so the submenu reveal
    // animation (subnav-fadein / grid expand) runs; setting aria-expanded
    // alone leaves the desktop menu items at opacity 0 and thus invisible.
    // eslint-disable-next-line no-use-before-define
    toggleSubNav(focused, focused.closest('.nav-sections'));
  }
}

function focusNavSection() {
  document.activeElement.addEventListener('keydown', openOnKeydown);
}

/**
 * Toggles all nav sections
 * @param {Element} sections The container element
 * @param {Boolean} expanded Whether the element should be expanded or collapsed
 */
function toggleAllNavSections(sections, expanded = false) {
  sections.querySelectorAll('.nav-sections .default-content-wrapper > ul > li').forEach((section) => {
    section.setAttribute('aria-expanded', expanded);
  });
}

/**
 * Toggles the entire nav
 * @param {Element} nav The container element
 * @param {Element} navSections The nav sections within the container element
 * @param {*} forceExpanded Optional param to force nav expand behavior when not null
 */
function toggleMenu(nav, navSections, forceExpanded = null) {
  // The open/closed state of the whole mobile menu lives on the hamburger
  // button (aria-expanded + aria-controls), not on the <nav> landmark:
  // aria-expanded is not a valid attribute on role="navigation" (WCAG 4.1.2).
  // A `nav-expanded` class mirrors the state for CSS hooks.
  const button = nav.querySelector('.nav-hamburger button');
  const expanded = forceExpanded !== null ? !forceExpanded : nav.classList.contains('nav-expanded');
  document.body.style.overflowY = (expanded || isDesktop.matches) ? '' : 'hidden';
  nav.classList.toggle('nav-expanded', !expanded);
  button?.setAttribute('aria-expanded', expanded ? 'false' : 'true');
  toggleAllNavSections(navSections, false);
  button?.setAttribute('aria-label', expanded ? 'Open navigation' : 'Close navigation');
  // enable nav dropdown keyboard accessibility
  const navDrops = navSections.querySelectorAll('.nav-drop');
  navDrops.forEach((drop) => {
    if (!drop.hasAttribute('tabindex')) {
      drop.setAttribute('role', 'button');
      drop.setAttribute('tabindex', 0);
      drop.addEventListener('focus', focusNavSection);
    }
  });

  const backdropEl = nav.querySelector('.nav-backdrop');
  if (!expanded) {
    backdropEl.classList.remove('hide');
  } else {
    backdropEl.classList.add('hide');
  }

  if (document.querySelector('header nav .nav-link-section')) {
    const animateTarget = document.querySelector('header nav .nav-link-section');
    const animationConfig = {
      initStyles: { display: 'flex' },
      startStyles: { right: '-320px' },
      endStyles: { right: '0' },
      time: fadeTransitionTime,
    };
    const animateInOut = addAnimateInOut(animateTarget, animationConfig);
    animateInOut(!expanded);
  }

  // enable menu collapse on escape keypress
  if (!expanded || isDesktop.matches) {
    // collapse menu on escape press
    window.addEventListener('keydown', closeOnEscape);
  } else {
    window.removeEventListener('keydown', closeOnEscape);
  }
}

function toggleSubNav(navSection, navSections) {
  const expanded = navSection.getAttribute('aria-expanded') === 'true';
  const navSublist = navSection.querySelector('.nav-sublist');
  toggleAllNavSections(navSections);

  if (expanded) {
    document.body.style.overflow = '';
    navSublist.classList.remove('subnav-fadein');
  } else {
    document.querySelector('header').classList.remove('transparent');

    setTimeout(() => {
      navSublist.classList.add('subnav-fadein');
    }, 0);
    document.body.style.overflow = 'hidden';
  }

  const animationConfig = {
    initStyles: { display: 'grid' },
    startStyles: { gridTemplateRows: '0fr' },
    endStyles: { gridTemplateRows: '1fr' },
    time: fadeTransitionTime,
  };
  const animateInOut = addAnimateInOut(navSublist, animationConfig);

  animateInOut(!expanded);
  navSection.setAttribute('aria-expanded', expanded ? 'false' : 'true');
}

function checkForActiveLink(navSections) {
  const normalise = (path) => path.replace(/\/+$/, '');
  const currentPath = normalise(window.location.pathname);

  navSections.querySelectorAll(':scope .default-content-wrapper a').forEach((link) => {
    const href = link.getAttribute('href');
    if (!href) return;

    // Compare full path segments, not raw substrings: "/it/it/tesi-h2" must not
    // match while on "/it/it/tesi-h2-tera" (and kb998/kb998-2027, bx450/
    // bx450-2026, kb4/kb4rc likewise). Resolve relative hrefs against the
    // current location so both absolute and relative nav links work.
    const linkPath = normalise(new URL(href, window.location.href).pathname);
    if (linkPath && linkPath === currentPath) {
      const navParent = link.closest('.nav-drop');
      navParent?.classList.add('active');
      link.classList.add('active');
    }
  });
}

function handleTransparentAndScrolling(nav) {
  const useTransparentVariant = !!document.querySelector('main > .section:first-child > .hero-wrapper:first-child');
  const header = nav.closest('header');
  let prevScrollingPosition = 0;

  const changeToTransparentIfNeeded = (scrollY) => {
    if (useTransparentVariant) {
      header.classList.add('transparent', 'can-be-transparent');

      if (scrollY > 100) {
        header.classList.remove('transparent');
      } else {
        header.classList.add('transparent');
      }
    }
  };

  document.addEventListener('scroll', () => {
    const { scrollY } = window;

    changeToTransparentIfNeeded(scrollY);

    if (scrollY - prevScrollingPosition > 0 && scrollY > 200) {
      header.classList.add('fade-out');
    } else if (prevScrollingPosition - scrollY > 0) {
      header.classList.remove('fade-out');
    }

    prevScrollingPosition = scrollY;
  });

  changeToTransparentIfNeeded(window.scrollY);
}

// loading country selector of modal as part of header
async function loadCountrySelectorBlock() {
  const main = document.querySelector('main');
  const fragment = await loadFragment('/index');

  while (fragment.firstElementChild) main.append(fragment.firstElementChild);
}
/**
 * loads and decorates the header, mainly the nav
 * @param {Element} block The header block element
 */
export default async function decorate(block) {
  // load nav as fragment
  const navMeta = getMetadata('nav');
  const navPath = navMeta ? new URL(navMeta, window.location).pathname : `${getRootPath()}/nav`;
  const fragment = await loadFragment(navPath);

  // decorate nav DOM
  block.textContent = '';
  const nav = document.createElement('nav');
  nav.id = 'nav';
  while (fragment.firstElementChild) nav.append(fragment.firstElementChild);

  const classes = ['brand', 'sections', 'tools', 'dealer-locator'];
  classes.forEach((c, i) => {
    const section = nav.children[i];
    if (section) section.classList.add(`nav-${c}`);
  });

  const navBrand = nav.querySelector('.nav-brand');
  const brandLink = navBrand.querySelector('.button');
  if (brandLink) {
    brandLink.className = '';
    brandLink.closest('.button-container').className = '';

    // Give the logo link an accessible name (the logo is an inline SVG with no
    // text), translated per language via the global logoconfig.json sheet.
    // Falls back to a sensible default so the link is never unlabelled.
    // (WCAG 1.1.1, 2.4.4)
    const logoLabel = await getLogoAlt();
    brandLink.setAttribute('aria-label', logoLabel);
    brandLink.querySelectorAll('span.icon').forEach((iconEl) => {
      iconEl.setAttribute('aria-hidden', 'true');
    });
  }

  const navSections = nav.querySelector('.nav-sections');

  if (navSections) {
    navSections.querySelectorAll(':scope .default-content-wrapper > ul > li').forEach((navSection) => {
      const sublist = navSection.querySelector('ul');
      if (sublist) {
        const textWrapper = document.createElement('a');
        textWrapper.classList.add('nav-drop-text');
        textWrapper.innerHTML += '<span class="icon icon-chevron"></span>';
        textWrapper.prepend(navSection.firstElementChild.innerHTML);
        navSection.firstElementChild.remove();
        navSection.prepend(textWrapper);
        navSection.classList.add('nav-drop');

        navSection.querySelectorAll('p').forEach((item) => {
          const parentEle = item.parentElement;
          parentEle.append(...item.children);
          item.remove();
        });

        // wrapping pictures with links if the link follows immediately after the picture
        navSection.querySelectorAll('ul picture + a').forEach((link) => {
          const pictures = link.parentElement.querySelectorAll('picture');

          if (pictures.length === 2) {
            link.classList.add('swipe-on-hover');
          }

          link.prepend(...pictures);
        });

        // setting transtion delay for every list item
        navSection.querySelectorAll('ul li').forEach((li, index) => {
          li.style.transitionDelay = `${fadeTransitionTime + index * 200}ms`;
        });

        const navSublist = document.createRange().createContextualFragment(`
          <div class="nav-sublist">
            <div>
              <span>${textWrapper.textContent}</span>
              ${sublist.outerHTML}
            </div>
          </div>
        `).children[0];

        sublist.replaceWith(navSublist);
      } else {
        const link = navSection.querySelector('a');
        if (link) {
          const linkWrapper = link.parentElement;
          navSection.append(link);
          linkWrapper.remove();
        }
      }
      navSection.addEventListener('click', (event) => {
        if (
          event.target.classList.contains('nav-drop-text')
          || event.target.classList.contains('nav-drop')
          || event.target.closest('.nav-drop-text')) {
          toggleSubNav(navSection, navSections);
        }
      });
    });
  }

  const navTools = nav.querySelector('.nav-tools');
  if (navTools) {
    const toolsWrapper = navTools.querySelector('ul');
    toolsWrapper.classList.add('default-content-wrapper');
    navTools.append(toolsWrapper);
    navTools.firstElementChild.remove();

    const globeIcon = navTools.querySelector('.icon-globe');
    if (globeIcon) {
      const textWrapper = document.createElement('span');
      textWrapper.textContent = globeIcon.nextSibling.textContent;
      globeIcon.nextSibling.remove();
      textWrapper.classList.add('nav-tools-text');
      globeIcon.parentElement.append(textWrapper);

      globeIcon.addEventListener('click', (event) => {
        event.preventDefault();
        const modalEvent = new CustomEvent('show-modal', { detail: 'modal-country-selector' });
        window.dispatchEvent(modalEvent);
      });
      loadCountrySelectorBlock();
    }
  }

  if (navSections && navTools) {
    const navLinksWrapper = document.createElement('div');
    navLinksWrapper.classList.add('nav-link-section');
    const flagEl = document.createElement('span');
    flagEl.classList.add('nav-flag');
    flagEl.innerHTML = '<span class="icon icon-logo-flag-black"></span>';
    const closeEl = document.createElement('button');
    closeEl.classList.add('nav-close-button');
    closeEl.innerHTML = '<span class="icon icon-close"></span>';
    closeEl.addEventListener('click', () => toggleMenu(nav, navSections));
    navLinksWrapper.append(closeEl, navSections, navTools, flagEl);
    nav.append(navLinksWrapper);

    const backdrop = document.createElement('div');
    backdrop.classList.add('nav-backdrop');
    nav.append(backdrop);
  }

  const navDealerLocator = nav.querySelector('.nav-dealer-locator');
  if (navDealerLocator) {
    const dealerLocatorButton = navDealerLocator.querySelector('a');
    navDealerLocator.innerHTML = '';
    navDealerLocator.append(dealerLocatorButton);
    nav.append(navDealerLocator);
  }

  // hamburger for mobile
  if (navSections) {
    const hamburger = document.createElement('div');
    hamburger.classList.add('nav-hamburger');
    hamburger.innerHTML = `<button type="button" aria-controls="nav" aria-expanded="false" aria-label="Open navigation">
        <span class="icon icon-hamburger"></span>
      </button>`;
    hamburger.addEventListener('click', () => toggleMenu(nav, navSections));
    nav.append(hamburger);
    // prevent mobile nav behavior on window resize
    toggleMenu(nav, navSections, isDesktop.matches);
    isDesktop.addEventListener('change', () => {
      toggleMenu(nav, navSections, isDesktop.matches);
    });
  }

  const navWrapper = document.createElement('div');
  navWrapper.className = 'nav-wrapper';
  navWrapper.append(nav);
  block.append(navWrapper);

  if (navSections) {
    checkForActiveLink(navSections);
  }
  handleTransparentAndScrolling(nav);
  customDecoreateIcons(nav);
}
