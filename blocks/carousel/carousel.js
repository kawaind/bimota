const getCarouselPadding = (itemIndex) => `calc(-1 * (${itemIndex - 0.5} * var(--slide-width) + var(--slide-gap) * ${itemIndex - 1}))`;

const recalcSlidePositions = (slides, activeSlideIndex, direction, prevActiveSlideIndex) => {
  const slidesList = [...slides];
  const slidesCount = slidesList.length;
  const centerItemIndex = Math.floor(slidesCount / 2);
  const carouselEl = slides[0].closest('.carousel').querySelector('.carousel-slide-wrapper');

  debugger;

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
    carouselEl.addEventListener('transitionend', () => { carouselEl.classList.remove('transition-effect'); }, { once: true });
  }

  carouselEl.style.transform = `translateX(${toPaddingInCalc})`;
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
    `<div class="carousel-nav">
      ${slides.map((slide, index) => `<button>${index}</button>`).join('')}
    </div>`,
  );

  block.append(slideWrapper);
  block.append(buttons.children[0]);
  block.append(carouselNav.children[0]);

  let activeSlideIndex = 0;
  let prevActiveSlideIndex = 0;

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
      recalcSlidePositions(slides, activeSlideIndex, null, prevActiveSlideIndex);
    });
  });
}
