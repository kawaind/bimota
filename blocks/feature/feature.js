import {
  onAppReady,
  forceHeadingLevel,
} from '../../scripts/helpers.js';

let instanceCounter = 0;

const setActiveSlide = (newActiveIndex, block) => {
  const slides = block.querySelectorAll('.feature-slides > div');
  const navItems = [...block.querySelectorAll('.feature-slide-nav-item')];

  slides.forEach((slide, index) => {
    const isActive = newActiveIndex === index;

    if (isActive) {
      slide.style.opacity = '1';
      slide.style.zIndex = '1';
      slide.classList.add('active');
    } else {
      slide.style.opacity = '0';
      slide.style.zIndex = '0';
      slide.classList.remove('active');
    }

    // Hidden slides are removed from the accessibility tree so screen readers
    // only announce the visible slide's image alt, title and text (WCAG 4.1.2).
    // The active tabpanel is focusable (tabindex=0) as it has no interactive
    // children; inactive ones are taken out of the tab order.
    slide.setAttribute('aria-hidden', isActive ? 'false' : 'true');
    slide.setAttribute('tabindex', isActive ? '0' : '-1');
  });

  navItems.forEach((navItem, index) => {
    const isActive = newActiveIndex === index;
    navItem.classList.toggle('active', isActive);
    // Every dot stays in the tab sequence (tabindex=0) so the user can Tab
    // to each number directly; aria-selected still reflects the active dot.
    navItem.setAttribute('aria-selected', isActive ? 'true' : 'false');
  });
};

const createNavigation = (block, slideCount, instanceId, onClick) => {
  // Tablist: labelled container for the slide tabs (ARIA Tabs pattern).
  const wrapper = document.createElement('div');
  wrapper.classList.add('feature-slides-nav');
  wrapper.setAttribute('role', 'tablist');
  wrapper.setAttribute('aria-label', 'Feature slides');
  wrapper.setAttribute('aria-orientation', 'vertical');

  const slidesDots = (new Array(slideCount))
    .fill(0)
    .map((_, index) => {
      const navItem = document.createElement('button');
      navItem.classList.add('feature-slide-nav-item');
      navItem.setAttribute('type', 'button');
      navItem.setAttribute('role', 'tab');
      navItem.id = `${instanceId}-tab-${index}`;
      navItem.setAttribute('aria-controls', `${instanceId}-panel-${index}`);
      navItem.setAttribute('aria-label', `Go to slide ${index + 1}`);
      navItem.setAttribute('aria-selected', index === 0 ? 'true' : 'false');

      if (!index) {
        navItem.classList.add('active');
      }

      const dotEl = document.createElement('span');
      dotEl.classList.add('feature-slide-nav-dot');
      // The number is decorative (the accessible name already says "slide N").
      dotEl.setAttribute('aria-hidden', 'true');
      dotEl.textContent = index + 1;

      navItem.append(dotEl);
      navItem.addEventListener('click', () => onClick(index, block));

      return navItem;
    });

  wrapper.append(...slidesDots);

  // Every dot is a native button in the tab sequence, so Tab/Shift+Tab reach
  // each number. Arrow/Home/End keys are also supported as a convenience for
  // moving focus between the dots; Enter/Space activates a dot natively.
  wrapper.addEventListener('keydown', (e) => {
    const tabs = [...wrapper.querySelectorAll('[role="tab"]')];
    const currentIndex = tabs.indexOf(document.activeElement);
    if (currentIndex === -1) return;

    let newIndex;
    switch (e.key) {
      case 'ArrowDown':
      case 'ArrowRight':
        newIndex = (currentIndex + 1) % tabs.length;
        break;
      case 'ArrowUp':
      case 'ArrowLeft':
        newIndex = (currentIndex - 1 + tabs.length) % tabs.length;
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
    tabs[newIndex].focus();
  });

  block.append(wrapper);
};

export default async function decorate(block) {
  instanceCounter += 1;
  const instanceId = `feature-${instanceCounter}`;
  const slideCount = block.querySelectorAll(':scope > div').length;
  const slideWrapper = document.createElement('div');
  slideWrapper.classList.add('feature-slides');

  block.querySelectorAll(':scope > div').forEach((el, index) => {
    if (!index) {
      el.replaceWith(slideWrapper);
    }

    el.classList.add('feature-slide');
    // Each slide is a tabpanel labelled by its dot tab (ARIA Tabs pattern).
    el.setAttribute('role', 'tabpanel');
    el.id = `${instanceId}-panel-${index}`;
    el.setAttribute('aria-labelledby', `${instanceId}-tab-${index}`);
    slideWrapper.append(el);
  });

  block.querySelectorAll('.feature-slides > div > div').forEach((column) => {
    const type = column.querySelector('picture') ? 'image' : 'text';
    column.classList.add(`feature-${type}`);
  });

  const headings = block.querySelectorAll('h1, h2, h3, h4, h5, h6');

  // Title: always semantic H3, visually sized as H5 (accessible outline).
  headings.forEach((heading) => {
    forceHeadingLevel(heading, 'h3', 'h5');
  });

  createNavigation(block, slideCount, instanceId, setActiveSlide);
  setActiveSlide(0, block);

  // making sure that the slide gets enought space to display slide navigation
  const onResize = () => {
    const firstTextEl = block.querySelector('.feature-text');
    const navEl = block.querySelector('.feature-slides-nav');
    const minHeight = window.getComputedStyle(navEl).height;

    firstTextEl.style.minHeight = `calc(${minHeight} + 20px)`;
  };

  onAppReady(onResize);

  window.addEventListener('resize', onResize);
}
