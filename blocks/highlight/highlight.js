import {
  throttle, createElement, isInViewport, getLanguageLabels,
} from '../../scripts/helpers.js';

const DEFAULT_ROTATION_SECONDS = 8;

// Screen-reader / ARIA labels. English defaults; localized per URL language
// from the `highlight` sheet in /lanconfig.json (one column per language code),
// the same dictionary mechanism the header and dealer selector use.
const LABEL_FALLBACKS = {
  carousel: 'Highlighted features',
  previousSlide: 'Previous slide',
  nextSlide: 'Next slide',
  pauseRotation: 'Pause slide auto-rotation',
  startRotation: 'Start slide auto-rotation',
};

const setScaleForPicture = (block, picture, onSetScale) => {
  const setScale = () => {
    const isNotMobile = window.matchMedia('(width >= 768px)').matches;
    const mobileAspectRatio = 3 / 4;
    const noneMobileAspectRatio = 16 / 9;
    const aspectRatio = isNotMobile ? noneMobileAspectRatio : mobileAspectRatio;

    const maxWidth = document.body.clientWidth;
    const maxHeight = maxWidth / aspectRatio;

    const initialWidth = block.clientWidth;
    block.style.height = maxHeight;

    const initScale = initialWidth / maxWidth;

    picture.style.transform = `scale(${initScale})`;
    onSetScale(initScale);
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.intersectionRatio > 0) {
        setScale(block, picture);
        observer.disconnect();
      }
    });
  }, { threshold: [0.1], rootMargin: '100px' });

  observer.observe(block);

  window.addEventListener('resize', throttle(() => {
    setScale(block, picture);
  }, 250));
};

const addFlag = (block) => {
  const flagEl = `
    <svg width="100" height="80" viewBox="0 0 100 80" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
      <rect y="0.351562" width="14.2857" height="80" fill="#ED1C24"/>
      <rect x="28.5714" y="0.351562" width="14.2857" height="80" fill="#ED1C24"/>
      <rect x="57.1429" y="0.351562" width="14.2857" height="80" fill="white"/>
      <rect x="85.7143" y="0.351562" width="14.2857" height="80" fill="white"/>
    </svg>
  `;

  const flagWrapper = document.createElement('div');
  flagWrapper.classList.add('flag-wrapper');
  flagWrapper.innerHTML = flagEl;
  block.append(flagWrapper);
};

/**
 * Normalise an authored slide's content into a fixed, accessible structure:
 * a semantic <h3> title (visually sized as H1) followed by the body copy as
 * <p class="h6">. Authors write the title as the first bold/underlined run
 * (…<strong><u>Title</u></strong>…) or as any heading; the split point is the
 * first <br>. The semantic level and visual class are enforced here so authors
 * cannot change them (requirement 2).
 * @param {HTMLElement} slide the authored slide wrapper
 */
const normaliseSlideContent = (slide) => {
  const contentEl = slide.querySelector(':scope > div') || slide;

  // Prefer an authored heading if present.
  const authoredHeading = contentEl.querySelector('h1, h2, h3, h4, h5, h6');

  const title = createElement('h3', { classes: 'h1' });
  const body = createElement('div', { classes: ['highlight-slide-body', 'h6'] });

  if (authoredHeading) {
    title.innerHTML = authoredHeading.innerHTML;
    authoredHeading.remove();
    // Everything else becomes the body copy.
    body.append(...contentEl.childNodes);
  } else {
    // Authored as "<strong><u>Title</u></strong><br><br>body" inside a <p>.
    const paragraph = contentEl.querySelector('p') || contentEl;
    const titleSource = paragraph.querySelector('strong, u');
    if (titleSource) {
      title.textContent = titleSource.textContent.trim();
    }
    // Body = the paragraph's nodes after the first <br> break(s).
    const nodes = [...paragraph.childNodes];
    const firstBreak = nodes.findIndex((n) => n.nodeName === 'BR');
    const bodyNodes = firstBreak === -1
      ? nodes.filter((n) => n !== titleSource && !(titleSource && titleSource.contains(n)))
      : nodes.slice(firstBreak + 1);
    const bodyText = bodyNodes
      .map((n) => (n.nodeName === 'BR' ? '' : n.textContent))
      .join('')
      .trim();
    if (bodyText) {
      const p = createElement('p');
      p.textContent = bodyText;
      body.append(p);
    }
  }

  contentEl.textContent = '';
  contentEl.append(title);
  if (body.childNodes.length) contentEl.append(body);
};

