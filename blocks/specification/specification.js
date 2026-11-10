import { autoScrollSlidesWhenInView, labelCtaWithTitle } from '../../scripts/helpers.js';

const HEADINGS = 'h1, h2, h3, h4, h5, h6';

/**
 * The specification block has no heading of its own: its title is the Title
 * block authored right above it in the same section ("Technical Information").
 * Use the nearest heading before the block in its section, else the page h1.
 * @param {Element} block the specification block
 * @returns {Element|null} the component title
 */
const findComponentTitle = (block) => {
  const own = block.querySelector(HEADINGS);
  if (own) return own;
  let prev = block.closest('.specification-wrapper')?.previousElementSibling;
  while (prev) {
    const headings = prev.matches(HEADINGS) ? [prev] : [...prev.querySelectorAll(HEADINGS)];
    if (headings.length) return headings[headings.length - 1];
    prev = prev.previousElementSibling;
  }
  return document.querySelector('main h1');
};

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
    // Keep an authored title (e.g. "Click to open the specification of the
    // KB4"); decorateButtons fills a missing one with the link text, which
    // would only repeat the visible label, so that one is not copied.
    const { title } = ctaButton;
    if (title && title.trim() !== ctaButton.textContent.trim()) button.title = title;
    button.append(...ctaButton.childNodes);
    ctaButton.replaceWith(button);
    ctaButton = button;
  }

  // The CTA is announced as its own text, a pause, then the component title,
  // e.g. "Show All Specifications, Technical Information" (WCAG 2.4.4, 2.4.6).
  labelCtaWithTitle(ctaButton, findComponentTitle(block));

  const slideCount = block.querySelectorAll('.specification-images > *').length;

  autoScrollSlidesWhenInView(block, {
    getActiveIndex: getActiveSlideIndex,
    slideCount,
    scrollToSlide,
    animationTime,
  });
}
