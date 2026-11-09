import { createOptimizedPicture } from '../../scripts/aem.js';

// A year ("2025") or a date ("12.03.2025", "2025-03-12") authored above a title.
const YEAR_OR_DATE = /^(\d{4}|\d{1,2}[./-]\d{1,2}[./-]\d{2,4}|\d{4}-\d{2}-\d{2})$/;

/**
 * The year (e.g. of an owner's manual) is authored as a paragraph above the
 * card title, so heading navigation announced only "KB998 Rimini Manual"
 * (KAW-11059, WCAG 2.4.6). Add it to the heading as visually hidden text
 * ("KB998 Rimini Manual, 2025") and hide the visible copy from assistive
 * technology, so it is not read twice. No visual change.
 * @param {Element} card the card element
 */
function addYearToHeading(card) {
  const heading = card.querySelector('h1, h2, h3, h4, h5, h6');
  const label = heading?.previousElementSibling;
  const year = label?.tagName === 'P' ? label.textContent.trim() : '';
  if (!YEAR_OR_DATE.test(year)) return;
  const separator = (document.documentElement.lang || '').toLowerCase().startsWith('ja') ? '、' : ', ';
  const hidden = document.createElement('span');
  hidden.className = 'sr-only';
  hidden.textContent = `${separator}${year}`;
  heading.append(hidden);
  label.setAttribute('aria-hidden', 'true');
}

export default function decorate(block) {
  /* change to ul, li */
  const ul = document.createElement('ul');
  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    li.append(...row.children);
    [...li.children].forEach((div) => {
      if (div.children.length === 1 && div.querySelector('picture')) div.className = 'news-stories-card-image';
      else div.className = 'news-stories-card-body';
    });
    ul.append(li);
    // each heading should be rendered as h5
    [...li.querySelectorAll('h1, h2, h3, h4, h5, h6')].forEach((heading) => heading.classList.add('h5'));
    addYearToHeading(li);
  });
  ul.querySelectorAll('picture > img').forEach((img) => img.closest('picture').replaceWith(createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }])));
  block.textContent = '';
  block.append(ul);
}
