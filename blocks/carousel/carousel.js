import { getTextLabel } from '../../scripts/scripts.js';

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
  let touchStartX = 0;
  let touchEndX = 0;

  const handleSwipe = () => {
    const minSwipeDistance = 50;

    if (touchEndX < touchStartX - minSwipeDistance) {
      // swipe left - next slide
      onSwipe('next');
    } else if (touchEndX > touchStartX + minSwipeDistance) {
      // swipe right - previous slide
      onSwipe('prev');
    }
  };

  swipeEl.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
  }, false);

  swipeEl.addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
  }, false);
};

export default async function decorate(block) {
  const slides = [...block.querySelectorAll(':scope > div > div ')];

  slides.forEach((slide, index) => {
    slide.classList.add('carousle-slide');
    slide.parentElement.replaceWith(slide);

    const d = document.createElement('span');
    d.innerHTML = index;
    slide.append(d);
  });

  const slideWrapper = document.createElement('div');
  slideWrapper.classList.add('carousel-slide-wrapper');
  slideWrapper.append(...slides);

  const buttons = document.createRange().createContextualFragment(`
    <div class="carousel-buttons">
      <button>&lt;</button>
      <button>&gt;</button>
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

  let activeSlideIndex = 0;
  let prevActiveSlideIndex = 0;

  const getActiveSlideIndex = () => activeSlideIndex;

  const setActiveSlideIndex = (value) => {
    prevActiveSlideIndex = activeSlideIndex;
    activeSlideIndex = value;
  };

  recalcSlidePositions(slides, activeSlideIndex, null);

  [...block.querySelectorAll('.carousel-buttons button')].forEach((button, btnIndex) => {
    button.addEventListener('click', () => {
      prevActiveSlideIndex = activeSlideIndex;

      if (btnIndex === 0) {
        activeSlideIndex = ((activeSlideIndex - 1 + slides.length) % slides.length);
      } else {
        activeSlideIndex = (activeSlideIndex + 1) % slides.length;
      }

      recalcSlidePositions(slides, activeSlideIndex, btnIndex === 0 ? 'prev' : 'next');
    });
  });

  [...block.querySelectorAll('.carousel-nav button')].forEach((button, btnIndex) => {
    button.addEventListener('click', () => {
      prevActiveSlideIndex = activeSlideIndex;
      activeSlideIndex = btnIndex;

      const times = Array.from(Array(Math.abs(prevActiveSlideIndex - activeSlideIndex)).keys());
      const direction = activeSlideIndex < prevActiveSlideIndex ? 'prev' : 'next';
      let currentIndex = prevActiveSlideIndex;

      times.forEach(async () => {
        if (direction === 'next') {
          currentIndex += 1;
        } else {
          currentIndex -= 1;
        }
        await recalcSlidePositions(slides, currentIndex, direction);
      });
    });
  });

  const triggerSlideChange = (direction) => {
    prevActiveSlideIndex = activeSlideIndex;
    if (direction === 'next') {
      activeSlideIndex = (activeSlideIndex + 1) % slides.length;
    } else if (direction === 'prev') {
      activeSlideIndex = ((activeSlideIndex - 1 + slides.length) % slides.length);
    }
    recalcSlidePositions(slides, activeSlideIndex, direction);
  };

  supportSwiping(block, triggerSlideChange);
}
