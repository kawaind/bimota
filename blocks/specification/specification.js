import { autoScrollSlidesWhenInView, describeButton } from '../../scripts/helpers.js';

export default function decorate(block) {
  const animationTime = [...block.classList]
    .find((el) => el.startsWith('time-'))
    ?.split('time-')[1].replace('-', '.');
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
    let valueEl = el.nextElementSibling;

    while (valueEl && valueEl.classList.contains('specification-value')) {
      const siblingEl = valueEl.nextElementSibling;
      stat.append(valueEl);
      valueEl = siblingEl;
    }

    stat.prepend(el);

    specificationStatsWrapper.append(stat);
  });

  const getActiveSlideIndex = () => [...block.querySelectorAll('.specification-images > *')]
    .findIndex((slide) => slide.classList.contains('active'));

  const scrollToSlide = (_, slideIndex) => {
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

  scrollToSlide(block, 0);

  // Describe the CTA (e.g. "Mostra tutto") by its own text + the page title so
  // screen readers get context about which vehicle it relates to (WCAG 2.4.6).
  const pageTitle = document.querySelector('main h1');
  let ctaButton = block.querySelector('.button-container a.button');

  // The CTA opens the specification dialog rather than navigating, so it is a
  // native <button> (not a link) that announces the dialog it opens and its
  // open/closed state (KAW-11088, WCAG 4.1.2). The shared modal helper opens it
  // via data-modal and keeps aria-expanded in sync with the dialog.
  const modalName = ctaButton?.getAttribute('href')?.split('#')[1];
  if (ctaButton && modalName?.startsWith('modal-')) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = ctaButton.className;
    button.dataset.modal = modalName;
    button.setAttribute('aria-haspopup', 'dialog');
    button.setAttribute('aria-expanded', 'false');
    button.append(...ctaButton.childNodes);
    ctaButton.replaceWith(button);
    ctaButton = button;
  }

  if (pageTitle && ctaButton) {
    describeButton(ctaButton, pageTitle);
  }

  const slideCount = block.querySelectorAll('.specification-images > *').length;

  autoScrollSlidesWhenInView(block, {
    getActiveIndex: getActiveSlideIndex,
    slideCount,
    scrollToSlide,
    animationTime,
  });
}
