import { unwrapDivs, forceHeadingLevel, describeButton } from '../../scripts/helpers.js';

export default async function decorate(block) {
  const textWrapper = document.createElement('div');
  textWrapper.classList.add('nba-text-wrapper');

  // Text pieces are headings/paragraphs without links (links are the buttons).
  const textNodes = [...block.querySelectorAll('h1, h2, h3, h4, h5, h6, p')]
    .filter((el) => !el.querySelector('a'));
  const [title, secondary] = textNodes;

  // Force the title to always render as an <h2> styled as .h3.
  let titleEl;
  if (title) {
    titleEl = forceHeadingLevel(title, 'h2', 'h3');
    textWrapper.append(titleEl);
  }

  // Force the secondary text to always render as a body copy <p> styled as .h6.
  if (secondary) {
    textWrapper.append(forceHeadingLevel(secondary, 'p', 'h6'));
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
    // Describe the button by its own text + the NBA title (WCAG 2.4.6).
    if (titleEl) {
      describeButton(button, titleEl);
    }
    buttonWrapper.append(button);
  });
  block.append(buttonWrapper);

  unwrapDivs(block);
}
