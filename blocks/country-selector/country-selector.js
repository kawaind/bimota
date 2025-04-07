import { stripEmptyTags } from '../../scripts/helpers.js';

export default function decorate(block) {
  let blockHeadingWrapper;
  const data = [];

  block.querySelectorAll(':scope > div').forEach((dataRow, i) => {
    if (i === 0) {
      const blockHeading = dataRow.querySelector('h1, h2, h3, h4, h5, h6');
      blockHeading.classList.add('h2');
      blockHeadingWrapper = blockHeading.parentElement;
      blockHeadingWrapper.classList.add('country-selector-heading-wrapper');
      const bikeImage = dataRow.querySelector('picture');
      bikeImage.classList.add('country-selector-bike-image');
      blockHeadingWrapper.append(bikeImage);
    } else {
      const region = dataRow.querySelector('h1, h2, h3, h4, h5, h6');
      const countryLanguageList = dataRow.querySelector('ul');

      if (region?.textContent.trim()) {
        region.classList.add('h5');
        data.push({
          region,
          regionData: [],
        });
      }

      countryLanguageList.classList.add('country-selector-language-list');

      data.at(-1).regionData.push({
        countryLanguageList,
      });
    }
  });

  block.innerHTML = '';
  block.append(blockHeadingWrapper);

  const dataContainer = document.createElement('div');
  dataContainer.classList.add('country-selector-regions-container');

  data.forEach((categoryRow) => {
    const categoryWrapper = document.createElement('div');
    categoryWrapper.classList.add('country-selector-region-wrapper');
    categoryWrapper.append(categoryRow.region);

    const categoryDataWrapper = document.createElement('div');
    categoryDataWrapper.classList.add('country-selector-country-wrapper');
    categoryRow.regionData.forEach((el) => {
      [...el.countryLanguageList.children].forEach((language) => {
        const picture = language.querySelector('picture');
        let countryButton = language.querySelector('a');
        if (!countryButton) {
          const spanWrapper = document.createElement('div');
          const coomingSoon = language.querySelector('em');

          spanWrapper.append(coomingSoon);
          countryButton = spanWrapper;
        }
        if (countryButton && picture) {
          picture.classList.add('country-selector-flag');
          countryButton.prepend(picture);
        }

        if (countryButton) {
          countryButton.classList.add('cs-button');
          if (countryButton.getAttribute('href') === window.location.pathname) {
            countryButton.classList.add('active');
          }
          language.append(countryButton);
        }
        language.querySelectorAll('p').forEach((item) => {
          stripEmptyTags(language, item);
        });
      });
      categoryDataWrapper.append(el.countryLanguageList);
    });
    categoryWrapper.append(categoryDataWrapper);
    dataContainer.append(categoryWrapper);
  });
  block.append(dataContainer);

  // add modal class only when header/footer has option of country change
  const hasGlobeIcon = document.querySelector('.icon-globe');
  if (hasGlobeIcon) {
    block.classList.add('modal-country-selector');
  }
}
