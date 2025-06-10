import { throttle, gatherButtons } from '../../scripts/helpers.js';

const moveImageOnScroll = (block, settings = {}) => {
  const [firstImage, secondImage] = block.querySelectorAll('.column-with-images img');
  let inProgress = false;
  const {
    startOverlap = 0.1, // how much of the 2nd image should overlap the 1st one at the start (in %)
    endOverlap = 0.5, // how much of the 2nd image should overlap the 1st one at the end (in %)
    durationRatio = 0.66, // how much of the viewport should be scrolled to finish the animation
  } = settings;

  const onScroll = () => {
    const windowHeight = window.innerHeight || document.documentElement.clientHeight;
    // how many px it takes to move the image from bottom to top
    const durationInPx = windowHeight * durationRatio;
    const rect = firstImage.getBoundingClientRect();
    const distanceFromTheBottom = windowHeight - rect.bottom;
    const secondImageHeight = secondImage.height;
    let distance = 0;

    if (distanceFromTheBottom >= durationInPx) {
      distance = endOverlap * 100;
    } else if (distanceFromTheBottom < 0) {
      distance = startOverlap * 100;
    } else {
      const shiftRatio = (distanceFromTheBottom / durationInPx) * (endOverlap - startOverlap);
      distance = (shiftRatio + startOverlap) * 100;
    }

    const distanaceToPx = Math.round((distance * secondImageHeight) / 100);
    block.style.setProperty('--text-image-distance', `${distanaceToPx}px`);
    block.style.setProperty('--text-image-max-overlap', `${Math.round(endOverlap * secondImageHeight)}px`);
  };

  const onScrollListener = () => {
    if (!inProgress) {
      window.requestAnimationFrame(() => {
        onScroll();
        inProgress = false;
      });

      inProgress = true;
    }
  };

  window.addEventListener('scroll', throttle(onScrollListener, 200));
};

export default async function decorate(block) {
  const row = block.querySelector(':scope > div');

  row.classList.add('text-with-image-row');

  block.querySelectorAll(':scope > div > div').forEach((column, index) => {
    const columnType = column.querySelector('picture') ? 'images' : 'text';
    column.classList.add(`column-with-${columnType}`);

    const columnPosition = index === 0 ? 'left' : 'right';
    column.classList.add(`${columnPosition}-column`);
  });

  const headings = block.querySelectorAll('h1, h2, h3, h4, h5, h6');

  headings.forEach((heading) => {
    heading.classList.add('h3');
  });

  gatherButtons(block.querySelectorAll('.button-container'));

  if (block.classList.contains('stacked-images') || block.classList.contains('wide-stacked-images')) {
    moveImageOnScroll(block, { startOverlap: -1, endOverlap: 0.3, durationRatio: 0.33 });
  }
}
