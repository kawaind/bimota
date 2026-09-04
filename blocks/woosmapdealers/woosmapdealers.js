import { createElement, getLanguageFromPath } from '../../scripts/helpers.js';

let uidCounter = 0;
// Unique id suffix so multiple instances / repeated regions don't collide.
const uid = () => {
  uidCounter += 1;
  return `wd-${uidCounter}`;
};

// Localized screen-reader / ARIA labels are authored in the global
// lanconfig.json multi-sheet, one column per language code (en, it, fr, de,
// nl, es, ja, lu) — the same dictionary the header uses for the skip link.
// The `dealer-selector` sheet holds this component's labels; `sr-buttons`
// already carries the shared "opensInNewTab" phrase, so we reuse it.
const LABEL_FALLBACKS = {
  dealerLocationsByRegion: 'Dealer locations by region',
  dealerPhone: 'Phone',
  dealerWebsite: 'Website',
  dealerEmail: 'Email',
  opensInNewTab: '(opens in a new tab)',
};

let labelDict = null;

/**
 * Load and cache the localized dealer-selector labels for the current URL
 * language from lanconfig.json (sheets `dealer-selector` and `sr-buttons`).
 * Each row is a Key plus one column per language code; the column matching the
 * current language wins, else English, else the hard-coded fallback. Adding a
 * language is a pure authoring change (add a column). Falls back gracefully on
 * any fetch/parse error so the block is always usable.
 */
async function loadLabels() {
  if (labelDict) return labelDict;
  const lang = getLanguageFromPath();
  const dict = { ...LABEL_FALLBACKS };
  try {
    const resp = await fetch('/lanconfig.json?sheet=dealer-selector&sheet=sr-buttons');
    if (resp.ok) {
      const json = await resp.json();
      const rows = [
        ...(json['dealer-selector']?.data || []),
        ...(json['sr-buttons']?.data || []),
      ];
      rows.forEach((row) => {
        if (row.Key && Object.prototype.hasOwnProperty.call(dict, row.Key)) {
          dict[row.Key] = row[lang] || row.en || dict[row.Key];
        }
      });
    }
  } catch (e) {
    // keep fallbacks
  }
  labelDict = dict;
  return labelDict;
}

/**
 * Return a localized label by key, using whatever loadLabels resolved (or the
 * English fallback before/if the dictionary is unavailable).
 * @param {string} key label key (e.g. "dealerWebsite")
 * @param {string} [fallback] optional override fallback
 * @returns {string} the localized label
 */
const t = (key, fallback) => (labelDict && labelDict[key])
  || fallback || LABEL_FALLBACKS[key] || key;

