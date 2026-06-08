/**
 * Resolves the language code from the current page URL path.
 * URL pattern: /{country}/{language}/page
 * Maps compound locales (en-be, fr-ca, nl-be) to their language key used in spec sheets.
 */
function getLanguage() {
  const pathTokens = window.location.pathname.split('/');
  if (pathTokens.length >= 3) {
    return pathTokens[2];
  }
  return 'en';
}

/**
 * Maps the page language to the spec sheet language key.
 * Spec sheets use base language codes (en, fr, de, it, ja, es, nl)
 * with exceptions for regional variants (fr-ca).
 */
function resolveSheetLanguage(lang) {
  const langMap = {
    en: 'en',
    'en-be': 'en',
    'en-lu': 'en',
    'en-nl': 'en',
    'en-ca': 'en',
    'en-us': 'en',
    'en-mx': 'en',
    it: 'it',
    fr: 'fr',
    'fr-be': 'fr',
    'fr-lu': 'fr',
    'fr-ca': 'fr-ca',
    de: 'de',
    ja: 'ja',
    es: 'es',
    'es-mx': 'es',
    nl: 'nl',
    'nl-be': 'nl',
    'nl-nl': 'nl',
  };
  return langMap[lang] || 'en';
}

/**
 * Extracts the bike ID from the block's class list.
 * Classes follow pattern: specification-table modal-specification-{bikeId}
 */
function getBikeId(block) {
  const modalClass = [...block.classList].find((c) => c.startsWith('modal-specification-'));
  if (modalClass) {
    return modalClass.replace('modal-specification-', '');
  }
  return null;
}

/**
 * Maps bike IDs (from CSS class) to their specification JSON file names.
 */
function bikeIdToFileName(bikeId) {
  const fileMap = {
    kb4: 'kb4',
    kb4rc: 'kb4rc',
    kb998: 'kb998',
    kb399: 'kb399',
    bx450: 'bx450',
    bx4502026: 'bx450-2026',
    tesih2: 'tesi-h2',
    tera: 'tesi-h2-tera',
  };
  return fileMap[bikeId] || bikeId;
}

/**
 * Fetches specification data from the JSON sheet.
 */
async function fetchSpecData(bikeId) {
  const fileName = bikeIdToFileName(bikeId);
  const resp = await fetch(`/specifications/${fileName}.json`);
  if (!resp.ok) return null;
  return resp.json();
}

/**
 * Renders spec data into the block DOM matching the original structure.
 */
function renderSpecData(block, specData, heading) {
  block.innerHTML = '';

  const tableHeader = document.createElement('div');
  tableHeader.innerHTML = `<div>${heading}</div>`;
  block.append(tableHeader);

  const dataContainer = document.createElement('div');
  dataContainer.classList.add('st-data-container');

  const data = [];
  specData.forEach((row) => {
    if (row.Category) {
      const categoryEl = document.createElement('div');
      categoryEl.classList.add('h6', 'st-category');
      categoryEl.textContent = row.Category;
      data.push({ category: categoryEl, categoryData: [] });
    }

    if (data.length === 0) {
      const categoryEl = document.createElement('div');
      categoryEl.classList.add('h6', 'st-category');
      data.push({ category: categoryEl, categoryData: [] });
    }

    const labelEl = document.createElement('div');
    labelEl.classList.add('st-label');
    if (row.Label) {
      labelEl.innerHTML = `<p><strong>${row.Label}</strong></p>`;
    }

    const valueEl = document.createElement('div');
    valueEl.classList.add('st-value');
    if (row.Value) {
      const lines = row.Value.split('\n');
      valueEl.innerHTML = lines.map((line) => `<p>${line}</p>`).join('');
    }

    data.at(-1).categoryData.push({ label: labelEl, value: valueEl });
  });

  data.forEach((categoryRow) => {
    const categoryWrapper = document.createElement('div');
    categoryWrapper.classList.add('st-category-wrapper');
    categoryWrapper.append(categoryRow.category);

    const categoryDataWrapper = document.createElement('div');
    categoryDataWrapper.classList.add('st-category-data-wrapper');
    categoryRow.categoryData.forEach((el) => {
      const wrapper = document.createElement('div');
      wrapper.append(el.label, el.value);
      categoryDataWrapper.append(wrapper);
    });
    categoryWrapper.append(categoryDataWrapper);
    dataContainer.append(categoryWrapper);
  });

  block.append(dataContainer);
}

/**
 * Falls back to the original static rendering when no JSON sheet is available.
 */
function renderStatic(block) {
  const tableHeader = block.querySelector(':scope > div > div');
  tableHeader.querySelector('h1, h2, h3, h4, h5, h6').classList.add('h3', 'st-heading');

  const data = [];

  block.querySelectorAll(':scope > div:not(:first-child)').forEach((dataRow) => {
    const [category, label, value] = dataRow.querySelectorAll(':scope > div');

    if (category.textContent.trim()) {
      category.classList.add('h6', 'st-category');
      data.push({ category, categoryData: [] });
    }

    label.classList.add('st-label');
    value.classList.add('st-value');

    data.at(-1).categoryData.push({ label, value });
  });

  block.innerHTML = '';
  block.append(tableHeader);

  const dataContainer = document.createElement('div');
  dataContainer.classList.add('st-data-container');

  data.forEach((categoryRow) => {
    const categoryWrapper = document.createElement('div');
    categoryWrapper.classList.add('st-category-wrapper');
    categoryWrapper.append(categoryRow.category);

    const categoryDataWrapper = document.createElement('div');
    categoryDataWrapper.classList.add('st-category-data-wrapper');
    categoryRow.categoryData.forEach((el) => {
      const wrapper = document.createElement('div');
      wrapper.append(el.label, el.value);
      categoryDataWrapper.append(wrapper);
    });
    categoryWrapper.append(categoryDataWrapper);
    dataContainer.append(categoryWrapper);
  });
  block.append(dataContainer);
}

export default async function decorate(block) {
  const bikeId = getBikeId(block);

  if (!bikeId) {
    renderStatic(block);
    return;
  }

  const headingEl = block.querySelector('h1, h2, h3, h4, h5, h6');
  const heading = headingEl ? headingEl.outerHTML : '';

  try {
    const allData = await fetchSpecData(bikeId);
    if (!allData) {
      renderStatic(block);
      return;
    }

    const lang = getLanguage();
    const sheetLang = resolveSheetLanguage(lang);
    const langData = allData[sheetLang] || allData.en;

    if (!langData || !langData.data) {
      renderStatic(block);
      return;
    }

    renderSpecData(block, langData.data, heading);
  } catch {
    renderStatic(block);
  }
}
