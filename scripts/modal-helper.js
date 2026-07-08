import { customDecoreateIcons } from './decorate-icon-helper.js';

export function addAnimateInOut(animateTarget, {
  initStyles = {}, startStyles = {}, endStyles = {}, time = 300,
}) {
  const fadeTransitionTime = time;

  const animateInOut = (isFadeIn, { afterOut } = {}) => {
    animateTarget.style.transition = `all ${fadeTransitionTime}ms ease-in-out`;

    const setStyles = (targetEl, stylesObject) => {
      Object.entries(stylesObject).forEach(([key, value]) => {
        targetEl.style[key] = value;
      });
    };

    const cssReflow = () => {
      // trigger reflow to ensure the transition starts from the current state
      // read more here: https://gist.github.com/paulirish/5d52fb081b3570c81e3a
      // eslint-disable-next-line no-unused-expressions
      animateTarget.offsetWidth;
    };

    const restoreDisplayPropAfterHide = () => {
      const transitionEndEvent = () => {
        animateTarget.style.display = '';
        animateTarget.removeEventListener('transitionend', transitionEndEvent);
        if (afterOut) {
          afterOut();
        }
      };

      animateTarget.addEventListener('transitionend', transitionEndEvent);
    };

    setStyles(animateTarget, initStyles);

    if (isFadeIn) {
      setStyles(animateTarget, startStyles);
      cssReflow();
      setStyles(animateTarget, endStyles);
    } else {
      setStyles(animateTarget, endStyles);
      cssReflow();
      restoreDisplayPropAfterHide();
      setStyles(animateTarget, startStyles);
    }
  };

  return animateInOut;
}

// Selector for elements that can receive keyboard focus, used by the trap.
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

// Ensures a unique id when labelling a dialog by a heading that lacks one.
let modalTitleIdCounter = 0;