/**
 * Build the carousel playback controls: Previous, Play/Pause, Next — all native
 * <button>s (keyboard-operable, focusable) with localized accessible names.
 * @param {Object} labels localized label map
 * @returns {{controls: HTMLElement, prevBtn, playBtn, nextBtn}}
 */
const buildControls = (labels) => {
  const controls = createElement('div', { classes: 'highlight-controls' });

  const prevIcon = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M15.4 7.4 14 6l-6 6 6 6 1.4-1.4-4.6-4.6z" fill="currentColor"/></svg>';
  const nextIcon = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M8.6 7.4 10 6l6 6-6 6-1.4-1.4 4.6-4.6z" fill="currentColor"/></svg>';
  const pauseIcon = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="6" y="5" width="4" height="14" fill="currentColor"/><rect x="14" y="5" width="4" height="14" fill="currentColor"/></svg>';

  const prevBtn = createElement('button', {
    classes: ['highlight-control', 'highlight-control--prev'],
    props: { type: 'button', 'aria-label': labels.previousSlide },
  });
  prevBtn.innerHTML = prevIcon;

  const playBtn = createElement('button', {
    classes: ['highlight-control', 'highlight-control--play'],
    props: { type: 'button', 'aria-label': labels.pauseRotation, 'aria-pressed': 'false' },
  });
  playBtn.innerHTML = pauseIcon;

  const nextBtn = createElement('button', {
    classes: ['highlight-control', 'highlight-control--next'],
    props: { type: 'button', 'aria-label': labels.nextSlide },
  });
  nextBtn.innerHTML = nextIcon;

  controls.append(prevBtn, playBtn, nextBtn);
  return {
    controls, prevBtn, playBtn, nextBtn,
  };
};

