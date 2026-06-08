/**
 * Extracts country and language from the current page URL path.
 * URL pattern: /{country}/{language}/page
 */
function getLocaleInfo() {
  const pathTokens = window.location.pathname.split('/');
  return {
    country: pathTokens.length >= 2 ? pathTokens[1] : '',
    language: pathTokens.length >= 3 ? pathTokens[2] : 'en',
  };
}

/**
 * Resolves the best matching sheet from the available sheets.
 * Tries in order:
 *   1. Country code (e.g. "za") — for country-specific overrides
 *   2. Exact language match (e.g. "fr-ca")
 *   3. Base language (e.g. "fr" from "fr-ca")
 *   4. Fallback to "en"
 *
 * This means authors can add a new country tab to the spreadsheet
 * and it will be picked up automatically without code changes.
 */
function resolveSheetLanguage(country, lang, availableSheets) {
  if (country && availableSheets[country]) return country;

  if (availableSheets[lang]) return lang;

  const baseLang = lang.split('-')[0];
  if (availableSheets[baseLang]) return baseLang;

  return 'en';
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
 * Maps bike IDs to their display names.
 */
function bikeIdToDisplayName(bikeId) {
  const nameMap = {
    kb4: 'KB4',
    kb4rc: 'KB4RC',
    kb998: 'KB998 Rimini',
    kb399: 'KB399',
    bx450: 'BX450',
    bx4502026: 'BX450 2026',
    tesih2: 'TESI H2',
    tera: 'Tesi H2 TERA',
  };
  return nameMap[bikeId] || bikeId.toUpperCase();
}

/**
 * Returns the translated "Technical Information" heading for the current language.
 * Resolves by exact match first, then base language, then English fallback.
 */
function getTechInfoLabel(lang) {
  const labels = {
    en: 'Technical Information',
    it: 'Informazioni Tecniche',
    fr: 'Informations techniques',
    de: 'Technische Informationen',
    ja: '主要諸元',
    es: 'Información técnica',
    nl: 'Technische Specificatie',
    pt: 'Informações Técnicas',
  };
  if (labels[lang]) return labels[lang];
  const baseLang = lang.split('-')[0];
  return labels[baseLang] || labels.en;
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
function renderSpecData(block, specData, bikeName, sheetLang) {
  block.innerHTML = '';

  const tableHeader = document.createElement('div');
  const techLabel = getTechInfoLabel(sheetLang);
  tableHeader.innerHTML = `<div><h3 class="h3 st-heading">${bikeName}</h3><hr><p>${techLabel}</p></div>`;
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
  if (!tableHeader) return;

  const headingEl = tableHeader.querySelector('h1, h2, h3, h4, h5, h6');
  if (headingEl) headingEl.classList.add('h3', 'st-heading');

  const dataRows = block.querySelectorAll(':scope > div:not(:first-child)');
  if (dataRows.length === 0) return;

  const data = [];

  dataRows.forEach((dataRow) => {
    const [category, label, value] = dataRow.querySelectorAll(':scope > div');
    if (!label || !value) return;

    if (category && category.textContent.trim()) {
      category.classList.add('h6', 'st-category');
      data.push({ category, categoryData: [] });
    }

    if (data.length === 0) return;

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
  if (!block) return;

  const bikeId = getBikeId(block);

  if (!bikeId) {
    renderStatic(block);
    return;
  }

  try {
    const allData = await fetchSpecData(bikeId);
    if (!allData) {
      renderStatic(block);
      return;
    }

    const { country, language } = getLocaleInfo();
    const sheetLang = resolveSheetLanguage(country, language, allData);
    const langData = allData[sheetLang] || allData.en;

    if (!langData || !langData.data || langData.data.length === 0) {
      renderStatic(block);
      return;
    }

    const bikeName = bikeIdToDisplayName(bikeId);
    renderSpecData(block, langData.data, bikeName, sheetLang);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('specification-table: failed to load spec data', e);
    renderStatic(block);
  }
}
