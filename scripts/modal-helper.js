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
      const modalEvent = new CustomEvent('show-modal', { detail: modalContentName });

      window.dispatchEvent(modalEvent);
    });
  });

  const modalEl = document.createRange().createContextualFragment(`
    <div class="modal modal-hidden">
      <div class="modal-background"></div>
      <div class="modal-content"></div>
      <button class="modal-close-button">
        <span class="icon icon-close"></span>
      </button>
    </div>
  `).children[0];

  document.body.append(modalEl);
  customDecoreateIcons(modalEl);

  document.body.querySelector('.modal-close-button').addEventListener('click', () => {
    const closeModalEvent = new CustomEvent('hide-modal');
    window.dispatchEvent(closeModalEvent);
  });

  const modalContent = document.querySelector('.modal .modal-content');
  const closeButton = document.querySelector('.modal-close-button');
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
    const elId = event.detail;
    const content = modalContentMap.get(elId);
    const modal = document.querySelector('.modal');

    modalContent.append(content);
    modal.classList.remove('modal-hidden');
    document.body.classList.add('modal-visible');

    modalContentAnimation(true);
    closeButtonAnimation(true);
  });

  window.addEventListener('hide-modal', () => {
    const modal = document.querySelector('.modal');
    document.body.classList.remove('modal-visible');

    // removing the modal content after the fade out
    modalContentAnimation(false, {
      afterOut: () => {
        modal.classList.add('modal-hidden');
        modalContent.innerHTML = '';
      },
    });
    closeButtonAnimation(false);
  });
}
