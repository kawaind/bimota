import { gatherButtons } from '../../scripts/helpers.js';

export default async function decorate(block) {
  const textContainer = block.querySelector(':scope > div > div');
  const headings = block.querySelectorAll('h1, h2, h3, h4, h5, h6');
  [...headings].forEach((heading) => {
    heading.classList.add('h3');
  });

  const textElements = block.querySelectorAll('p');
  [...textElements].forEach((heading) => {
    heading.classList.add('text-content');
  });
  const quoteWrapper = document.createElement('div');
  quoteWrapper.classList.add('text-quote-wrapper');
  const quotedText = block.querySelector('strong');
  quotedText.classList.add('h4');
  const openQuotes = document.createRange().createContextualFragment(`
    <div class="text-open-quotes">
      <img data-icon-name="arrow" src="/icons/quote-open.svg" alt="" loading="lazy">
    </div>
  `);
  const closeQuotes = document.createRange().createContextualFragment(`
    <div class="text-close-quotes">
      <img data-icon-name="arrow" src="/icons/quote-close.svg" alt="" loading="lazy">
    </div>
  `);
  quoteWrapper.append(openQuotes, quotedText, closeQuotes);

  gatherButtons(block.querySelectorAll('.button-container'));

  const buttonContainer = block.querySelector('.button-container');
  buttonContainer.classList.remove('text-content');
  textContainer.insertBefore(quoteWrapper, buttonContainer);

  quoteWrapper.previousElementSibling.remove();
}
