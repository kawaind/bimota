import { stripEmptyTags } from '../../scripts/helpers.js';
import { addModalHandling } from '../../scripts/modal-helper.js';

const ICON_TOKEN_REGEX = /:([\w-]+):/;
const LOCALE_PREFIX_REGEX = /^\/([^/]+)\/([^/]+)(\/.*)?$/;

/**
 * Extracts the page slug from the current URL path (everything after /{country}/{lang}/).
 * Returns empty string if on the index page.
 */
function getCurrentPageSlug() {
  const match = window.location.pathname.match(LOCALE_PREFIX_REGEX);
  if (!match) return '';
  const rest = match[3] || '';
  const slug = rest.replace(/^\//, '').replace(/\/$/, '');
  return slug;
}

/**
 * Builds the target URL preserving the current page under the new locale prefix.
 * Falls back to the locale index if the page doesn't exist.
 */
async function resolveCountryUrl(targetBase) {
  const slug = getCurrentPageSlug();
  if (!slug || slug === 'index') {
    return targetBase.replace(/\/?$/, '/');
  }

  const targetPage = `${targetBase.replace(/\/?$/, '')}/${slug}`;

  try {
    const resp = await fetch(targetPage, { method: 'HEAD' });
    if (resp.ok) return targetPage;
  } catch { /* fall through to index */ }

  return targetBase.replace(/\/?$/, '/');
}

function getIconConfig(iconName) {
  if (iconName.endsWith('--png')) {
    return {
      name: iconName.replace(/--png$/, ''),
      extension: 'png',
    };
  }

  return {
    name: iconName,
    extension: 'svg',
  };
}

function decorateCountrySelectorIcon(icon) {
  if (!icon) return;

  const iconClass = Array.from(icon.classList)
    .find((className) => className.startsWith('icon-'));

  if (!iconClass) return;

  const rawIconName = iconClass.substring(5);
  const { name, extension } = getIconConfig(rawIconName);

  let img = icon.querySelector('img');

  if (!img) {
    img = document.createElement('img');
    icon.append(img);
  }

  img.dataset.iconName = name;
  img.src = `${window.hlx?.codeBasePath || ''}/icons/${name}.${extension}`;
  img.alt = '';
  img.loading = 'lazy';
  img.decoding = 'async';
}

function createIconFromToken(iconName) {
  const icon = document.createElement('span');
  icon.classList.add('icon', `icon-${iconName}`);
  decorateCountrySelectorIcon(icon);
  return icon;
}

function extractRawIconToken(container, excludeElement) {
  const textNodes = [];
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);

  let currentNode = walker.nextNode();

  while (currentNode) {
    textNodes.push(currentNode);
    currentNode = walker.nextNode();
  }

  const iconTextNode = textNodes.find((textNode) => {
    const parent = textNode.parentElement;

    if (!parent) return false;
    if (excludeElement && excludeElement.contains(parent)) return false;

    return ICON_TOKEN_REGEX.test(textNode.nodeValue);
  });

  if (!iconTextNode) return null;

  const match = iconTextNode.nodeValue.match(ICON_TOKEN_REGEX);

  if (!match) return null;

  iconTextNode.nodeValue = iconTextNode.nodeValue.replace(match[0], '').trim();

  return createIconFromToken(match[1]);
}

function getRowIcon(dataRow, countryLanguageList) {
  const rowIcon = [...dataRow.querySelectorAll('span.icon')]
    .find((icon) => !countryLanguageList?.contains(icon));

  if (rowIcon) {
    decorateCountrySelectorIcon(rowIcon);
    return rowIcon;
  }

  return extractRawIconToken(dataRow, countryLanguageList);
}

function getLanguageIcon(language) {
  const languageIcon = language.querySelector('span.icon');

  if (languageIcon) {
    decorateCountrySelectorIcon(languageIcon);
    return languageIcon;
  }

  return extractRawIconToken(language);
}

