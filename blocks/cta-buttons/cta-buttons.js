// Ensure a link inside a column is styled as a button. The author picks the
// style with inline emphasis: **bold** => primary, *italic* => secondary,
// plain link => tertiary. The global decorateButtons only fires when the link
// sits in a paragraph-wrapped structure, which the column layout collapses, so
// the block applies the class itself.
function decorateColumnButton(cell) {
  const link = cell.querySelector('a');
  if (!link || link.querySelector('img') || link.classList.contains('button')) return;

  const inStrong = link.closest('strong');
  const inEm = link.closest('em');

  if (inStrong) {
    link.className = 'button primary';
  } else if (inEm) {
    link.className = 'button secondary';
  } else {
    link.className = 'button';
  }

  // Unwrap emphasis so it no longer affects layout; the class carries style.
  const emphasis = inStrong || inEm;
  if (emphasis && emphasis.childNodes.length === 1) {
    emphasis.replaceWith(link);
  }
}

export default function decorate(block) {
  // One row of cells = one row of columns. The number of cells in the first
  // row sets the column count (1-4), driving the responsive grid via a class.
  const firstRow = block.firstElementChild;
  const colCount = firstRow ? firstRow.children.length : 1;
  block.classList.add(`cta-buttons-${colCount}-cols`);

  [...block.children].forEach((row) => {
    row.classList.add('cta-buttons-row');
    [...row.children].forEach((cell) => {
      cell.classList.add('cta-buttons-col');
      decorateColumnButton(cell);
    });
  });
}
