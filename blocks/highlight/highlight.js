import { autoScrollSlidesWhenInView, throttle, forceHeadingLevel } from '../../scripts/helpers.js';

const setScaleForPicture = (block, picture, onSetScale) => {
  const setScale = () => {
    const isNotMobile = window.matchMedia('(width >= 768px)').matches;
    const mobileAspectRatio = 3 / 4;
    const noneMobileAspectRatio = 16 / 9;
    const aspectRatio = isNotMobile ? noneMobileAspectRatio : mobileAspectRatio;

    const maxWidth = document.body.clientWidth;
    const maxHeight = maxWidth / aspectRatio;

    const initialWidth = block.clientWidth;
    block.style.height = maxHeight;

    const initScale = initialWidth / maxWidth;

    picture.style.transform = `scale(${initScale})`;
    onSetScale(initScale);
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.intersectionRatio > 0) {
        setScale(block, picture);
        observer.disconnect();
      }
    });
  }, { threshold: [0.1], rootMargin: '100px' });

  observer.observe(block);

  window.addEventListener('resize', throttle(() => {
    setScale(block, picture);
  }, 250));
};

const getActiveSlideIndex = (block) => [...block.querySelectorAll('.highlight-slide')]
  .findIndex((slide) => slide.classList.contains('active'));

const scrollToSlide = (block, slideIndex) => {
  const slidersContainer = block.querySelector('.highlight-slides-container');
  slidersContainer.style.transform = `translateY(-${slideIndex * 100}%)`;
  slidersContainer.querySelectorAll('.highlight-slide').forEach((slide, index) => {
    const isActive = index === slideIndex;
    slide.classList[isActive ? 'add' : 'remove']('active');
    // Only the visible slide is exposed to assistive tech, so screen readers
    // announce just its title and body copy (WCAG 4.1.2). The CSS also hides
    // inactive slides from layout/focus once faded out.
    slide.setAttribute('aria-hidden', isActive ? 'false' : 'true');
  });
};

const addFlag = (block) => {
  const falgEl = `
    <svg width="100" height="80" viewBox="0 0 100 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect y="0.351562" width="14.2857" height="80" fill="#ED1C24"/>
      <rect x="28.5714" y="0.351562" width="14.2857" height="80" fill="#ED1C24"/>
      <rect x="57.1429" y="0.351562" width="14.2857" height="80" fill="white"/>
      <rect x="85.7143" y="0.351562" width="14.2857" height="80" fill="white"/>
    </svg>
  `;

  const flagWrapper = document.createElement('div');
  flagWrapper.classList.add('flag-wrapper');
  flagWrapper.innerHTML = (falgEl);
  block.append(flagWrapper);
};

export default async function decorate(block) {
  const [pictureWrapper, ...slides] = block.querySelectorAll(':scope > div');
  const slidesWrapper = document.createElement('div');
  const slidesContainer = document.createElement('div');
  const animationTime = [...block.classList]
    .find((el) => el.startsWith('time-'))
    ?.split('time-')[1].replace('-', '.');

  // The block is an auto-rotating region; label it so screen-reader users get
  // structural context when they enter it (WCAG 1.3.1).
  block.setAttribute('role', 'region');
  block.setAttribute('aria-roledescription', 'carousel');
  block.setAttribute('aria-label', 'Highlighted Features');

  const totalSlides = slides.length;
  slides.forEach((slide, index) => {
    slide.classList.add('highlight-slide');
    // Each slide is a labelled group giving "slide X of Y" context.
    slide.setAttribute('role', 'group');
    slide.setAttribute('aria-roledescription', 'slide');
    slide.setAttribute('aria-label', `slide ${index + 1} of ${totalSlides}`);
    // Only the first slide is exposed to AT initially; the rest are hidden.
    slide.setAttribute('aria-hidden', index === 0 ? 'false' : 'true');
    // Title: always semantic H3, visually sized as H1 (accessible outline).
    slide.querySelectorAll('h1, h2, h3, h4, h5, h6')
      .forEach((heading) => forceHeadingLevel(heading, 'h3', 'h1'));

    if (index === 0) {
      slide.classList.add('active');
    }
  });

  slidesWrapper.classList.add('highlight-slides-wrapper');
  slidesContainer.classList.add('highlight-slides-container', 'h6');
  slidesContainer.append(...slides);
  slidesWrapper.append(slidesContainer);
  block.append(slidesWrapper);

  const picture = pictureWrapper.querySelector('picture');
  // Background image is decorative by default: only expose it to AT when the
  // author supplied meaningful alt text in the da.live document (WCAG 1.1.1).
  const img = picture.querySelector('img');
  if (img && !img.getAttribute('alt')?.trim()) {
    img.setAttribute('alt', '');
  }
  pictureWrapper.replaceWith(picture);

  addFlag(block);
  const onSetScaleForPicture = (value) => {
    const space = ((1 - value) / 2) * 100;
    block.style.setProperty('--flag-margin', `${space}%`);
  };
  setScaleForPicture(block, picture, onSetScaleForPicture);

  const slideCount = [...block.querySelectorAll('.highlight-slide')].length;

  autoScrollSlidesWhenInView(block, {
    getActiveIndex: getActiveSlideIndex,
    slideCount,
    scrollToSlide,
    animationTime,
  });
}
