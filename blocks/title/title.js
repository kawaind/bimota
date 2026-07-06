import { adjustPretitle, forceHeadingLevel } from '../../scripts/helpers.js';

export default async function decorate(block) {
  adjustPretitle(block);
  const isLineVariant = block.classList.contains('line');

  const headings = block.querySelectorAll('h1, h2, h3, h4, h5, h6');
  [...headings].forEach((heading) => {
    // Title: always semantic H2 (accessible outline); visual size unchanged.
    const headingClass = isLineVariant ? 'h2' : 'h1';
    forceHeadingLevel(heading, 'h2', headingClass);
  });

  const pretitle = block.querySelector('.pretitle');
  pretitle?.classList.add('h5');

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
