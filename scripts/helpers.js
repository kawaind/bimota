// Hash prefixes reserved by other features (modals, block swapping) that must
// not be treated as in-page anchor links. Shared so the body anchor handling
// (scripts.js) and the nav anchor handling (header block) stay in sync.
export const RESERVED_HASH_PREFIXES = ['modal-', 'id-'];

/**
 * Whether a hash (without the leading '#') is reserved by another feature and
 * so must not be handled as an in-page anchor link.
 * @param {string} hash the hash value, e.g. "modal-country-selector"
 * @returns {boolean}
 */
export function isReservedHash(hash) {
  return RESERVED_HASH_PREFIXES.some((prefix) => hash.startsWith(prefix));
}

/**
 * Smooth-scroll to an in-page anchor target by id. Targets are the ids that
 * decorateAnchors() assigns to headings / bold paragraphs (via a `{#id}`
 * marker) or to standalone anchor points, so authors reuse the exact same
 * mechanism the page body already uses. Reserved hashes (modals, block
 * swapping) are ignored. No-op if the target does not exist on the page.
 * @param {string} targetId the id to scroll to (without '#')
 * @returns {boolean} true if a target was found and scrolled to
 */
export function scrollToAnchor(targetId) {
  if (!targetId || isReservedHash(targetId)) return false;
  const target = document.getElementById(targetId);
  if (!target) return false;
  target.scrollIntoView({ behavior: 'smooth' });
  return true;
}

export function addSwiping(swipeEl, onSwipe) {
  let startX = 0;
  let endX = 0;
  let isDragging = false;

  const handleSwipe = () => {
    const minSwipeDistance = 50;

    if (endX < startX - minSwipeDistance) {
      // swipe left - next slide
      onSwipe('next');
    } else if (endX > startX + minSwipeDistance) {
      // swipe right - previous slide
      onSwipe('prev');
    }
  };

  // touch events
  swipeEl.addEventListener('touchstart', (e) => {
    startX = e.changedTouches[0].screenX;
  }, false);

  swipeEl.addEventListener('touchend', (e) => {
    endX = e.changedTouches[0].screenX;
    handleSwipe();
  }, false);

  // mouse events
  swipeEl.addEventListener('mousedown', (e) => {
    startX = e.screenX;
    isDragging = true;
  }, false);

  swipeEl.addEventListener('mouseup', (e) => {
    if (isDragging) {
      endX = e.screenX;
      handleSwipe();
      isDragging = false;
    }
  }, false);

  swipeEl.addEventListener('mouseleave', () => {
    // cancel swipe if dragging and mouse leaves element
    if (isDragging) {
      isDragging = false;
    }
  }, false);
}

export function callOnIntersection(elements, onChange) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const { target, isIntersecting } = entry;

      onChange(isIntersecting, target);
    });
  }, {
    threshold: 0.5,
  });

  elements.forEach((video) => {
    observer.observe(video);
  });
}

export function addTitleAttributeToIconLink(element) {
  const iconElement = element.querySelector('[data-icon-name]');
  if (iconElement) {
    element.setAttribute('title', iconElement.getAttribute('data-icon-name'));
  }
}

export const adjustPretitle = (element) => {
  const headingSelector = 'h1, h2, h3, h4, h5, h6';

  [...element.querySelectorAll(headingSelector)].forEach((heading) => {
    const isNextElHeading = heading.nextElementSibling?.matches(headingSelector);

    if (!isNextElHeading) {
      return;
    }

    const currentLevel = Number(heading.tagName[1]);
    const nextElLevel = Number(heading.nextElementSibling.tagName[1]);

    if (currentLevel > nextElLevel) {
      const pretitle = document.createElement('span');
      pretitle.classList.add('pretitle');
      pretitle.append(...heading.childNodes);

      heading.replaceWith(pretitle);
    }
  });
};

export const unwrapDivs = (element) => {
  const stack = [element];

  while (stack.length > 0) {
    const currentElement = stack.pop();

    let i = 0;
    while (i < currentElement.children.length) {
      const node = currentElement.children[i];
      const attributesLength = [...node.attributes].filter((el) => el).length;

      if (node && attributesLength === 0) {
        while (node.firstChild) {
          currentElement.insertBefore(node.firstChild, node);
        }
        node.remove();
      } else {
        stack.push(node);
        i += 1;
      }
    }
  }
};

export const throttle = (func, limit) => {
  let inThrottle;

  return function thrttledFunction(...args) {
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => { inThrottle = false; }, limit);
    }
  };
};

export const debounce = (func, wait) => {
  let timeout;

  return function debouncedFunction(...args) {
    const context = this;

    clearTimeout(timeout);
    timeout = setTimeout(() => {
      func.apply(context, args);
    }, wait);
  };
};

