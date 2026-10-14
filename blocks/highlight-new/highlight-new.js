import { fetchPlaceholders } from '../../scripts/aem.js';
import { createElement, labelWithContext } from '../../scripts/helpers.js';

const DEFAULT_SECONDS = 8;
const SLIDE_DURATION_MS = 800;
const HEADINGS = 'h1, h2, h3, h4, h5, h6';
const FOCUSABLE = 'a[href], button, input, select, textarea, [tabindex]';

/*
 * Screen-reader / control labels, in the page language (WCAG 3.1.2: names must
 * be in the language of the page). Authors can override any of them from the
 * site placeholders sheet (/placeholders.json, read with fetchPlaceholders())
 * by adding a row whose Key is the placeholder key followed by the language in
 * brackets, e.g. "Highlight new next (it)" -> "Diapositiva successiva". English
 * rows may omit the language ("Highlight new next").
 */
const LABELS = {
  en: {
    carousel: 'Highlighted content',
    carouselRole: 'carousel',
    slideRole: 'slide',
    slideCounter: '{x} of {y}',
    controls: 'Carousel controls',
    pause: 'Pause automatic rotation',
    start: 'Start automatic rotation',
    previous: 'Previous slide',
    next: 'Next slide',
  },
  es: {
    carousel: 'Contenido destacado',
    carouselRole: 'carrusel',
    slideRole: 'diapositiva',
    slideCounter: '{x} de {y}',
    controls: 'Controles del carrusel',
    pause: 'Pausar la rotación automática',
    start: 'Iniciar la rotación automática',
    previous: 'Diapositiva anterior',
    next: 'Diapositiva siguiente',
  },
  it: {
    carousel: 'Contenuto in evidenza',
    carouselRole: 'carosello',
    slideRole: 'diapositiva',
    slideCounter: '{x} di {y}',
    controls: 'Controlli del carosello',
    pause: 'Metti in pausa la rotazione automatica',
    start: 'Avvia la rotazione automatica',
    previous: 'Diapositiva precedente',
    next: 'Diapositiva successiva',
  },
  fr: {
    carousel: 'Contenu mis en avant',
    carouselRole: 'carrousel',
    slideRole: 'diapositive',
    slideCounter: '{x} sur {y}',
    controls: 'Commandes du carrousel',
    pause: 'Mettre en pause la rotation automatique',
    start: 'Démarrer la rotation automatique',
    previous: 'Diapositive précédente',
    next: 'Diapositive suivante',
  },
  de: {
    carousel: 'Hervorgehobene Inhalte',
    carouselRole: 'Karussell',
    slideRole: 'Folie',
    slideCounter: '{x} von {y}',
    controls: 'Karussell-Steuerung',
    pause: 'Automatische Rotation anhalten',
    start: 'Automatische Rotation starten',
    previous: 'Vorherige Folie',
    next: 'Nächste Folie',
  },
  nl: {
    carousel: 'Uitgelichte inhoud',
    carouselRole: 'carrousel',
    slideRole: 'dia',
    slideCounter: '{x} van {y}',
    controls: 'Carrouselbediening',
    pause: 'Automatische rotatie pauzeren',
    start: 'Automatische rotatie starten',
    previous: 'Vorige dia',
    next: 'Volgende dia',
  },
  ja: {
    carousel: '注目のコンテンツ',
    carouselRole: 'カルーセル',
    slideRole: 'スライド',
    slideCounter: '{y}枚中{x}枚目',
    controls: 'カルーセルの操作',
    pause: '自動再生を一時停止',
    start: '自動再生を開始',
    previous: '前のスライド',
    next: '次のスライド',
  },
};

// placeholder key (as camel-cased by fetchPlaceholders) for each label
const PLACEHOLDER_KEYS = {
  carousel: 'highlightNewCarousel',
  carouselRole: 'highlightNewCarouselRole',
  slideRole: 'highlightNewSlideRole',
  slideCounter: 'highlightNewSlideCounter',
  controls: 'highlightNewControls',
  pause: 'highlightNewPause',
  start: 'highlightNewStart',
  previous: 'highlightNewPrevious',
  next: 'highlightNewNext',
};

const ICONS = {
  pause: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="6" y="5" width="4" height="14" fill="currentColor"/><rect x="14" y="5" width="4" height="14" fill="currentColor"/></svg>',
  play: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>',
  previous: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M15.4 7.4 14 6l-6 6 6 6 1.4-1.4-4.6-4.6z" fill="currentColor"/></svg>',
  next: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M8.6 7.4 10 6l6 6-6 6-1.4-1.4 4.6-4.6z" fill="currentColor"/></svg>',
};

