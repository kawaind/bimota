export default async function decorate(block) {
  const rows = [...block.querySelectorAll(':scope > div')];
  const table = document.createElement('table');
  const tBody = document.createElement('tbody');

  table.classList.add('table-element');

  // Optional table title → <caption> (WCAG 1.3.1). The author adds the title as
  // a leading single-cell row (one column while the data rows have several); it
  // is rendered as the table's <caption>, which screen readers announce first
  // when entering the table. Text is taken verbatim from the authored cell, so
  // casing and spacing are preserved. When no such row is present the table has
  // no caption and nothing changes. (A leading title row is the same authoring
  // convention the specification-table block uses.)
  let dataRows = rows;
  const firstCellCount = rows[0]
    ? rows[0].querySelectorAll(':scope > div').length
    : 0;
  if (rows.length > 1 && firstCellCount === 1) {
    const titleCell = rows[0].querySelector(':scope > div');
    const titleText = titleCell?.textContent.trim();
    if (titleText) {
      const caption = document.createElement('caption');
      caption.classList.add('table-caption');
      caption.textContent = titleText;
      table.append(caption);
    }
    dataRows = rows.slice(1);
  }

  dataRows.forEach((row, rowIndex) => {
    const rowEl = document.createElement('tr');

    row.querySelectorAll(':scope > div').forEach((cell) => {
      // The first data row holds the column headers: expose them as
      // <th scope="col"> so screen readers associate every data cell with its
      // column header (WCAG 1.3.1). Remaining rows are plain data cells. Header
      // cells stay in the same position and box as before, so the visual layout
      // is unchanged (see table.css, where th mirrors td styling).
      const isHeaderRow = rowIndex === 0;
      const cellEl = document.createElement(isHeaderRow ? 'th' : 'td');
      if (isHeaderRow) cellEl.setAttribute('scope', 'col');

      cellEl.append(...cell.children);
      rowEl.append(cellEl);
    });

    tBody.append(rowEl);
  });

  block.innerHTML = '';
  table.append(tBody);

  // links should be displayed as links - no buttons in table
  table.querySelectorAll('.button').forEach((link) => link.classList.remove('button'));

  block.append(table);
}
