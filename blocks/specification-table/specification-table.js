import { forceHeadingLevel } from '../../scripts/helpers.js';

let headingIdCounter = 0;

export default function decorate(block) {
  const tableHeader = block.querySelector(':scope > div > div');
  // Bike name: always semantic H2, visually sized as H3 (accessible outline).
  const heading = forceHeadingLevel(tableHeader.querySelector('h1, h2, h3, h4, h5, h6'), 'h2', 'h3');
  heading.classList.add('st-heading');
  // Give the title a stable id so the modal can be labelled by it (WCAG 4.1.2).
  if (!heading.id) {
    headingIdCounter += 1;
    heading.id = `st-heading-${headingIdCounter}`;
  }

  // Parse the da.live rows: column 1 = specification group/type, column 2 =
  // label, column 3 = value. A non-empty column 1 starts a new group; empty
  // column 1 rows belong to the current group.
  const data = [];

  block.querySelectorAll(':scope > div:not(:first-child)').forEach((dataRow) => {
    const [category, label, value] = dataRow.querySelectorAll(':scope > div');

    if (category.textContent.trim()) {
      data.push({
        category,
        categoryData: [],
      });
    }

    data.at(-1).categoryData.push({
      label,
      value,
    });
  });

  block.innerHTML = '';
  block.append(tableHeader);

  const dataContainer = document.createElement('div');
  dataContainer.classList.add('st-data-container');

  // Each specification group is rendered as a semantic <table> so screen
  // readers announce the header/data relationships (WCAG 1.3.1). The visual
  // layout is preserved via CSS flex overrides on the table elements.
  data.forEach((categoryRow) => {
    const table = document.createElement('table');
    table.classList.add('st-category-wrapper');

    // Group name becomes the table caption (its accessible title).
    const caption = document.createElement('caption');
    caption.classList.add('h6', 'st-category');
    caption.append(...categoryRow.category.childNodes);
    table.append(caption);

    const tbody = document.createElement('tbody');
    tbody.classList.add('st-category-data-wrapper');

    categoryRow.categoryData.forEach((el) => {
      const row = document.createElement('tr');

      // Label is the row header; value is the data cell.
      const th = document.createElement('th');
      th.setAttribute('scope', 'row');
      th.classList.add('st-label');
      th.append(...el.label.childNodes);

      const td = document.createElement('td');
      td.classList.add('st-value');
      td.append(...el.value.childNodes);

      row.append(th, td);
      tbody.append(row);
    });

    table.append(tbody);
    dataContainer.append(table);
  });

  block.append(dataContainer);
}
