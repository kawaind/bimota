import {
  addSwiping,
  createElement,
  fetchLanguageConfig,
  labelWithContext,
} from '../../scripts/helpers.js';

const blockName = 'vehicle-selector-new';

// Optional author-editable overrides live in this sheet of /lanconfig.json
// (a `Key` column plus one column per language code). Any key or language not
// found there falls back to the internal dictionary below, so the block never
// depends on the sheet existing.
const LABEL_SHEET = 'vehicle-selector-new';

// Internal dictionary, keyed by the page language (document.documentElement.lang).
// {x}, {y}, {model} and {position} are filled in at render time.
const DICTIONARY = {
  en: {
    regionLabel: 'Vehicle Model Selector',
    tablistLabel: 'Select a vehicle model',
    previousModel: 'Previous model',
    nextModel: 'Next model',
    carouselRoleDescription: 'carousel',
    slideRoleDescription: 'slide',
    slidePosition: '{x} of {y}',
    imageAlt: 'Image of {model}',
    slideStatus: '{model}, {position}',
    separator: ',',
  },
  it: {
    regionLabel: 'Selettore del modello di veicolo',
    tablistLabel: 'Seleziona un modello di veicolo',
    previousModel: 'Modello precedente',
    nextModel: 'Modello successivo',
    carouselRoleDescription: 'carosello',
    slideRoleDescription: 'diapositiva',
    slidePosition: '{x} di {y}',
    imageAlt: 'Immagine di {model}',
  },
  fr: {
    regionLabel: 'Sélecteur de modèle de véhicule',
    tablistLabel: 'Sélectionnez un modèle de véhicule',
    previousModel: 'Modèle précédent',
    nextModel: 'Modèle suivant',
    carouselRoleDescription: 'carrousel',
    slideRoleDescription: 'diapositive',
    slidePosition: '{x} sur {y}',
    imageAlt: 'Image de {model}',
  },
  de: {
    regionLabel: 'Fahrzeugmodell-Auswahl',
    tablistLabel: 'Wählen Sie ein Fahrzeugmodell',
    previousModel: 'Vorheriges Modell',
    nextModel: 'Nächstes Modell',
    carouselRoleDescription: 'Karussell',
    slideRoleDescription: 'Folie',
    slidePosition: '{x} von {y}',
    imageAlt: 'Bild von {model}',
  },
  nl: {
    regionLabel: 'Voertuigmodelkiezer',
    tablistLabel: 'Selecteer een voertuigmodel',
    previousModel: 'Vorig model',
    nextModel: 'Volgend model',
    carouselRoleDescription: 'carrousel',
    slideRoleDescription: 'dia',
    slidePosition: '{x} van {y}',
    imageAlt: 'Afbeelding van {model}',
  },
  es: {
    regionLabel: 'Selector de modelo de vehículo',
    tablistLabel: 'Selecciona un modelo de vehículo',
    previousModel: 'Modelo anterior',
    nextModel: 'Modelo siguiente',
    carouselRoleDescription: 'carrusel',
    slideRoleDescription: 'diapositiva',
    slidePosition: '{x} de {y}',
    imageAlt: 'Imagen de {model}',
  },
  ja: {
    regionLabel: '車両モデルセレクター',
    tablistLabel: '車両モデルを選択',
    previousModel: '前のモデル',
    nextModel: '次のモデル',
    carouselRoleDescription: 'カルーセル',
    slideRoleDescription: 'スライド',
    slidePosition: '{y} 枚中 {x} 枚目',
    imageAlt: '{model}の画像',
    slideStatus: '{model}、{position}',
    separator: '、',
  },
  lu: {
    regionLabel: 'Gefierermodell-Auswiel',
    tablistLabel: 'Wielt e Gefierermodell',
    previousModel: 'Viregt Modell',
    nextModel: 'Nächst Modell',
    carouselRoleDescription: 'Karussell',
    slideRoleDescription: 'Folie',
    slidePosition: '{x} vun {y}',
    imageAlt: 'Bild vum {model}',
  },
};

