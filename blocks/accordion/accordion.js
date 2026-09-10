import { createElement } from '../../scripts/helpers.js';

const blockName = 'accordion';

let idCounter = 0;
// Unique id prefix so multiple instances / items on a page don't collide.
const uid = () => {
  idCounter += 1;
  return `${blockName}-${idCounter}`;
};

/**
 * Move a cell's content into `target`, unwrapping a single wrapping <p>. The
 * authoring model wraps cell text in a paragraph, but the trigger label and the
 * group heading only allow phrasing content — a nested <p> there is invalid
 * HTML. When the cell is exactly one <p>, its inline children are moved instead
 * of the <p> itself.
 * @param {HTMLElement} target destination element
 * @param {HTMLElement} cell authored source cell
 */
const appendUnwrapped = (target, cell) => {
  const nodes = [...cell.childNodes].filter(
    (n) => n.nodeType !== Node.TEXT_NODE || n.textContent.trim(),
  );
  if (nodes.length === 1 && nodes[0].nodeName === 'P') {
    target.append(...nodes[0].childNodes);
  } else {
    target.append(...cell.childNodes);
  }
};

/**
 * Build one accordion item (ARIA APG Accordion pattern): a native <button>
 * wrapped in a heading controls a collapsible panel. Expanded state is exposed
 * via aria-expanded; the panel is a labelled region linked back to its button
 * with aria-labelledby (WCAG 1.3.1, 4.1.2). Collapsed panels use the native
 * `hidden` attribute so their content is removed from layout, the a11y tree and
 * the tab order in one step.
 * @param {HTMLElement} summaryCell the authored trigger content (the question)
 * @param {HTMLElement} panelCell the authored panel content (the answer)
 * @param {string} headingTag semantic heading level for the trigger
 * @returns {HTMLElement} the accordion item wrapper
 */
const buildItem = (summaryCell, panelCell, headingTag) => {
  const instanceId = uid();
  const buttonId = `${instanceId}-btn`;
  const panelId = `${instanceId}-panel`;

  const item = createElement('div', { classes: `${blockName}-item` });

  const heading = createElement(headingTag, { classes: `${blockName}-heading` });
  const button = createElement('button', {
    classes: `${blockName}-trigger`,
    props: {
      type: 'button',
      id: buttonId,
      'aria-expanded': 'false',
      'aria-controls': panelId,
    },
  });
  const label = createElement('span', { classes: `${blockName}-title` });
  // Move the authored summary content (text/inline markup) into the label,
  // unwrapping a lone <p> so we don't nest block content inside the button.
  appendUnwrapped(label, summaryCell);
  button.append(label);
  heading.append(button);
  item.append(heading);

  const panel = createElement('div', {
    classes: `${blockName}-panel`,
    props: { id: panelId, role: 'region', 'aria-labelledby': buttonId },
  });
  panel.hidden = true;
  panel.append(...panelCell.childNodes);
  item.append(panel);

  button.addEventListener('click', () => {
    const expanded = button.getAttribute('aria-expanded') === 'true';
    button.setAttribute('aria-expanded', expanded ? 'false' : 'true');
    panel.hidden = expanded;
    item.classList.toggle('open', !expanded);
  });

  return item;
};

export default function decorate(block) {
  const rows = [...block.querySelectorAll(':scope > div')];

  // Region grouping the accordion so screen readers get structural context.
  block.setAttribute('role', 'region');
  const blockHeadingLevel = 'h2'; // category dividers
  const itemHeadingLevel = 'h3'; // question triggers (keep h2 -> h3 order)

  const container = createElement('div', { classes: `${blockName}-container` });

  rows.forEach((row) => {
    const cells = [...row.children];

    // Single-cell row = a category divider (a subheading between item groups).
    if (cells.length === 1) {
      const groupHeading = createElement(blockHeadingLevel, { classes: `${blockName}-group-heading` });
      appendUnwrapped(groupHeading, cells[0]);
      // Only treat as a heading if it actually has text; otherwise skip empties.
      if (groupHeading.textContent.trim()) {
        container.append(groupHeading);
      }
      return;
    }

    // Two-cell row = an accordion item: [summary/question, panel/answer].
    if (cells.length >= 2) {
      container.append(buildItem(cells[0], cells[1], itemHeadingLevel));
    }
  });

  block.textContent = '';
  block.append(container);
}
