import { getMetadata, getRootPath } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';
import { addTitleAttributeToIconLink } from '../../scripts/helpers.js';
import { customDecoreateIcons } from '../../scripts/decorate-icon-helper.js';

const addFlagIcon = (flagWrapper, country) => {
  const flagIcon = document.createElement('span');
  flagIcon.classList.add('icon', `icon-${country}`);

  flagWrapper.append(flagIcon);
};
/**
 * loads and decorates the footer
 * @param {Element} block The footer block element
 */
export default async function decorate(block) {
  // load footer as fragment
  const footerMeta = getMetadata('footer');
  const footerPath = footerMeta ? new URL(footerMeta, window.location).pathname : `${getRootPath()}/footer`;
  const fragment = await loadFragment(footerPath);

  // decorate footer DOM
  block.textContent = '';
  const footer = document.createElement('div');
  while (fragment.firstElementChild) footer.append(fragment.firstElementChild);

  // country selector changes
  const selectedCountry = sessionStorage.getItem('country-selected');
  const buttonSelector = footer.querySelector('[href="/#modal-country-selector"]');
  const csWrapper = buttonSelector.parentElement;
  const csContainer = csWrapper.parentElement;
  csContainer.classList.add('footer-cs-wrapper');
  csContainer.classList.remove('default-content-wrapper');

  const title = document.createElement('span');
  title.textContent = csWrapper.firstChild.textContent;

  const flagWrapper = document.createElement('div');
  flagWrapper.classList.add('footer-cs-button-wrapper');
  if (selectedCountry) {
    addFlagIcon(flagWrapper, selectedCountry.split(' ')[0].toLowerCase());

    const textEle = document.createElement('span');
    textEle.textContent = selectedCountry;
    flagWrapper.append(textEle, buttonSelector);
  }

  buttonSelector.classList.add('footer-cs-button');
  csContainer.append(title, flagWrapper);
  csWrapper.remove();

  const columns = [...footer.querySelectorAll('.columns > div > div')];
  columns.forEach((column) => {
    column.classList.add('footer-column');

    // each heading should be rendered as font-small
    [...column.querySelectorAll('h1, h2, h3, h4, h5, h6')].forEach((heading) => heading.classList.add('font-small'));
  });

  // a11y for social icons
  const socialIconLinks = footer.querySelectorAll('.footer-column:has(a[title=""]) a[title=""]');
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

  // Back to top button
  const backToTopNode = document.createRange().createContextualFragment(`
    <button class="back-to-top">
      <img data-icon-name="arrow" src="/icons/chevron-up.svg" alt="" loading="lazy">
    </button>
  `);

  footer.prepend(backToTopNode);

  const backToTopButton = footer.querySelector('.back-to-top');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        backToTopButton.style.position = 'absolute';
        backToTopButton.style.bottom = `${entry.boundingClientRect.height + 40}px`;
      } else {
        backToTopButton.style.position = 'fixed';
        backToTopButton.style.bottom = '40px';
      }
    });
  });
  observer.observe(footer);

  window.addEventListener('scroll', () => {
    const scrollPosition = window.scrollY + window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;

    // Display button if user scrolls close to the bottom, 40px above the footer
    if (scrollPosition >= documentHeight / 3) {
      backToTopButton.style.display = 'block';
    } else {
      backToTopButton.style.display = 'none';
    }
  });

  footer.querySelector('.back-to-top').addEventListener('click', () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  });

  customDecoreateIcons(footer);
  block.append(footer);
}
