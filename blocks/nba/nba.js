import { unwrapDivs } from '../../scripts/helpers.js';

function forceElement(source, tagName, className) {
  const el = document.createElement(tagName);
  el.classList.add(className);
  el.append(...source.childNodes);
  source.replaceWith(el);
  return el;
}

export default async function decorate(block) {
  const textWrapper = document.createElement('div');
  textWrapper.classList.add('nba-text-wrapper');

  // Text pieces are headings/paragraphs without links (links are the buttons).
  const textNodes = [...block.querySelectorAll('h1, h2, h3, h4, h5, h6, p')]
    .filter((el) => !el.querySelector('a'));
  const [title, secondary] = textNodes;

  // Force the title to always render as an <h2> styled as .h3.
  if (title) {
    textWrapper.append(forceElement(title, 'h2', 'h3'));
  }

  // Force the secondary text to always render as a body copy <p> styled as .h6.
  if (secondary) {
    textWrapper.append(forceElement(secondary, 'p', 'h6'));
  }

  block.prepend(textWrapper);

  const buttonWrapper = document.createElement('div');
  buttonWrapper.classList.add('nba-button-wrapper');
  block.querySelectorAll('a').forEach((button, index) => {
    const buttonClass = index < 1 ? 'primary' : 'secondary';
    button.classList.add('button', buttonClass);
    if (button.parentElement.classList.contains('button-container')) {
      button.parentElement.removeAttribute('class');
    }
    buttonWrapper.append(button);
  });
  block.append(buttonWrapper);

  unwrapDivs(block);
}
