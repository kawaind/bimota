export default async function decorate(block) {
  if (block.classList.contains('full-width')) {
    block.parentElement.classList.add('image-wrapper-full-width');
  }
}