const REGIONS = {
  africa: [
    'ao', 'bf', 'bi', 'bj', 'bw', 'cd', 'cf', 'cg', 'ci', 'cm', 'cv', 'dj',
    'dz', 'eg', 'eh', 'er', 'et', 'ga', 'gh', 'gm', 'gn', 'gq', 'gw', 'ke',
    'km', 'lr', 'ls', 'ly', 'ma', 'mg', 'ml', 'mr', 'mu', 'mw', 'mz', 'na',
    'ne', 'ng', 'rw', 'sc', 'sd', 'sl', 'sn', 'so', 'ss', 'st', 'sz', 'td',
    'tg', 'tn', 'tz', 'ug', 'za', 'zm', 'zw',
  ],
  americas: [
    'ag', 'ai', 'ar', 'aw', 'bb', 'bl', 'bm', 'bo', 'bq', 'br', 'bs', 'bz',
    'ca', 'cl', 'co', 'cr', 'cu', 'cw', 'dm', 'do', 'ec', 'fk', 'gd', 'gf',
    'gp', 'gt', 'gy', 'hn', 'ht', 'jm', 'kn', 'ky', 'lc', 'mf', 'mq', 'ms',
    'mx', 'ni', 'pa', 'pe', 'pm', 'pr', 'py', 'sr', 'sv', 'sx', 'tc', 'tt',
    'us', 'uy', 've', 'vg', 'vi',
  ],
  asia: [
    'ae', 'af', 'am', 'az', 'bd', 'bh', 'bn', 'bt', 'cn', 'cy', 'ge', 'hk',
    'id', 'il', 'in', 'iq', 'ir', 'jo', 'jp', 'kg', 'kh', 'kp', 'kr', 'kw',
    'kz', 'la', 'lb', 'lk', 'mm', 'mn', 'mo', 'mv', 'my', 'np', 'om', 'ph',
    'pk', 'ps', 'qa', 'sa', 'sg', 'sy', 'th', 'tj', 'tl', 'tm', 'tr', 'tw',
    'uz', 'vn', 'ye',
  ],
  europe: [
    'ad', 'al', 'at', 'ax', 'ba', 'be', 'bg', 'by', 'ch', 'cz', 'de', 'dk',
    'ee', 'es', 'fi', 'fo', 'fr', 'gb', 'gg', 'gi', 'gr', 'hr', 'hu', 'ie',
    'im', 'is', 'it', 'je', 'li', 'lt', 'lu', 'lv', 'mc', 'md', 'me', 'mk',
    'mt', 'nl', 'no', 'pl', 'pt', 'ro', 'rs', 'ru', 'se', 'si', 'sk', 'sm',
    'ua', 'va', 'xk',
  ],
  oceania: [
    'as', 'au', 'ck', 'fj', 'fm', 'gu', 'ki', 'mh', 'mp', 'nc', 'nf', 'nr',
    'nu', 'nz', 'pf', 'pg', 'pn', 'pw', 'sb', 'tk', 'to', 'tv', 'vu', 'wf',
    'ws',
  ],
};

function getRegionForCountry(countryCode) {
  const code = countryCode.toLowerCase();
  const region = Object.keys(REGIONS).find((r) => REGIONS[r].includes(code));
  return region || null;
}

const URL_TO_ISO = {
  uk: 'gb',
};

function getUrlParams() {
  const segments = window.location.pathname.split('/').filter(Boolean);
  const urlCountry = (segments[0] || '').toLowerCase();
  const countryIso = URL_TO_ISO[urlCountry] || urlCountry;
  const langSegment = segments[1] || '';
  const langCode = langSegment.split('-')[0] || urlCountry;
  return { countryIso, langCode };
}

function getLocalizedCountryName(countryCode, langCode) {
  if (!countryCode) return '';
  try {
    const displayNames = new Intl.DisplayNames([langCode], { type: 'region' });
    return displayNames.of(countryCode.toUpperCase()) || countryCode.toUpperCase();
  } catch (e) {
    return countryCode.toUpperCase();
  }
}

/**
 * Build a single dealer as a semantic list item containing an <address>
 * element (WCAG 1.3.1). The dealer name is the item's accessible heading text;
 * interactive links (website, phone, email) carry visually-hidden context so
 * their purpose is clear out of context to a screen reader (WCAG 2.4.4).
 * @param {Object} store the Woosmap store feature
 * @returns {HTMLLIElement} the dealer list item
 */