const FOCUSABLE = 'a[href], button, input, select, textarea, [tabindex]';

const ARROW_ICONS = {
  prev: '<svg viewBox="0 0 24 24" width="24" height="24" focusable="false"><path d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z" fill="currentColor"/></svg>',
  next: '<svg viewBox="0 0 24 24" width="24" height="24" focusable="false"><path d="M8.59 16.59 10 18l6-6-6-6-1.41 1.41L13.17 12z" fill="currentColor"/></svg>',
};

let instanceCount = 0;

const format = (template, values) => Object.entries(values)
  .reduce((text, [key, value]) => text.replaceAll(`{${key}}`, value), template);

const getLanguage = () => (document.documentElement.lang || 'en').toLowerCase().split('-')[0];

const getBaseLabels = (lang) => ({ ...DICTIONARY.en, ...(DICTIONARY[lang] || {}) });

/**
 * Overlay any author-supplied translations from the lanconfig sheet on top of
 * the internal dictionary. Returns the base labels unchanged if the sheet is
 * missing or the request fails.
 * @param {string} lang page language
 * @param {Object} base labels from the internal dictionary
 * @returns {Promise<Object>} the resolved labels
 */
const getAuthoredLabels = async (lang, base) => {
  const config = await fetchLanguageConfig();
  const rows = config?.[LABEL_SHEET]?.data;
  if (!Array.isArray(rows)) return base;
  const labels = { ...base };
  rows.forEach((row) => {
    const key = row.Key || row.key;
    const value = `${row[lang] ?? ''}`.trim();
    if (key && key in base && value) labels[key] = value;
  });
  return labels;
};

/**
 * Read one authored row: column 1 model name, column 2 image, column 3 the
 * specifications (odd lines = titles, even lines = values) and a CTA link.
 * A trailing unpaired line (e.g. a footnote) is kept as a note.
 * @param {Element} row the authored block row
 */
const parseRow = (row) => {
  const [nameCell, imageCell, specCell] = [...row.children];
  const model = nameCell?.textContent.trim().replace(/\s+/g, ' ') || '';
  const picture = imageCell?.querySelector('picture') || null;
  const link = specCell?.querySelector('a[href]') || null;
  const lines = specCell
    ? [...specCell.children].filter((el) => !link || !el.contains(link))
    : [];
  const specs = [];
  let note = null;
  for (let i = 0; i < lines.length; i += 2) {
    if (lines[i + 1]) specs.push({ title: lines[i], value: lines[i + 1] });
    else note = lines[i];
  }
  return {
    model, picture, link, specs, note,
  };
};

const buildSpecs = (specs) => {
  const list = createElement('dl', { classes: `${blockName}-specs` });
  specs.forEach(({ title, value }) => {
    const group = createElement('div', { classes: `${blockName}-spec` });
    const dt = createElement('dt', { classes: `${blockName}-spec-title` });
    const dd = createElement('dd', { classes: `${blockName}-spec-value` });
    dt.append(...title.childNodes);
    dd.append(...value.childNodes);
    group.append(dt, dd);
    list.append(group);
  });
  return list;
};

let svgIdCount = 0;

/**
 * Give every id inside an inline SVG a unique suffix and update the
 * `url(#id)` / `#id` references that point at them. The same icon is inlined
 * in every slide, so shared ids (e.g. a clipPath) would all resolve to the
 * first copy — which sits in a hidden slide, making the icon disappear.
 * @param {SVGElement} svg the inline SVG
 */
