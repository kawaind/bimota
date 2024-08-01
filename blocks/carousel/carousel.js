import { getTextLabel } from '../../scripts/scripts.js';
import { addSwiping, callOnIntersection, isElementInViewport } from '../../scripts/helpers.js';

const SLIDE_CHANGE_DIRECTION = {
  NEXT: 'next',
  PREV: 'prev',
};

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

const getCarouselPadding = (itemIndex) => `calc(-1 * ((${itemIndex} - var(--slide-part-on-edge)) * var(--slide-width) + var(--slide-gap) * ${itemIndex - 1}))`;
const getTransitionTiming = (el) => `${el.offsetWidth * 0.5 + 300}ms`;

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
}

// slide changes automatically every 6 seconds, with pause if cursor is over the slide
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
      target.play();
      return;
    }

    target.pause();
  });

  // using setTimout to make sure that the elemnt is already added to the DOM
  setTimeout(() => {
    if (videos[0] && isElementInViewport(videos[0])) {
      videos[0].muted = true;
      videos[0].play();
    }
  }, 100);
}

export default async function decorate(block) {
  const slides = [...block.querySelectorAll(':scope > div > div ')];

  slides.forEach((slide) => {
    slide.classList.add('carousel-slide');
    slide.parentElement.replaceWith(slide);
    slide.innerHTML = slide.innerHTML.trim(); // removing spaces and new lines

    if (slide.childElementCount === 1 && slide.querySelector('picture, video')) {
      slide.classList.add('carousel-slide-media-only');
    }
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

      const direction = btnIndex === 0 ? SLIDE_CHANGE_DIRECTION.PREV : SLIDE_CHANGE_DIRECTION.NEXT;
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
        if (direction === SLIDE_CHANGE_DIRECTION.NEXT) {
          setActiveSlideIndex(getActiveSlideIndex() + 1);
        } else {
          setActiveSlideIndex(getActiveSlideIndex() - 1);
        }

        await recalcSlidePositions(slides, getActiveSlideIndex(), direction);
      }, Promise.resolve());
    });
  });

  const triggerSlideChange = (direction) => {
    if (direction === SLIDE_CHANGE_DIRECTION.NEXT) {
      setActiveSlideIndex((getActiveSlideIndex() + 1) % slides.length);
    } else if (direction === SLIDE_CHANGE_DIRECTION.PREV) {
      setActiveSlideIndex((getActiveSlideIndex() - 1 + slides.length) % slides.length);
    }
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
