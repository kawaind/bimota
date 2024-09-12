import { getMetadata } from '../../scripts/aem.js';
import { customDecoreateIcons } from '../../scripts/scripts.js';
import { loadFragment } from '../fragment/fragment.js';

// media query match that indicates mobile/tablet width
const isDesktop = window.matchMedia('(min-width: 1024px)');

function closeOnEscape(e) {
  if (e.code === 'Escape') {
    const nav = document.getElementById('nav');
    const navSections = nav.querySelector('.nav-sections');
    const navSectionExpanded = navSections.querySelector('[aria-expanded="true"]');
    if (navSectionExpanded && isDesktop.matches) {
      // eslint-disable-next-line no-use-before-define
      toggleAllNavSections(navSections);
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
  const isNavDrop = focused.className === 'nav-drop';
  if (isNavDrop && (e.code === 'Enter' || e.code === 'Space')) {
    const dropExpanded = focused.getAttribute('aria-expanded') === 'true';
    // eslint-disable-next-line no-use-before-define
    toggleAllNavSections(focused.closest('.nav-sections'));
    focused.setAttribute('aria-expanded', dropExpanded ? 'false' : 'true');
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
  const expanded = forceExpanded !== null ? !forceExpanded : nav.getAttribute('aria-expanded') === 'true';
  const button = nav.querySelector('.nav-hamburger button');
  document.body.style.overflowY = (expanded || isDesktop.matches) ? '' : 'hidden';
  nav.setAttribute('aria-expanded', expanded ? 'false' : 'true');
  toggleAllNavSections(navSections, false);
  button.setAttribute('aria-label', expanded ? 'Open navigation' : 'Close navigation');
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
  toggleAllNavSections(navSections);
  navSection.setAttribute('aria-expanded', expanded ? 'false' : 'true');
}

function checkForActiveLink(navSections) {
  navSections.querySelectorAll(':scope .default-content-wrapper a').forEach((link) => {
    const href = link.getAttribute('href');
    if (href === window.location.pathname || href === window.location.href) {
      const navParent = link.closest('.nav-drop');
      navParent?.classList.add('active');
      link.classList.add('active');
    }
  });
}

function redirectPage(event) {
  const currentUrl = window.location;
  let redirectUrl = currentUrl.origin;

  if (event.target.innerHTML.toLowerCase() === 'en') {
    if (!currentUrl.pathname.includes('/en/')) {
      redirectUrl = `${redirectUrl}/en`;
    }
    redirectUrl = `${redirectUrl}${currentUrl.pathname}`;
  } else {
    redirectUrl = `${redirectUrl}${currentUrl.pathname.replace(/\/en\//, '/')}`;
  }
  window.location.replace(redirectUrl);
}

function handleTransparentAndScrolling(nav) {
  const useTransparentVariant = !!document.querySelector('main > .section > .hero-wrapper');
  const header = nav.closest('header');
  let prevScrollingPosition = 0;

  document.addEventListener('scroll', () => {
    const { scrollY } = window;

    if (useTransparentVariant) {
      header.classList.add('transparent', 'can-be-transparent');

      if (scrollY > 100) {
        header.classList.remove('transparent');
      } else {
        header.classList.add('transparent');
      }
    }

    if (scrollY - prevScrollingPosition > 0 && scrollY > 200) {
      header.classList.add('fade-out');
    } else if (prevScrollingPosition - scrollY > 0) {
      header.classList.remove('fade-out');
    }

    prevScrollingPosition = scrollY;
  });
}

/**
 * loads and decorates the header, mainly the nav
 * @param {Element} block The header block element
 */
export default async function decorate(block) {
  // load nav as fragment
  const navMeta = getMetadata('nav');
  const navPath = navMeta ? new URL(navMeta, window.location).pathname : '/nav';
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
  }

  const navSections = nav.querySelector('.nav-sections');

  if (navSections) {
    navSections.querySelectorAll(':scope .default-content-wrapper > ul > li').forEach((navSection) => {
      if (navSection.querySelector('ul')) {
        const textWrapper = document.createElement('a');
        textWrapper.classList.add('nav-drop-text');
        textWrapper.append(navSection.firstChild);
        textWrapper.innerHTML += '<span class="icon icon-chevron"></span>';
        navSection.prepend(textWrapper);
        navSection.classList.add('nav-drop');

        // wrapping pictures with links if the link follows immediately after the picture
        navSection.querySelectorAll('ul picture + a').forEach((link) => {
          const picture = link.previousElementSibling;

          link.prepend(picture);
        });
      }

      navSection.addEventListener('click', (event) => {
        if (event.target.classList.contains('nav-drop-text') || event.target.closest('.nav-drop-text')) {
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
    toolsWrapper.querySelectorAll('li').forEach((item) => {
      item.addEventListener('click', redirectPage);

      const urlLang = document.location.pathname.includes('/en/') ? 'en' : 'ita';
      const listItemLang = item.textContent.trim().toLowerCase();

      if (urlLang === listItemLang) {
        item.classList.add('active');
      }
    });
  }

  const navDealerLocator = nav.querySelector('.nav-dealer-locator');
  const dealerLocatorButton = navDealerLocator.querySelector('a');
  navDealerLocator.innerHTML = '';
  navDealerLocator.append(dealerLocatorButton);

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

  nav.append(navDealerLocator);

  // hamburger for mobile
  const hamburger = document.createElement('div');
  hamburger.classList.add('nav-hamburger');
  hamburger.innerHTML = `<button type="button" aria-controls="nav" aria-label="Open navigation">
      <span class="icon icon-hamburger"></span>
    </button>`;
  hamburger.addEventListener('click', () => toggleMenu(nav, navSections));
  nav.append(hamburger);
  nav.setAttribute('aria-expanded', 'false');
  // prevent mobile nav behavior on window resize
  toggleMenu(nav, navSections, isDesktop.matches);
  isDesktop.addEventListener('change', () => {
    toggleMenu(nav, navSections, isDesktop.matches);
  });

  const navWrapper = document.createElement('div');
  navWrapper.className = 'nav-wrapper';
  navWrapper.append(nav);
  block.append(navWrapper);

  checkForActiveLink(navSections);

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting && isDesktop) {
        navWrapper.classList.add('hide');
      } else if (isDesktop) {
        navWrapper.classList.remove('hide');
      }
    });
  }, { rootMargin: '0px 0px -1000px 0px' });
  observer.observe(document.querySelector('main'));

  handleTransparentAndScrolling(nav);

  customDecoreateIcons(nav);
}