function buildDealerCard(store) {
  const { properties } = store;
  const { name, address, contact } = properties;
  const item = createElement('li', { classes: 'dealer-card' });
  const addressEl = createElement('address', { classes: 'dealer-address' });

  if (name) {
    const nameEl = createElement('p', { classes: 'dealer-name' });
    nameEl.textContent = name;
    addressEl.append(nameEl);
  }

  const lines = address?.lines;
  const street = Array.isArray(lines) ? lines.join(', ') : (lines || '');
  if (street) {
    const streetEl = createElement('p', { classes: 'dealer-street' });
    streetEl.textContent = street;
    addressEl.append(streetEl);
  }

  const city = address?.city || '';
  const zip = address?.zipcode || '';
  const cityZip = [city, zip].filter(Boolean).join(' ');
  if (cityZip) {
    const cityEl = createElement('p', { classes: 'dealer-city' });
    cityEl.textContent = cityZip;
    addressEl.append(cityEl);
  }

  // Helper: append visually-hidden context so links read meaningfully out of
  // context (e.g. "Phone: +32 …", "Website: … (opens in a new tab), <dealer>").
  const withContext = (linkEl, contextText) => {
    const ctx = createElement('span', { classes: 'sr-only' });
    ctx.textContent = `${contextText} `;
    linkEl.prepend(ctx);
  };

  const phone = (contact?.phone || '').trim();
  if (phone) {
    const phoneEl = createElement('p', { classes: 'dealer-phone' });
    const telHref = `tel:${phone.replace(/[^\d+]/g, '')}`;
    const phoneLink = createElement('a', { classes: 'dealer-phone-link', props: { href: telHref } });
    phoneLink.textContent = phone;
    withContext(phoneLink, `${t('dealerPhone', 'Phone')}:`);
    const phoneLabel = `${t('dealerPhone', 'Phone')}: ${phone}${name ? `, ${name}` : ''}`;
    phoneLink.setAttribute('aria-label', phoneLabel);
    phoneEl.append(phoneLink);
    addressEl.append(phoneEl);
  }

  const url = contact?.website || '';
  if (url) {
    const urlEl = createElement('p', { classes: 'dealer-url' });
    const href = url.startsWith('http') ? url : `https://${url}`;
    const link = createElement('a', {
      props: {
        href,
        target: '_blank',
        rel: 'noopener noreferrer',
      },
    });
    const visibleUrl = url.replace(/^https?:\/\//, '');
    link.textContent = visibleUrl;
    // Accessible name states the purpose, the dealer and that it opens a new
    // tab (WCAG 2.4.4, 3.2.5). It must also contain the visible link text (the
    // URL) so the name matches the label a speech-input user would speak
    // (WCAG 2.5.3 Label in Name). The shared "opensInNewTab" phrase already
    // includes its own parentheses.
    const newTab = t('opensInNewTab', '(opens in a new tab)');
    const websiteLabel = `${t('dealerWebsite', 'Website')}${name ? `, ${name}` : ''}, ${visibleUrl} ${newTab}`;
    link.setAttribute('aria-label', websiteLabel);
    urlEl.append(link);
    addressEl.append(urlEl);
  }

  const email = contact?.email || '';
  if (email) {
    const emailEl = createElement('p', { classes: 'dealer-email' });
    const mailLink = createElement('a', { props: { href: `mailto:${email}` } });
    mailLink.textContent = email;
    if (name) mailLink.setAttribute('aria-label', `${t('dealerEmail', 'Email')}: ${email}, ${name}`);
    else mailLink.setAttribute('aria-label', `${t('dealerEmail', 'Email')}: ${email}`);
    emailEl.append(mailLink);
    addressEl.append(emailEl);
  }

  item.append(addressEl);
  return item;
}

function sortStores(stores, isCountryDealers, langCode) {
  return [...stores].sort((a, b) => {
    if (!isCountryDealers) {
      const countryA = getLocalizedCountryName(
        a.properties?.address?.country_code,
        langCode,
      ).toUpperCase();
      const countryB = getLocalizedCountryName(
        b.properties?.address?.country_code,
        langCode,
      ).toUpperCase();
      if (countryA !== countryB) return countryA.localeCompare(countryB);
    }
    const nameA = (a.properties?.name || '').toUpperCase();
    const nameB = (b.properties?.name || '').toUpperCase();
    return nameA.localeCompare(nameB);
  });
}

async function fetchDealers(apiKey, query) {
  const url = new URL('https://api.woosmap.com/stores/search');
  url.searchParams.set('key', apiKey);
  if (query) url.searchParams.set('query', query);
  url.searchParams.set('limit', '300');

  const resp = await fetch(url.toString());
  if (!resp.ok) return [];
  const data = await resp.json();
  return data.features || [];
}

function getConfig(block) {
  const rows = [...block.children];
  const config = {};
  rows.forEach((row) => {
    const cols = [...row.children];
    if (cols.length >= 2) {
      const key = cols[0].textContent.trim().toLowerCase();
      const value = cols[1].textContent.trim();
      config[key] = value;
    }
  });
  return config;
}

function parseList(value) {
  if (!value) return [];
  return value.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
}

function buildBaseQuery(excludeCountries, dealerIdstores) {
  if (!excludeCountries.length) {
    return '';
  }
  if (dealerIdstores.length) {
    const countryParts = excludeCountries.map((iso) => `NOT country:="${iso}"`).join(' AND ');
    const idParts = dealerIdstores.map((id) => `idstore:="${id}"`).join(' OR ');
    return `(${countryParts}) OR (${idParts})`;
  }
  return excludeCountries.map((iso) => `NOT country:="${iso}"`).join(' AND ');
}

function buildQuery(isCountryDealers, countryIso, excludeCountries, dealerIdstores) {
  if (isCountryDealers) {
    return `country:="${countryIso}"`;
  }

  if (!excludeCountries.length && !dealerIdstores.length) {
    return `NOT country:="${countryIso}"`;
  }

  if (excludeCountries.length && dealerIdstores.length) {
    const countryParts = [...excludeCountries, countryIso].map((iso) => `NOT country:="${iso}"`).join(' AND ');
    const idParts = dealerIdstores.map((id) => `idstore:="${id}"`).join(' OR ');
    return `(${countryParts}) OR (${idParts})`;
  }

  if (excludeCountries.length) {
    return [...excludeCountries, countryIso].map((iso) => `NOT country:="${iso}"`).join(' AND ');
  }

  return `NOT country:="${countryIso}"`;
}

const TRANSLATIONS = {
  'other dealers': {
    en: 'Other Dealers',
    fr: 'Autres Concessionnaires',
    it: 'Altri Concessionari',
    es: 'Otros Distribuidores',
    de: 'Andere Händler',
    pt: 'Outros Revendedores',
    nl: 'Andere Dealers',
    ja: 'その他のディーラー',
  },
  dealers: {
    en: 'Dealers',
    fr: 'Concessionnaires',
    it: 'Concessionari',
    es: 'Distribuidores',
    de: 'Händler',
    pt: 'Revendedores',
    nl: 'Dealers',
    ja: 'ディーラー',
  },
};

const REGION_TRANSLATIONS = {
  africa: {
    en: 'Africa', fr: 'Afrique', it: 'Africa', es: 'África', de: 'Afrika', pt: 'África', nl: 'Afrika', ja: 'アフリカ',
  },
  americas: {
    en: 'Americas', fr: 'Amériques', it: 'Americhe', es: 'Américas', de: 'Amerika', pt: 'Américas', nl: 'Amerika', ja: 'アメリカ',
  },
  asia: {
    en: 'Asia', fr: 'Asie', it: 'Asia', es: 'Asia', de: 'Asien', pt: 'Ásia', nl: 'Azië', ja: 'アジア',
  },
  europe: {
    en: 'Europe', fr: 'Europe', it: 'Europa', es: 'Europa', de: 'Europa', pt: 'Europa', nl: 'Europa', ja: 'ヨーロッパ',
  },
  oceania: {
    en: 'Oceania', fr: 'Océanie', it: 'Oceania', es: 'Oceanía', de: 'Ozeanien', pt: 'Oceania', nl: 'Oceanië', ja: 'オセアニア',
  },
};

function updatePageTitle(langCode) {
  const lang = langCode.toLowerCase();
  const translated = TRANSLATIONS.dealers?.[lang];
  if (translated) {
    document.title = translated;
  }
}

function translateCustomText(text, langCode) {
  const key = text.toLowerCase();
  const lang = langCode.toLowerCase();
  return TRANSLATIONS[key]?.[lang] || text;
}

function decorateGlobalTitle(block) {
  const config = getConfig(block);
  const customText = (config.custom_text || '').trim();
  const { langCode } = getUrlParams();

  block.textContent = '';

  const heading = createElement('h1', { classes: 'dealers-global-title' });
  const translated = translateCustomText(customText || 'Other Dealers', langCode).toUpperCase();
  heading.textContent = translated;
  block.append(heading);
}

function groupStoresByRegionAndCountry(stores, langCode) {
  const regionMap = {};
  stores.forEach((store) => {
    const code = (store.properties?.address?.country_code || '').toLowerCase();
    const region = getRegionForCountry(code);
    if (!region) return;
    if (!regionMap[region]) regionMap[region] = {};
    const countryName = getLocalizedCountryName(code, langCode);
    if (!regionMap[region][countryName]) regionMap[region][countryName] = [];
    regionMap[region][countryName].push(store);
  });
  return regionMap;
}

function getLocalizedRegionName(region, langCode) {
  const lang = langCode.toLowerCase();
  return REGION_TRANSLATIONS[region]?.[lang]
    || REGION_TRANSLATIONS[region]?.en
    || region.charAt(0).toUpperCase() + region.slice(1);
}

/**
 * Set the selected tab in a tablist that uses automatic activation (ARIA APG
 * Tabs pattern): update aria-selected + roving tabindex on every tab, show the
 * matching panel and hide the rest. Optionally move DOM focus to the newly
 * selected tab (used by the arrow / Home / End keys, which move focus and
 * activate together).
 * @param {HTMLElement[]} tabs the tab buttons
 * @param {HTMLElement[]} panels the tab panels (index-aligned with tabs)
 * @param {number} index the tab to select
 * @param {boolean} [focusTab=false] move focus onto the selected tab
 */
function selectTab(tabs, panels, index, focusTab = false) {
  tabs.forEach((tab, i) => {
    const selected = i === index;
    tab.setAttribute('aria-selected', selected ? 'true' : 'false');
    tab.setAttribute('tabindex', selected ? '0' : '-1');
    tab.classList.toggle('active', selected);
  });
  panels.forEach((panel, i) => {
    const selected = i === index;
    panel.hidden = !selected;
    panel.classList.toggle('active', selected);
  });
  if (focusTab) tabs[index].focus();
}

/**
 * Build one country accordion (ARIA APG Accordion pattern): a native <button>
 * wrapped in a heading, controlling a collapsible region. Expanded state is
 * exposed via aria-expanded; the panel is linked back to its button with
 * aria-labelledby (WCAG 1.3.1, 4.1.2).
 * @param {string} countryName the localized country name
 * @param {Object[]} dealers the stores in this country
 * @param {string} headingTag semantic heading level for the trigger
 * @returns {HTMLElement} the accordion wrapper
 */
function buildCountryAccordion(countryName, dealers, headingTag) {
  const instanceId = uid();
  const buttonId = `${instanceId}-btn`;
  const panelId = `${instanceId}-panel`;

  const sortedDealers = [...dealers].sort((a, b) => {
    const nameA = (a.properties?.name || '').toUpperCase();
    const nameB = (b.properties?.name || '').toUpperCase();
    return nameA.localeCompare(nameB);
  });

  const accordion = createElement('div', { classes: 'dealers-accordion' });

  const heading = createElement(headingTag, { classes: 'dealers-accordion-heading' });
  const button = createElement('button', {
    classes: 'dealers-accordion-header',
    props: {
      type: 'button',
      id: buttonId,
      'aria-expanded': 'false',
      'aria-controls': panelId,
    },
  });
  const label = createElement('span', { classes: 'dealers-accordion-title' });
  label.textContent = countryName;
  button.append(label);
  heading.append(button);
  accordion.append(heading);

  // Panel is a labelled region that wraps the dealer list. Keeping the region
  // role on a container <div> (not the <ul>) preserves the list semantics of
  // the <ul>/<li> dealer markup (WCAG 1.3.1).
  const panel = createElement('div', {
    classes: 'dealers-accordion-panel',
    props: { id: panelId, role: 'region', 'aria-labelledby': buttonId },
  });
  panel.hidden = true;
  const list = createElement('ul', { classes: 'dealers-grid' });
  sortedDealers.forEach((store) => list.append(buildDealerCard(store)));
  panel.append(list);
  accordion.append(panel);

  button.addEventListener('click', () => {
    const expanded = button.getAttribute('aria-expanded') === 'true';
    button.setAttribute('aria-expanded', expanded ? 'false' : 'true');
    panel.hidden = expanded;
    accordion.classList.toggle('open', !expanded);
  });

  return accordion;
}

function buildRegionTabs(regionMap, langCode, container, userCountryIso) {
  const userRegion = userCountryIso ? getRegionForCountry(userCountryIso) : null;
  const sorted = Object.keys(regionMap).sort();
  const regionNames = userRegion && sorted.includes(userRegion)
    ? [userRegion, ...sorted.filter((r) => r !== userRegion)]
    : sorted;

  // Tablist (ARIA Tabs pattern, automatic activation).
  const tabNav = createElement('ul', {
    classes: 'dealers-tabs',
    props: { role: 'tablist', 'aria-label': t('dealerLocationsByRegion', 'Dealer locations by region') },
  });
  const tabContent = createElement('div', { classes: 'dealers-tab-content' });

  const tabs = [];
  const panels = [];

  regionNames.forEach((region, index) => {
    const instanceId = uid();
    const tabId = `${instanceId}-tab`;
    const panelId = `${instanceId}-tabpanel`;

    const listItem = createElement('li', { classes: 'dealers-tab-item', props: { role: 'presentation' } });
    const tabBtn = createElement('button', {
      classes: 'dealers-tab-btn',
      props: {
        type: 'button',
        role: 'tab',
        id: tabId,
        'aria-controls': panelId,
        'aria-selected': index === 0 ? 'true' : 'false',
        tabindex: index === 0 ? '0' : '-1',
      },
    });
    tabBtn.textContent = getLocalizedRegionName(region, langCode);
    if (index === 0) tabBtn.classList.add('active');
    listItem.append(tabBtn);
    tabNav.append(listItem);
    tabs.push(tabBtn);

    const panel = createElement('div', {
      classes: 'dealers-tab-panel',
      props: {
        role: 'tabpanel',
        id: panelId,
        tabindex: '0',
        'aria-labelledby': tabId,
      },
    });
    if (index === 0) panel.classList.add('active');
    panel.hidden = index !== 0;

    const countries = Object.keys(regionMap[region]).sort();
    countries.forEach((countryName) => {
      // Region heading is <h2> in the section, so country triggers are <h3>.
      panel.append(buildCountryAccordion(countryName, regionMap[region][countryName], 'h3'));
    });

    tabContent.append(panel);
    panels.push(panel);
  });

  // Automatic activation: selecting (via click) or focusing (via keyboard)
  // a tab activates it.
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectTab(tabs, panels, index));
  });

  tabNav.addEventListener('keydown', (e) => {
    const current = tabs.indexOf(document.activeElement);
    if (current === -1) return;
    let next;
    switch (e.key) {
      case 'ArrowRight':
        next = current === tabs.length - 1 ? 0 : current + 1;
        break;
      case 'ArrowLeft':
        next = current === 0 ? tabs.length - 1 : current - 1;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = tabs.length - 1;
        break;
      default:
        return;
    }
    e.preventDefault();
    selectTab(tabs, panels, next, true);
  });

  container.append(tabNav);
  container.append(tabContent);
}