const FLAG = `<svg viewBox="0 0 100 80" aria-hidden="true" focusable="false">
  <rect width="14.2857" height="80" fill="#ED1C24"/>
  <rect x="28.5714" width="14.2857" height="80" fill="#ED1C24"/>
  <rect x="57.1429" width="14.2857" height="80" fill="#FFFFFF"/>
  <rect x="85.7143" width="14.2857" height="80" fill="#FFFFFF"/>
</svg>`;

const getLanguage = () => (document.documentElement.lang || 'en').toLowerCase().split('-')[0];

const getLabels = async () => {
  const lang = getLanguage();
  const labels = { ...LABELS.en, ...LABELS[lang] };
  const placeholders = await fetchPlaceholders();
  const langSuffix = lang.charAt(0).toUpperCase() + lang.slice(1);
  Object.entries(PLACEHOLDER_KEYS).forEach(([name, key]) => {
    const value = placeholders[`${key}${langSuffix}`] || (lang === 'en' ? placeholders[key] : '');
    if (value) labels[name] = value;
  });
  return labels;
};

// "time-8" -> 8, "time-2-5" -> 2.5 (the delay before each slide moves on)
const getSeconds = (block) => {
  const timeClass = [...block.classList].find((c) => /^time-\d/.test(c));
  const seconds = Number(timeClass?.slice(5).replace('-', '.'));
  return seconds > 0 ? seconds : DEFAULT_SECONDS;
};

const formatCounter = (template, x, y) => template.replace('{x}', x).replace('{y}', y);

/**
 * Rebuild an authored slide cell into a fixed structure, whatever the author
 * typed: one semantic <h3 class="h1 slide-title"> followed by the body copy as
 * <p class="h6 slide-body">. The title is the first heading of any level, or,
 * when there is none, a bold/underlined lead-in at the start of the first
 * paragraph (or else the whole first paragraph). Further headings become body
 * paragraphs, so authors can't change the heading outline or the visual scale.
 * @param {Element} cell the authored cell
 * @returns {{title: HTMLElement|null, body: HTMLElement[]}}
 */
const normaliseSlide = (cell) => {
  // wrap loose text / inline nodes into paragraphs
  let looseP = null;
  [...cell.childNodes].forEach((node) => {
    const isBlock = node.nodeType === Node.ELEMENT_NODE
      && node.matches(`p, ul, ol, div, picture, ${HEADINGS}`);
    if (isBlock || (node.nodeType === Node.TEXT_NODE && !node.textContent.trim())) {
      looseP = null;
      return;
    }
    if (!looseP) {
      looseP = document.createElement('p');
      node.before(looseP);
    }
    looseP.append(node);
  });

  let titleText = '';
  const heading = cell.querySelector(HEADINGS);
  if (heading) {
    titleText = heading.textContent;
    heading.remove();
  } else {
    const firstP = cell.querySelector('p');
    const lead = firstP?.firstElementChild;
    const leadIsFirst = lead && lead.matches('strong, b, u')
      && ![...firstP.childNodes].slice(0, [...firstP.childNodes].indexOf(lead))
        .some((n) => n.textContent.trim());
    if (leadIsFirst && lead.textContent.trim() !== firstP.textContent.trim()) {
      titleText = lead.textContent;
      lead.remove();
      // drop the line break(s) that separated the lead-in from the body
      const isLeadingGap = (n) => n && (n.nodeName === 'BR'
        || (n.nodeType === Node.TEXT_NODE && !n.textContent.trim()));
      while (isLeadingGap(firstP.firstChild)) firstP.firstChild.remove();
    } else if (firstP) {
      titleText = firstP.textContent;
      firstP.remove();
    }
  }

  let title = null;
  titleText = titleText.replace(/\s+/g, ' ').trim();
  if (titleText) {
    title = createElement('h3', { classes: ['h1', 'slide-title'] });
    title.textContent = titleText;
  }

  const body = [];
  cell.querySelectorAll(`:scope > :is(p, ul, ol, div, ${HEADINGS})`).forEach((el) => {
    if (el.matches('p.button-container')) {
      body.push(el);
      return;
    }
    if (el.matches('ul, ol')) {
      el.className = 'h6 slide-body';
      body.push(el);
      return;
    }
    if (!el.textContent.trim()) return;
    const p = createElement('p', { classes: ['h6', 'slide-body'] });
    if (el.matches(HEADINGS)) p.textContent = el.textContent.trim();
    else p.append(...el.childNodes);
    body.push(p);
  });
  return { title, body };
};

