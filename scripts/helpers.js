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
