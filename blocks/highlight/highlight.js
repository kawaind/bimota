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
  });
};

const observeWhenBlockIsFullyVisible = (block) => {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting && entry.intersectionRatio === 1) {
        block.classList.add('active');
      } else {
        block.classList.remove('active');
      }
    });
  }, { threshold: [0, 1.0] });

  observer.observe(block);
};

export default async function decorate(block) {
  const [pictureWrapper, ...slides] = block.querySelectorAll(':scope > div');
  const slidesWrapper = document.createElement('div');

  slides.forEach((slide) => {
    slide.classList.add('highlight-slide');
    slide.querySelectorAll('h1, h2, h3, h4, h5, h6')
      .forEach((heading) => heading.classList.add('h1'));
  });

  slidesWrapper.classList.add('highlight-slides-wrapper');
  slidesWrapper.append(...slides);
  block.append(slidesWrapper);

  const picture = pictureWrapper.querySelector('picture');
  pictureWrapper.replaceWith(picture);

  setInitScaleForPicture(block, picture);
  observeWhenBlockIsFullyVisible(block);
}
