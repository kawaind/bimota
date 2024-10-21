import { isInViewport, onSlideUpOrDown, throttle } from './helpers.js';

const trapScrollingForSlides = (block, {
  hasNextSlide, hasPrevSlide, move, onInViewport,
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
      onInViewport(true);

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
    } else {
      onInViewport(false);
    }

    if (restoreScolling) {
      restoreScolling();
      restoreScolling = null;
    }
  });
};

const addSliding = (block, {
  getActiveSlideIndex, slideCount, scrollToSlide, onInViewport = () => { },
}) => {
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
    hasNextSlide, hasPrevSlide, move, onInViewport,
  });
};

export default addSliding;
