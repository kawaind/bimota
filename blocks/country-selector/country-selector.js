import { stripEmptyTags, forceHeadingLevel } from '../../scripts/helpers.js';
import { addModalHandling } from '../../scripts/modal-helper.js';

const ICON_TOKEN_REGEX = /:([\w-]+):/;
const LOCALE_PREFIX_REGEX = /^\/([^/]+)\/([^/]+)(\/.*)?$/;

// Source sheet for the data-driven `countries` variant.
const COUNTRIES_SHEET_PATH = '/countries.json';
// Fallbacks used when the sheet omits the heading/image (config) values.
const DEFAULT_HEADING = 'Choose your country';
const DEFAULT_IMAGE = 'https://content.da.live/kawaind/bimota/.index/media_1a3a472218eb2412dbd144a2819aca90ddf781479.png';
// Canonical fallback order used when the user's region is unknown, and the
// order the remaining regions follow after the user's own region.
const DEFAULT_REGION_ORDER = ['Europe', 'Asia', 'Oceania', 'North America'];

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

/**
 * Renders the country selector from the authored (or reconstructed) block markup.
 * Expects the first row to hold the heading + image, and subsequent rows to hold
 * region headings and country/language lists.
 */
function renderCountrySelector(block) {
  let blockHeadingWrapper;
  const data = [];

  block.querySelectorAll(':scope > div').forEach((dataRow, i) => {
    if (i === 0) {
      const blockHeading = dataRow.querySelector('h1, h2, h3, h4, h5, h6');

      if (blockHeading) {
        // The selector title is the page's main heading: enforce a semantic
        // <h1> while keeping the .h2 visual size (WCAG 1.3.1, 2.4.6).
        blockHeadingWrapper = blockHeading.parentElement;
        forceHeadingLevel(blockHeading, 'h1', 'h2');
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
        // Region headings sit one level below the selector title: enforce a
        // semantic <h2> while keeping the .h5 visual size (WCAG 1.3.1).
        const regionHeading = forceHeadingLevel(region, 'h2', 'h5');
        data.push({
          region: regionHeading,
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

/**
 * Reads a named sheet's data rows from a DA sheet response, supporting both
 * single-sheet ({ data: [...] }) and multi-sheet ({ <name>: { data: [...] } }) formats.
 */
function getSheetRows(json, name) {
  if (json?.[name] && Array.isArray(json[name].data)) return json[name].data;
  if (Array.isArray(json?.data)) return json.data;
  return [];
}

/**
 * Returns the language code for the current page, derived from the URL locale
 * (e.g. /be/nl-be/ -> "nl", /it/it/ -> "it", /uk/en/ -> "en"). Defaults to "en".
 */
function getCurrentLanguage() {
  const segments = window.location.pathname.split('/').filter(Boolean);
  const langSegment = (segments[1] || '').toLowerCase();
  const lang = langSegment.split('-')[0];
  return lang || 'en';
}

/**
 * Returns the target language of a link path (e.g. /de/de/ -> "de",
 * /be/nl-be/ -> "nl"). Mirrors getCurrentLanguage but for an arbitrary path.
 */
function getPathLanguage(path) {
  const segments = (path || '').split('/').filter(Boolean);
  const langSegment = (segments[1] || '').toLowerCase();
  return langSegment.split('-')[0] || '';
}

/**
 * Builds a per-language lookup from a sheet whose rows have an id column plus
 * one column per language code. Produces { id: { en: '...', it: '...' } }.
 */
function getLangColumnMap(rows, idColumn) {
  const map = {};
  rows.forEach((row) => {
    const id = (row[idColumn] ?? row[idColumn.charAt(0).toUpperCase() + idColumn.slice(1)] ?? '')
      .toString().trim();
    if (!id) return;
    const byLang = {};
    Object.keys(row).forEach((column) => {
      const lang = column.trim().toLowerCase();
      if (lang === idColumn) return;
      const value = (row[column] ?? '').toString().trim();
      if (value) byLang[lang] = value;
    });
    map[id] = byLang;
  });
  return map;
}

/**
 * Builds a translation lookup from the `translations` sheet. Each row has a
 * `key` plus one column per language code (en, it, fr, ...). Produces:
 *   { key: { en: '...', it: '...' } }
 */
function getTranslationsMap(json) {
  return getLangColumnMap(getSheetRows(json, 'translations'), 'key');
}

/**
 * Builds a country-name lookup from the `country-names` sheet. Each row has a
 * `country` slug plus one column per language code. Produces:
 *   { italy: { it: 'Italia', en: 'Italy' } }
 */
function getCountryNamesMap(json) {
  return getLangColumnMap(getSheetRows(json, 'country-names'), 'country');
}

/**
 * Localizes a country link label into the link's own target language and
 * auto-generates the language suffix from the link path (e.g. /be/nl-be/ -> nl,
 * giving "België (nl)"). The suffix is only appended when the country has more
 * than one language link, so single-language entries stay clean (e.g. "Australia").
 * Falls back to the authored label when no localized name is found.
 */
function localizeCountryLabel(label, country, path, countryNames, showSuffix) {
  const targetLang = getPathLanguage(path);
  const names = countryNames[country];
  const translated = (names && (names[targetLang] || names.en)) || label;
  if (!translated) return label;

  const suffix = showSuffix && targetLang ? ` (${targetLang})` : '';
  return `${translated}${suffix}`;
}

/**
 * Resolves a translation for `key` in the current language, falling back to
 * English and finally to the provided default text (usually the key itself).
 */
function translate(translations, key, lang, fallback) {
  const entry = translations[key];
  if (entry) {
    if (entry[lang]) return entry[lang];
    if (entry.en) return entry.en;
  }
  return fallback ?? key;
}

/**
 * Builds a { key: value } map from a config sheet whose rows hold key/value pairs.
 */
function getConfigMap(json) {
  const rows = json?.config && Array.isArray(json.config.data) ? json.config.data : [];
  const map = {};
  rows.forEach((row) => {
    const key = (row.key || row.Key || '').trim();
    const value = (row.value ?? row.Value ?? '').toString().trim();
    if (key) map[key] = value;
  });
  return map;
}

/**
 * Reconstructs the block markup expected by renderCountrySelector() from sheet data,
 * so the data-driven `countries` variant renders identically to the authored block.
 */
function buildBlockFromSheet(block, config, countries, translations, lang, countryNames) {
  block.innerHTML = '';

  // Row 0: heading + image (kept from defaults/config, no authoring required).
  const headingRow = document.createElement('div');
  const headingCell = document.createElement('div');
  const heading = document.createElement('h2');
  const headingText = config.heading || DEFAULT_HEADING;
  heading.textContent = translate(translations, headingText, lang, headingText);
  headingCell.append(heading);
  headingRow.append(headingCell);

  const imageCell = document.createElement('div');
  const imageUrl = config.image || DEFAULT_IMAGE;
  if (imageUrl) {
    const picture = document.createElement('picture');
    const img = document.createElement('img');
    img.src = imageUrl;
    img.loading = 'lazy';
    img.alt = '';
    picture.append(img);
    imageCell.append(picture);
  }
  headingRow.append(imageCell);
  block.append(headingRow);

  // Count language links per country so the auto-generated language suffix is
  // only shown when a country offers more than one language (e.g. Belgium),
  // keeping single-language entries clean (e.g. "Australia").
  const linkCountByCountry = {};
  countries.forEach((row) => {
    const country = (row.country || row.icon || '').trim();
    if (!country) return;
    linkCountByCountry[country] = (linkCountByCountry[country] || 0) + 1;
  });

  // Subsequent rows: a region heading row, then one row per country group
  // (each group is a flag + list of language links), matching the authored DOM.
  let currentRegion = null;
  let currentCountry = null;
  let currentList = null;

  countries.forEach((row) => {
    const region = (row.region || '').trim();
    const country = (row.country || row.icon || '').trim();
    const label = (row.label || '').trim();
    const path = (row.path || '').trim();
    const icon = (row.icon || '').trim();

    // Label is optional now (names come from country-names); a row is valid as
    // long as it has a link path or an authored label (for "coming soon" text).
    if (!label && !path) return;

    if (region && region !== currentRegion) {
      currentRegion = region;
      currentCountry = null;

      const regionRow = document.createElement('div');
      const regionCell = document.createElement('div');
      const regionHeading = document.createElement('h4');
      regionHeading.textContent = translate(translations, region, lang, region);
      regionCell.append(regionHeading);
      regionRow.append(regionCell);
      regionRow.append(document.createElement('div'));
      block.append(regionRow);
    }

    if (country !== currentCountry) {
      currentCountry = country;

      const countryRow = document.createElement('div');
      countryRow.append(document.createElement('div'));

      const dataCell = document.createElement('div');
      if (icon) {
        const iconParagraph = document.createElement('p');
        iconParagraph.textContent = `:${icon}:`;
        dataCell.append(iconParagraph);
      }

      currentList = document.createElement('ul');
      dataCell.append(currentList);
      countryRow.append(dataCell);
      block.append(countryRow);
    }

    const showSuffix = (linkCountByCountry[country] || 0) > 1;
    const localizedLabel = localizeCountryLabel(label, country, path, countryNames, showSuffix);

    const listItem = document.createElement('li');
    if (path) {
      const link = document.createElement('a');
      link.href = path;
      link.textContent = localizedLabel;
      listItem.append(link);
    } else {
      // No path => "coming soon" style entry (rendered via <em>).
      const comingSoon = document.createElement('em');
      comingSoon.textContent = localizedLabel;
      listItem.append(comingSoon);
    }
    currentList.append(listItem);
  });
}

/**
 * Returns the country segment of the current URL (e.g. "uk" from /uk/en/...).
 */
function getCurrentCountrySegment() {
  const [country] = window.location.pathname.split('/').filter(Boolean);
  return (country || '').toLowerCase();
}

/**
 * Determines the user's region by matching the URL's country segment against
 * the country path prefixes in the sheet (e.g. URL /au/en/ matches a row whose
 * path starts with /au/, which lives in the "Oceania" region).
 * Returns null when no match is found (e.g. the global index page).
 */
function getUserRegion(countries) {
  const segment = getCurrentCountrySegment();
  if (!segment) return null;

  const match = countries.find((row) => {
    const path = (row.path || '').trim().toLowerCase();
    return path.startsWith(`/${segment}/`);
  });

  return match ? (match.region || '').trim() || null : null;
}

/**
 * Reorders sheet rows so the user's region appears first, followed by the
 * remaining regions in the canonical DEFAULT_REGION_ORDER. Rows within each
 * region keep their original order. Unknown regions are appended last.
 */
function orderCountriesByRegion(countries, userRegion) {
  const byRegion = new Map();
  countries.forEach((row) => {
    const region = (row.region || '').trim();
    if (!byRegion.has(region)) byRegion.set(region, []);
    byRegion.get(region).push(row);
  });

  const ordered = [];
  const used = new Set();

  if (userRegion && byRegion.has(userRegion)) {
    ordered.push(userRegion);
    used.add(userRegion);
  }

  DEFAULT_REGION_ORDER.forEach((region) => {
    if (!used.has(region) && byRegion.has(region)) {
      ordered.push(region);
      used.add(region);
    }
  });

  // Append any regions present in the sheet but not in the canonical list.
  byRegion.forEach((_, region) => {
    if (!used.has(region)) {
      ordered.push(region);
      used.add(region);
    }
  });

  return ordered.flatMap((region) => byRegion.get(region));
}

async function decorateCountriesVariant(block) {
  let json;
  try {
    const resp = await fetch(COUNTRIES_SHEET_PATH);
    if (!resp.ok) return;
    json = await resp.json();
  } catch {
    return;
  }

  const config = getConfigMap(json);
  const countries = getSheetRows(json, 'countries');
  const translations = getTranslationsMap(json);
  const countryNames = getCountryNamesMap(json);
  const lang = getCurrentLanguage();

  if (!countries.length) return;

  const userRegion = getUserRegion(countries);
  const orderedCountries = orderCountriesByRegion(countries, userRegion);

  buildBlockFromSheet(block, config, orderedCountries, translations, lang, countryNames);
  renderCountrySelector(block);
}

export default function decorate(block) {
  if (block.classList.contains('countries')) {
    decorateCountriesVariant(block);
    return;
  }

  renderCountrySelector(block);
}
