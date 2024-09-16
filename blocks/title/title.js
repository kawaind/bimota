import { unwrapDivs, adjustPretitle } from '../../scripts/helpers.js';

export default async function decorate(block) {
  unwrapDivs(block);
  adjustPretitle(block);

  const headings = block.querySelectorAll('h1, h2, h3, h4, h5, h6');
  [...headings].forEach((heading) => heading.classList.add('heading'));

  const isLineVariant = block.classList.contains('line');

  if (isLineVariant) {
    const lineEle = document.createElement('div');
    lineEle.classList.add('vertical-line-wrapper');
    const innerEle = document.createElement('div');
    innerEle.classList.add('vertical-line');
    lineEle.appendChild(innerEle);
    block.prepend(lineEle);

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          innerEle.classList.add('animate');
        } else {
          innerEle.classList.remove('animate');
        }
      });
    });
    observer.observe(block);
  }
}
