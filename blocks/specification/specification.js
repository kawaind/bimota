import { isInViewport, preventScroll, throttle } from '../../scripts/helpers.js';

export default function decorate(block) {
  const content = block.querySelector(':scope > div');
  content.classList.add('specification-content');
  const textContent = block.querySelector(':scope > div > div:first-child');
  const imagesWrapper = block.querySelector(':scope > div > div:nth-child(2)');
  const statisticsWrapper = document.createElement('div');

  statisticsWrapper.classList.add('specification-statistics');
  textContent.classList.add('specification-text-content');

  // adding proper styles for stats labels and values
  textContent.querySelectorAll('p').forEach((paragraph) => {
    const strongEls = paragraph.querySelectorAll('strong');
    const hasButton = paragraph.classList.contains('button-container');

    if (strongEls.length > 0) {
      paragraph.classList.add('font-small', 'specification-value');
      strongEls.forEach((s) => {
        s.classList.add('h5');
      });
    } else if (!hasButton) {
      paragraph.classList.add('font-small', 'specification-label');
    }
  });

  imagesWrapper.classList.add('specification-images');

  // grouping all of the stats label and values
  const specificationStatsWrapper = document.createElement('div');
  specificationStatsWrapper.classList.add('specification-stats-wrapper');
  textContent.insertBefore(specificationStatsWrapper, textContent.querySelector('.specification-label'));

  textContent.querySelectorAll('.specification-label').forEach((el) => {
    const stat = document.createElement('div');
    stat.classList.add('specification-stat');
    const valueEl = el.nextElementSibling;

    stat.append(el);
    stat.append(valueEl);
    specificationStatsWrapper.append(stat);
  });

  // trapping the scrolling so the user will scroll the next slides of the slider
  const trapScrollingForSlides = ({ hasNextSlide, hasPrevSlide, move }) => {
    let enableScroll = null;
    let prevY = window.scrollY;

    window.addEventListener('scroll', () => {
      const hasSlideInDirection = prevY < window.scrollY ? hasNextSlide() : hasPrevSlide();
      prevY = window.scrollY;

      if (isInViewport(block)) {
        block.classList.add('active');

        if (hasSlideInDirection) {
          if (enableScroll) {
            // enablingScroll just to make sure that all of the event listener
            // blocking it are removed they will be replaced by the preventScroll with new ones
            enableScroll();
          }
          block.scrollIntoView({ block: 'nearest', behaviour: 'smooth' });

          enableScroll = preventScroll({ move: (direction) => move(direction, enableScroll) });
        }
      } else {
        block.classList.remove('active');
        if (enableScroll) {
          enableScroll();
          enableScroll = null;
        }
      }
    });
  };

  const getActiveSlideIndex = () => [...block.querySelectorAll('.specification-images > *')]
    .findIndex((slide) => slide.classList.contains('active'));

  const scrollToSlide = (slideIndex) => {
    [...block.querySelectorAll('.specification-images > *')]
      .forEach((el, index) => {
        if (slideIndex === index) {
          el.style.opacity = '1';
          el.classList.add('active');
        } else {
          el.style.opacity = '0';
          el.classList.remove('active');
        }
      });
  };

  const hasPrevSlide = () => {
    const activeSlideIndex = getActiveSlideIndex();
    return activeSlideIndex > 0;
  };

  const hasNextSlide = () => {
    const activeSlideIndex = getActiveSlideIndex();
    const slideCount = block.querySelectorAll('.specification-images > *').length;

    return activeSlideIndex < slideCount - 1;
  };

  const prevSlide = (onNoPreSlide) => {
    const activeSlideIndex = getActiveSlideIndex();

    if (!hasPrevSlide()) {
      onNoPreSlide();
      return;
    }

    scrollToSlide(activeSlideIndex - 1);
  };
  const nextSlide = (onNoNextSlide) => {
    const activeSlideIndex = getActiveSlideIndex();

    if (!hasNextSlide()) {
      onNoNextSlide();
      return;
    }

    scrollToSlide(activeSlideIndex + 1);
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

  scrollToSlide(0);
  trapScrollingForSlides({ hasNextSlide, hasPrevSlide, move });
}