async function decoratePriorityDealers(block) {
  const config = getConfig(block);
  const apiKey = config.woosmapkey || '';
  if (!apiKey) return;

  const priorityCountries = parseList(config.priority_countries || config['priority-dealers']);
  const dealerIdstores = parseList(config.dealer_idstore);
  const { langCode } = getUrlParams();

  block.textContent = '';
  const container = createElement('div', { classes: 'dealers-container' });
  block.append(container);

  let query = '';
  if (priorityCountries.length && dealerIdstores.length) {
    const countryParts = priorityCountries.map((iso) => `country:="${iso}"`).join(' OR ');
    const idParts = dealerIdstores.map((id) => `idstore:="${id}"`).join(' OR ');
    query = `(${countryParts}) OR (${idParts})`;
  } else if (priorityCountries.length) {
    query = priorityCountries.map((iso) => `country:="${iso}"`).join(' OR ');
  } else if (dealerIdstores.length) {
    query = dealerIdstores.map((id) => `idstore:="${id}"`).join(' OR ');
  }

  const stores = await fetchDealers(apiKey, query);
  const sorted = sortStores(stores, false, langCode);
  const grid = createElement('ul', { classes: 'dealers-grid' });
  sorted.forEach((store) => {
    grid.append(buildDealerCard(store));
  });
  container.append(grid);
}

