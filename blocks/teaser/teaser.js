import { createOptimizedPicture } from '../../scripts/aem.js';
import { forceHeadingLevel, describeButton } from '../../scripts/helpers.js';

export default function decorate(block) {
  /* change to ul, li */
  const ul = document.createElement('ul');
  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    li.append(...row.children);
    [...li.children].forEach((div) => {
      if (div.children.length === 1 && div.querySelector('picture')) div.className = 'teaser-card-image';
      else div.className = 'teaser-card-body';
    });
    ul.append(li);
    // Title: always semantic H2, visually sized as H4 (accessible outline).
    const [titleEl] = [...li.querySelectorAll('h1, h2, h3, h4, h5, h6')]
      .map((heading) => forceHeadingLevel(heading, 'h2', 'h4'));
    // Describe each card's CTA by its own text + the card title (WCAG 2.4.6).
    if (titleEl) {
      li.querySelectorAll('a.button').forEach((button) => describeButton(button, titleEl));
    }
  });
  ul.querySelectorAll('picture > img').forEach((img) => img.closest('picture').replaceWith(createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }])));
  block.textContent = '';
  block.append(ul);
}