const buildControls = (labels) => {
  const controls = createElement('div', {
    classes: 'highlight-new-controls',
    props: { role: 'group', 'aria-label': labels.controls },
  });
  const makeButton = (name, label, icon) => {
    const button = createElement('button', {
      classes: ['highlight-new-control', `highlight-new-control-${name}`],
      props: { type: 'button', 'aria-label': label },
    });
    button.innerHTML = icon;
    return button;
  };
  const playButton = makeButton('play', labels.pause, ICONS.pause);
  const prevButton = makeButton('previous', labels.previous, ICONS.previous);
  const nextButton = makeButton('next', labels.next, ICONS.next);
  controls.append(playButton, prevButton, nextButton);
  return {
    controls, playButton, prevButton, nextButton,
  };
};

// hidden slides: out of the accessibility tree and the tab order
const setSlideActive = (slide, active) => {
  slide.classList.toggle('is-active', active);
  slide.setAttribute('aria-hidden', active ? 'false' : 'true');
  slide.inert = !active;
  slide.querySelectorAll(FOCUSABLE).forEach((el) => {
    if (active) {
      if (el.dataset.hnTabindex === undefined) return;
      if (el.dataset.hnTabindex) el.setAttribute('tabindex', el.dataset.hnTabindex);
      else el.removeAttribute('tabindex');
      delete el.dataset.hnTabindex;
    } else {
      if (el.dataset.hnTabindex === undefined) {
        el.dataset.hnTabindex = el.getAttribute('tabindex') || '';
      }
      el.setAttribute('tabindex', '-1');
    }
  });
};