export function stripEmptyTags(main, child) {
  if (child !== main && child.innerHTML.trim() === '') {
    const parent = child.parentNode;
    child.remove();
    stripEmptyTags(main, parent);
  }
}

/**
 * Replace a heading with one at a fixed semantic level, preserving its content
 * (including inline markup like sup/sub/strong) and applying a visual class.
 * Used to enforce a consistent, accessible heading outline regardless of the
 * tag the author chose. If the source is already the target tag it is reused so
 * event listeners/references are not lost; only the visual class is applied.
 * @param {HTMLElement} source the authored heading/element to normalise
 * @param {string} tagName the semantic tag to enforce (e.g. 'h2')
 * @param {string} [visualClass] optional visual size class (e.g. 'h3')
 * @returns {HTMLElement} the resulting element (new or the reused source)
 */
export function forceHeadingLevel(source, tagName, visualClass) {
  let el = source;
  if (source.tagName.toLowerCase() !== tagName.toLowerCase()) {
    el = document.createElement(tagName);
    el.append(...source.childNodes);
    [...source.attributes].forEach((attr) => el.setAttribute(attr.name, attr.value));
    source.replaceWith(el);
  }
  if (visualClass) {
    el.classList.add(visualClass);
  }
  return el;
}

let describedButtonId = 0;

/**
 * Ensure an element has an id, generating a stable unique one if needed.
 * @param {HTMLElement} el the element
 * @param {string} [prefix='lbl'] id prefix used when generating
 * @returns {string} the element's id
 */
export const ensureId = (el, prefix = 'lbl') => {
  if (!el.id) {
    describedButtonId += 1;
    el.id = `${prefix}-${describedButtonId}`;
  }
  return el.id;
};

/**
 * Give a button a descriptive accessible name for screen readers: its own text,
 * a comma, then a contextual title (e.g. the heading above it), so a generic
 * "Discover" reads as "Discover, <title>" (WCAG 2.4.6, 4.1.2). Native
 * <button>s keep their role; non-button elements (links that act as buttons)
 * get role="button". For plain navigation links use labelWithContext() instead,
 * which names the link the same way but keeps its native link role.
 * @param {HTMLElement} button the button/link element
 * @param {HTMLElement} parent the element whose text provides context
 */
export function describeButton(button, parent) {
  if (!button || !parent) return;

  if (button.tagName !== 'BUTTON') {
    button.setAttribute('role', 'button');
  }

  // Own text first (with the comma pause), then the contextual title.
  // eslint-disable-next-line no-use-before-define
  labelWithContext(button, parent);
}

/**
 * Create an element with the given id and classes.
 * @param {string} tagName the tag
 * @param {Object} options the element options
 * @param {string[]|string} [options.classes=[]] the class or classes to add
 * @param {Object} [options.props={}] any other attributes to add to the element
 * @returns {HTMLElement} the element
 */
export function createElement(tagName, options = {}) {
  const { classes = [], props = {} } = options;
  const elem = document.createElement(tagName);
  const isString = typeof classes === 'string';
  if (classes || (isString && classes !== '') || (!isString && classes.length > 0)) {
    const classesArr = isString ? [classes] : classes;
    elem.classList.add(...classesArr);
  }
  if (!isString && classes.length === 0) elem.removeAttribute('class');

  if (props) {
    Object.keys(props).forEach((propName) => {
      const value = propName === props[propName] ? '' : props[propName];
      elem.setAttribute(propName, value);
    });
  }

  return elem;
}

/**
 * Give a control a contextual accessible name through aria-labelledby: its own
 * label, a comma, then the context element(s). A generic CTA "Explore" next to
 * the "Tesi H2" tab is announced as "Explore, Tesi H2" (WCAG 2.4.4, 2.4.6), and
 * because the visible text comes first the name still satisfies Label in Name
 * (WCAG 2.5.3). Reusable by any CTA or action button on the site.
 *
 * aria-labelledby joins the referenced texts with a space, so a comma placed in
 * its own element would read "Explore , Tesi H2". The comma is therefore put
 * inside the first referenced element, which is always one this helper owns:
 * - without `label`: the control's own visible text is wrapped in a span and a
 *   zero-size comma is appended to it (no visual change);
 * - with `label`: a `hidden` span holding "label," is appended to the control
 *   (hidden text is still used when it is referenced by aria-labelledby, and is
 *   not read twice in browse mode).
 * Idempotent: calling it again on the same control replaces the previous setup.
 * @param {Element} control the link/button (or other element) to name
 * @param {Element|Element[]} context element(s) whose text follows the comma
 * @param {Object} [options]
 * @param {string} [options.label] use this text as the first part instead of
 *   the control's visible text
 * @param {string} [options.separator] separator glued to the first part;
 *   defaults to the page language's comma (',' — or '、' for Japanese)
 */
