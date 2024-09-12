import { unwrapDivs } from '../../scripts/helpers.js';

export default async function decorate(block) {
  const textWrapper = document.createElement('div');
  textWrapper.classList.add('nba-text-wrapper');

  const headings = block.querySelectorAll('h1, h2, h3, h4, h5, h6');
  [...headings].forEach((heading) => {
    heading.classList.add('heading');
    textWrapper.append(heading);
  });

  block.querySelectorAll('p').forEach((textEle) => {
    if (!textEle.children.length) {
      textWrapper.append(textEle);
    }
  });
  block.prepend(textWrapper);

  const buttonWrapper = document.createElement('div');
  buttonWrapper.classList.add('nba-button-wrapper');
  block.querySelectorAll('a').forEach((button, index) => {
    const buttonClass = index < 1 ? 'primary' : 'secondary';
    button.classList.add('button', buttonClass);
    if (button.parentElement.classList.contains('button-container')) {
      button.parentElement.remove();
    }
    buttonWrapper.append(button);
  });
  block.append(buttonWrapper);

  unwrapDivs(block);
}
