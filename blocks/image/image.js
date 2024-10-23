import { createOptimizedPicture } from '../../scripts/aem.js';
import { throttle } from '../../scripts/helpers.js';

export default async function decorate(block) {
  const images = block.querySelectorAll(':scope > div > div picture');

  if (images.length === 2) {
    block.classList.add('images-wide-row');
  }

  if (block.classList.contains('sticky')) {
    const img = block.querySelector('img');
    const pictureEl = createOptimizedPicture(img.src, '', false, [{ width: window.innerWidth }]);

    block.querySelector('picture').replaceWith(pictureEl);
    window.addEventListener('scroll', throttle(() => {
      const { top } = block.getBoundingClientRect();

      if (top < 0) {
        pictureEl.style.top = `${top * -1}px`;
      } else {
        pictureEl.style.top = 0;
      }
    }), 10);
  }
}