export function labelWithContext(control, context, {
  label,
  separator = (document.documentElement.lang || '').toLowerCase().startsWith('ja') ? '、' : ',',
} = {}) {
  let first = control.querySelector(':scope > [data-label-own]');

  if (label !== undefined) {
    if (first && !first.hidden) {
      first.replaceWith(...first.childNodes);
      first = null;
    }
    if (!first) {
      first = createElement('span', { props: { 'data-label-own': '' } });
      first.hidden = true;
      control.append(first);
    }
    first.textContent = `${label}${separator}`;
  } else {
    if (first?.hidden) {
      first.remove();
      first = null;
    }
    if (!first) {
      // Wrap the control's own text; decorative children (icons, SVGs,
      // aria-hidden nodes) stay outside so they never join the name.
      first = createElement('span', { props: { 'data-label-own': '' } });
      const textNodes = [...control.childNodes].filter((node) => (
        node.nodeType === Node.TEXT_NODE
        || (node.nodeType === Node.ELEMENT_NODE
          && !node.matches('.icon, [class*="icon-"], svg, img, [aria-hidden="true"]'))
      ));
      textNodes[0]?.before(first);
      first.append(...textNodes);
    }
    first.querySelector(':scope > [data-label-separator]')?.remove();
    const sep = createElement('span', { props: { 'data-label-separator': '' } });
    // Zero-size, so it adds nothing visually but stays in the computed name.
    sep.style.fontSize = '0';
    sep.textContent = separator;
    first.append(sep);
  }

  const contextIds = (Array.isArray(context) ? context : [context])
    .filter(Boolean)
    .map((el) => ensureId(el));
  control.setAttribute('aria-labelledby', [ensureId(first), ...contextIds].join(' '));
}

export const isInViewport = (element) => {
  const rect = element.getBoundingClientRect();
  const windowHeight = (window.visualViewport || window).height;
  const windowWidth = (window.visualViewport || window).width;

  return (
    rect.top >= 0
    && rect.left >= 0
    && rect.bottom <= windowHeight
    && rect.right <= windowWidth
  );
};

export const gatherButtons = (buttonsContainers) => {
  let currentButtonContainer;

  buttonsContainers.forEach((buttonContainer) => {
    if (currentButtonContainer?.nextElementSibling === buttonContainer) {
      currentButtonContainer.append(buttonContainer.children[0]);
      buttonContainer.remove();
    } else {
      currentButtonContainer = buttonContainer;
    }
  });
};

export const onAppReady = (onReady) => {
  const interval = setInterval(() => {
    // initial calculaton when the page is ready
    // (EDS adds the appear class when the page is ready)
    if (document.body.classList.contains('appear')) {
      clearInterval(interval);
      onReady();
    }
  }, 100);
};

export const autoScrollSlidesWhenInView = (block, {
  getActiveIndex, slideCount, scrollToSlide, animationTime = 3,
}) => {
  let interval = null;
  // Auto-rotation pauses while the user hovers or keyboard-focuses inside the
  // block, so they can read at their own pace (WCAG 2.2.2 Pause, Stop, Hide).
  let paused = false;

  const startRotation = () => {
    if (interval || paused || !isInViewport(block)) return;
    interval = setInterval(() => {
      const activeIndex = getActiveIndex(block);
      const newActiveIndex = activeIndex === slideCount - 1 ? 0 : activeIndex + 1;

      scrollToSlide(block, newActiveIndex);
    }, animationTime * 1000);
  };

  const stopRotation = () => {
    clearInterval(interval);
    interval = null;
  };

  const pause = () => {
    paused = true;
    stopRotation();
  };

  const resume = () => {
    paused = false;
    startRotation();
  };

  // Mouse users: pause on hover. Keyboard users: pause while focus is within.
  block.addEventListener('mouseenter', pause);
  block.addEventListener('mouseleave', resume);
  block.addEventListener('focusin', pause);
  block.addEventListener('focusout', resume);

  window.addEventListener('scroll', debounce(() => {
    if (isInViewport(block) && !interval) {
      block.classList.add('active');
      startRotation();
    } else if (!isInViewport(block)) {
      block.classList.remove('active');
      stopRotation();
    }
  }, 100));
};

/**
 * Maps a full locale path segment (e.g. "fr-be") to a base language code.
 * Locales not listed here fall back to the base segment if it is a supported
 * language, otherwise to the provided default.
 */
