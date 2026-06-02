import { createElement } from '../../scripts/helpers.js';

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

function getUrlParams() {
  const segments = window.location.pathname.split('/').filter(Boolean);
  const countryIso = (segments[0] || '').toLowerCase();
  const langSegment = segments[1] || '';
  const langCode = langSegment.split('-')[0] || countryIso;
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

function buildDealerCard(store) {
  const { properties } = store;
  const { name, address, contact } = properties;
  const card = createElement('div', { classes: 'dealer-card' });

  if (name) {
    const nameEl = createElement('p', { classes: 'dealer-name' });
    nameEl.textContent = name;
    card.append(nameEl);
  }

  const lines = address?.lines;
  const street = Array.isArray(lines) ? lines.join(', ') : (lines || '');
  if (street) {
    const streetEl = createElement('p', { classes: 'dealer-street' });
    streetEl.textContent = street;
    card.append(streetEl);
  }

  const city = address?.city || '';
  const zip = address?.zipcode || '';
  const cityZip = [city, zip].filter(Boolean).join(' ');
  if (cityZip) {
    const cityEl = createElement('p', { classes: 'dealer-city' });
    cityEl.textContent = cityZip;
    card.append(cityEl);
  }

  const phone = contact?.phone || '';
  if (phone) {
    const phoneEl = createElement('p', { classes: 'dealer-phone' });
    phoneEl.textContent = phone;
    card.append(phoneEl);
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
    link.textContent = url.replace(/^https?:\/\//, '');
    urlEl.append(link);
    card.append(urlEl);
  }

  const email = contact?.email || '';
  if (email) {
    const emailEl = createElement('p', { classes: 'dealer-email' });
    const mailLink = createElement('a', { props: { href: `mailto:${email}` } });
    mailLink.textContent = email;
    emailEl.append(mailLink);
    card.append(emailEl);
  }

  return card;
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
  url.searchParams.set('query', query);
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

function buildQuery(isCountryDealers, countryIso, excludeCountries, dealerIdstores) {
  if (isCountryDealers) {
    if (!excludeCountries.length && !dealerIdstores.length) {
      return `country:="${countryIso}"`;
    }
    let query = `country:="${countryIso}"`;
    if (excludeCountries.length && dealerIdstores.length) {
      const countryParts = excludeCountries.map((iso) => `NOT country:="${iso}"`).join(' AND ');
      const idParts = dealerIdstores.map((id) => `idstore:="${id}"`).join(' OR ');
      query += ` AND (${countryParts} OR ${idParts})`;
    } else if (excludeCountries.length) {
      query += ` AND ${excludeCountries.map((iso) => `NOT country:="${iso}"`).join(' AND ')}`;
    } else {
      query += ` AND (${dealerIdstores.map((id) => `idstore:="${id}"`).join(' OR ')})`;
    }
    return query;
  }

  if (!excludeCountries.length && !dealerIdstores.length) {
    return `NOT country:="${countryIso}"`;
  }

  let query = `NOT country:="${countryIso}"`;
  if (excludeCountries.length && dealerIdstores.length) {
    const countryParts = excludeCountries.map((iso) => `NOT country:="${iso}"`).join(' AND ');
    const idParts = dealerIdstores.map((id) => `idstore:="${id}"`).join(' OR ');
    query += ` AND (${countryParts} OR ${idParts})`;
  } else if (excludeCountries.length) {
    query += ` AND ${excludeCountries.map((iso) => `NOT country:="${iso}"`).join(' AND ')}`;
  } else {
    query += ` AND (${dealerIdstores.map((id) => `idstore:="${id}"`).join(' OR ')})`;
  }
  return query;
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
};

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

function capitalizeRegion(region) {
  return region.charAt(0).toUpperCase() + region.slice(1);
}

function buildRegionTabs(regionMap, langCode, container, userCountryIso) {
  const userRegion = userCountryIso ? getRegionForCountry(userCountryIso) : null;
  const sorted = Object.keys(regionMap).sort();
  const regionNames = userRegion && sorted.includes(userRegion)
    ? [userRegion, ...sorted.filter((r) => r !== userRegion)]
    : sorted;

  const tabNav = createElement('div', { classes: 'dealers-tabs' });
  const tabContent = createElement('div', { classes: 'dealers-tab-content' });

  regionNames.forEach((region, index) => {
    const tabBtn = createElement('button', { classes: 'dealers-tab-btn' });
    tabBtn.textContent = capitalizeRegion(region);
    tabBtn.setAttribute('data-region', region);
    if (index === 0) tabBtn.classList.add('active');
    tabBtn.addEventListener('click', () => {
      tabNav.querySelectorAll('.dealers-tab-btn').forEach((b) => b.classList.remove('active'));
      tabBtn.classList.add('active');
      tabContent.querySelectorAll('.dealers-tab-panel').forEach((p) => p.classList.remove('active'));
      tabContent.querySelector(`[data-region="${region}"]`).classList.add('active');
    });
    tabNav.append(tabBtn);
  });

  regionNames.forEach((region, index) => {
    const panel = createElement('div', { classes: 'dealers-tab-panel' });
    panel.setAttribute('data-region', region);
    if (index === 0) panel.classList.add('active');

    const countries = Object.keys(regionMap[region]).sort();
    countries.forEach((countryName) => {
      const dealers = regionMap[region][countryName];
      const sortedDealers = [...dealers].sort((a, b) => {
        const nameA = (a.properties?.name || '').toUpperCase();
        const nameB = (b.properties?.name || '').toUpperCase();
        return nameA.localeCompare(nameB);
      });

      const details = document.createElement('details');
      details.classList.add('dealers-accordion');

      const summary = document.createElement('summary');
      summary.classList.add('dealers-accordion-header');
      summary.textContent = countryName;
      details.append(summary);

      const grid = createElement('div', { classes: 'dealers-grid' });
      sortedDealers.forEach((store) => {
        grid.append(buildDealerCard(store));
      });
      details.append(grid);
      panel.append(details);
    });

    tabContent.append(panel);
  });

  container.append(tabNav);
  container.append(tabContent);
}

export default async function decorate(block) {
  if (block.classList.contains('global-title')) {
    decorateGlobalTitle(block);
    return;
  }

  const isCountryDealers = block.classList.contains('country-dealers');
  const isGlobalDealers = block.classList.contains('global-dealers');
  const config = getConfig(block);
  const apiKey = config.woosmapkey || '';

  if (!apiKey) return;

  const priorityCountries = parseList(config.priority_countries);
  const authorExcludes = parseList(config.exclude_countries);
  const excludeCountries = [...new Set([...authorExcludes, ...priorityCountries])];
  const dealerIdstores = parseList(config.dealer_idstore);
  const { countryIso, langCode } = getUrlParams();

  const query = buildQuery(isCountryDealers, countryIso, excludeCountries, dealerIdstores);

  block.textContent = '';

  const container = createElement('div', { classes: 'dealers-container' });
  const loading = createElement('div', { classes: 'dealers-loading' });
  loading.textContent = '...';
  container.append(loading);
  block.append(container);

  const hasPriority = priorityCountries.length > 0 && isGlobalDealers;
  const priorityQuery = hasPriority
    ? priorityCountries.map((iso) => `country:="${iso}"`).join(' OR ')
    : '';

  const [priorityStores, globalStores] = await Promise.all([
    hasPriority ? fetchDealers(apiKey, priorityQuery) : Promise.resolve([]),
    fetchDealers(apiKey, query),
  ]);

  loading.remove();

  if (isGlobalDealers) {
    if (hasPriority && priorityStores.length) {
      const priorityRegionMap = groupStoresByRegionAndCountry(priorityStores, langCode);
      const prioritySection = createElement('div', { classes: 'dealers-priority-section' });
      buildRegionTabs(priorityRegionMap, langCode, prioritySection, countryIso);
      container.append(prioritySection);
    }

    const regionMap = groupStoresByRegionAndCountry(globalStores, langCode);
    buildRegionTabs(regionMap, langCode, container, countryIso);
  } else if (isCountryDealers) {
    const countryName = getLocalizedCountryName(countryIso, langCode);
    if (countryName) {
      const heading = createElement('h2', { classes: 'dealers-country-heading' });
      heading.textContent = countryName;
      container.append(heading);
    }

    const sorted = sortStores(globalStores, true, langCode);
    const grid = createElement('div', { classes: 'dealers-grid' });
    sorted.forEach((store) => {
      grid.append(buildDealerCard(store));
    });
    container.append(grid);
  }
}