const uniquifySvgIds = (svg) => {
  svgIdCount += 1;
  const nodes = [svg, ...svg.querySelectorAll('*')];
  svg.querySelectorAll('[id]').forEach((el) => {
    const oldId = el.id;
    const newId = `${oldId}-vsn${svgIdCount}`;
    el.id = newId;
    nodes.forEach((node) => {
      [...node.attributes].forEach((attr) => {
        if (attr.value.includes(`#${oldId}`)) {
          node.setAttribute(attr.name, attr.value
            .replaceAll(`url(#${oldId})`, `url(#${newId})`)
            .replace(new RegExp(`^#${oldId}$`), `#${newId}`));
        }
      });
    });
  });
};

/**
 * Apply uniquifySvgIds to an inline icon, waiting for its SVG if the icon
 * decorator has not fetched and inserted it yet.
 * @param {Element} icon the icon span
 */
const fixIconIds = (icon) => {
  const run = () => {
    const svg = icon.querySelector('svg');
    if (svg) uniquifySvgIds(svg);
    return !!svg;
  };
  if (run()) return;
  const observer = new MutationObserver(() => {
    if (run()) observer.disconnect();
  });
  observer.observe(icon, { childList: true, subtree: true });
};

const buildCta = (link) => {
  const wrapper = createElement('p', { classes: `${blockName}-cta` });
  link.className = `${blockName}-cta-link`;
  // decorateButtons() copies the text into `title`; it only duplicates the name.
  link.removeAttribute('title');
  // Unwrap an authored <em>/<strong> so the icon and text sit directly in the link.
  link.querySelectorAll(':scope > em, :scope > strong').forEach((el) => el.replaceWith(...el.childNodes));
  // Icons are decorative (inline icons keep only their `icon-<name>` class).
  link.querySelectorAll('.icon, [class*="icon-"], svg, img')
    .forEach((icon) => icon.setAttribute('aria-hidden', 'true'));
  link.querySelectorAll('[class*="icon-"]').forEach(fixIconIds);
  wrapper.append(link);
  return wrapper;
};