export function addModalHandling() {
  const modalLinks = document.querySelectorAll('a[href^="/#modal-"]');
  const modalContentMap = new Map();

  modalLinks.forEach((mLink) => {
    const modalContentName = mLink.getAttribute('href').split('/#')[1];
    const modalContentEl = document.querySelector(`.${modalContentName}`);

    if (modalContentEl) {
      modalContentEl.parentElement.replaceWith(modalContentEl);
      modalContentMap.set(modalContentName, modalContentEl);
    }

    mLink.addEventListener('click', (event) => {
      event.preventDefault();
      const modalEvent = new CustomEvent('show-modal', {
        // Pass the trigger so focus can be restored to it on close (WCAG 2.4.3).
        detail: { name: modalContentName, trigger: mLink },
      });

      window.dispatchEvent(modalEvent);
    });
  });

  // The modal is a dialog: role + aria-modal so AT treats it as a modal
  // surface (WCAG 4.1.2). tabindex=-1 lets us focus the container on open so
  // the screen reader announces the dialog (title first, then the tables).
  // The close button is placed as the very first element inside the modal so
  // keyboard users can Shift+Tab once from the container to reach it and exit
  // immediately, without tabbing through the entire tables.
  const modalEl = document.createRange().createContextualFragment(`
    <div class="modal modal-hidden" role="dialog" aria-modal="true" tabindex="-1">
      <button class="modal-close-button" type="button" aria-label="Close">
        <span class="icon icon-close"></span>
      </button>
      <div class="modal-background"></div>
      <div class="modal-content"></div>
    </div>
  `).children[0];

  document.body.append(modalEl);
  customDecoreateIcons(modalEl);

  const closeModal = () => {
    const closeModalEvent = new CustomEvent('hide-modal');
    window.dispatchEvent(closeModalEvent);
  };

  document.body.querySelector('.modal-close-button').addEventListener('click', closeModal);

  const modal = document.querySelector('.modal');
  const modalContent = document.querySelector('.modal .modal-content');
  const closeButton = document.querySelector('.modal-close-button');

  // Background regions hidden from AT while the modal is open, restored on close.
  const backgroundRegions = ['header', 'main', 'footer'];
  // The element that opened the modal, so focus can return to it on close.
  let lastTrigger = null;

  // Focus trap: keep Tab/Shift+Tab cycling within the modal, and close on Esc
  // (WCAG 2.1.1, 2.4.3). Attached only while the modal is open.
  const onKeydown = (event) => {
    if (event.key === 'Escape') {
      closeModal();
      return;
    }

    if (event.key !== 'Tab') return;

    const focusable = [...modal.querySelectorAll(FOCUSABLE_SELECTOR)]
      .filter((el) => el.offsetParent !== null || el === document.activeElement);
    if (focusable.length === 0) {
      event.preventDefault();
      closeButton.focus();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    // Focus starts on the dialog container (tabindex=-1) on open. Tab moves to
    // the first focusable element (the close button, placed first in the DOM);
    // Shift+Tab moves to the last — so a single Shift+Tab from the container is
    // the shortcut to reach the close button and exit.
    if (document.activeElement === modal) {
      event.preventDefault();
      (event.shiftKey ? last : first).focus();
    } else if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const modalXSmallAnimationConfig = {
    startStyles: { transform: 'var(--modal-content-animation-start)' },
    endStyles: { transform: 'var(--modal-content-animation-end)' },
  };
  const closeXSmallAnimationConfig = {
    startStyles: { transform: 'var(--modal-close-button-animation-start)' },
    endStyles: { transform: 'var(--modal-close-button-animation-end)' },
  };

  const modalContentAnimation = addAnimateInOut(modalContent, modalXSmallAnimationConfig);
  const closeButtonAnimation = addAnimateInOut(closeButton, closeXSmallAnimationConfig);

  window.addEventListener('show-modal', (event) => {
    // detail may be a plain string (legacy callers, e.g. the header globe) or
    // an object { name, trigger }.
    const detail = typeof event.detail === 'string'
      ? { name: event.detail }
      : event.detail;
    const { name: elId, trigger } = detail;
    lastTrigger = trigger || document.activeElement;

    let content = modalContentMap.get(elId);
    if (!content) {
      content = document.querySelector(`.${elId}`);
      modalContentMap.set(elId, content);
    }

    modalContent.append(content);

    // Give the dialog an accessible name so screen readers announce what
    // opened (WCAG 4.1.2). Prefer the bike title (specification modal); fall
    // back to the content's first heading (e.g. the country selector title).
    // An id is assigned on the fly if the heading lacks one.
    const title = content.querySelector('.st-heading, h1, h2, h3, h4, h5, h6');
    if (title) {
      if (!title.id) {
        modalTitleIdCounter += 1;
        title.id = `modal-title-${modalTitleIdCounter}`;
      }
      modal.setAttribute('aria-labelledby', title.id);
    } else {
      modal.removeAttribute('aria-labelledby');
    }

    // Hide the rest of the page from assistive technology.
    backgroundRegions.forEach((sel) => {
      document.querySelectorAll(sel).forEach((el) => el.setAttribute('aria-hidden', 'true'));
    });

    modal.classList.remove('modal-hidden');
    document.body.classList.add('modal-visible');

    modalContentAnimation(true);
    closeButtonAnimation(true);

    // Focus the dialog container (not the close button) so the screen reader
    // announces the dialog title first, then reads through the tables. With
    // the close button placed first in the DOM, a single Shift+Tab from here
    // reaches it to exit. Start trapping focus.
    modal.focus();
    document.addEventListener('keydown', onKeydown);
  });

  window.addEventListener('hide-modal', () => {
    document.body.classList.remove('modal-visible');
    document.removeEventListener('keydown', onKeydown);

    // Reveal the background page again.
    backgroundRegions.forEach((sel) => {
      document.querySelectorAll(sel).forEach((el) => el.removeAttribute('aria-hidden'));
    });

    // removing the modal content after the fade out
    modalContentAnimation(false, {
      afterOut: () => {
        modal.classList.add('modal-hidden');
        modalContent.innerHTML = '';
      },
    });
    closeButtonAnimation(false);

    // Restore focus to the element that opened the modal (WCAG 2.4.3).
    if (lastTrigger && typeof lastTrigger.focus === 'function') {
      lastTrigger.focus();
    }
    lastTrigger = null;
  });
}
