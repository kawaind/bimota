import { decorateIcons } from './aem.js';

export default function customDecoreateIcons(main) {
  // inline icons give the possibility to change its colors using the css variables
  const decorateInlineIcons = (rootElement) => {
    const inlineIcons = [
      'icon-logo',
      'icon-hamburger',
      'icon-chevron',
      'icon-close',
      'icon-arrow-right',
      'icon-mail',
      'icon-chevron-right',
    ];
    const isInlineIcon = (el) => {
      const isInline = (className) => inlineIcons.includes(className);
      return [...el.classList].some(isInline);
    };
    const inlineIconsList = [...rootElement.querySelectorAll('span.icon')].filter(isInlineIcon);

    inlineIconsList.forEach((async (inlineIcon) => {
      const iconName = [...inlineIcon.classList].find((c) => c.startsWith('icon-')).substring(5);
      inlineIcon.classList.remove('icon'); // removing the 'icon' class, so the icon won't be used by decorateIcon
      const icon = await fetch(`${window.hlx.codeBasePath}/icons/${iconName}.svg`);

      try {
        const svgIcon = await icon.text();
        const svgEl = document.createRange().createContextualFragment(svgIcon).children[0];
        inlineIcon.innerHTML = svgEl.outerHTML;
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(error);
      }
    }));
  };

  decorateInlineIcons(main);
  decorateIcons(main);
}

export { customDecoreateIcons };
