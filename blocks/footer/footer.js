import { getMetadata } from '../../scripts/aem.js';
// import { getTextLabel } from '../../scripts/scripts.js';
import { loadFragment } from '../fragment/fragment.js';
import { addTitleAttributeToIconLink } from '../../scripts/helpers.js';

/**
 * loads and decorates the footer
 * @param {Element} block The footer block element
 */
export default async function decorate(block) {
  // load footer as fragment
  const footerMeta = getMetadata('footer');
  const footerPath = footerMeta ? new URL(footerMeta, window.location).pathname : '/footer';
  const fragment = await loadFragment(footerPath);

  // decorate footer DOM
  block.textContent = '';
  const footer = document.createElement('div');
  while (fragment.firstElementChild) footer.append(fragment.firstElementChild);

  const columns = [...footer.querySelectorAll('.columns > div > div')];
  columns.forEach((column) => {
    column.classList.add('footer-column');

    // each heading should be rendered as font-small
    [...column.querySelectorAll('h1, h2, h3, h4, h5, h6')].forEach((heading) => heading.classList.add('font-small'));
  });

  // a11y for social icons
  const socialIconLinks = footer.querySelectorAll('.footer-column:has(a[title=""]) a[title=""]');
  console.log('🚀 ~ decorate ~ socialIcons:', socialIconLinks);
  socialIconLinks.forEach((anchor) => addTitleAttributeToIconLink(anchor));

  const lists = [...footer.querySelectorAll('ul')];
  lists.forEach((list) => {
    [...list.querySelectorAll(':scope > li')].forEach((listItem) => {
      const textEl = document.createElement('span');
      textEl.classList.add('footer-list-item-text');
      listItem.classList.add('footer-list-item');
      textEl.append(...listItem.childNodes);

      // if the first child is an icon, move it back to the listItem
      const { nodeName, classList } = textEl.firstChild;
      if (nodeName.toLowerCase() === 'span' && classList.contains('icon')) {
        listItem.append(textEl.firstChild);
      }

      listItem.append(textEl);
    });
  });

  // TODO add back to top button
  // const backToTopIcon = `
  //   <svg width="18" height="10" viewBox="0 0 18 10">
  //     <polyline fill="none" stroke="currentColor" stroke-width="1.2" points="1 9 9 1 17 9">
  // </polyline>
  //   </svg>
  // `;

  // const backToTopText = getTextLabel('top');

  // const backToTopNode = document.createRange().createContextualFragment(`
  //   <button class="back-to-top">
  //     ${backToTopIcon}
  //     <span>${backToTopText}</span>
  //   </button>
  // `);

  // footer.querySelector('.section:last-child').prepend(backToTopNode);

  // footer.querySelector('.back-to-top').addEventListener('click', () => {
  //   window.scrollTo({
  //     top: 0,
  //     behavior: 'smooth',
  //   });
  // });

  block.append(footer);
}
