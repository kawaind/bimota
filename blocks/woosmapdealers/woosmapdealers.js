import { createElement, getLocale } from '../../scripts/helpers.js';

function getLocalizedCountryName(countryCode, language) {
  if (!countryCode) return '';
  try {
    const displayNames = new Intl.DisplayNames([language], { type: 'region' });
    return displayNames.of(countryCode.toUpperCase()) || countryCode.toUpperCase();
  } catch (e) {
    return countryCode.toUpperCase();
  }
}

function buildDealerCard(store, language) {
  const { properties } = store;
  const { name, address, contact } = properties;
  const card = createElement('div', { classes: 'dealer-card' });

  const countryCode = address?.country_code || '';
  const countryName = getLocalizedCountryName(countryCode, language);
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

function sortStores(stores, isLocal, language) {
  return [...stores].sort((a, b) => {
    if (!isLocal) {
      const countryA = getLocalizedCountryName(
        a.properties?.address?.country_code,
        language,
      ).toUpperCase();
      const countryB = getLocalizedCountryName(
        b.properties?.address?.country_code,
        language,
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

export default async function decorate(block) {
  const isLocal = block.classList.contains('local-country');
  const config = getConfig(block);
  const apiKey = config.woosmapkey || '';
  const query = config.query || '';

  if (!apiKey) return;

  const { language } = getLocale();
  block.textContent = '';

  const container = createElement('div', { classes: 'dealers-container' });
  const loading = createElement('div', { classes: 'dealers-loading' });
  loading.textContent = '...';
  container.append(loading);
  block.append(container);

  const stores = await fetchDealers(apiKey, query);
  const sorted = sortStores(stores, isLocal, language);

  loading.remove();

  const grid = createElement('div', { classes: 'dealers-grid' });
  sorted.forEach((store) => {
    grid.append(buildDealerCard(store, language));
  });

  container.append(grid);
}
