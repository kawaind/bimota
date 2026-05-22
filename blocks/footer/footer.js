import { getMetadata, getRootPath } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';
import { addTitleAttributeToIconLink } from '../../scripts/helpers.js';

const ICON_TOKEN_REGEX = /:([A-Za-z0-9][A-Za-z0-9-]*):/g;

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
    }

    flagWrapper.append(csIcon);

    csContainer.append(textEle);
    csContainer.append(flagWrapper);
    csWrapper.remove();
  }

  const columns = [...footer.querySelectorAll('.columns > div > div')];
  columns.forEach((column) => {
    column.classList.add('footer-column');

    // each heading should be rendered as font-small
    [...column.querySelectorAll('h1, h2, h3, h4, h5, h6')].forEach((heading) => heading.classList.add('font-small'));
  });

  // a11y for social icons
  const socialIconLinks = footer.querySelectorAll('.footer-column:has(a[title=""]) a[title=""]');
  socialIconLinks.forEach((anchor) => addTitleAttributeToIconLink(anchor));

  const lists = [...footer.querySelectorAll('ul')];
  lists.forEach((list) => {
    [...list.querySelectorAll(':scope > li')].forEach((listItem) => {
      const textEl = document.createElement('span');
      textEl.classList.add('footer-list-item-text');
      listItem.classList.add('footer-list-item');
      textEl.append(...listItem.childNodes);

      // if the first child is an icon, move it back to the listItem
      const firstChild = textEl.firstChild;

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

  // Back to top button
  const backToTopNode = document.createRange().createContextualFragment(`
    <button class="back-to-top">
      <img data-icon-name="arrow" src="/icons/chevron-up.svg" alt="" loading="lazy">
    </button>
  `);

  footer.prepend(backToTopNode);

  const backToTopButton = footer.querySelector('.back-to-top');
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
