import { throttle } from '../../scripts/helpers.js';

const setInitScaleForPicture = (block, picture) => {
  const isNotMobile = window.matchMedia('(width >= 768px)').matches;
  const mobileAspectRatio = 3 / 4;
  const noneMobileAspectRatio = 16 / 9;
  const aspectRatio = isNotMobile ? noneMobileAspectRatio : mobileAspectRatio;

  const maxWidth = document.body.clientWidth;
  const maxHeight = maxWidth / aspectRatio;

  // for some reason the block.clientWidth is 0
  // so we need to wait for the repaint
  setTimeout(() => {
    const initialWidth = block.clientWidth;
    block.style.height = maxHeight;

    const initScale = initialWidth / maxWidth;

    picture.style.transform = `scale(${initScale})`;
  }, 100);
};

const getActiveSlideIndex = (block) => [...block.querySelectorAll('.highlight-slide')]
  .findIndex((slide) => slide.classList.contains('active'));

const scrollToSlide = (slidersContainer, slideIndex) => {
  slidersContainer.style.transform = `translateY(-${slideIndex * 100}%)`;
  slidersContainer.querySelectorAll('.highlight-slide').forEach((slide, index) => {
    const addOrRemove = index === slideIndex ? 'add' : 'remove';
    slide.classList[addOrRemove]('active');
  });
};

function preventScroll({ moveDown, moveUp }) {
  let startX;
  let startY;
  let isInitPause = true; // pause the moving event for 1s - fix for Firefox

  setTimeout(() => { isInitPause = false; }, 1000);

  const move = throttle((direction) => {
    if (isInitPause) {
      return;
    }

    if (direction === 'down') {
      moveDown();
      return;
    }

    moveUp();
  }, 1000);

  const touchStart = (event) => {
    // Store the starting touch position
    startX = event.touches[0].pageX;
    startY = event.touches[0].pageY;
    document.body.style.overflow = 'hidden';
  };

  const touchMove = (event) => {
    event.preventDefault();

    // Calculate the distance moved in both directions
    const moveX = event.touches[0].pageX - startX;
    const moveY = event.touches[0].pageY - startY;

    // Determine direction
    if (Math.abs(moveY) > Math.abs(moveX)) {
      if (moveY > 0) {
        move('up');
      } else {
        move('down');
      }
    }
  };

  const onWheel = (event) => {
    if (event.cancelable) {
      event.preventDefault();
      event.stopPropagation();
    }

    document.body.style.overflow = 'hidden';

    if (event.deltaY > 0) {
      move('down');
    } else {
      move('up');
    }
  };

  window.addEventListener('touchstart', touchStart, { passive: false });
  window.addEventListener('touchmove', touchMove, { passive: false });
  window.addEventListener('wheel', onWheel, { passive: false });

  const enableScroll = () => {
    window.removeEventListener('touchstart', touchStart, { passive: false });
    window.removeEventListener('touchmove', touchMove, { passive: false });
    window.removeEventListener('wheel', onWheel, { passive: false });
  };

  return enableScroll;
}

const trapScrollingForSlides = (block, { prevSlide, nextSlide }) => {
  const observer = new IntersectionObserver((entries) => {
    let enableScoll = null;
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
        block.classList.add('active');
        enableScoll = preventScroll({ moveDown, moveUp });
      } else {
        block.classList.remove('active');
        if (enableScoll) {
          enableScoll();
          enableScoll = null;
        }
      }
    });
  }, { threshold: [0.1, 0.9] });

  observer.observe(block);
};

export default async function decorate(block) {
  const [pictureWrapper, ...slides] = block.querySelectorAll(':scope > div');
  const slidesWrapper = document.createElement('div');
  const slidesContainer = document.createElement('div');

  slides.forEach((slide, index) => {
    slide.classList.add('highlight-slide');
    slide.querySelectorAll('h1, h2, h3, h4, h5, h6')
      .forEach((heading) => heading.classList.add('h1'));

    if (index === 0) {
      slide.classList.add('active');
    }
  });

  slidesWrapper.classList.add('highlight-slides-wrapper');
  slidesContainer.classList.add('highlight-slides-container');
  slidesContainer.append(...slides);
  slidesWrapper.append(slidesContainer);
  block.append(slidesWrapper);

  const picture = pictureWrapper.querySelector('picture');
  pictureWrapper.replaceWith(picture);

  setInitScaleForPicture(block, picture);

  // trapping the scrolling so the user will scroll the next slides of the slider
  const container = block.querySelector('.highlight-slides-container');
  const prevSlide = (onNoPreSlide) => {
    const activeSlideIndex = getActiveSlideIndex(block);

    if (activeSlideIndex <= 0) {
      onNoPreSlide();
      return;
    }

    scrollToSlide(container, activeSlideIndex - 1);
  };
  const nextSlide = (onNoNextSlide) => {
    const activeSlideIndex = getActiveSlideIndex(block);
    const slideCount = block.querySelectorAll('.highlight-slide').length;

    if (activeSlideIndex >= slideCount - 1) {
      onNoNextSlide();
      return;
    }

    scrollToSlide(container, activeSlideIndex + 1);
  };

  trapScrollingForSlides(block, { prevSlide, nextSlide });
}
