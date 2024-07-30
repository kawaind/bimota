import { getTextLabel } from '../../scripts/scripts.js';

const createCarouselStateManager = (onUpdate) => {
  let activeSlideIndex = 0;

  return {
    getActiveSlideIndex: () => activeSlideIndex,
    setActiveSlideIndex: (value) => {
      activeSlideIndex = value;
      onUpdate(activeSlideIndex);
    },
  };
};

const getCarouselPadding = (itemIndex) => `calc(-1 * (${itemIndex - 0.5} * var(--slide-width) + var(--slide-gap) * ${itemIndex - 1}))`;

const recalcSlidePositions = (slides, activeSlideIndex, direction) => {
  const slidesList = [...slides];
  const slidesCount = slidesList.length;
  const centerItemIndex = Math.floor(slidesCount / 2);
  const carouselEl = slides[0].closest('.carousel').querySelector('.carousel-slide-wrapper');
  let resolveTransition;
  const transitionEndPromise = new Promise((resolve) => {
    resolveTransition = resolve;
  });

  slidesList.forEach((slide, index) => {
    slide.style.order = (index - activeSlideIndex + centerItemIndex + slidesCount) % slidesCount;
  });

  let fromPaddingInCalc;
  const toPaddingInCalc = getCarouselPadding(centerItemIndex);

  if (direction === 'next') {
    fromPaddingInCalc = getCarouselPadding(centerItemIndex - 1);
  } else if (direction === 'prev') {
    fromPaddingInCalc = getCarouselPadding(centerItemIndex + 1);
  }

  if (fromPaddingInCalc) {
    carouselEl.style.transform = `translateX(${fromPaddingInCalc})`;

    // Force reflow/repaint to ensure the transition is truly disabled for the first transform
    // eslint-disable-next-line no-unused-vars
    const { offsetHeight } = carouselEl; // Read property to force reflow

    carouselEl.classList.add('transition-effect');
    carouselEl.style.transform = `translateX(${toPaddingInCalc})`;

    carouselEl.addEventListener('transitioncancel', () => {
      resolveTransition();
    }, { once: true });

    carouselEl.addEventListener('transitionend', () => {
      carouselEl.classList.remove('transition-effect');
      resolveTransition();
    }, { once: true });
  } else {
    carouselEl.style.transform = `translateX(${toPaddingInCalc})`;
    resolveTransition();
  }

  return transitionEndPromise;
};

const supportSwiping = (swipeEl, onSwipe) => {
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
};

export default async function decorate(block) {
  const slides = [...block.querySelectorAll(':scope > div > div ')];

  slides.forEach((slide) => {
    slide.classList.add('carousle-slide');
    slide.parentElement.replaceWith(slide);
  });

  const slideWrapper = document.createElement('div');
  slideWrapper.classList.add('carousel-slide-wrapper');
  slideWrapper.append(...slides);

  const buttons = document.createRange().createContextualFragment(`
    <div class="carousel-buttons">
      <button aria-label="${getTextLabel('Prev slide')}">
        <span class="icon icon-arrow">
          <img data-icon-name="arrow" src="/icons/arrow.svg" alt="" loading="lazy">
        </span>
      </button>
      <button aria-label="${getTextLabel('Next slide')}">
        <span class="icon icon-arrow">
          <img data-icon-name="arrow" src="/icons/arrow.svg" alt="" loading="lazy">
        </span>
      </button>
    </div>
  `);

  const carouselNav = document.createRange().createContextualFragment(
    `<ul class="carousel-nav">
      ${slides.map((_, index) => `
        <li class="carousel-nav-item">
          <button class="carousel-nav-button">${getTextLabel('Slide')} ${index}</button>
        </li>
      `).join('')}
    </ul>`,
  );

  block.append(slideWrapper);
  block.append(buttons.children[0]);
  block.append(carouselNav.children[0]);

  const onIndexUpdate = (activeIndex) => {
    const navButtons = [...block.querySelectorAll('.carousel-nav .carousel-nav-button')];

    navButtons.forEach((el) => el.classList.remove('carousel-nav-button-active'));
    navButtons[activeIndex].classList.add('carousel-nav-button-active');
  };

  const { getActiveSlideIndex, setActiveSlideIndex } = createCarouselStateManager(onIndexUpdate);

  onIndexUpdate(getActiveSlideIndex());
  recalcSlidePositions(slides, getActiveSlideIndex(), null);

  [...block.querySelectorAll('.carousel-buttons button')].forEach((button, btnIndex) => {
    button.addEventListener('click', () => {
      const activeIndex = getActiveSlideIndex();
      if (btnIndex === 0) {
        setActiveSlideIndex((activeIndex - 1 + slides.length) % slides.length);
      } else {
        setActiveSlideIndex((activeIndex + 1) % slides.length);
      }

      recalcSlidePositions(slides, getActiveSlideIndex(), btnIndex === 0 ? 'prev' : 'next');
    });
  });

  [...block.querySelectorAll('.carousel-nav button')].forEach((button, btnIndex) => {
    button.addEventListener('click', async (event) => {
      const { target } = event;
      const activeIndex = getActiveSlideIndex();
      const times = [...Array(Math.abs(activeIndex - btnIndex)).keys()];
      const direction = btnIndex < activeIndex ? 'prev' : 'next';

      [...target.closest('.carousel-nav').querySelectorAll('carousel-nav-button')].forEach((el) => el.classList.remove('carousel-nav-button-active'));
      target.classList.add('carousel-nav-button-active');

      await times.reduce(async (previousPromise) => {
        await previousPromise;
        if (direction === 'next') {
          setActiveSlideIndex(getActiveSlideIndex() + 1);
        } else {
          setActiveSlideIndex(getActiveSlideIndex() - 1);
        }

        await recalcSlidePositions(slides, getActiveSlideIndex(), direction);
      }, Promise.resolve());
    });
  });

  const triggerSlideChange = (direction) => {
    if (direction === 'next') {
      setActiveSlideIndex((getActiveSlideIndex() + 1) % slides.length);
    } else if (direction === 'prev') {
      setActiveSlideIndex((getActiveSlideIndex() - 1 + slides.length) % slides.length);
    }
    recalcSlidePositions(slides, getActiveSlideIndex(), direction);
  };

  supportSwiping(block, triggerSlideChange);
}
