/* eslint-disable max-len */
import { createElement, stripEmptyTags } from '../../scripts/helpers.js';
import { smoothScrollHorizontal } from '../../scripts/motion-helper.js';
import { getTextLabel } from '../../scripts/scripts.js';

const blockName = 'vehicle-selector';

let idCounter = 0;
// Unique id prefix so multiple instances on a page don't collide.
const uid = () => {
  idCounter += 1;
  return `${blockName}-${idCounter}`;
};

function buildTabNavigation(tabItems, instanceId, clickHandler) {
  // Tablist: the container that holds the tab elements (ARIA Tabs pattern).
  const tabNavigation = createElement('ul', { classes: `${blockName}__navigation` });
  tabNavigation.setAttribute('role', 'tablist');
  tabNavigation.setAttribute('aria-label', getTextLabel('Vehicle selector'));
  const navigationLine = createElement('li', { classes: `${blockName}__navigation-line` });

  tabItems.forEach((tabItem, i) => {
    const listItem = createElement('li', { classes: `${blockName}__navigation-item` });
    // The <li> is only a layout wrapper, not part of the tablist semantics.
    listItem.setAttribute('role', 'presentation');

    const button = createElement('button');
    button.classList.add('h5');
    button.setAttribute('type', 'button');
    button.setAttribute('role', 'tab');
    button.id = `${instanceId}-tab-${i}`;
    button.setAttribute('aria-controls', `${instanceId}-panel-${i}`);
    // Only the active tab is in the tab sequence (roving tabindex); the rest
    // are reachable via Left/Right/Home/End arrow keys.
    button.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
    button.setAttribute('tabindex', i === 0 ? '0' : '-1');
    button.addEventListener('click', () => clickHandler(i));

    const tabTitle = tabItem.querySelector('h1,h2,h3,h4,h5,h6');
    button.innerText = tabTitle.innerText;
    tabTitle.remove();

    listItem.append(button);
    tabNavigation.append(listItem);
  });

  tabNavigation.append(navigationLine);

  return tabNavigation;
}

const updateActiveItem = (block, index) => {
  const images = block.querySelector(`.${blockName}__images-container`);
  const descriptions = block.querySelector(`.${blockName}__description-container`);
  const navigation = block.querySelector(`.${blockName}__navigation`);
  if (!images || !descriptions || !navigation) return;
  const tabs = [...navigation.querySelectorAll('[role="tab"]')];

  [images, descriptions, navigation].forEach((c) => c.querySelectorAll('.active').forEach((i) => {
    i.classList.remove('active');

    // Remove tabindex from previously active items
    i.querySelectorAll('a').forEach((link) => link.setAttribute('tabindex', '-1'));
  }));

  images.children[index]?.classList.add('active');
  descriptions.children[index]?.classList.add('active');
  navigation.children[index]?.classList.add('active');

  // Tabs: mark the selected tab and update roving tabindex so only it is in
  // the tab sequence (ARIA Tabs pattern).
  tabs.forEach((tab, i) => {
    const selected = i === index;
    tab.setAttribute('aria-selected', selected ? 'true' : 'false');
    tab.setAttribute('tabindex', selected ? '0' : '-1');
  });

  // Tabpanels: only the active panel is focusable and exposed to AT; inactive
  // panels stay in the DOM (the carousel animates by scrolling between them)
  // but are bypassed via tabindex=-1 + aria-hidden, so hidden content and its
  // links are skipped by keyboard and screen readers.
  [...descriptions.children].forEach((panel, i) => {
    const selected = i === index;
    panel.setAttribute('tabindex', selected ? '0' : '-1');
    panel.setAttribute('aria-hidden', selected ? 'false' : 'true');
  });
  [...images.children].forEach((imageItem, i) => {
    imageItem.setAttribute('aria-hidden', i === index ? 'false' : 'true');
  });

  // Make links of current panel accessible by keyboard
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
  descriptions.scrollTo({
    left: descriptionWidth * index,
    behavior: 'smooth',
  });

  // Announce the vehicle name only when the change was driven from the image
  // slider (the slider or one of its children holds focus). Tab navigation
  // already announces the name via the focused tab, so we avoid duplicating it.
  const liveRegion = block.querySelector(`.${blockName}__live-region`);
  if (liveRegion && images.contains(document.activeElement)) {
    liveRegion.textContent = tabs[index]?.textContent ?? '';
  }
};

