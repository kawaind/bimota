import { getMetadata, getRootPath } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';
import {
  addTitleAttributeToIconLink, forceHeadingLevel, getLanguageFromPath, getLanguageLabels,
} from '../../scripts/helpers.js';

const ICON_TOKEN_REGEX = /:([A-Za-z0-9][A-Za-z0-9-]*):/g;
const YEAR_TOKEN_REGEX = /\{\s*year\s*\}/gi;

// English fallback used until the translated label resolves (or if the sheet is
// unavailable), so the back-to-top button always has an accessible name.
const BACK_TO_TOP_FALLBACK = 'Back to top';

// Accessible-name templates + defaults for the footer's icon-only controls,
// localized via the `footer` sheet in lanconfig.json (one column per language),
// with these English strings as the fallback so names are never missing.
// {network}/{current} are substituted at runtime. Adding a language or a new
// network is a pure authoring change (add a column / a networkName-* row).
const A11Y_FALLBACKS = {
  // Country/language selector "Change" link (WCAG 2.4.4, 4.1.2).
  changeCountryLanguage: 'Change country and language (current: {current})',
  // Social icon links (WCAG 1.1.1, 2.4.4): "Bimota on X" etc.
  socialLink: 'Bimota on {network}',
  opensInNewTab: '(opens in a new tab)',
  // Proper display names per network icon token (fallbacks; localizable).
  'networkName-x': 'X',
  'networkName-twitter': 'X',
  'networkName-facebook': 'Facebook',
  'networkName-instagram': 'Instagram',
  'networkName-youtube': 'YouTube',
  'networkName-tiktok': 'TikTok',
  'networkName-linkedin': 'LinkedIn',
};

// Which footer column is the social row: its links are icon-only and each needs
// a descriptive, network-identifying accessible name.
const SOCIAL_HOST_TO_TOKEN = [
  { match: /(twitter|x\.com)/i, token: 'x' },
  { match: /facebook/i, token: 'facebook' },
  { match: /instagram/i, token: 'instagram' },
  { match: /youtube/i, token: 'youtube' },
  { match: /tiktok/i, token: 'tiktok' },
  { match: /linkedin/i, token: 'linkedin' },
];

/**
 * Resolves the translated "Back to top" label from the global lanconfig.json
 * multi-sheet. The `sr-topbutton` sheet has a `backToTop` row with one column
 * per language code (en, it, fr, de, nl, es, ja, lu); the column matching the
 * current URL's language wins, else `en`. Adding a language is an authoring
 * change: add a column. Falls back to the English default on any error.
 * @returns {Promise<string>} the language-appropriate back-to-top label
 */
async function getBackToTopLabel() {
  try {
    const resp = await fetch('/lanconfig.json?sheet=sr-topbutton');
    if (!resp.ok) return BACK_TO_TOP_FALLBACK;
    const json = await resp.json();
    const data = json['sr-topbutton']?.data || json.data || [];
    const row = data.find((r) => r.Key === 'backToTop');
    if (!row) return BACK_TO_TOP_FALLBACK;
    const lang = getLanguageFromPath();
    return row[lang] || row.en || BACK_TO_TOP_FALLBACK;
  } catch (e) {
    return BACK_TO_TOP_FALLBACK;
  }
}

function replaceYearTokens(container) {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  const currentYear = String(new Date().getFullYear());

  let currentNode = walker.nextNode();

  while (currentNode) {
    if (currentNode.nodeValue.includes('{')) {
      currentNode.nodeValue = currentNode.nodeValue.replace(YEAR_TOKEN_REGEX, currentYear);
    }

    currentNode = walker.nextNode();
  }
}

function getIconClassName(icon) {
  return [...icon.classList].find((className) => className.startsWith('icon-'));
}

function getIconDetails(rawIconName) {
  const explicitExtensionMatch = rawIconName.match(/--(svg|png)$/i);

  return {
    iconName: rawIconName.replace(/--(svg|png)$/i, ''),
    extension: explicitExtensionMatch ? explicitExtensionMatch[1].toLowerCase() : 'svg',
    hasExplicitExtension: Boolean(explicitExtensionMatch),
  };
}

function decorateFooterIcon(icon, alt = '') {
  if (!icon) return;

  const iconClassName = getIconClassName(icon);
  if (!iconClassName) return;

  const rawIconName = iconClassName.substring(5);
  const { iconName, extension, hasExplicitExtension } = getIconDetails(rawIconName);
  const iconBasePath = `${window.hlx?.codeBasePath || ''}/icons/${iconName}`;

  let img = icon.querySelector(':scope > img');

  if (!img) {
    icon.replaceChildren();
    img = document.createElement('img');
    icon.append(img);
  } else {
    icon.replaceChildren(img);
  }

  img.dataset.iconName = iconName;
  img.alt = alt;
  img.loading = 'lazy';
  img.decoding = 'async';

  img.onerror = () => {
    if (hasExplicitExtension || img.dataset.pngFallbackApplied) return;

    img.dataset.pngFallbackApplied = 'true';
    img.src = `${iconBasePath}.png`;
  };

  img.src = `${iconBasePath}.${extension}`;
}

