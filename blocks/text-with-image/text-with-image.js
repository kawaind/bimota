const gatherButtons = (buttonsContainers) => {
  let currentButtonContainer;

  buttonsContainers.forEach((buttonContainer) => {
    if (currentButtonContainer?.nextElementSibling === buttonContainer) {
      currentButtonContainer.append(buttonContainer.children[0]);
      buttonContainer.remove();
    } else {
      currentButtonContainer = buttonContainer;
    }
  });
};

const moveImageOnScroll = (block, settings = {}) => {
  const [firstImage, secondImage] = block.querySelectorAll('.column-with-images img');
  let inProgeress = false;
  const {
    minOverlap = 0.1,
    maxOverlap = 0.5,
    durationRatio = 0.66,
  } = settings;

  const onScroll = () => {
    const windowHeight = window.innerHeight || document.documentElement.clientHeight;
    // how many px it takes to move the image from bottom to top
    const durationInPx = windowHeight * durationRatio;
    const rect = firstImage.getBoundingClientRect();
    const distanceFromTheBottom = windowHeight - rect.bottom;
    const secondImageHeight = secondImage.height;
    let overlapInPx = 0;

    if (distanceFromTheBottom >= durationInPx) {
      overlapInPx = (1 - maxOverlap) * secondImageHeight;
    } else if (distanceFromTheBottom < 0) {
      overlapInPx = (1 - minOverlap) * secondImageHeight;
    } else {
      const shiftRatio = (distanceFromTheBottom / durationInPx) * (maxOverlap - minOverlap);
      overlapInPx = (1 - (shiftRatio + minOverlap)) * secondImageHeight;
    }

    // fix for strange scroll event with less then 1px
    if (Math.abs(firstImage.style.marginBottom.split('px')[0] - overlapInPx) > 1) {
      firstImage.style.marginBottom = `${overlapInPx}px`;
      block.style.setProperty('--text-image-distance', `${secondImageHeight - overlapInPx}px`);
    }
  };

  window.addEventListener('scroll', () => {
    if (!inProgeress) {
      window.requestAnimationFrame(() => {
        onScroll();
        inProgeress = false;
      });

      inProgeress = true;
    }
  });
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

  if (block.classList.contains('stacked-images')) {
    moveImageOnScroll(block);
  }

  if (block.classList.contains('wide-stacked-images')) {
    moveImageOnScroll(block, { minOverlap: -1, maxOverlap: 0.4, durationRatio: 0.3 });
  }
}