export const LOCALE_TO_LANGUAGE = {
  'fr-be': 'fr',
  'nl-be': 'nl',
  'en-be': 'en',
  'nl-nl': 'nl',
  'en-nl': 'en',
  'en-ca': 'en',
  'en-us': 'en',
  'fr-ca': 'fr',
  'en-mx': 'en',
  'es-mx': 'es',
  'en-lu': 'en',
  'fr-lu': 'fr',
};

export const SUPPORTED_LANGUAGES = ['en', 'it', 'ja', 'es', 'fr', 'de', 'nl', 'lu'];

export const getPathSegments = (pathname = '') => pathname
  .toLowerCase()
  .split('/')
  .filter(Boolean);

/**
 * Resolves the base language code for the current (or given) URL path.
 * @param {string} [pathname] path to inspect; defaults to window.location
 * @param {string} [defaultLang] fallback when the locale is unknown
 * @returns {string} base language code (e.g. "en", "fr", "ja")
 */
export const getLanguageFromPath = (pathname, defaultLang = 'it') => {
  const currentPathname = pathname
    ?? (typeof window !== 'undefined' ? window.location.pathname : '');

  const segments = getPathSegments(currentPathname);
  const locale = segments[1];

  if (locale && LOCALE_TO_LANGUAGE[locale]) {
    return LOCALE_TO_LANGUAGE[locale];
  }

  if (locale && SUPPORTED_LANGUAGES.includes(locale)) {
    return locale;
  }

  return defaultLang;
};

export const getLocale = () => {
  const [, country, langSegment] = window.location.pathname.split('/');
  const language = langSegment.includes('-') ? langSegment.split('-')[0] : langSegment;
  let locale = `${language}_${country.toUpperCase()}`;

  if (locale === 'ja_JP') {
    locale = 'ja';
  }
  return {
    country, language, langSegment, locale,
  };
};

let lanconfigPromise;

/**
 * Fetch the site's language-config sheet (/lanconfig.json) once and cache it.
 * @returns {Promise<Object|null>} the parsed sheet, or null if unavailable
 */
export const fetchLanguageConfig = () => {
  if (!lanconfigPromise) {
    lanconfigPromise = fetch(`${window.hlx?.codeBasePath || ''}/lanconfig.json`)
      .then((resp) => (resp.ok ? resp.json() : null))
      .catch(() => null);
  }
  return lanconfigPromise;
};

/**
 * Read the rows of a named sheet from the multi-sheet lanconfig workbook.
 * Supports the multi-sheet shape (sheet keyed by name with its own `data`
 * array) and, as a fallback, a single-sheet workbook (top-level `data`).
 * @param {Object|null} config the parsed lanconfig.json
 * @param {string} sheetName the sheet to read (e.g. "sr-buttons")
 * @returns {Array} the sheet's rows, or an empty array
 */
const getLanguageConfigSheet = (config, sheetName) => {
  if (!config) return [];
  if (Array.isArray(config[sheetName]?.data)) return config[sheetName].data;
  if (Array.isArray(config.data)) return config.data;
  return [];
};

/**
 * Resolve a set of screen-reader/ARIA labels translated for the current URL's
 * language from a named /lanconfig.json sheet. Each row is a Key plus one
 * column per language code; the column matching the current language wins, else
 * English, else the caller's fallback. Adding a language is a pure authoring
 * change (add a column). Returns the fallbacks as-is on any fetch/parse error,
 * so callers are always usable.
 * @param {string} sheetName the lanconfig sheet holding the labels
 * @param {Object<string,string>} fallbacks map of key -> English default
 * @returns {Promise<Object<string,string>>} map of key -> localized label
 */
export const getLanguageLabels = async (sheetName, fallbacks) => {
  const labels = { ...fallbacks };
  try {
    const config = await fetchLanguageConfig();
    const rows = getLanguageConfigSheet(config, sheetName);
    if (!rows.length) return labels;
    const { language } = getLocale();
    Object.keys(fallbacks).forEach((key) => {
      const row = rows.find((r) => (r.Key || r.key) === key);
      if (row) labels[key] = row[language] || row.en || row.En || fallbacks[key];
    });
  } catch (e) {
    // keep fallbacks
  }
  return labels;
};

/**
 * Resolve the "opens in a new tab" warning translated for the current URL's
 * language, read from the "sr-buttons" sheet in /lanconfig.json (row keyed
 * "opensInNewTab", one column per language code). Falls back to English, then
 * to a hard-coded default.
 * @returns {Promise<string>} the translated warning text
 */
export const getOpensInNewTabLabel = async () => {
  const fallback = '(opens in a new tab)';
  const labels = await getLanguageLabels('sr-buttons', { opensInNewTab: fallback });
  return labels.opensInNewTab;
};