const listenScroll = (block, carousel) => {
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
          updateActiveItem(block, currentIndex);
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

const getActiveIndex = (carousel) => {
  const activeItem = carousel.querySelector(`.${blockName}__image-item.active`);
  return [...activeItem.parentNode.children].indexOf(activeItem);
};

const navigate = (carousel, direction) => {
  if (carousel.classList.contains('is-animating')) return;

  let index = getActiveIndex(carousel);
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
  // The arrows duplicate the tab/arrow-key controls; they are pointer-only
  // affordances, so they are kept out of the tab order and hidden from AT.
  arrowControls.setAttribute('aria-hidden', 'true');
  const arrows = document.createRange().createContextualFragment(`
    <li>
      <button tabindex="-1" aria-label="Previous">
        <svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 34 34" fill="none">
          <path d="M20.764 9.65283C20.2223 9.11117 19.3473 9.11117 18.8057 9.65283L12.4307 16.0278C11.889 16.5695 11.889 17.4445 12.4307 17.9862L18.8057 24.3612C19.3473 24.9028 20.2223 24.9028 20.764 24.3612C21.3057 23.8195 21.3057 22.9445 20.764 22.4028L15.3751 17.0001L20.764 11.6112C21.3057 11.0695 21.2918 10.1806 20.764 9.65283Z" fill="currentColor"/>
        </svg>
      </button>
    </li>
    <li>
      <button tabindex="-1" aria-label="Next">
        <svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 34 34" fill="none">
          <path d="M13.2363 9.65312C12.6947 10.1948 12.6947 11.0698 13.2363 11.6115L18.6252 17.0003L13.2363 22.3892C12.6947 22.9309 12.6947 23.8059 13.2363 24.3476C13.778 24.8892 14.653 24.8892 15.1947 24.3476L21.5697 17.9726C22.1113 17.4309 22.1113 16.5559 21.5697 16.0142L15.1947 9.63923C14.6669 9.11145 13.778 9.11145 13.2363 9.65312Z" fill="currentColor"/>
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

/**
 * Activate a tab by index: slide the carousel, update the selected state, and
 * move focus to the tab. Used by the arrow/Home/End keyboard interactions,
 * which move focus and activate the newly focused tab together (ARIA Tabs
 * pattern). Selection is updated immediately rather than waiting for the
 * scroll animation's IntersectionObserver, so AT reflects the change at once.
 */
const activateTab = (block, carousel, index) => {
  const tabs = block.querySelectorAll(`.${blockName}__navigation [role="tab"]`);
  if (!carousel.classList.contains('is-animating')) {
    setCarouselPosition(carousel, index);
  }
  updateActiveItem(block, index);
  tabs[index].focus();
};

const addTablistKeyboard = (block, tablist, carousel) => {
  const tabs = [...tablist.querySelectorAll('[role="tab"]')];

  tablist.addEventListener('keydown', (e) => {
    const currentIndex = tabs.indexOf(document.activeElement);
    if (currentIndex === -1) return;

    let newIndex;
    switch (e.key) {
      case 'ArrowRight':
        newIndex = currentIndex === tabs.length - 1 ? 0 : currentIndex + 1;
        break;
      case 'ArrowLeft':
        newIndex = currentIndex === 0 ? tabs.length - 1 : currentIndex - 1;
        break;
      case 'Home':
        newIndex = 0;
        break;
      case 'End':
        newIndex = tabs.length - 1;
        break;
      default:
        return;
    }

    e.preventDefault();
    activateTab(block, carousel, newIndex);
  });
};

export default function decorate(block) {
  const instanceId = uid();
  const tabItems = block.querySelectorAll(':scope > div > div:nth-child(1)');

  const descriptionContainer = createElement('div', { classes: `${blockName}__description-container` });
  const descriptionItems = block.querySelectorAll(':scope > div > div:nth-child(3)');
  descriptionItems.forEach((item, i) => {
    item.classList.add(`${blockName}__desc-item`);
    // Tabpanel: labelled by its tab, focusable so Tab moves into the panel
    // after the tablist (ARIA Tabs pattern). The active/inactive focusability
    // is managed by updateActiveItem.
    item.setAttribute('role', 'tabpanel');
    item.id = `${instanceId}-panel-${i}`;
    item.setAttribute('aria-labelledby', `${instanceId}-tab-${i}`);
    descriptionContainer.appendChild(item);
  });
  block.appendChild(descriptionContainer);

  const imagesWrapper = createElement('div', { classes: `${blockName}__slider-wrapper` });
  const imagesContainer = createElement('div', { classes: `${blockName}__images-container` });
  // The image slider is a keyboard-operable scroll region; give it an
  // accessible name so screen readers identify it on focus.
  imagesContainer.setAttribute('role', 'group');
  imagesContainer.setAttribute('aria-label', getTextLabel('Vehicle selector'));
  descriptionContainer.parentNode.prepend(imagesWrapper);
  imagesWrapper.appendChild(imagesContainer);

  const tabNavigation = buildTabNavigation(tabItems, instanceId, (index) => {
    if (imagesContainer.classList.contains('is-animating')) {
      return;
    }

    setCarouselPosition(imagesContainer, index);
  });

  // Arrows
  createArrowControls(imagesContainer);

  block.prepend(tabNavigation);

  addTablistKeyboard(block, tabNavigation, imagesContainer);

  const allDivs = block.querySelectorAll(':scope > div');

  // Filter only the empty divs (no classes and no content)
  const imageContainers = Array.from(allDivs).filter((div) => !div.classList.length);

  const tabButtons = [...tabNavigation.querySelectorAll('[role="tab"]')];

  tabItems.forEach((tabItem, i) => {
    // Create div for image and append inside image div container
    const picture = imageContainers[i]?.querySelector('picture');
    const imageItem = createElement('div', { classes: `${blockName}__image-item` });
    if (picture) {
      // Name the image after its vehicle so the slide is meaningful to AT
      // (the source images ship with empty/decorative alt text).
      const img = picture.querySelector('img');
      const vehicleName = tabButtons[i]?.textContent.trim();
      if (img && vehicleName) {
        img.setAttribute('alt', vehicleName);
      }
      imageItem.appendChild(picture);
    }
    imagesContainer.appendChild(imageItem);

    // Remove empty tags
    block.querySelectorAll('p, div').forEach((item) => {
      stripEmptyTags(tabItem, item);
    });

    const headings = descriptionItems[i].querySelectorAll('h1, h2, h3, h4, h5, h6');
    headings.forEach((heading) => {
      heading.classList.add('h6');
    });
    // Creating the description list (as in specification component)
    descriptionItems[i].querySelectorAll('p').forEach((paragraph) => {
      const strongEls = paragraph.querySelectorAll('strong');
      const hasButton = paragraph.classList.contains('button-container');

      if (strongEls.length > 0) {
        paragraph.classList.add('font-small', 'description-value');
        strongEls.forEach((el) => {
          el.classList.add('h6');
        });
      } else if (!hasButton) {
        paragraph.classList.add('font-small', 'description-label');
      }
    });
    Array.from(descriptionItems[i].querySelectorAll('.description-label')).reverse().forEach((el) => {
      const stat = document.createElement('div');
      stat.classList.add('description-stat');
      const valueEl = el.nextElementSibling;

      stat.append(el);
      stat.append(valueEl);
      descriptionItems[i].prepend(stat);
    });
  });

  // Visually-hidden live region. When the user navigates the image slider with
  // the keyboard/arrows, focus stays on the scroll container, so scrolling a
  // new vehicle into view announces nothing on its own. We mirror the active
  // vehicle name here so it is announced, matching what the tab list conveys.
  // Added after the loop above so stripEmptyTags (which prunes empty divs)
  // doesn't remove this intentionally-empty element.
  const liveRegion = createElement('div', { classes: `${blockName}__live-region` });
  liveRegion.setAttribute('aria-live', 'polite');
  liveRegion.setAttribute('role', 'status');
  block.appendChild(liveRegion);

  // Set the initial active/selected state (tab 0 + its panel).
  updateActiveItem(block, 0);

  // Update the button indicator on scroll
  listenScroll(block, imagesContainer);

  // Update text position + navigation line when page is resized
  window.addEventListener('resize', () => {
    updateActiveItem(block, getActiveIndex(imagesContainer));
  });

  block.classList.add('full-width');
}
