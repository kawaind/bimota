import { getTextLabel } from '../../scripts/scripts.js';
import { addSwiping, callOnIntersection } from '../../scripts/helpers.js';

const SLIDE_CHANGE_DIRECTION = {
  NEXT: 'next',
  PREV: 'prev',
};
const DEFAULT_TRANSITION_PARAMS = '500ms ease';
const FAST_TRANSITION_PARAMS = '100ms linear';

const getCarouselPadding = (centerItemIndex) => `calc(-1 * ((${centerItemIndex} - var(--slide-part-on-edge)) * var(--slide-width) + var(--slide-gap) * ${centerItemIndex - 1}))`;

function initTransition(target, onEnd, onCancell) {
  target.addEventListener('transitioncancel', () => {
    onCancell();
  }, { once: true });

  target.addEventListener('transitionend', () => {
    onEnd();
  }, { once: true });
}

function setUpTransition(block, onUpdate) {
  const slides = [...block.querySelectorAll(':scope .carousel-slide')];
  const slidesWrapper = block.querySelector('.carousel-slide-wrapper');
  const slidesCount = slides.length;
  const centerItemIndex = Math.floor(slidesCount / 2);
  const transitionsQueue = [];
  let activeSlideIndex = 0;

  const setSlidesOrder = () => {
    slides.forEach((slide, index) => {
      slide.style.order = (index - activeSlideIndex + centerItemIndex + slidesCount) % slidesCount;
    });
  };

  const getActiveSlideIndex = () => activeSlideIndex;

  async function goToSlide(
    direction,
    times = 1,
    transformFunction = DEFAULT_TRANSITION_PARAMS,
    int = false,
  ) {
    let resolveTransition;
    const transitionPromise = new Promise((resolve) => { resolveTransition = resolve; });

    if (!int) {
      transitionsQueue.push(transitionPromise);

      const indexInQueue = transitionsQueue.findIndex((p) => p === resolveTransition);
      const earlierPromises = transitionsQueue.slice(0, indexInQueue);
      await Promise.allSettled(earlierPromises);
    }

    block.style.setProperty('--slide-transition-params', transformFunction);

    if (times > 1) {
      await goToSlide(direction, times - 1, FAST_TRANSITION_PARAMS, true);
    }

    let fromPaddingInCalc;
    const toPaddingInCalc = getCarouselPadding(centerItemIndex);

    if (direction === SLIDE_CHANGE_DIRECTION.NEXT) {
      activeSlideIndex = (activeSlideIndex + 1) % slidesCount;
      fromPaddingInCalc = getCarouselPadding(centerItemIndex - 1);
    } else if (direction === SLIDE_CHANGE_DIRECTION.PREV) {
      activeSlideIndex = (activeSlideIndex - 1 + slidesCount) % slidesCount;
      fromPaddingInCalc = getCarouselPadding(centerItemIndex + 1);
    }

    setSlidesOrder();

    if (fromPaddingInCalc) {
      slidesWrapper.style.transform = `translateX(${fromPaddingInCalc})`;
      // Force reflow/repaint to ensure the transition is truly disabled for the first transform
      // eslint-disable-next-line no-unused-vars
      const { offsetHeight } = slidesWrapper; // Read property to force reflow

      slidesWrapper.classList.add('transition-effect');
      onUpdate(activeSlideIndex);

      const onTransitionEnd = () => {
        slidesWrapper.classList.remove('transition-effect');
        resolveTransition();
      };
      const onTransitionCancelled = () => {
        resolveTransition();
      };

      initTransition(slidesWrapper, onTransitionEnd, onTransitionCancelled);
      slidesWrapper.style.transform = `translateX(${toPaddingInCalc})`;
    } else {
      onUpdate(activeSlideIndex);
      resolveTransition();
    }

    return transitionPromise;
  }

  setSlidesOrder();
  slidesWrapper.style.transform = `translateX(${getCarouselPadding(centerItemIndex)})`;
  onUpdate(activeSlideIndex);

  return {
    goToSlide,
    getActiveSlideIndex,
  };
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

  const { goToSlide, getActiveSlideIndex } = setUpTransition(block, onActiveSlideIndexUpdate);

  [...block.querySelectorAll('.carousel-arrow-buttons button')].forEach((button, btnIndex) => {
    button.addEventListener('click', () => {
      const direction = btnIndex === 0 ? SLIDE_CHANGE_DIRECTION.PREV : SLIDE_CHANGE_DIRECTION.NEXT;
      goToSlide(direction);
    });
  });

  [...block.querySelectorAll('.carousel-nav button')].forEach((button, btnIndex) => {
    button.addEventListener('click', async (event) => {
      const { target } = event;
      const activeIndex = getActiveSlideIndex();
      const times = Math.abs(activeIndex - btnIndex);
      const { PREV, NEXT } = SLIDE_CHANGE_DIRECTION;
      const direction = btnIndex < activeIndex ? PREV : NEXT;

      if (!times) {
        return;
      }

      [...target.closest('.carousel-nav').querySelectorAll('carousel-nav-button')].forEach((el) => el.classList.remove('carousel-nav-button-active'));
      target.classList.add('carousel-nav-button-active');

      goToSlide(direction, times);
    });
  });

  const triggerSlideChange = (direction) => {
    goToSlide(direction);
  };

  addSwiping(block, triggerSlideChange);

  if (block.classList.contains('autoplay')) {
    autoSlide(block, triggerSlideChange);
  }

  // setting the slides ratio
  setAspecRatio(block);
  setAutoPlayForVideos(block);
}
