import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';

// media query match that indicates mobile/tablet width
const isDesktop = window.matchMedia('(min-width: 1024px)');

const hamburgerIcon = `
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
    <g clip-path="url(#clip0_2319_4806)">
      <path d="M4 18H20C20.55 18 21 17.55 21 17C21 16.45 20.55 16 20 16H4C3.45 16 3 16.45 3 17C3 17.55 3.45 18 4 18ZM4 13H20C20.55 13 21 12.55 21 12C21 11.45 20.55 11 20 11H4C3.45 11 3 11.45 3 12C3 12.55 3.45 13 4 13ZM3 7C3 7.55 3.45 8 4 8H20C20.55 8 21 7.55 21 7C21 6.45 20.55 6 20 6H4C3.45 6 3 6.45 3 7Z" fill="currentColor"/>
    </g>
    <defs>
      <clipPath id="clip0_2319_4806">
        <rect width="24" height="24" fill="white"/>
      </clipPath>
    </defs>
  </svg>
`;

const chevronIcon = `
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
    <path d="M15.88 9.29L12 13.17L8.11998 9.29C7.72998 8.9 7.09998 8.9 6.70998 9.29C6.31998 9.68 6.31998 10.31 6.70998 10.7L11.3 15.29C11.69 15.68 12.32 15.68 12.71 15.29L17.3 10.7C17.69 10.31 17.69 9.68 17.3 9.29C16.91 8.91 16.27 8.9 15.88 9.29Z" fill="currentColor"/>
  </svg>
`;

const flag = `
  <svg width="100" height="40" viewBox="0 0 100 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="14.2857" height="40" fill="#ED1C24"/>
    <rect x="28.5714" width="14.2857" height="40" fill="#ED1C24"/>
    <rect x="57.1428" width="14.2857" height="40" fill="black"/>
    <rect x="85.7142" width="14.2857" height="40" fill="black"/>
  </svg>
`;

const closeIcon = `
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
    <path d="M19.6451 4.36708C19.1718 3.89382 18.4073 3.89382 17.934 4.36708L12 10.289L6.06598 4.35495C5.59272 3.88168 4.82821 3.88168 4.35495 4.35495C3.88168 4.82821 3.88168 5.59272 4.35495 6.06598L10.289 12L4.35495 17.934C3.88168 18.4073 3.88168 19.1718 4.35495 19.6451C4.82821 20.1183 5.59272 20.1183 6.06598 19.6451L12 13.711L17.934 19.6451C18.4073 20.1183 19.1718 20.1183 19.6451 19.6451C20.1183 19.1718 20.1183 18.4073 19.6451 17.934L13.711 12L19.6451 6.06598C20.1062 5.60485 20.1062 4.82821 19.6451 4.36708Z" fill="black"/>
  </svg>
`;

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

  if (event.target.innerHTML === 'ENG') {
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
  // const navPath = navMeta ? new URL(navMeta, window.location).pathname : '/nav';
  const navPath = '/drafts/tdziezyk/v3-nav';
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
        textWrapper.innerHTML += `<span class="chevron-icon">${chevronIcon}</span>`;
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
    toolsWrapper.querySelectorAll('li').forEach((list) => {
      list.addEventListener('click', redirectPage);
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
    flagEl.innerHTML = flag;
    const closeEl = document.createElement('button');
    closeEl.classList.add('nav-close-button');
    closeEl.innerHTML = closeIcon;
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
      ${hamburgerIcon}
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
}