export default async function decorate(block) {
  // Ensure the localized label dictionary is loaded before we build labels, so
  // the ARIA labels render in the site language on first paint (requirement
  // #4). loadLabels caches, so this is a no-op after the first call.
  await loadLabels();

  if (block.classList.contains('global-title')) {
    decorateGlobalTitle(block);
    return;
  }

  if (block.classList.contains('priority-dealers')) {
    await decoratePriorityDealers(block);
    return;
  }

  const isCountryDealers = block.classList.contains('country-dealers');
  const isGlobalDealers = block.classList.contains('global-dealers');
  const isBaseVariant = !isCountryDealers && !isGlobalDealers;
  const config = getConfig(block);
  const apiKey = config.woosmapkey || '';

  if (!apiKey) return;

  const priorityCountries = parseList(config.priority_countries || config['priority-dealers']);
  const authorExcludes = parseList(config.exclude_countries || config['exclude-dealers']);
  const excludeCountries = [...new Set([...authorExcludes, ...priorityCountries])];
  const dealerIdstores = parseList(config.dealer_idstore);
  const { countryIso, langCode } = getUrlParams();

  updatePageTitle(langCode);

  block.textContent = '';

  const container = createElement('div', { classes: 'dealers-container' });
  const loading = createElement('div', { classes: 'dealers-loading' });
  loading.textContent = '...';
  container.append(loading);
  block.append(container);

  let stores;

  if (isBaseVariant) {
    const query = buildBaseQuery(excludeCountries, dealerIdstores);
    stores = await fetchDealers(apiKey, query);
  } else {
    const query = buildQuery(isCountryDealers, countryIso, excludeCountries, dealerIdstores);
    stores = await fetchDealers(apiKey, query);
  }

  loading.remove();

  if (isBaseVariant) {
    const regionMap = groupStoresByRegionAndCountry(stores, langCode);
    buildRegionTabs(regionMap, langCode, container, countryIso);
  } else if (isGlobalDealers) {
    const regionMap = groupStoresByRegionAndCountry(stores, langCode);
    buildRegionTabs(regionMap, langCode, container, countryIso);
  } else if (isCountryDealers) {
    const countryName = getLocalizedCountryName(countryIso, langCode);
    if (countryName) {
      const heading = createElement('h2', { classes: 'dealers-country-heading' });
      heading.textContent = countryName;
      container.append(heading);
    }

    const sorted = sortStores(stores, true, langCode);
    const grid = createElement('ul', { classes: 'dealers-grid' });
    sorted.forEach((store) => {
      grid.append(buildDealerCard(store));
    });
    container.append(grid);
  }
}
