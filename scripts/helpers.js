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

export const preventScroll = ({ move }) => {
  let startX;
  let startY;

  const touchStart = (event) => {
    // Store the starting touch position
    startX = event.touches[0].pageX;
    startY = event.touches[0].pageY;
  };

  const touchMove = (event) => {
    if (event.cancelable) {
      event.preventDefault();
      event.stopPropagation();
    }

    // Calculate the distance moved in both directions
    const moveX = event.touches[0].pageX - startX;
    const moveY = event.touches[0].pageY - startY;

    // Determine direction
    if (Math.abs(moveY) > Math.abs(moveX)) {
      if (moveY > 0) {
        move('up');
      } else {
        move('down');
      }
    }
  };

  const onWheel = (event) => {
    if (event.cancelable) {
      event.preventDefault();
      event.stopPropagation();
    }

    if (event.deltaY > 0) {
      move('down');
    } else {
      move('up');
    }
  };

  window.addEventListener('touchstart', touchStart, { passive: false });
  window.addEventListener('touchmove', touchMove, { passive: false });
  window.addEventListener('wheel', onWheel, { passive: false });

  const enableScroll = () => {
    window.removeEventListener('touchstart', touchStart, { passive: false });
    window.removeEventListener('touchmove', touchMove, { passive: false });
    window.removeEventListener('wheel', onWheel, { passive: false });
  };

  return enableScroll;
};

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
