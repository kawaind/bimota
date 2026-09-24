import {
  onAppReady,
  forceHeadingLevel,
  getLanguageLabels,
} from '../../scripts/helpers.js';

let instanceCounter = 0;

// Localizable strings for the carousel's ARIA metadata (ARIA APG Carousel +
// Tabs pattern). Authors translate these via the `feature` sheet in
// lanconfig.json (one column per language code); English is the fallback.
// {n}, {x} and {y} are substituted at render time.
const LABEL_FALLBACKS = {
  carouselRoleDescription: 'carousel',
  carouselLabel: 'Feature slides',
  slideTab: 'Slide {n}', // tab accessible name
  slideRoleDescription: 'slide', // tabpanel role description
  slidePosition: '{x} of {y}', // tabpanel accessible name
};

const fillTemplate = (template, values) => Object.entries(values)
  .reduce((str, [key, value]) => str.replaceAll(`{${key}}`, value), template);

/**
 * Show the slide at `newActiveIndex` and sync the tablist to match (ARIA APG
 * Tabs pattern, automatic activation). The visible slide is exposed to
 * assistive tech and placed in the page tab sequence; every other slide is
 * hidden (aria-hidden + taken out of the tab order) so screen readers only
 * announce the active slide's image alt, title and text. The tabs use a roving
 * tabindex: only the selected tab is tabbable (its tabindex attribute is
 * removed, per the APG note for button-based tabs), the rest are tabindex=-1.
 * @param {number} newActiveIndex the slide/tab to activate
 * @param {Element} block the decorated feature block
 */
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
    // Inactive slides are taken out of the tab order; their descendants are also
    // unreachable because inactive slides are visibility:hidden in CSS.
    slide.setAttribute('aria-hidden', isActive ? 'false' : 'true');
    if (!isActive) {
      slide.setAttribute('tabindex', '-1');
      return;
    }
    // The active tabpanel is only made focusable (tabindex=0) when it has NO
    // focusable children. Per the ARIA APG (and bug KAW-11082), a tabpanel that
    // contains interactive content (e.g. an authored CTA link) must NOT be a tab
    // stop itself, otherwise reading-flow navigation stops on the panel and then
    // again on its child, double-reading the content. When the slide has such a
    // child, drop the panel from the tab order and let the child be the stop.
    const hasFocusable = slide.querySelector(
      'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    if (hasFocusable) {
      slide.removeAttribute('tabindex');
    } else {
      slide.setAttribute('tabindex', '0');
    }
  });

  navItems.forEach((navItem, index) => {
    const isActive = newActiveIndex === index;
    navItem.classList.toggle('active', isActive);
    navItem.setAttribute('aria-selected', isActive ? 'true' : 'false');
    // Roving tabindex: the selected tab is the only one in the page tab
    // sequence. For a native <button> the APG removes the tabindex attribute on
    // the selected tab (rather than setting 0); non-selected tabs get -1.
    if (isActive) {
      navItem.removeAttribute('tabindex');
    } else {
      navItem.setAttribute('tabindex', '-1');
    }
  });
};

/**
 * Build the vertical dot tablist (ARIA APG Tabs pattern). Each dot is a native
 * <button role="tab"> controlling its slide's tabpanel. The tablist is inserted
 * before the slides so the keyboard tab order is: selected tab -> visible slide
 * -> next block on the page.
 */
const createNavigation = (block, slideWrapper, slideCount, instanceId, labels, onClick) => {
  const wrapper = document.createElement('div');
  wrapper.classList.add('feature-slides-nav');
  wrapper.setAttribute('role', 'tablist');
  wrapper.setAttribute('aria-label', labels.carouselLabel);
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
      navItem.setAttribute('aria-label', fillTemplate(labels.slideTab, { n: index + 1 }));
      navItem.setAttribute('aria-selected', index === 0 ? 'true' : 'false');
      // Roving tabindex: only the first (selected) tab is initially tabbable.
      if (index !== 0) navItem.setAttribute('tabindex', '-1');

      if (!index) {
        navItem.classList.add('active');
      }

      const dotEl = document.createElement('span');
      dotEl.classList.add('feature-slide-nav-dot');
      // The number is decorative: the tab's accessible name already conveys the
      // slide ("Slide N"), so exposing the digit too would double-announce.
      dotEl.setAttribute('aria-hidden', 'true');
      dotEl.textContent = index + 1;

      navItem.append(dotEl);
      navItem.addEventListener('click', () => onClick(index, block));

      return navItem;
    });

  wrapper.append(...slidesDots);

  // Automatic activation (ARIA APG carousel-2-tablist): Arrow/Home/End move the
  // focus between tabs AND show the associated slide. Left/Up = previous (wraps
  // to last), Right/Down = next (wraps to first), Home = first, End = last.
  // Enter/Space activate natively via the button click handler.
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
    onClick(newIndex, block); // show the slide + move the tab into the sequence
    tabs[newIndex].focus(); // then move focus to it
  });

  // Insert the tablist before the slides so it is reached first when tabbing
  // into the block, then the visible slide, then the next block.
  block.insertBefore(wrapper, slideWrapper);
};

export default async function decorate(block) {
  instanceCounter += 1;
  const instanceId = `feature-${instanceCounter}`;
  const slideCount = block.querySelectorAll(':scope > div').length;
  const slideWrapper = document.createElement('div');
  slideWrapper.classList.add('feature-slides');

  // The block itself is the carousel container (ARIA APG Carousel pattern).
  block.setAttribute('aria-roledescription', LABEL_FALLBACKS.carouselRoleDescription);
  block.setAttribute('aria-label', LABEL_FALLBACKS.carouselLabel);

  block.querySelectorAll(':scope > div').forEach((el, index) => {
    if (!index) {
      el.replaceWith(slideWrapper);
    }

    el.classList.add('feature-slide');
    // Each slide is a tabpanel controlled by its dot tab. It carries a "slide"
    // role description and an "X of Y" position label (ARIA APG Carousel).
    el.setAttribute('role', 'tabpanel');
    el.id = `${instanceId}-panel-${index}`;
    el.setAttribute('aria-labelledby', `${instanceId}-tab-${index}`);
    el.setAttribute('aria-roledescription', LABEL_FALLBACKS.slideRoleDescription);
    el.setAttribute('aria-label', fillTemplate(LABEL_FALLBACKS.slidePosition, {
      x: index + 1,
      y: slideCount,
    }));
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

  createNavigation(block, slideWrapper, slideCount, instanceId, LABEL_FALLBACKS, setActiveSlide);
  setActiveSlide(0, block);

  // Swap in localized ARIA labels once the dictionary resolves (English is
  // shown until then, so the labels are never missing). Adding a language is a
  // pure authoring change (add a column to the `feature` lanconfig sheet).
  getLanguageLabels('feature', LABEL_FALLBACKS).then((labels) => {
    block.setAttribute('aria-roledescription', labels.carouselRoleDescription);
    block.setAttribute('aria-label', labels.carouselLabel);
    const nav = block.querySelector('.feature-slides-nav');
    if (nav) nav.setAttribute('aria-label', labels.carouselLabel);
    block.querySelectorAll('.feature-slide-nav-item').forEach((tab, index) => {
      tab.setAttribute('aria-label', fillTemplate(labels.slideTab, { n: index + 1 }));
    });
    block.querySelectorAll('.feature-slides > div').forEach((panel, index) => {
      panel.setAttribute('aria-roledescription', labels.slideRoleDescription);
      panel.setAttribute('aria-label', fillTemplate(labels.slidePosition, {
        x: index + 1,
        y: slideCount,
      }));
    });
  });

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
