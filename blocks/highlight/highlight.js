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

const getActiveSlideIndex = (slidersContainer) => [...slidersContainer.querySelectorAll('.highlight-slide')].findIndex((slide) => slide.classList.contains('active'));

const scrollToSlide = (slidersContainer, slideIndex) => {
  slidersContainer.style.transform = `translateY(-${slideIndex * 100}%)`;
  slidersContainer.querySelectorAll('.highlight-slide').forEach((slide, index) => {
    const addOrRemove = index === slideIndex ? 'add' : 'remove';
    slide.classList[addOrRemove]('active');
  });
};

const getOnScroll = (block) => {
  const container = block.querySelector('.highlight-slides-container');
  let prevScrollY = window.scrollY;
  let pause = false;

  const pauseForMoment = () => {
    pause = true;

    setTimeout(() => {
      pause = false;
    }, 1000);
  };

  pauseForMoment();

  const onScroll = () => {
    if (pause) {
      block.scrollIntoView({ block: 'end', behavior: 'instant' });
      return;
    }

    const activeSlideIndex = getActiveSlideIndex(container);
    const slideCount = container.querySelectorAll('.highlight-slide').length;
    const deltaY = window.scrollY - prevScrollY;

    pauseForMoment();

    if (deltaY > 0 && activeSlideIndex < slideCount - 1) {
      scrollToSlide(container, activeSlideIndex + 1);
      block.scrollIntoView({ block: 'end' });
    } else if (deltaY < 0 && activeSlideIndex > 0) {
      scrollToSlide(container, activeSlideIndex - 1);
      block.scrollIntoView({ block: 'end' });
    } else {
      // remove the listener when there is no more slides in the direction
      window.removeEventListener('scroll', onScroll, { passive: false });
    }

    prevScrollY = window.scrollY;
  };

  return onScroll;
};

const trap = (block) => {
  const onScroll = getOnScroll(block);

  window.addEventListener('scroll', onScroll, { passive: false });
  block.scrollIntoView({ block: 'end' });
};

const observeWhenBlockIsFullyVisible = (block) => {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting && entry.intersectionRatio >= 0.9) {
        block.classList.add('active');
        trap(block);
      } else {
        block.classList.remove('active');
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
  observeWhenBlockIsFullyVisible(block);
}