export default async function decorate(block) {
  const labels = await getLabels();
  const rotationMs = getSeconds(block) * 1000;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  const [mediaRow, ...slideRows] = [...block.children];

  // full-bleed so the image can grow to the full screen width; buttons use the
  // site's dark (over-image) theme
  block.classList.add('full-width', 'dark');
  block.parentElement?.classList.add('wrapper-full-width');

  // decorative background (the information is in the slides): WCAG 1.1.1
  const media = createElement('div', { classes: 'highlight-new-media', props: { 'aria-hidden': 'true' } });
  const picture = mediaRow?.querySelector('picture');
  if (picture) {
    const img = picture.querySelector('img');
    img?.setAttribute('alt', '');
    img?.setAttribute('aria-hidden', 'true');
    media.append(picture);
  }

  const slidesContainer = createElement('div', { classes: 'highlight-new-slides' });
  const viewport = createElement('div', { classes: 'highlight-new-viewport' });
  slidesContainer.append(viewport);

  const slides = [];
  slideRows.forEach((row) => {
    const cell = row.querySelector(':scope > div') || row;
    const { title, body } = normaliseSlide(cell);
    if (!title && !body.length) return;
    const slide = createElement('div', { classes: 'highlight-new-slide' });
    if (title) slide.append(title);
    slide.append(...body);
    // CTAs read "<CTA text>, <slide title>" (WCAG 2.4.6), as elsewhere on the site
    if (title) slide.querySelectorAll('a.button').forEach((link) => labelWithContext(link, title));
    slides.push(slide);
  });
  viewport.append(...slides);

  const flag = createElement('div', { classes: 'highlight-new-flag', props: { 'aria-hidden': 'true' } });
  flag.innerHTML = FLAG;

  block.setAttribute('role', 'region');
  block.setAttribute('aria-label', labels.carousel);
  block.replaceChildren(media);

  const total = slides.length;
  if (total < 2) {
    // a single slide is not a carousel: no controls, no rotation
    block.append(slidesContainer, flag);
    slides.forEach((slide) => setSlideActive(slide, true));
  } else {
    block.setAttribute('aria-roledescription', labels.carouselRole);
    slides.forEach((slide, i) => {
      slide.setAttribute('role', 'group');
      slide.setAttribute('aria-roledescription', labels.slideRole);
      slide.setAttribute('aria-label', formatCounter(labels.slideCounter, i + 1, total));
      setSlideActive(slide, i === 0);
    });
  }

  // expand the image to the full screen width once the block is in view
  let expanded = false;
  let inView = false;
  const observer = new IntersectionObserver(([entry]) => {
    // vertical visibility only: the full-bleed block may be clipped sideways
    const blockHeight = entry.boundingClientRect.height || 1;
    const visible = entry.isIntersecting ? entry.intersectionRect.height / blockHeight : 0;
    // "fully visible", or as much as fits when the block is taller than the screen
    const maxVisible = Math.min(1, window.innerHeight / blockHeight);
    inView = visible >= 0.25;
    if (!expanded && visible >= maxVisible - 0.1) {
      expanded = true;
      block.classList.add('is-expanded');
    }
    // eslint-disable-next-line no-use-before-define
    if (total > 1) schedule();
  }, { threshold: Array.from({ length: 21 }, (_, i) => i / 20) });
  observer.observe(block);

  if (total < 2) return;

  const {
    controls, playButton, prevButton, nextButton,
  } = buildControls(labels);
  // controls first in the tab order, then the active slide (APG carousel)
  block.append(controls, slidesContainer, flag);

  let activeIndex = 0;
  let playing = !reducedMotion.matches;
  let hoverPaused = false;
  let timer = null;
  let running = [];

  const show = (index, direction) => {
    const nextIndex = (index + total) % total;
    if (nextIndex === activeIndex) return;
    running.forEach((animation) => animation.finish());
    const from = slides[activeIndex];
    const to = slides[nextIndex];
    activeIndex = nextIndex;
    setSlideActive(from, false);
    setSlideActive(to, true);

    if (reducedMotion.matches) return;
    // "next" always travels upwards (bottom to top), also from the last slide
    // back to the first; "previous" travels downwards
    const offset = 'calc(100% + 16px)';
    const enterFrom = direction === 'next' ? offset : `calc(-1 * ${offset})`;
    const leaveTo = direction === 'next' ? `calc(-1 * ${offset})` : offset;
    const options = { duration: SLIDE_DURATION_MS, easing: 'ease-in-out' };
    from.classList.add('is-leaving');
    const leaving = from.animate([{ transform: 'translateY(0)' }, { transform: `translateY(${leaveTo})` }], options);
    const entering = to.animate([{ transform: `translateY(${enterFrom})` }, { transform: 'translateY(0)' }], options);
    running = [leaving, entering];
    leaving.finished.catch(() => {}).finally(() => from.classList.remove('is-leaving'));
  };

  const canRotate = () => playing && !hoverPaused && inView && expanded && !document.hidden;

  const schedule = () => {
    clearTimeout(timer);
    timer = canRotate() ? setTimeout(() => {
      show(activeIndex + 1, 'next');
      schedule();
    }, rotationMs) : null;
  };

  const setPlaying = (value) => {
    playing = value;
    // the button's name always states the action it will perform
    playButton.setAttribute('aria-label', playing ? labels.pause : labels.start);
    playButton.innerHTML = playing ? ICONS.pause : ICONS.play;
    // announce slide changes only when they are user-initiated
    slidesContainer.setAttribute('aria-live', playing ? 'off' : 'polite');
    schedule();
  };

  playButton.addEventListener('click', () => setPlaying(!playing));
  prevButton.addEventListener('click', () => show(activeIndex - 1, 'previous'));
  nextButton.addEventListener('click', () => show(activeIndex + 1, 'next'));

  controls.addEventListener('keydown', (e) => {
    if (!e.target.closest('button')) return;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      show(activeIndex - 1, 'previous');
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      show(activeIndex + 1, 'next');
    }
  });

  // keyboard focus entering the carousel stops the rotation until the user
  // restarts it (APG carousel, WCAG 2.2.2); a mouse click doesn't
  block.addEventListener('focusin', (e) => {
    if (playing && !block.contains(e.relatedTarget) && e.target.matches(':focus-visible')) {
      setPlaying(false);
    }
  });
  // hovering with a mouse pauses only while the pointer is over the block
  // (touch has no "leave", so it would never resume)
  block.addEventListener('pointerenter', (e) => {
    if (e.pointerType !== 'mouse') return;
    hoverPaused = true;
    schedule();
  });
  block.addEventListener('pointerleave', (e) => {
    if (e.pointerType !== 'mouse') return;
    hoverPaused = false;
    schedule();
  });
  document.addEventListener('visibilitychange', schedule);

  setPlaying(playing);
}
