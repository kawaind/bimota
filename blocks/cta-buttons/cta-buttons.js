import { getOpensInNewTabLabel } from '../../scripts/helpers.js';

let newTabId = 0;

// Trailing "+" markers on the link text make it open in a new tab and add an
// "opens in a new tab" warning (WCAG 3.2.5). The warning text is translated for
// the page language via /lanconfig.json.
//   one "+"  -> warning exposed to screen readers only (via aria-labelledby),
//              nothing added to the visible label.
//   two "++" -> warning also shown as visible text next to the button label.
// The accessible name is composed with aria-labelledby pointing at the button's
// own label followed by the (visually-hidden or visible) warning, so the button
// name is always read first, then the warning.
async function applyNewTabShortcut(link) {
  const label = link.textContent.trim();
  const match = label.match(/(\++)$/);
  if (!match) return;

  const plusCount = match[1].length;
  const cleanLabel = label.replace(/\++$/, '').trim();
  link.textContent = cleanLabel;
  if (link.title) link.title = link.title.replace(/\++$/, '').trim();

  link.setAttribute('target', '_blank');
  link.setAttribute('rel', 'noopener noreferrer');

  const warning = await getOpensInNewTabLabel();

  // Wrap the visible label in a span we can reference for the accessible name.
  const labelSpan = document.createElement('span');
  labelSpan.textContent = cleanLabel;
  newTabId += 1;
  labelSpan.id = `cta-btn-label-${newTabId}`;
  link.textContent = '';
  link.append(labelSpan);

  // Warning text: visually hidden for one "+", visible for two "++".
  const warningEl = document.createElement('span');
  warningEl.id = `cta-btn-newtab-${newTabId}`;
  warningEl.textContent = plusCount >= 2 ? ` ${warning}` : warning;
  warningEl.classList.add(plusCount >= 2 ? 'cta-buttons-newtab-note' : 'sr-only');
  link.append(warningEl);

  // Compose the accessible name: button label first, then the warning.
  link.setAttribute('aria-labelledby', `${labelSpan.id} ${warningEl.id}`);
}

// Ensure a link inside a column is styled as a button. The author picks the
// style with inline emphasis: **bold** => primary, *italic* => secondary,
// plain link => tertiary. The global decorateButtons only fires when the link
// sits in a paragraph-wrapped structure, which the column layout collapses, so
// the block applies the class itself.
function decorateColumnButton(cell) {
  const link = cell.querySelector('a');
  if (!link || link.querySelector('img') || link.classList.contains('button')) {
    return Promise.resolve();
  }

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

  return applyNewTabShortcut(link);
}

export default async function decorate(block) {
  // One row of cells = one row of columns. The number of cells in the first
  // row sets the column count (1-4), driving the responsive grid via a class.
  const firstRow = block.firstElementChild;
  const colCount = firstRow ? firstRow.children.length : 1;
  block.classList.add(`cta-buttons-${colCount}-cols`);

  const pending = [];
  [...block.children].forEach((row) => {
    row.classList.add('cta-buttons-row');
    [...row.children].forEach((cell) => {
      cell.classList.add('cta-buttons-col');
      pending.push(decorateColumnButton(cell));
    });
  });

  await Promise.all(pending);
}
