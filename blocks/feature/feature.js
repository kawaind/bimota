import {
  isInViewport, onAppReady, onSlideUpOrDown, throttle,
} from '../../scripts/helpers.js';

const setActiveSlide = (newActiveIndex, block) => {
  const slides = block.querySelectorAll('.feature-slides > div');
  const navItems = [...block.querySelectorAll('.feature-slide-nav-item')];

  slides.forEach((slide, index) => {
    if (newActiveIndex === index) {
      slide.style.opacity = '1';
      slide.style.zIndex = '1';
      slide.classList.add('active');
      navItems[index].classList.add('active');
    } else {
      slide.style.opacity = '0';
      slide.style.zIndex = '0';
      slide.classList.remove('active');
      navItems[index].classList.remove('active');
    }
  });
};

const getActiveSlideIndex = (block) => [...block.querySelectorAll('.feature-slide')]
  .findIndex((slide) => slide.classList.contains('active'));

const scrollToSlide = (block, slideIndex) => {
  setActiveSlide(slideIndex, block);
};

const createNavigation = (block, slideCount, onClick) => {
  const slidesDots = (new Array(slideCount))
    .fill(0)
    .map((_, index) => {
      const navItem = document.createElement('button');
      navItem.classList.add('feature-slide-nav-item');

      if (!index) {
        navItem.classList.add('active');
      }

      const dotEl = document.createElement('span');
      dotEl.classList.add('feature-slide-nav-dot');
      dotEl.textContent = index + 1;

      navItem.append(dotEl);
      navItem.addEventListener('click', () => onClick(index, block));

      return navItem;
    });

  const wrapper = document.createElement('div');
  wrapper.classList.add('feature-slides-nav');
  wrapper.append(...slidesDots);
  block.append(wrapper);
};

const trapScrollingForSlides = (block, {
  hasNextSlide, hasPrevSlide, move,
}) => {
  let restoreScolling = null;
  let prevY = window.scrollY;
  let blockedScrollYPosition = null;
  let paused = false;

  window.addEventListener('scroll', () => {
    if (paused) {
      window.scrollTo({ top: blockedScrollYPosition, behavior: 'instant' });
      return;
    }

    const hasSlideInDirection = prevY < window.scrollY ? hasNextSlide() : hasPrevSlide();
    prevY = window.scrollY;

    if (isInViewport(block)) {
      if (hasSlideInDirection) {
        paused = true;
        blockedScrollYPosition = window.scrollY;

        window.scrollTo({ top: blockedScrollYPosition, behavior: 'instant' });
        restoreScolling = onSlideUpOrDown({
          move: (direction) => move(direction, restoreScolling),
          onEnd: () => { paused = false; },
        });
        return;
      }
    }

    if (restoreScolling) {
      restoreScolling();
      restoreScolling = null;
    }
  });
};

export default async function decorate(block) {
  const slideCount = block.querySelectorAll(':scope > div').length;
  const slideWrapper = document.createElement('div');
  slideWrapper.classList.add('feature-slides');

  block.querySelectorAll(':scope > div').forEach((el, index) => {
    if (!index) {
      el.replaceWith(slideWrapper);
    }

    el.classList.add('feature-slide');
    slideWrapper.append(el);
  });

  block.querySelectorAll('.feature-slides > div > div').forEach((column) => {
    const type = column.querySelector('picture') ? 'image' : 'text';
    column.classList.add(`feature-${type}`);
  });

  const headings = block.querySelectorAll('h1, h2, h3, h4, h5, h6');

  headings.forEach((heading) => {
    heading.classList.add('h5');
  });

  createNavigation(block, slideCount, setActiveSlide);
  setActiveSlide(0, block);

  // making sure that the slide gets enought space to display slide navigation
  const onResize = () => {
    const firstTextEl = block.querySelector('.feature-text');
    const navEl = block.querySelector('.feature-slides-nav');
    const minHeight = window.getComputedStyle(navEl).height;

    firstTextEl.style.minHeight = `calc(${minHeight} + 20px)`;
  };

  onAppReady(onResize);

  window.addEventListener('resize', onResize);

  // trapping the scrolling so the user will scroll the next slides of the slider
  const hasPrevSlide = () => {
    const activeSlideIndex = getActiveSlideIndex(block);
    return activeSlideIndex > 0;
  };

  const hasNextSlide = () => {
    const activeSlideIndex = getActiveSlideIndex(block);

    return activeSlideIndex < slideCount - 1;
  };

  const prevSlide = (onNoPreSlide) => {
    const activeSlideIndex = getActiveSlideIndex(block);

    if (!hasPrevSlide()) {
      onNoPreSlide();
      return;
    }

    scrollToSlide(block, activeSlideIndex - 1);
  };
  const nextSlide = (onNoNextSlide) => {
    const activeSlideIndex = getActiveSlideIndex(block);

    if (!hasNextSlide()) {
      onNoNextSlide();
      return;
    }

    scrollToSlide(block, activeSlideIndex + 1);
  };

  const move = throttle((direction, onNoSlide) => {
    if (direction === 'up') {
      if (!hasPrevSlide()) {
        onNoSlide();
        return;
      }

      prevSlide();
    } else {
      if (!hasNextSlide()) {
        onNoSlide();
        return;
      }

      nextSlide();
    }
  }, 1000);

  trapScrollingForSlides(block, {
    hasNextSlide, hasPrevSlide, move,
  });
}
