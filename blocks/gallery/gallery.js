import { onAppReady } from '../../scripts/helpers.js';

export default async function decorate(block) {
  const targets = block.querySelectorAll('.gallery div:has(>picture)');

  const calcImagesIntersectionRatio = () => {
    [...targets].forEach((el) => {
      const { top, bottom, height } = el.getBoundingClientRect();
      let imageVisibleInPx = height;

      if (top > window.innerHeight) {
        imageVisibleInPx = 0;
      } else if (top > 0 && bottom > window.innerHeight) {
        imageVisibleInPx = window.innerHeight - top;
      } else if (top < 0 && bottom > window.innerHeight) {
        imageVisibleInPx = window.innerHeight + Math.abs(top);
      } else if (top < 0 && bottom < window.innerHeight) {
        imageVisibleInPx = bottom + Math.abs(top);
      }
      const imageVisibilityInPercent = (imageVisibleInPx * 100) / height;

      el.style.setProperty('--gallery-intersection-ratio', imageVisibilityInPercent);
    });
  };

  let scrollEventListener = null;
  const startImagesAnimation = () => {
    calcImagesIntersectionRatio();

    window.addEventListener('scroll', calcImagesIntersectionRatio);
  };

  const endImagesAnimation = () => {
    if (scrollEventListener) {
      window.removeEventListener('scroll', scrollEventListener);
      scrollEventListener = null;
    }
  };

  // only observe on large screens
  const isSmallUp = window.matchMedia('(min-width: 768px)');

  if (isSmallUp.matches) {
    onAppReady(startImagesAnimation);
  }

  isSmallUp.addEventListener('change', (evt) => {
    if (evt.matches) {
      startImagesAnimation();
    } else {
      endImagesAnimation();
    }
  });
}
