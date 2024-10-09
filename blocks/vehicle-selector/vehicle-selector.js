/* eslint-disable max-len */
import { createElement } from '../../scripts/helpers.js';
import { smoothScrollHorizontal } from '../../scripts/motion-helper.js';

const blockName = 'vehicle-selector';

function stripEmptyTags(main, child) {
  if (child !== main && child.innerHTML.trim() === '') {
    const parent = child.parentNode;
    child.remove();
    stripEmptyTags(main, parent);
  }
}

function buildTabNavigation(tabItems, clickHandler) {
  const tabNavigation = createElement('ul', { classes: `${blockName}__navigation` });
  const navigationLine = createElement('li', { classes: `${blockName}__navigation-line` });

  tabItems.forEach((tabItem, i) => {
    const listItem = createElement('li', { classes: `${blockName}__navigation-item` });
    const button = createElement('button');
    button.classList.add('h5');
    button.addEventListener('click', () => clickHandler(i));
    // TODO make surer i target the right heading
    const tabTitle = tabItem.querySelector('h1,h2,h3,h4,h5,h6');
    button.innerText = tabTitle.innerText;
    tabTitle.remove();

    listItem.append(button);
    tabNavigation.append(listItem);
  });

  tabNavigation.append(navigationLine);

  return tabNavigation;
}

const updateActiveItem = (index) => {
  const images = document.querySelector(`.${blockName}__images-container`);
  const descriptions = document.querySelector(`.${blockName}__description-container`);
  const navigation = document.querySelector(`.${blockName}__navigation`);

  [images, descriptions, navigation].forEach((c) => c.querySelectorAll('.active').forEach((i) => {
    i.classList.remove('active');

    // Remove tabindex from previously active items
    i.querySelectorAll('a').forEach((link) => link.setAttribute('tabindex', '-1'));
  }));

  images.children[index].classList.add('active');
  descriptions.children[index].classList.add('active');
  navigation.children[index].classList.add('active');

  // Make links of current item are accessible by keyboard
  descriptions.children[index].setAttribute('aria-hidden', 'false');
  descriptions.children[index].querySelectorAll('a').forEach((link) => link.setAttribute('tabindex', '0'));

  // Center navigation item
  const navigationActiveItem = navigation.querySelector('.active');

  if (navigation && navigationActiveItem) {
    const { clientWidth: itemWidth, offsetLeft } = navigationActiveItem;
    // Calculate the scroll position to center the active item
    const scrollPosition = offsetLeft - (navigation.clientWidth - itemWidth) / 2;
    navigation.scrollTo({
      left: scrollPosition,
      behavior: 'smooth',
    });
  }

  // Update description position
  const descriptionWidth = descriptions.offsetWidth;

  setTimeout(() => {
    descriptions.scrollTo({
      left: descriptionWidth * index,
      behavior: 'smooth',
    });
  }, 50);
};

const listenScroll = (carousel) => {
  const imageLoadPromises = Array.from(carousel.querySelectorAll('picture > img'))
    .filter((img) => !img.complete)
    .map((img) => new Promise((resolve) => {
      img.addEventListener('load', resolve);
    }));

  Promise.all(imageLoadPromises).then(() => {
    const elements = carousel.querySelectorAll(':scope > *');

    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.9) {
          const activeItem = entry.target;
          const currentIndex = Array.from(activeItem.parentNode.children).indexOf(activeItem);
          updateActiveItem(currentIndex);
        }
      });
    }, {
      root: carousel,
      threshold: 0.9,
    });

    elements.forEach((el) => io.observe(el));

    // Force to go to the first item on load
    carousel.scrollTo({
      left: 0,
      behavior: 'instant',
    });
  });
};

const setCarouselPosition = (carousel, index) => {
  const scrollOffset = carousel.firstElementChild.getBoundingClientRect().width + 24;
  const targetX = index * scrollOffset;

  smoothScrollHorizontal(carousel, targetX, 1200);
};

const navigate = (carousel, direction) => {
  if (carousel.classList.contains('is-animating')) return;

  const activeItem = carousel.querySelector(`.${blockName}__image-item.active`);
  let index = [...activeItem.parentNode.children].indexOf(activeItem);
  if (direction === 'left') {
    index -= 1;
    if (index === -1) {
      index = carousel.childElementCount - 1;
    }
  } else {
    index += 1;
    if (index > carousel.childElementCount - 1) {
      index = 0;
    }
  }

  setCarouselPosition(carousel, index);
};

