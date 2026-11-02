import { createOptimizedPicture } from '../../scripts/aem.js';

const borderClassName = 'border-top';

// Timeline option (e.g. Heritage): headings are authored at their semantic
// level so the page outline is sequential (WCAG 1.3.1) - entry h3, its
// technology label h4, technology items h5 - while keeping the compact sizes
// the timeline was designed with, via the visual heading classes.
const TIMELINE_HEADING_SIZES = { H3: 'h5', H4: 'h5', H5: 'h6' };

export default function decorate(block) {
  const cols = [...block.firstElementChild.children];
  block.classList.add(`columns-${cols.length}-cols`);

  if (block.classList.contains('timeline')) {
    block.querySelectorAll('h3, h4, h5').forEach((heading) => {
      const hasVisualClass = [...heading.classList].some((c) => /^h[1-6]$/.test(c));
      if (!hasVisualClass) heading.classList.add(TIMELINE_HEADING_SIZES[heading.tagName]);
    });
  }

  // handle boder top in download pages
  const borderClass = block.classList.contains(borderClassName);
  if (borderClass) {
    block.parentElement.classList.add(borderClassName);
    block.classList.remove(borderClassName);
  }
  const isDownloadVariant = block.classList.contains('download');
  const isGridVariant = block.classList.contains('grid');
  const isGalleryVariant = block.classList.contains('gallery');
  const ratioClass = [...block.classList].find((cl) => cl.startsWith('ratio-'));
  let rationNumbers;

  if (ratioClass) {
    const regex = /(\d+)/g;

    rationNumbers = [...ratioClass.matchAll(regex).map((match) => parseInt(match[1], 10))];
    block.classList.add('ratio');
  }

  // setup image columns
  [...block.children].forEach((row) => {
    const rows = [...row.children];

    if (rationNumbers) {
      row.style.gridTemplateColumns = rationNumbers.map((v) => `${v}fr`).join(' ');
    }

    rows.forEach((col, index) => {
      const pic = col.querySelector('picture');
      if (pic) {
        const picWrapper = pic.closest('div');
        if (picWrapper && picWrapper.children.length === 1) {
          // picture is only content in column
          picWrapper.classList.add('columns-img-col');

          const picWrapperChildren = picWrapper.children[0];
          // remove paragraph wrapping picture
          if (picWrapperChildren.tagName === 'P') {
            picWrapperChildren.replaceWith(...picWrapperChildren.children);
          }
        }
        // handle download variant
        const button = picWrapper.querySelector('.button');
        if (button && isDownloadVariant) {
          button.innerHTML = '';
          button.append(pic);
          button.closest('.button-container')?.classList.remove('button-container');
          picWrapper.prepend(button);
        }
      }
      // handle grid variant
      if (isGridVariant) {
        if (index < 2) {
          col.classList.add('col-wide');
        } else {
          col.classList.add('col-narrow');
        }
      }

      // handel gallery variant
      if (isGalleryVariant) {
        const imageSrc = pic.querySelector('img').src;
        const breakpoints = [
          { media: '(min-width: 1800px)', width: '620' },
          { media: '(min-width: 1500px)', width: '460' },
          { media: '(min-width: 1200px)', width: '345' },
          { media: '(min-width: 960px)', width: '238' },
          { media: '(min-width: 640px)', width: '218' },
          { width: '138' },
        ];
        const newPic = createOptimizedPicture(imageSrc, '', false, breakpoints);

        pic.replaceWith(newPic);
      }
    });
  });
}
