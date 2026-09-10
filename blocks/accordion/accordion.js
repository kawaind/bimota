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
 * authoring model wraps cell text in a paragraph, but the trigger label only
 * allows phrasing content — a nested <p> inside a button is invalid HTML. When
 * the cell is exactly one <p>, its inline children are moved instead of the <p>.
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
 * Build a disclosure widget (ARIA APG Accordion pattern): a native <button>
 * wrapped in a heading controls a collapsible panel. Expanded state is exposed
 * via aria-expanded; the panel is a labelled region linked back to its button
 * with aria-labelledby (WCAG 1.3.1, 4.1.2). Collapsed panels use the native
 * `hidden` attribute so their content is removed from layout, the a11y tree and
 * the tab order in one step. Returns the wrapper and its (empty) panel so the
 * caller can fill the panel with either an answer or nested question items.
 * @param {Object} opts
 * @param {string} opts.headingTag semantic heading level for the trigger
 * @param {string} opts.variant class suffix, '' for a category or 'sub' for a question
 * @param {HTMLElement} opts.labelSource authored cell holding the trigger label
 * @returns {{ item: HTMLElement, panel: HTMLElement }}
 */
const buildDisclosure = ({ headingTag, variant, labelSource }) => {
  const p = variant ? `${blockName}-${variant}` : `${blockName}-`;
  const instanceId = uid();
  const buttonId = `${instanceId}-btn`;
  const panelId = `${instanceId}-panel`;

  const item = createElement('div', { classes: `${p}item` });

  const heading = createElement(headingTag, { classes: `${p}heading` });
  const button = createElement('button', {
    classes: `${p}trigger`,
    props: {
      type: 'button',
      id: buttonId,
      'aria-expanded': 'false',
      'aria-controls': panelId,
    },
  });
  const title = createElement('span', { classes: `${p}title` });
  appendUnwrapped(title, labelSource);
  button.append(title);
  heading.append(button);
  item.append(heading);

  const panel = createElement('div', {
    classes: `${p}panel`,
    props: { id: panelId, role: 'region', 'aria-labelledby': buttonId },
  });
  panel.hidden = true;
  item.append(panel);

  button.addEventListener('click', () => {
    const expanded = button.getAttribute('aria-expanded') === 'true';
    button.setAttribute('aria-expanded', expanded ? 'false' : 'true');
    panel.hidden = expanded;
    item.classList.toggle('open', !expanded);
  });

  return { item, panel };
};

export default function decorate(block) {
  const rows = [...block.querySelectorAll(':scope > div')];

  // Region grouping the accordion so screen readers get structural context.
  block.setAttribute('role', 'region');

  const container = createElement('div', { classes: `${blockName}-container` });

  // The current category's panel — question items are nested inside it. Before
  // the first category appears (defensive), questions fall back to the container.
  let currentCategoryPanel = null;

  rows.forEach((row) => {
    const cells = [...row.children];

    // Single-cell row = a category: a top-level collapsible dropdown (h2). Its
    // panel becomes the destination for the questions that follow it.
    if (cells.length === 1) {
      if (!cells[0].textContent.trim()) return;
      const { item, panel } = buildDisclosure({
        headingTag: 'h2',
        variant: '',
        labelSource: cells[0],
      });
      container.append(item);
      currentCategoryPanel = panel;
      return;
    }

    // Two-cell row = a question: a nested collapsible (h3) whose panel holds the
    // answer. Nested inside the current category's panel so the Q&A group under
    // their category (keeps a clean h2 -> h3 heading order).
    if (cells.length >= 2) {
      const { item, panel } = buildDisclosure({
        headingTag: 'h3',
        variant: 'sub-',
        labelSource: cells[0],
      });
      panel.append(...cells[1].childNodes);
      (currentCategoryPanel || container).append(item);
    }
  });

  block.textContent = '';
  block.append(container);
}
