import { getTextLabel } from '../../scripts/scripts.js';
import { addSwiping, callOnIntersection } from '../../scripts/helpers.js';

const SLIDE_CHANGE_DIRECTION = {
  NEXT: 'next',
  PREV: 'prev',
};

const createCarouselStateManager = (onUpdate, slidesCount) => {
  let activeSlideIndex = 0;
  const nextSlide = () => {
    activeSlideIndex = (activeSlideIndex + 1) % slidesCount;
    onUpdate(activeSlideIndex);
  };
  const prevSlide = () => {
    activeSlideIndex = (activeSlideIndex - 1 + slidesCount) % slidesCount;
    onUpdate(activeSlideIndex);
  };

  return {
    getActiveSlideIndex: () => activeSlideIndex,
    swipe: (direction) => {
      if (direction === SLIDE_CHANGE_DIRECTION.PREV) {
        prevSlide();
        return;
      }

      nextSlide();
    },
  };
};

const getCarouselPadding = (itemIndex) => `calc(-1 * ((${itemIndex} - var(--slide-part-on-edge)) * var(--slide-width) + var(--slide-gap) * ${itemIndex - 1}))`;
const getTransitionTiming = (el) => `${el.offsetWidth * 0.5 + 300}ms`;

function initTransition(target, onEnd, onCancell) {
  target.addEventListener('transitioncancel', () => {
    onCancell();
  }, { once: true });

  target.addEventListener('transitionend', () => {
    onEnd();
  }, { once: true });
}

function recalcSlidePositions(slides, activeSlideIndex, direction) {
  const slidesList = [...slides];
  const slidesCount = slidesList.length;
  const centerItemIndex = Math.floor(slidesCount / 2);
  const carouselEl = slides[0].closest('.carousel').querySelector('.carousel-slide-wrapper');
  let resolveTransition;
  const transitionEndPromise = new Promise((resolve) => {
    resolveTransition = resolve;
  });

  carouselEl.style.setProperty('--slide-transition-time', getTransitionTiming(carouselEl));

  slidesList.forEach((slide, index) => {
    slide.style.order = (index - activeSlideIndex + centerItemIndex + slidesCount) % slidesCount;
  });

  let fromPaddingInCalc;
  const toPaddingInCalc = getCarouselPadding(centerItemIndex);

  if (direction === SLIDE_CHANGE_DIRECTION.NEXT) {
    fromPaddingInCalc = getCarouselPadding(centerItemIndex - 1);
  } else if (direction === SLIDE_CHANGE_DIRECTION.PREV) {
    fromPaddingInCalc = getCarouselPadding(centerItemIndex + 1);
  }

  if (fromPaddingInCalc) {
    carouselEl.style.transform = `translateX(${fromPaddingInCalc})`;

    // Force reflow/repaint to ensure the transition is truly disabled for the first transform
    // eslint-disable-next-line no-unused-vars
    const { offsetHeight } = carouselEl; // Read property to force reflow

    carouselEl.classList.add('transition-effect');
    carouselEl.style.transform = `translateX(${toPaddingInCalc})`;

    const onTransitionEnd = () => {
      carouselEl.classList.remove('transition-effect');
      resolveTransition();
    };
    const onTransitionCancelled = () => resolveTransition();

    initTransition(carouselEl, onTransitionEnd, onTransitionCancelled);
  } else {
    carouselEl.style.transform = `translateX(${toPaddingInCalc})`;
    resolveTransition();
  }

  return transitionEndPromise;
}

// change slide automatically every 6 seconds, with pause if cursor is over the slide
function autoSlide(carouselEl, changeSlide) {
  let interval;
  const startAutoSlideChange = () => {
    interval = setInterval(() => {
      changeSlide(SLIDE_CHANGE_DIRECTION.NEXT);
    }, 6000);
  };

  startAutoSlideChange();

  carouselEl.addEventListener('mouseover', () => {
    if (interval) {
      clearInterval(interval);
    }
  }, false);

  carouselEl.addEventListener('mouseout', () => {
    startAutoSlideChange();
  }, false);
}

// set aspect ratio when block class has class like: ratio-16-9
function setAspecRatio(block) {
  const ratioClass = [...block.classList].find((cl) => cl.startsWith('ratio-'));
  if (ratioClass) {
    // eslint-disable-next-line no-unused-vars
    const [_, a, b] = /ratio-(\d+)-(\d+)/.exec(ratioClass);

    block.querySelector('.carousel-slide-wrapper').style.aspectRatio = `${a} / ${b}`;
  }
}