export default function decorate(block) {
  instanceCount += 1;
  const uid = `${blockName}-${instanceCount}`;
  const lang = getLanguage();
  const slides = [...block.children].map(parseRow).filter((slide) => slide.model);
  if (!slides.length) return;

  const total = slides.length;
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  // Region landmark for the whole component (APG Carousel pattern).
  const section = createElement('section', {
    classes: `${blockName}-region`,
    props: { role: 'region' },
  });
  const tablist = createElement('div', {
    classes: `${blockName}-tablist`,
    props: { role: 'tablist' },
  });
  const stage = createElement('div', { classes: `${blockName}-stage` });
  const track = createElement('div', {
    classes: `${blockName}-track`,
    props: { id: `${uid}-track`, 'aria-live': 'polite' },
  });
  // Short confirmation read by the live region when the arrows change slide.
  const status = createElement('p', { classes: [`${blockName}-status`, `${blockName}-sr-only`] });
  track.append(status);

  const tabs = slides.map((slide, i) => {
    const tab = createElement('button', {
      classes: `${blockName}-tab`,
      props: {
        type: 'button',
        role: 'tab',
        id: `${uid}-tab-${i}`,
        'aria-controls': `${uid}-panel-${i}`,
      },
    });
    tab.textContent = slide.model;
    tablist.append(tab);
    return tab;
  });

  const panels = slides.map((slide, i) => {
    const panel = createElement('div', {
      classes: `${blockName}-panel`,
      props: { role: 'tabpanel', id: `${uid}-panel-${i}` },
    });

    // Slide heading for heading navigation; the tab already shows the name.
    const heading = createElement('h3', { classes: [`${blockName}-heading`, `${blockName}-sr-only`] });
    heading.textContent = slide.model;

    const media = createElement('div', { classes: `${blockName}-media` });
    if (slide.picture) {
      const img = slide.picture.querySelector('img');
      if (img && !img.getAttribute('alt')?.trim()) img.dataset.generatedAlt = '';
      media.append(slide.picture);
    }

    // Details row: specifications (+ optional note) fill columns 1–3 and the
    // CTA sits in column 4, so reading order matches the visual order.
    const details = createElement('div', { classes: `${blockName}-details` });
    const info = createElement('div', { classes: `${blockName}-info` });
    if (slide.specs.length) info.append(buildSpecs(slide.specs));
    if (slide.note) {
      const note = createElement('p', { classes: `${blockName}-note` });
      note.append(...slide.note.childNodes);
      info.append(note);
    }
    if (info.childElementCount) details.append(info);
    if (slide.link) details.append(buildCta(slide.link));

    panel.append(heading, media, details);
    track.append(panel);
    return panel;
  });

  let prevButton = null;
  let nextButton = null;
  if (total > 1) {
    const controls = createElement('div', { classes: `${blockName}-controls` });
    const makeArrow = (direction) => {
      const button = createElement('button', {
        classes: [`${blockName}-arrow`, `${blockName}-arrow-${direction}`],
        props: { type: 'button', 'aria-controls': track.id },
      });
      const icon = createElement('span', { props: { 'aria-hidden': 'true' } });
      icon.innerHTML = ARROW_ICONS[direction];
      button.append(icon);
      controls.append(button);
      return button;
    };
    prevButton = makeArrow('prev');
    nextButton = makeArrow('next');
    // DOM order gives the Tab sequence: selected tab -> Previous -> Next -> CTA.
    stage.append(controls);
  }
  stage.append(track);
  section.append(tablist, stage);
  block.replaceChildren(section);

  let labels = getBaseLabels(lang);
  let active = 0;
  let liveTimer;
  let statusTimer;

  const applyLabels = () => {
    section.setAttribute('aria-roledescription', labels.carouselRoleDescription);
    section.setAttribute('aria-label', labels.regionLabel);
    tablist.setAttribute('aria-label', labels.tablistLabel);
    prevButton?.setAttribute('aria-label', labels.previousModel);
    nextButton?.setAttribute('aria-label', labels.nextModel);
    panels.forEach((panel, i) => {
      panel.setAttribute('aria-roledescription', labels.slideRoleDescription);
      // Named "1 of 5, Tesi H2": the position, then its tab (aria-labelledby).
      labelWithContext(panel, tabs[i], {
        label: format(labels.slidePosition, { x: i + 1, y: total }),
        separator: labels.separator,
      });
      const img = panel.querySelector(`.${blockName}-media img`);
      if (img?.dataset.generatedAlt !== undefined) {
        img.alt = format(labels.imageAlt, { model: slides[i].model });
      }
      // CTA named "<author text>, <model>" (e.g. "Explore, Tesi H2").
      const cta = panel.querySelector(`.${blockName}-cta-link`);
      if (cta) labelWithContext(cta, tabs[i], { separator: labels.separator });
    });
  };

  const centerTab = (tab) => {
    if (tablist.scrollWidth <= tablist.clientWidth) return;
    tablist.scrollTo({
      left: tab.offsetLeft - (tablist.clientWidth - tab.offsetWidth) / 2,
      behavior: prefersReducedMotion.matches ? 'auto' : 'smooth',
    });
  };

  /**
   * Show a slide. Tab-driven changes move focus to the new tab, which already
   * announces the change, so the live region is muted for that update to
   * avoid a second, overlapping announcement. Arrow/swipe changes keep focus on
   * the control, so the live region stays polite and speaks a short status.
   * The carousel is finite: the index is clamped to the first/last slide
   * (no wrap-around), and Previous/Next are disabled at the ends.
   * @param {number} index slide to show
   * @param {Object} [options]
   * @param {boolean} [options.focusTab=false] move focus to the new tab
   * @param {boolean} [options.announce=false] announce via the live region
   */
  const setActive = (index, { focusTab = false, announce = false } = {}) => {
    active = Math.min(Math.max(index, 0), total - 1);

    clearTimeout(liveTimer);
    clearTimeout(statusTimer);
    track.setAttribute('aria-live', announce ? 'polite' : 'off');

    tabs.forEach((tab, i) => {
      const selected = i === active;
      tab.setAttribute('aria-selected', selected ? 'true' : 'false');
      tab.setAttribute('tabindex', selected ? '0' : '-1');
    });

    panels.forEach((panel, i) => {
      const isActive = i === active;
      // Linear position in the finite sequence: slides only ever move one way
      // across the strip, never jump from one side to the other.
      const offset = i - active;
      panel.style.setProperty('--vsn-offset', offset);
      panel.classList.toggle('is-active', isActive);
      panel.classList.toggle('is-adjacent', !isActive && Math.abs(offset) === 1);
      panel.setAttribute('aria-hidden', isActive ? 'false' : 'true');

      // Inactive slides: take every interactive element out of the tab order.
      const focusables = [...panel.querySelectorAll(FOCUSABLE)]
        .filter((el) => el !== panel);
      focusables.forEach((el) => {
        if (isActive) el.removeAttribute('tabindex');
        else el.setAttribute('tabindex', '-1');
      });
      // A slide without a CTA has nothing focusable, so the panel itself is
      // made reachable by Tab (APG Tabs); with a CTA the link is the stop.
      if (isActive && !focusables.length) panel.setAttribute('tabindex', '0');
      else panel.removeAttribute('tabindex');
    });

    // Disable Previous on the first slide and Next on the last. A disabled
    // button cannot hold focus, so if the arrow the user just pressed becomes
    // disabled, focus moves to the other arrow instead of being dropped.
    const focusedArrow = document.activeElement;
    [[prevButton, active === 0], [nextButton, active === total - 1]]
      .forEach(([button, atEnd]) => {
        if (!button) return;
        button.disabled = atEnd;
        button.setAttribute('aria-disabled', atEnd ? 'true' : 'false');
      });
    if (focusedArrow?.disabled) {
      (focusedArrow === prevButton ? nextButton : prevButton)?.focus();
    }

    centerTab(tabs[active]);
    if (focusTab) tabs[active].focus();

    if (announce) {
      status.textContent = format(labels.slideStatus, {
        model: slides[active].model,
        position: format(labels.slidePosition, { x: active + 1, y: total }),
      });
      // Clear afterwards so browse mode does not read a stale message later.
      statusTimer = setTimeout(() => { status.textContent = ''; }, 2000);
    } else {
      status.textContent = '';
      liveTimer = setTimeout(() => track.setAttribute('aria-live', 'polite'), 300);
    }
  };

  tabs.forEach((tab, i) => tab.addEventListener('click', () => setActive(i)));

  // Automatic activation: arrow keys move focus and show the slide; Home/End
  // jump to the first/last tab. Enter/Space are native button activation.
  tablist.addEventListener('keydown', (event) => {
    const current = tabs.indexOf(document.activeElement);
    if (current === -1) return;
    let target;
    switch (event.key) {
      // Finite: Left on the first tab / Right on the last tab do nothing.
      case 'ArrowRight': target = Math.min(current + 1, total - 1); break;
      case 'ArrowLeft': target = Math.max(current - 1, 0); break;
      case 'Home': target = 0; break;
      case 'End': target = total - 1; break;
      default: return;
    }
    event.preventDefault();
    if (target !== current) setActive(target, { focusTab: true });
  });

  // Step one slide; ignored at the ends so nothing is re-announced.
  const step = (delta) => {
    const target = active + delta;
    if (target < 0 || target > total - 1) return;
    setActive(target, { announce: true });
  };
  prevButton?.addEventListener('click', () => step(-1));
  nextButton?.addEventListener('click', () => step(1));
  if (total > 1) {
    addSwiping(track, (direction) => step(direction === 'next' ? 1 : -1));
  }

  applyLabels();
  setActive(0);

  getAuthoredLabels(lang, labels).then((resolved) => {
    labels = resolved;
    applyLabels();
  });
}
