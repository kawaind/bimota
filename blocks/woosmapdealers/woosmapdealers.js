import { createElement } from '../../scripts/helpers.js';

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

function buildDealerCard(store, langCode) {
  const { properties } = store;
  const { name, address, contact } = properties;
  const card = createElement('div', { classes: 'dealer-card' });

  const countryCode = address?.country_code || '';
  const countryName = getLocalizedCountryName(countryCode, langCode);
  if (countryName) {
    const countryEl = createElement('p', { classes: 'dealer-country' });
    countryEl.textContent = countryName.toUpperCase();
    card.append(countryEl);
  }

  if (name) {
    const nameEl = createElement('p', { classes: 'dealer-name' });
    nameEl.textContent = name;
    card.append(nameEl);
  }

  const street = address?.lines?.join(', ') || '';
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
      return `country:="${countryIso}" NOT country:="jp"`;
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
    return `NOT country:="${countryIso}" NOT country:="jp"`;
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

export default async function decorate(block) {
  if (block.classList.contains('global-title')) {
    decorateGlobalTitle(block);
    return;
  }

  const isCountryDealers = block.classList.contains('country-dealers');
  const config = getConfig(block);
  const apiKey = config.woosmapkey || '';

  if (!apiKey) return;

  const excludeCountries = parseList(config.exclude_countries);
  const dealerIdstores = parseList(config.dealer_idstore);
  const { countryIso, langCode } = getUrlParams();
  const query = buildQuery(isCountryDealers, countryIso, excludeCountries, dealerIdstores);

  block.textContent = '';

  const container = createElement('div', { classes: 'dealers-container' });
  const loading = createElement('div', { classes: 'dealers-loading' });
  loading.textContent = '...';
  container.append(loading);
  block.append(container);

  const stores = await fetchDealers(apiKey, query);
  const sorted = sortStores(stores, isCountryDealers, langCode);

  loading.remove();

  const grid = createElement('div', { classes: 'dealers-grid' });
  sorted.forEach((store) => {
    grid.append(buildDealerCard(store, langCode));
  });

  container.append(grid);
}