function createIconFromToken(rawIconName, alt = '') {
  const icon = document.createElement('span');
  icon.classList.add('icon', `icon-${rawIconName}`);
  decorateFooterIcon(icon, alt);
  return icon;
}

function replaceInlineIconTokens(container) {
  const textNodes = [];
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);

  let currentNode = walker.nextNode();

  while (currentNode) {
    textNodes.push(currentNode);
    currentNode = walker.nextNode();
  }

  textNodes.forEach((textNode) => {
    const text = textNode.nodeValue;
    if (!ICON_TOKEN_REGEX.test(text)) return;

    ICON_TOKEN_REGEX.lastIndex = 0;

    const fragment = document.createDocumentFragment();
    let lastIndex = 0;
    let match = ICON_TOKEN_REGEX.exec(text);

    while (match) {
      const textBeforeIcon = text.slice(lastIndex, match.index);

      if (textBeforeIcon) {
        fragment.append(document.createTextNode(textBeforeIcon));
      }

      fragment.append(createIconFromToken(match[1]));

      lastIndex = match.index + match[0].length;
      match = ICON_TOKEN_REGEX.exec(text);
    }

    const remainingText = text.slice(lastIndex);

    if (remainingText) {
      fragment.append(document.createTextNode(remainingText));
    }

    textNode.replaceWith(fragment);
  });
}

function extractFooterFlagIcon(csWrapper, buttonEle) {
  const existingFlagIcon = [...csWrapper.querySelectorAll('span.icon')]
    .find((icon) => {
      if (buttonEle?.contains(icon)) return false;
      return !icon.classList.contains('icon-arrow-right');
    });

  if (existingFlagIcon) {
    decorateFooterIcon(existingFlagIcon);
    return existingFlagIcon;
  }

  const textNodes = [];
  const walker = document.createTreeWalker(csWrapper, NodeFilter.SHOW_TEXT);

  let currentNode = walker.nextNode();

  while (currentNode) {
    if (!buttonEle?.contains(currentNode.parentElement)) {
      textNodes.push(currentNode);
    }

    currentNode = walker.nextNode();
  }

  const iconTextNode = textNodes.find((textNode) => {
    ICON_TOKEN_REGEX.lastIndex = 0;
    return ICON_TOKEN_REGEX.test(textNode.nodeValue);
  });

  if (!iconTextNode) return null;

  ICON_TOKEN_REGEX.lastIndex = 0;
  const match = ICON_TOKEN_REGEX.exec(iconTextNode.nodeValue);

  if (!match) return null;

  iconTextNode.nodeValue = iconTextNode.nodeValue
    .replace(match[0], '')
    .replace(/\s+/g, ' ')
    .trim();

  return createIconFromToken(match[1]);
}

function getCountrySelectorLines(csWrapper, buttonEle) {
  const lines = [];
  let currentLine = '';

  [...csWrapper.childNodes].forEach((node) => {
    if (buttonEle && node === buttonEle) return;

    if (node.nodeName?.toLowerCase() === 'br') {
      if (currentLine.trim()) {
        lines.push(currentLine.trim());
      }

      currentLine = '';
      return;
    }

    if (node.nodeType === Node.TEXT_NODE) {
      currentLine += node.textContent;
      return;
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      if (node.matches?.('span.icon, picture')) return;
      if (buttonEle?.contains(node)) return;

      currentLine += node.textContent;
    }
  });

  if (currentLine.trim()) {
    lines.push(currentLine.trim());
  }

  return lines
    .map((line) => line
      .replace(ICON_TOKEN_REGEX, '')
      .replace(/\s+/g, ' ')
      .trim())
    .filter(Boolean);
}

/**
 * loads and decorates the footer
 * @param {Element} block The footer block element
 */