export default async function decorate(block) {
  const labels = await getLanguageLabels('highlight', LABEL_FALLBACKS);

  const [pictureWrapper, ...slideEls] = block.querySelectorAll(':scope > div');
  const animationTime = [...block.classList]
    .find((el) => el.startsWith('time-'))
    ?.split('time-')[1].replace('-', '.');
  const rotationMs = (Number(animationTime) || DEFAULT_ROTATION_SECONDS) * 1000;

  // Carousel region: labelled so screen-reader users get structural context on
  // entry, with aria-roledescription="carousel" per the APG carousel pattern
  // (WCAG 1.3.1, 4.1.2).
  block.setAttribute('role', 'region');
  block.setAttribute('aria-roledescription', 'carousel');
  block.setAttribute('aria-label', labels.carousel);

  const slidesWrapper = createElement('div', { classes: 'highlight-slides-wrapper' });
  const slidesContainer = createElement('div', { classes: 'highlight-slides-container' });

  const totalSlides = slideEls.length;
  slideEls.forEach((slide, index) => {
    slide.classList.add('highlight-slide');
    // Each slide is a labelled group giving "slide X of Y" context (APG).
    slide.setAttribute('role', 'group');
    slide.setAttribute('aria-roledescription', 'slide');
    slide.setAttribute('aria-label', `slide ${index + 1} of ${totalSlides}`);
    normaliseSlideContent(slide);
    if (index === 0) slide.classList.add('active');
  });

  slidesContainer.append(...slideEls);
  slidesWrapper.append(slidesContainer);
  block.append(slidesWrapper);

  const slides = [...block.querySelectorAll('.highlight-slide')];

  // Visually-hidden live region: announces the active slide when auto-rotation
  // is paused (polite), so screen-reader users registering manual navigation
  // are not interrupted mid-announcement during auto-play (APG carousel).
  const liveRegion = createElement('div', {
    classes: 'highlight-live-region',
    props: { 'aria-live': 'polite', role: 'status' },
  });

  const picture = pictureWrapper.querySelector('picture');
  // Background image is decorative by default: only expose it to AT when the
  // author supplied meaningful alt text in the da.live document (WCAG 1.1.1).
  const img = picture.querySelector('img');
  if (img && !img.getAttribute('alt')?.trim()) {
    img.setAttribute('alt', '');
  }
  pictureWrapper.replaceWith(picture);

  addFlag(block);
  const onSetScaleForPicture = (value) => {
    const space = ((1 - value) / 2) * 100;
    block.style.setProperty('--flag-margin', `${space}%`);
  };
  setScaleForPicture(block, picture, onSetScaleForPicture);

  // --- Carousel state + rotation (lightweight vanilla JS, no dependencies) ---
  let activeIndex = 0;
  let timer = null;
  // The user's explicit Play/Pause choice. When they pause, auto-rotation stays
  // off even after hover/focus leaves; hover/focus only pause transiently.
  let userPaused = false;

  const render = (announce) => {
    slidesContainer.style.transform = `translateY(-${activeIndex * 100}%)`;
    slides.forEach((slide, i) => {
      const isActive = i === activeIndex;
      slide.classList.toggle('active', isActive);
      // The active slide is the only one exposed to AT and keyboard focus; the
      // rest are removed from the a11y tree (aria-hidden) and made inert so
      // screen readers and Tab skip them entirely (requirement: hidden slides
      // ignored by AT/keyboard).
      slide.setAttribute('aria-hidden', isActive ? 'false' : 'true');
      slide.toggleAttribute('inert', !isActive);
    });
    if (announce) {
      liveRegion.textContent = `slide ${activeIndex + 1} of ${totalSlides}`;
    }
  };

  const goTo = (index, announce = false) => {
    activeIndex = (index + totalSlides) % totalSlides;
    render(announce);
  };

  const stopTimer = () => {
    clearInterval(timer);
    timer = null;
  };

  const startTimer = () => {
    if (timer || userPaused || totalSlides <= 1 || !isInViewport(block)) return;
    timer = setInterval(() => goTo(activeIndex + 1), rotationMs);
  };

  const {
    controls, prevBtn, playBtn, nextBtn,
  } = buildControls(labels);
  if (totalSlides <= 1) {
    // A single slide is not a carousel: drop the controls and roledescription.
    block.removeAttribute('aria-roledescription');
  } else {
    slidesWrapper.append(controls);
  }
  block.append(liveRegion);

  const pauseIcon = playBtn.innerHTML;
  const playIcon = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>';

  const setPlayState = (playing) => {
    userPaused = !playing;
    playBtn.setAttribute('aria-pressed', playing ? 'false' : 'true');
    playBtn.setAttribute('aria-label', playing ? labels.pauseRotation : labels.startRotation);
    playBtn.innerHTML = playing ? pauseIcon : playIcon;
    if (playing) {
      startTimer();
    } else {
      stopTimer();
      // Announce the current slide once the user takes manual control.
      liveRegion.textContent = `slide ${activeIndex + 1} of ${totalSlides}`;
    }
  };

  prevBtn.addEventListener('click', () => goTo(activeIndex - 1, true));
  nextBtn.addEventListener('click', () => goTo(activeIndex + 1, true));
  playBtn.addEventListener('click', () => setPlayState(userPaused));

  // Pause on hover (mouse) and focus-within (keyboard); resume when the pointer
  // leaves / focus exits — unless the user has explicitly paused (WCAG 2.2.2).
  block.addEventListener('mouseenter', stopTimer);
  block.addEventListener('mouseleave', startTimer);
  block.addEventListener('focusin', stopTimer);
  block.addEventListener('focusout', startTimer);

  // Only rotate while the carousel is on screen; keeps it idle off-screen.
  window.addEventListener('scroll', throttle(() => {
    if (isInViewport(block)) {
      block.classList.add('active');
      startTimer();
    } else {
      block.classList.remove('active');
      stopTimer();
    }
  }, 200));

  render(false);
  if (isInViewport(block)) {
    block.classList.add('active');
    startTimer();
  }
}