function setAutoPlayForVideos(block) {
  const videos = block.querySelectorAll('video');

  // autoplaying videos only when visible on the screan
  callOnIntersection(videos, (isIntersecting, target) => {
    if (isIntersecting) {
      target.muted = true;
      target.play();
      return;
    }

    target.pause();
  });
}

function buildSlides(slidesList) {
  slidesList.forEach((slide) => {
    slide.classList.add('carousel-slide');
    slide.parentElement.replaceWith(slide); // removing wrapping parent element
    slide.innerHTML = slide.innerHTML.trim(); // removing spaces and new lines

    if (slide.childElementCount === 1 && slide.querySelector('picture, video')) {
      slide.classList.add('carousel-slide-media-only');
    } else if (slide.firstChild.querySelector('picture, video')) {
      // if the slide contains more that just media (text, button...)
      // the media is displayed as background
      const [mediaParagraph, restEls] = [...slide.children];
      const media = mediaParagraph.children[0];

      media.classList.add('carsousel-slide-media-as-background');
      mediaParagraph.replaceWith(media); // removing wrapping parentElement

      // the rest of the elements are wrapped into div
      const wrapper = document.createElement('div');
      wrapper.classList.add('carsousel-slide-content');
      wrapper.append(restEls);
      slide.append(wrapper);
    }
  });

  return slidesList;
}

function buildSlideDotsNav(slides) {
  const dotNav = document.createRange().createContextualFragment(
    `<ul class="carousel-nav">
      ${slides.map((_, index) => `
        <li class="carousel-nav-item">
          <button class="carousel-nav-button">${getTextLabel('Slide')} ${index}</button>
        </li>
      `).join('')}
    </ul>`,
  );

  return dotNav.children[0];
}

function createArrowsButtons() {
  const arrowButtons = document.createRange().createContextualFragment(`
    <div class="carousel-arrow-buttons">
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

  return arrowButtons.children[0];
}

export default async function decorate(block) {
  const slides = [...block.querySelectorAll(':scope > div > div ')];

  buildSlides(slides);

  const slideWrapper = document.createElement('div');
  slideWrapper.classList.add('carousel-slide-wrapper');
  slideWrapper.append(...slides);

  const arrowsButtons = createArrowsButtons();
  const donNav = buildSlideDotsNav(slides);

  block.append(slideWrapper);
  block.append(arrowsButtons);
  block.append(donNav);

  const onActiveSlideIndexUpdate = (activeIndex) => {
    const navButtons = [...block.querySelectorAll('.carousel-nav .carousel-nav-button')];

    navButtons.forEach((el) => el.classList.remove('carousel-nav-button-active'));
    navButtons[activeIndex].classList.add('carousel-nav-button-active');
  };

  const {
    getActiveSlideIndex, swipe,
  } = createCarouselStateManager(onActiveSlideIndexUpdate, slides.length);

  onActiveSlideIndexUpdate(getActiveSlideIndex());
  recalcSlidePositions(slides, getActiveSlideIndex(), null);

  [...block.querySelectorAll('.carousel-arrow-buttons button')].forEach((button, btnIndex) => {
    button.addEventListener('click', () => {
      const direction = btnIndex === 0 ? SLIDE_CHANGE_DIRECTION.PREV : SLIDE_CHANGE_DIRECTION.NEXT;

      swipe(direction);
      recalcSlidePositions(slides, getActiveSlideIndex(), direction);
    });
  });

  [...block.querySelectorAll('.carousel-nav button')].forEach((button, btnIndex) => {
    button.addEventListener('click', async (event) => {
      const { target } = event;
      const activeIndex = getActiveSlideIndex();
      const times = [...Array(Math.abs(activeIndex - btnIndex)).keys()];
      const { PREV, NEXT } = SLIDE_CHANGE_DIRECTION;
      const direction = btnIndex < activeIndex ? PREV : NEXT;

      [...target.closest('.carousel-nav').querySelectorAll('carousel-nav-button')].forEach((el) => el.classList.remove('carousel-nav-button-active'));
      target.classList.add('carousel-nav-button-active');

      await times.reduce(async (previousPromise) => {
        await previousPromise;
        swipe(direction);
        await recalcSlidePositions(slides, getActiveSlideIndex(), direction);
      }, Promise.resolve());
    });
  });

  const triggerSlideChange = (direction) => {
    swipe(direction);
    recalcSlidePositions(slides, getActiveSlideIndex(), direction);
  };

  addSwiping(block, triggerSlideChange);

  if (block.classList.contains('autoplay')) {
    autoSlide(block, triggerSlideChange);
  }

  // setting the slides ratio
  setAspecRatio(block);
  setAutoPlayForVideos(block);
}
