const borderClassName = 'border-top';

export default function decorate(block) {
  const cols = [...block.firstElementChild.children];
  block.classList.add(`columns-${cols.length}-cols`);

  // handle boder top in download pages
  const borderClass = block.classList.contains(borderClassName);
  if (borderClass) {
    block.parentElement.classList.add(borderClassName);
    block.classList.remove(borderClassName);
  }
  const isDownloadVariant = block.classList.contains('download');

  const isGridVariant = block.classList.contains('grid');
  // setup image columns
  [...block.children].forEach((row) => {
    const rows = [...row.children];
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
    });
  });
}
