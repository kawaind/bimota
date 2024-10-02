export default function decorate(block) {
  const content = block.querySelector(':scope > div');
  content.classList.add('specification-content');
  const textContent = block.querySelector(':scope > div > div:first-child');
  const statisticsWrapper = document.createElement('div');

  statisticsWrapper.classList.add('specification-statistics');
  textContent.classList.add('specification-text-content');

  // adding proper styles for stats labels and values
  textContent.querySelectorAll('p').forEach((paragraph) => {
    const strongEls = paragraph.querySelectorAll('strong');
    const hasButton = paragraph.classList.contains('button-container');

    if (strongEls.length > 0) {
      paragraph.classList.add('font-small', 'specification-value');
      strongEls.forEach((s) => {
        s.classList.add('h5');
      });
    } else if (!hasButton) {
      paragraph.classList.add('font-small', 'specification-label');
    }
  });

  // grouping all of the stats label and values
  const specificationStatsWrapper = document.createElement('div');
  specificationStatsWrapper.classList.add('specification-stats-wrapper');
  textContent.insertBefore(specificationStatsWrapper, textContent.querySelector('.specification-label'));

  textContent.querySelectorAll('.specification-label').forEach((el) => {
    const stat = document.createElement('div');
    stat.classList.add('specification-stat');
    const valueEl = el.nextElementSibling;

    stat.append(el);
    stat.append(valueEl);
    specificationStatsWrapper.append(stat);
  });
}
