import { createOptimizedPicture } from '../../scripts/aem.js';
import { throttle } from '../../scripts/helpers.js';

export default async function decorate(block) {
  const images = block.querySelectorAll(':scope > div > div picture');

  if (images.length === 2) {
    block.classList.add('images-wide-row');
  }

  if (block.classList.contains('sticky')) {
    const bgImg = new Image();
    const img = block.querySelector('img');
    const pictureEl = createOptimizedPicture(img.src, '', false, [{ width: window.innerWidth }]);
    const imgUrl = pictureEl.querySelector('img').src;
    bgImg.onload = () => {
      block.style.backgroundImage = `url(${imgUrl})`;
      block.style.aspectRatio = `${bgImg.naturalWidth} / ${bgImg.naturalHeight}`;
    };
    bgImg.src = imgUrl;

    block.innerHTML = '';

    window.addEventListener('scroll', throttle(() => {
      const backgroundStyle = block.getBoundingClientRect().top > 0 ? 'scroll' : 'fixed';
      block.style.backgroundAttachment = backgroundStyle;
    }), 100);
  }
}
