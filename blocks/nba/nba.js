import { unwrapDivs, forceHeadingLevel } from '../../scripts/helpers.js';

export default async function decorate(block) {
  const textWrapper = document.createElement('div');
  textWrapper.classList.add('nba-text-wrapper');

  // Text pieces are headings/paragraphs without links (links are the buttons).
  const textNodes = [...block.querySelectorAll('h1, h2, h3, h4, h5, h6, p')]
    .filter((el) => !el.querySelector('a'));
  const [title, secondary] = textNodes;

  // Force the title to always render as an <h2> styled as .h3.
  if (title) {
    textWrapper.append(forceHeadingLevel(title, 'h2', 'h3'));
  }

  // Force the secondary text to always render as a body copy <p> styled as .h6.
  if (secondary) {
    textWrapper.append(forceHeadingLevel(secondary, 'p', 'h6'));
  }

  block.prepend(textWrapper);

  const buttons = [...block.querySelectorAll('a')];
  // Several buttons (e.g. the owner's manual in different languages) are
  // related links: group them in a list so screen readers announce them
  // together ("list, 2 items") instead of as isolated links (WCAG 1.3.1).
  const isGroup = buttons.length > 1;
  const buttonWrapper = document.createElement(isGroup ? 'ul' : 'div');
  buttonWrapper.classList.add('nba-button-wrapper');
  // Explicit role: Safari/VoiceOver drops list semantics with list-style: none.
  if (isGroup) buttonWrapper.setAttribute('role', 'list');
  buttons.forEach((button, index) => {
    const buttonClass = index < 1 ? 'primary' : 'secondary';
    button.classList.add('button', buttonClass);
    if (button.parentElement.classList.contains('button-container')) {
      button.parentElement.removeAttribute('class');
    }
    if (isGroup) {
      const item = document.createElement('li');
      item.append(button);
      buttonWrapper.append(item);
    } else {
      buttonWrapper.append(button);
    }
  });
  block.append(buttonWrapper);

  unwrapDivs(block);
}
