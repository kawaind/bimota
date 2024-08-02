import { variantsClassesToBEM } from '../../scripts/scripts.js';

const variantClasses = ['center'];
const blockName = 'image';

export default async function decorate(block) {
  variantsClassesToBEM(block.classList, variantClasses, blockName);
}
