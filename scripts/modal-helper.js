import { customDecoreateIcons } from './decorate-icon-helper.js';
import { getLanguageLabels } from './helpers.js';

// English fallback for the modal Close button's accessible name, used until the
// localized label resolves (or if the dictionary lookup fails), so the button
// always announces "Close, button" and never just "button" (WCAG 4.1.2).
const CLOSE_LABEL_FALLBACK = 'Close';

export function addAnimateInOut(animateTarget, {
  initStyles = {}, startStyles = {}, endStyles = {}, time = 300,
}) {
  const fadeTransitionTime = time;
  // End-of-fade-out handler still waiting for its transition, if any.
  let pendingHideEnd = null;

  const animateInOut = (isFadeIn, { afterOut } = {}) => {
    // A new fade (in or out) supersedes a fade-out still in progress: drop its
    // end handler so it can't run later (e.g. on the fade-in's transitionend)
    // and hide/empty a modal that was just reopened, which left the page
    // blurred behind an invisible modal (KAW-11087).
    if (pendingHideEnd) {
      animateTarget.removeEventListener('transitionend', pendingHideEnd);
      pendingHideEnd = null;
    }
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
      const transitionEndEvent = (event) => {
        // Ignore transitions bubbling up from children; only the target's own
        // fade-out marks the end of the hide.
        if (event.target !== animateTarget) return;
        animateTarget.style.display = '';
        animateTarget.removeEventListener('transitionend', transitionEndEvent);
        pendingHideEnd = null;
        if (afterOut) {
          afterOut();
        }
      };

      pendingHideEnd = transitionEndEvent;
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
  // Triggers: authored "/#modal-<name>" links, and native buttons that blocks
  // create for a dialog trigger (<button data-modal="modal-<name>">, KAW-11088).
  const modalLinks = document.querySelectorAll('a[href^="/#modal-"], button[data-modal^="modal-"]');
  const modalContentMap = new Map();

  modalLinks.forEach((mLink) => {
    const modalContentName = mLink.dataset.modal || mLink.getAttribute('href').split('/#')[1];
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
  // surface (WCAG 4.1.2). tabindex=-1 keeps the container programmatically
  // focusable as a trap fallback. The close button is placed as the very first
  // element inside the modal and receives focus on open, so keyboard users can
  // dismiss it immediately without tabbing through the entire tables.
  const modalEl = document.createRange().createContextualFragment(`
    <div class="modal modal-hidden" role="dialog" aria-modal="true" tabindex="-1">
      <button class="modal-close-button" type="button" aria-label="${CLOSE_LABEL_FALLBACK}">
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

  // Localize the Close button's accessible name for the current page language,
  // read from the `sr-buttons` sheet (English fallback already set on the
  // element). Exposed consistently across all viewports (WCAG 4.1.2).
  getLanguageLabels('sr-buttons', { closeModal: CLOSE_LABEL_FALLBACK }).then((labels) => {
    closeButton.setAttribute('aria-label', labels.closeModal);
  });

  // While the modal is open every other top-level element of the page is hidden
  // from AT, including ones injected by third-party scripts (e.g. the cookie
  // consent widget), not just a fixed list of regions. Only the elements hidden
  // here are revealed again on close; anything already aria-hidden is left alone.
  const hiddenBackground = new Set();
  const hideBackground = () => {
    [...document.body.children].forEach((el) => {
      if (el === modal || el.matches('script, style, link, template, noscript')) return;
      if (el.getAttribute('aria-hidden') === 'true') return;
      el.setAttribute('aria-hidden', 'true');
      hiddenBackground.add(el);
    });
  };
  const revealBackground = () => {
    hiddenBackground.forEach((el) => el.removeAttribute('aria-hidden'));
    hiddenBackground.clear();
  };
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

    // Visibility test via getClientRects() rather than offsetParent: the close
    // button is position:fixed, and offsetParent is always null for fixed
    // elements even when they are fully visible — which previously dropped the
    // close button out of the focus cycle, so Tab from the last country wrapped
    // to the first country instead of back to the close button. getClientRects()
    // reports a box for any rendered element regardless of positioning.
    const focusable = [...modal.querySelectorAll(FOCUSABLE_SELECTOR)]
      .filter((el) => el.getClientRects().length > 0 || el === document.activeElement);
    if (focusable.length === 0) {
      event.preventDefault();
      closeButton.focus();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    // Focus opens on the close button (first focusable). If focus is ever on
    // the dialog container itself (tabindex=-1, e.g. a stray programmatic
    // focus), Tab moves to the first focusable and Shift+Tab to the last so the
    // trap still holds.
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

    // Replace (not append): if this open interrupts a fade-out, the previous
    // content was not cleared yet.
    modalContent.replaceChildren(content);

    // Dialog triggers that expose their state (aria-haspopup="dialog" buttons)
    // report it as expanded while the dialog is open (KAW-11088).
    if (lastTrigger?.hasAttribute?.('aria-expanded')) lastTrigger.setAttribute('aria-expanded', 'true');

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
    hideBackground();

    modal.classList.remove('modal-hidden');
    document.body.classList.add('modal-visible');

    // Scrollable content with nothing focusable inside (e.g. the specification
    // table) is made a focusable, named region so keyboard users can reach it
    // and scroll it with the arrow keys (WCAG 2.1.1). Content with its own
    // links (e.g. the country selector) is left out of the tab order.
    const needsScrollFocus = !content.querySelector(FOCUSABLE_SELECTOR)
      && modalContent.scrollHeight > modalContent.clientHeight;
    if (needsScrollFocus) {
      modalContent.tabIndex = 0;
      modalContent.setAttribute('role', 'region');
      if (title) modalContent.setAttribute('aria-labelledby', title.id);
    } else {
      ['tabindex', 'role', 'aria-labelledby'].forEach((attr) => modalContent.removeAttribute(attr));
    }

    modalContentAnimation(true);
    closeButtonAnimation(true);

    // Move keyboard focus directly to the Close button, the first focusable
    // element inside the dialog, so keyboard users can dismiss it immediately
    // without tabbing to reach it (WCAG 2.4.3 Focus Order). The button carries
    // aria-label="Close" and the dialog is labelled by its title, so screen
    // readers still announce the dialog context on entry. Start trapping focus.
    closeButton.focus();
    document.addEventListener('keydown', onKeydown);
  });

  window.addEventListener('hide-modal', () => {
    document.body.classList.remove('modal-visible');
    document.removeEventListener('keydown', onKeydown);

    // Reveal the background page again.
    revealBackground();

    // removing the modal content after the fade out
    modalContentAnimation(false, {
      afterOut: () => {
        modal.classList.add('modal-hidden');
        modalContent.innerHTML = '';
        ['tabindex', 'role', 'aria-labelledby'].forEach((attr) => modalContent.removeAttribute(attr));
      },
    });
    closeButtonAnimation(false);

    if (lastTrigger?.hasAttribute?.('aria-expanded')) lastTrigger.setAttribute('aria-expanded', 'false');

    // Restore focus to the element that opened the modal (WCAG 2.4.3).
    if (lastTrigger && typeof lastTrigger.focus === 'function') {
      lastTrigger.focus();
    }
    lastTrigger = null;
  });
}