const createArrowControls = (carousel) => {
  const arrowControls = createElement('ul', { classes: [`${blockName}__arrow-controls`] });
  const arrows = document.createRange().createContextualFragment(`
    <li>
      <button aria-label="Previous">
        <svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 34 34" fill="none">
          <path d="M20.764 9.65283C20.2223 9.11117 19.3473 9.11117 18.8057 9.65283L12.4307 16.0278C11.889 16.5695 11.889 17.4445 12.4307 17.9862L18.8057 24.3612C19.3473 24.9028 20.2223 24.9028 20.764 24.3612C21.3057 23.8195 21.3057 22.9445 20.764 22.4028L15.3751 17.0001L20.764 11.6112C21.3057 11.0695 21.2918 10.1806 20.764 9.65283Z" fill="#ED1C24"/>
        </svg>
      </button>
    </li>
    <li>
      <button aria-label="Next">
        <svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 34 34" fill="none">
          <path d="M13.2363 9.65312C12.6947 10.1948 12.6947 11.0698 13.2363 11.6115L18.6252 17.0003L13.2363 22.3892C12.6947 22.9309 12.6947 23.8059 13.2363 24.3476C13.778 24.8892 14.653 24.8892 15.1947 24.3476L21.5697 17.9726C22.1113 17.4309 22.1113 16.5559 21.5697 16.0142L15.1947 9.63923C14.6669 9.11145 13.778 9.11145 13.2363 9.65312Z" fill="#ED1C24"/>
        </svg>
      </button>
    </li>
  `);
  arrowControls.append(...arrows.children);
  carousel.insertAdjacentElement('beforebegin', arrowControls);
  const [prevButton, nextButton] = arrowControls.querySelectorAll(':scope button');
  prevButton.addEventListener('click', () => navigate(carousel, 'left'));
  nextButton.addEventListener('click', () => navigate(carousel, 'right'));
};

export default function decorate(block) {
  const tabItems = block.querySelectorAll(':scope > div > div:nth-child(1)');

  const descriptionContainer = createElement('div', { classes: `${blockName}__description-container` });
  const descriptionItems = block.querySelectorAll(':scope > div > div:nth-child(3)');
  descriptionItems.forEach((item) => {
    item.classList.add(`${blockName}__desc-item`);
    descriptionContainer.appendChild(item);
  });
  block.appendChild(descriptionContainer);

  const imagesWrapper = createElement('div', { classes: `${blockName}__slider-wrapper` });
  const imagesContainer = createElement('div', { classes: `${blockName}__images-container` });
  descriptionContainer.parentNode.prepend(imagesWrapper);
  imagesWrapper.appendChild(imagesContainer);

  const tabNavigation = buildTabNavigation(tabItems, (index) => {
    setCarouselPosition(imagesContainer, index);
  });

  // Arrows
  createArrowControls(imagesContainer);

  block.prepend(tabNavigation);

  const allDivs = block.querySelectorAll(':scope > div');

  // Filter only the empty divs (no classes and no content)
  const imageContainers = Array.from(allDivs).filter((div) => !div.classList.length);

  tabItems.forEach((tabItem, i) => {
    // Create div for image and append inside image div container
    const picture = imageContainers[i].querySelector('picture');
    const imageItem = createElement('div', { classes: `${blockName}__image-item` });
    imageItem.appendChild(picture);
    imagesContainer.appendChild(imageItem);

    // Remove empty tags
    block.querySelectorAll('p, div').forEach((item) => {
      stripEmptyTags(tabItem, item);
    });

    const headings = descriptionItems[i].querySelectorAll('h1, h2, h3, h4, h5, h6');
    headings.forEach((heading) => {
      heading.classList.add('h6');
    });

    const descItem = descriptionItems[i].querySelectorAll('p');
    descItem.forEach((element) => {
      const currentContainer = createElement('div', { classes: `${blockName}__text` });
      element.parentNode.appendChild(currentContainer);
      let nextElement = element.nextElementSibling;
      while (nextElement && nextElement.classList.contains('h6')) {
        currentContainer.appendChild(nextElement);
        nextElement = element.nextElementSibling;
      }
      currentContainer.insertAdjacentElement('afterbegin', element);
    });
  });

  // Update the button indicator on scroll
  listenScroll(imagesContainer);

  // Update text position + navigation line when page is resized
  window.addEventListener('resize', () => {
    const activeItem = imagesContainer.querySelector(`.${blockName}__image-item.active`);
    const index = [...activeItem.parentNode.children].indexOf(activeItem);
    updateActiveItem(index);
  });
}
