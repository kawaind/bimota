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

  window.addEventListener('scroll', debounce(() => {
    if (isInViewport(block) && !interval) {
      block.classList.add('active');

      interval = setInterval(() => {
        const activeIndex = getActiveIndex(block);
        const newActiveIndex = activeIndex === slideCount - 1 ? 0 : activeIndex + 1;

        scrollToSlide(block, newActiveIndex);
      }, animationTime * 1000);
    } else if (!isInViewport(block)) {
      block.classList.remove('active');
      clearInterval(interval);
      interval = null;
    }
  }, 100));
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
 * Resolve the "opens in a new tab" warning translated for the current URL's
 * language, read from the "sr-buttons" sheet in /lanconfig.json (row keyed
 * "opensInNewTab", one column per language code). Falls back to English, then
 * to a hard-coded default.
 * @returns {Promise<string>} the translated warning text
 */
export const getOpensInNewTabLabel = async () => {
  const fallback = '(opens in a new tab)';
  const config = await fetchLanguageConfig();
  const rows = getLanguageConfigSheet(config, 'sr-buttons');
  if (!rows.length) return fallback;

  const row = rows.find((r) => (r.Key || r.key) === 'opensInNewTab');
  if (!row) return fallback;

  const { language } = getLocale();
  return row[language] || row.en || row.En || fallback;
};
