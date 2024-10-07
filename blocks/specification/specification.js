import { preventScroll } from '../../scripts/helpers.js';

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
  const trapScrollingForSlides = ({ prevSlide, nextSlide }) => {
    let enableScoll = null;

    const observer = new IntersectionObserver((entries) => {
      const moveDown = () => {
        nextSlide(enableScoll);
        document.body.style.overflow = '';
      };
      const moveUp = () => {
        prevSlide(enableScoll);
        document.body.style.overflow = '';
      };

      entries.forEach((entry) => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.9) {
          if (enableScoll) {
            enableScoll();
          }
          enableScoll = preventScroll({ moveDown, moveUp });
        } else if (enableScoll) {
          enableScoll();
          enableScoll = null;
        }
      });
    }, { threshold: [0.1, 0.9] });

    observer.observe(block);
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

  const prevSlide = (onNoPreSlide) => {
    const activeSlideIndex = getActiveSlideIndex(block);

    if (activeSlideIndex <= 0) {
      onNoPreSlide();
      return;
    }

    scrollToSlide(activeSlideIndex - 1);
  };
  const nextSlide = (onNoNextSlide) => {
    const activeSlideIndex = getActiveSlideIndex(block);
    const slideCount = block.querySelectorAll('.specification-images > *').length;

    if (activeSlideIndex >= slideCount - 1) {
      onNoNextSlide();
      return;
    }

    scrollToSlide(activeSlideIndex + 1);
  };

  scrollToSlide(0);
  trapScrollingForSlides({ prevSlide, nextSlide });
}