export default function decorate(block) {
  let blockHeadingWrapper;
  const data = [];

  block.querySelectorAll(':scope > div').forEach((dataRow, i) => {
    if (i === 0) {
      const blockHeading = dataRow.querySelector('h1, h2, h3, h4, h5, h6');

      if (blockHeading) {
        blockHeading.classList.add('h2');
        blockHeadingWrapper = blockHeading.parentElement;
        blockHeadingWrapper.classList.add('country-selector-heading-wrapper');
      }

      const bikeImage = dataRow.querySelector('picture');

      if (bikeImage && blockHeadingWrapper) {
        bikeImage.classList.add('country-selector-bike-image');
        blockHeadingWrapper.append(bikeImage);
      } else if (blockHeadingWrapper) {
        blockHeadingWrapper.classList.add('no-bike-image');
      }
    } else {
      const region = dataRow.querySelector('h1, h2, h3, h4, h5, h6');
      const countryLanguageList = dataRow.querySelector('ul');

      if (region?.textContent.trim()) {
        region.classList.add('h5');
        data.push({
          region,
          regionData: [],
        });
      }

      if (countryLanguageList && data.length) {
        countryLanguageList.classList.add('country-selector-language-list');

        const rowIcon = getRowIcon(dataRow, countryLanguageList);

        data.at(-1).regionData.push({
          countryLanguageList,
          rowIcon,
        });
      }
    }
  });

  block.innerHTML = '';

  if (blockHeadingWrapper) {
    block.append(blockHeadingWrapper);
  }

  const dataContainer = document.createElement('div');
  dataContainer.classList.add('country-selector-regions-container');

  data.forEach((categoryRow) => {
    const categoryWrapper = document.createElement('div');
    categoryWrapper.classList.add('country-selector-region-wrapper');
    categoryWrapper.append(categoryRow.region);

    const categoryDataWrapper = document.createElement('div');
    categoryDataWrapper.classList.add('country-selector-country-wrapper');

    categoryRow.regionData.forEach((el) => {
      let rowIconUsed = false;

      [...el.countryLanguageList.children].forEach((language) => {
        // Country flags should now come from :icon-name--png:, not authored pictures.
        // This removes old picture-based flag content from list items.
        language.querySelectorAll('picture').forEach((picture) => picture.remove());

        const languageIcon = getLanguageIcon(language);

        let countryButton = language.querySelector('a');

        if (!countryButton) {
          const spanWrapper = document.createElement('div');
          const comingSoon = language.querySelector('em');

          if (comingSoon) {
            spanWrapper.append(comingSoon);
          }

          countryButton = spanWrapper;
        }

        if (countryButton) {
          const icon = languageIcon || (!rowIconUsed ? el.rowIcon : null);

          if (icon) {
            icon.classList.add('country-selector-flag');
            decorateCountrySelectorIcon(icon);
            countryButton.prepend(icon);

            if (icon === el.rowIcon) {
              rowIconUsed = true;
            }
          } else {
            countryButton.classList.add('cs-button-no-flag');
          }

          countryButton.classList.add('cs-button');

          if (countryButton.getAttribute('href') === window.location.pathname) {
            countryButton.classList.add('active');
          }

          if (countryButton.tagName === 'A' && countryButton.getAttribute('href')) {
            countryButton.addEventListener('click', async (e) => {
              e.preventDefault();
              const targetBase = countryButton.getAttribute('href');
              const resolvedUrl = await resolveCountryUrl(targetBase);
              window.location.href = resolvedUrl;
            });
          }

          language.append(countryButton);
        }

        language.querySelectorAll('p').forEach((item) => {
          stripEmptyTags(language, item);
        });
      });

      categoryDataWrapper.append(el.countryLanguageList);
    });

    categoryWrapper.append(categoryDataWrapper);
    dataContainer.append(categoryWrapper);
  });

  block.append(dataContainer);

  // add modal class only when header/footer has option of country change
  const hasGlobeIcon = document.querySelector('.icon-globe');

  if (hasGlobeIcon) {
    block.classList.add('modal-country-selector');
    addModalHandling();
  }
}
