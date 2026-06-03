import { getRootPath } from '../../scripts/aem.js';

export default function decorate(block) {
  const homeLink = block.querySelector('a');
  if (homeLink) {
    const rootPath = getRootPath() || '/';
    homeLink.href = rootPath;
  }
}