export default async function decorate(block) {
  // load footer as fragment
  const footerMeta = getMetadata('footer');
  const footerPath = footerMeta ? new URL(footerMeta, window.location).pathname : `${getRootPath()}/footer`;
  const fragment = await loadFragment(footerPath);

  // decorate footer DOM
  block.textContent = '';
  const footer = document.createElement('div');
  while (fragment.firstElementChild) footer.append(fragment.firstElementChild);

  // replace {year} tokens with the current year so the copyright stays current
  replaceYearTokens(footer);

  // country selector changes
  const csIcon = footer.querySelector('[href="/#modal-country-selector"], [href="#modal-country-selector"]');

  if (csIcon) {
    const csWrapper = csIcon.parentElement;
    const csContainer = csWrapper.parentElement;

    csContainer.classList.add('footer-cs-wrapper');
    csContainer.classList.remove('default-content-wrapper');

    // Authors should now use an icon token, for example:
    // :bimota-belgium--png:
    // Remove old picture-based flag content from this footer selector.
    csWrapper.querySelectorAll('picture').forEach((picture) => picture.remove());

    replaceInlineIconTokens(csIcon);

    const flagIcon = extractFooterFlagIcon(csWrapper, csIcon);
    const selectorLines = getCountrySelectorLines(csWrapper, csIcon);

    const selectorLabel = selectorLines[0] || '';
    const countryName = selectorLines.slice(1).join(' ');

    const textEle = document.createElement('span');
    textEle.textContent = selectorLabel;

    const flagWrapper = document.createElement('div');
    flagWrapper.classList.add('footer-cs-button-wrapper', 'cs-button-padding');

    if (flagIcon) {
      flagIcon.classList.add('footer-cs-flag-icon');
      decorateFooterIcon(flagIcon, countryName ? `${countryName} flag` : '');
      flagWrapper.append(flagIcon);
    }

    if (countryName) {
      const countryTextEle = document.createElement('span');
      countryTextEle.classList.add('footer-cs-country-name');
      countryTextEle.textContent = countryName;
      flagWrapper.append(countryTextEle);
    }

    csIcon.classList.add('footer-cs-button');

    const arrowIcon = csIcon.querySelector('.icon-arrow-right');
    if (arrowIcon) {
      arrowIcon.classList.add('footer-cs-arrow-icon');
      // The arrow glyph is decorative; hide it from assistive tech so the link
      // is not announced with a stray "arrow" (WCAG 1.1.1).
      arrowIcon.setAttribute('aria-hidden', 'true');
    }

    // The visible "Change" text alone doesn't convey purpose or current
    // selection. Give the link a descriptive, localized accessible name that
    // includes the current country/language (WCAG 2.4.4, 4.1.2). The visible
    // text is unchanged. Applied synchronously with the English fallback, then
    // swapped for the localized value once the dictionary resolves.
    const setChangeLabel = (template) => {
      const current = countryName || selectorLabel;
      const label = current ? template.replace('{current}', current) : template.replace(' (current: {current})', '');
      csIcon.setAttribute('aria-label', label);
    };
    setChangeLabel(A11Y_FALLBACKS.changeCountryLanguage);
    getLanguageLabels('footer', { changeCountryLanguage: A11Y_FALLBACKS.changeCountryLanguage })
      .then((labels) => setChangeLabel(labels.changeCountryLanguage));

    flagWrapper.append(csIcon);

    csContainer.append(textEle);
    csContainer.append(flagWrapper);
    csWrapper.remove();
  }

  const columns = [...footer.querySelectorAll('.columns > div > div')];
  columns.forEach((column) => {
    column.classList.add('footer-column');

    // Column titles are forced to a semantic H3 (consistent heading outline
    // across the site) while keeping the H4 visual size via font-small.
    [...column.querySelectorAll('h1, h2, h3, h4, h5, h6')].forEach((heading) => {
      forceHeadingLevel(heading, 'h3', 'font-small');
    });
  });

  // a11y for social icons: each is an icon-only link, so it needs a
  // descriptive, network-identifying accessible name (WCAG 1.1.1, 2.4.4,
  // 4.1.2). Derive the network from the link href, name it "Bimota on X" (etc)
  // via the localized `footer` dictionary, hide the decorative icon, and append
  // a visually-hidden "(opens in a new tab)" when the link opens in a new tab.
  // Any other icon-only footer link falls back to the icon's name.
  const socialLinks = [...footer.querySelectorAll('a')].filter((a) => {
    const href = a.getAttribute('href') || '';
    return SOCIAL_HOST_TO_TOKEN.some(({ match }) => match.test(href))
      && !a.textContent.trim();
  });

  if (socialLinks.length) {
    const nameSocialLinks = (labels) => {
      socialLinks.forEach((anchor) => {
        const href = anchor.getAttribute('href') || '';
        const entry = SOCIAL_HOST_TO_TOKEN.find(({ match }) => match.test(href));
        const network = labels[`networkName-${entry.token}`] || entry.token;
        let label = (labels.socialLink || A11Y_FALLBACKS.socialLink).replace('{network}', network);

        // Warn AT users when the link opens in a new tab (WCAG 3.2.5).
        if (anchor.getAttribute('target') === '_blank') {
          label += ` ${labels.opensInNewTab || A11Y_FALLBACKS.opensInNewTab}`;
        }

        anchor.setAttribute('aria-label', label);
        anchor.removeAttribute('title');

        // The icon graphic is decorative once the link is named (WCAG 1.1.1).
        anchor.querySelectorAll('img, svg').forEach((el) => {
          el.setAttribute('aria-hidden', 'true');
          if (el.tagName.toLowerCase() === 'img') el.setAttribute('alt', '');
        });
      });
    };

    // English fallback names applied immediately; localized names swapped in
    // once the dictionary resolves.
    nameSocialLinks(A11Y_FALLBACKS);
    getLanguageLabels('footer', A11Y_FALLBACKS).then((labels) => nameSocialLinks(labels));
  }

  // Any remaining icon-only footer links (non-social) keep the icon-name title
  // fallback so they are never unnamed.
  footer.querySelectorAll('.footer-column a[title=""]').forEach((anchor) => {
    if (!anchor.hasAttribute('aria-label')) addTitleAttributeToIconLink(anchor);
  });

  // Image-only footer links with no accessible name (e.g. an app-store / app
  // logo link under a "Mobile Application" heading) fail WCAG 2.4.4/1.1.1.
  // Name each from the nearest preceding column heading and hide the decorative
  // image, so the link is announced by its section (e.g. "Mobile Application").
  footer.querySelectorAll('.footer-column a').forEach((anchor) => {
    if (anchor.getAttribute('aria-label') || anchor.textContent.trim()) return;
    const img = anchor.querySelector('img');
    if (!img) return;

    // Prefer the image's own alt; else the nearest heading *preceding* the link
    // in its column (e.g. the "Mobile Application" heading right above it), not
    // just the column's first heading.
    let name = img.getAttribute('alt')?.trim();
    if (!name) {
      const column = anchor.closest('.footer-column');
      // Walk the column in document order, remembering the most recent heading
      // seen before we reach the link.
      let preceding = null;
      if (column) {
        const nodes = [...column.querySelectorAll('h1, h2, h3, h4, h5, h6, a')];
        for (let i = 0; i < nodes.length; i += 1) {
          if (nodes[i] === anchor) break;
          if (/^H[1-6]$/.test(nodes[i].tagName)) preceding = nodes[i];
        }
      }
      name = preceding?.textContent.trim();
    }
    if (!name) return;

    anchor.setAttribute('aria-label', name);
    anchor.querySelectorAll('img').forEach((el) => {
      el.setAttribute('alt', '');
      el.setAttribute('aria-hidden', 'true');
    });
  });

  const lists = [...footer.querySelectorAll('ul')];
  lists.forEach((list) => {
    [...list.querySelectorAll(':scope > li')].forEach((listItem) => {
      const textEl = document.createElement('span');
      textEl.classList.add('footer-list-item-text');
      listItem.classList.add('footer-list-item');
      textEl.append(...listItem.childNodes);

      // if the first child is an icon, move it back to the listItem
      const { firstChild } = textEl;

      if (
        firstChild
        && firstChild.nodeName.toLowerCase() === 'span'
        && firstChild.classList.contains('icon')
      ) {
        listItem.append(firstChild);
      }

      listItem.append(textEl);
    });
  });

  // Back to top button. The only content is a decorative chevron icon (alt=""
  // + aria-hidden), so the button itself carries an aria-label giving screen
  // readers an accessible name (WCAG 4.1.2, 2.4.4). The label is translated per
  // language via the lanconfig.json `sr-topbutton` sheet, with an English
  // fallback set immediately so the name is never missing.
  const backToTopNode = document.createRange().createContextualFragment(`
    <button class="back-to-top" type="button" aria-label="${BACK_TO_TOP_FALLBACK}">
      <img data-icon-name="arrow" src="/icons/chevron-up.svg" alt="" aria-hidden="true" loading="lazy">
    </button>
  `);

  footer.prepend(backToTopNode);

  const backToTopButton = footer.querySelector('.back-to-top');

  getBackToTopLabel().then((label) => {
    backToTopButton.setAttribute('aria-label', label);
  });
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        backToTopButton.style.position = 'absolute';
        backToTopButton.style.bottom = `${entry.boundingClientRect.height + 40}px`;
      } else {
        backToTopButton.style.position = 'fixed';
        backToTopButton.style.bottom = '40px';
      }
    });
  });
  observer.observe(footer);

  window.addEventListener('scroll', () => {
    const scrollPosition = window.scrollY + window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;

    // Display button if user scrolls close to the bottom, 40px above the footer
    if (scrollPosition >= documentHeight / 3) {
      backToTopButton.style.display = 'block';
    } else {
      backToTopButton.style.display = 'none';
    }
  });

  footer.querySelector('.back-to-top').addEventListener('click', () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  });

  block.append(footer);
}
