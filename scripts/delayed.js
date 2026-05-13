import { loadScript } from './aem.js';
import { getLocale } from './helpers.js';

// OneTrust Cookies Consent Notice
if (!window.location.pathname.includes('srcdoc')
  && !['localhost'].some((url) => window.location.host.includes(url))) {
  // when running on localhost in the block library host is empty but the path is srcdoc
  // on localhost/hlx.page/hlx.live the consent notice is displayed every time the page opens,
  // because the cookie is not persistent. To avoid this annoyance, disable unless on the
  // production page.
  const { language, country, locale } = getLocale();
  let cookiesLinks

  await fetch("/cookies-links.json")
    .then(response => response.json())
    .then(response => {
      cookiesLinks = response.data;
    })
  window.addEventListener('ccm19WidgetLoaded', updateCookieLinks.bind(null, country, language, cookiesLinks))
    
  await loadScript(`https://cloud.ccm19.de/app.js?apiKey=c7d2f47f3259dd5a137414a641f559ee48d81e684564ca8f&amp;domain=67e136a8868b63fcba0a4022&amp;lang=${locale}`, {
    type: 'text/javascript',
    charset: 'UTF-8',
  });

  window.OptanonWrapper = () => {
    const currentOnetrustActiveGroups = window.OnetrustActiveGroups;
    function isSameGroups(groups1, groups2) {
      const s1 = JSON.stringify(groups1.split(',').sort());
      const s2 = JSON.stringify(groups2.split(',').sort());

      return s1 === s2;
    }

    window.OneTrust.OnConsentChanged(() => {
      // reloading the page only when the active group has changed
      if (!isSameGroups(currentOnetrustActiveGroups, window.OnetrustActiveGroups)) {
        window.location.reload();
      }
    });
  };
}

function updateCookieLinks(country, language, cookiesLinks) {
  const widgetLinks = document.querySelectorAll('.ccm-widget .ccm-modal--footer a');
  const panelControlLinks = document.querySelectorAll('.ccm-control-panel .ccm-modal--footer a');

  const languagePath = `/${country}/${language}`;
  const newPaths = cookiesLinks.find(item => item.path === languagePath);

  if (cookiesLinks && newPaths) {
    if (widgetLinks.length > 1) {
      widgetLinks[0].href = newPaths.cookieUrl;
      widgetLinks[1].href = newPaths.privacyUrl;
    }
    if (panelControlLinks.length > 1) {
      panelControlLinks[0].href = newPaths.cookieUrl;
      panelControlLinks[1].href = newPaths.privacyUrl;
    }
  }
}

function injectScript(src, crossOrigin = '') {
  window.scriptsLoaded = window.scriptsLoaded || [];

  if (window.scriptsLoaded.indexOf(src)) {
    const head = document.querySelector('head');
    const script = document.createElement('script');

    script.src = src;
    script.setAttribute('async', 'true');
    if (['anonymous', 'use-credentials'].includes(crossOrigin)) {
      script.crossOrigin = crossOrigin;
    }
    head.append(script);
    window.scriptsLoaded.push(src);
  }
}

function loadLaunch() {
  window.adobeDataLayer = window.adobeDataLayer || [];

  const isProd = window.location.host === 'www.bimota.com';

  const src = isProd
    ? 'https://assets.adobedtm.com/53c8e773d591/d826b4085ef5/launch-268ad0976d20.min.js'
    : 'https://assets.adobedtm.com/53c8e773d591/d826b4085ef5/launch-09753792cdf0-staging.min.js';
  injectScript(src);
}

loadLaunch();
