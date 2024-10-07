import { preventScroll, throttle } from '../../scripts/helpers.js';

const setScaleForPicture = (block, picture) => {
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

const scrollToSlide = (slidersContainer, slideIndex) => {
  slidersContainer.style.transform = `translateY(-${slideIndex * 100}%)`;
  slidersContainer.querySelectorAll('.highlight-slide').forEach((slide, index) => {
    const addOrRemove = index === slideIndex ? 'add' : 'remove';
    slide.classList[addOrRemove]('active');
  });
};

const trapScrollingForSlides = (block, { prevSlide, nextSlide }) => {
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
        block.classList.add('active');
        if (enableScoll) {
          enableScoll();
        }
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

  setScaleForPicture(block, picture);

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
