export default async function decorate(block) {
  const rows = block.querySelectorAll(':scope > div');
  const table = document.createElement('table');
  const tBody = document.createElement('tbody');

  table.classList.add('table-element');

  rows.forEach((row) => {
    const rowEl = document.createElement('tr');

    row.querySelectorAll(':scope > div').forEach((cell) => {
      const cellEl = document.createElement('td');

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
