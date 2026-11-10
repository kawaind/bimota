import { createOptimizedPicture } from '../../scripts/aem.js';

export default async function decorate(block) {
  const images = block.querySelectorAll(':scope > div > div picture');

  if (images.length === 2) {
    block.classList.add('images-wide-row');
  }

  if (block.classList.contains('sticky')) {
    const img = block.querySelector('img');
    // Keep the authored alt text (WCAG 1.1.1); an empty alt stays decorative.
    const alt = img.getAttribute('alt') || '';
    const pictureEl = createOptimizedPicture(img.src, alt, false, [{ width: window.innerWidth }]);

    block.querySelector('picture').replaceWith(pictureEl);
    window.addEventListener('scroll', () => {
      const { top } = block.getBoundingClientRect();

      if (top < 0) {
        pictureEl.style.top = `${top * -1}px`;
      } else {
        pictureEl.style.top = 0;
      }
    });
  }
}
