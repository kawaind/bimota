export default function decorate(block) {
  const tableHeader = block.querySelector(':scope > div > div');
  tableHeader.querySelector('h1, h2, h3, h4, h5, h6').classList.add('h3', 'st-heading');

  const data = [];

  block.querySelectorAll(':scope > div:not(:first-child)').forEach((dataRow) => {
    const [category, label, value] = dataRow.querySelectorAll(':scope > div');

    if (category.textContent.trim()) {
      category.classList.add('h6', 'st-category');
      data.push({
        category,
        categoryData: [],
      });
    }

    label.classList.add('st-label');
    value.classList.add('st-value');

    data.at(-1).categoryData.push({
      label,
      value,
    });
  });

  block.innerHTML = '';
  block.append(tableHeader);

  const dataContainer = document.createElement('div');
  dataContainer.classList.add('st-data-container');

  data.forEach((categoryRow) => {
    const categoryWrapper = document.createElement('div');
    categoryWrapper.classList.add('st-category-wrapper');
    categoryWrapper.append(categoryRow.category);

    const categoryDataWrapper = document.createElement('div');
    categoryDataWrapper.classList.add('st-category-data-wrapper');
    categoryRow.categoryData.forEach((el) => {
      const wrapper = document.createElement('div');
      wrapper.append(el.label, el.value);

      categoryDataWrapper.append(wrapper);
    });
    categoryWrapper.append(categoryDataWrapper);
    dataContainer.append(categoryWrapper);
  });
  block.append(dataContainer);
}
