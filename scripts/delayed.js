import { loadScript } from './aem.js';
import { getLocale } from './helpers.js';

function updateCookieLinks(country, langSeg, cookiesLinks) {
  const languagePath = `/${country}/${langSeg}`;
  const newPaths = cookiesLinks?.find((item) => item.path === languagePath);

  if (!newPaths) return;

  const bannerCookieLink = document.querySelector(
    '.ccm-widget--introduction a.ccm19-footer-banner-link',
  );

  const widgetLinks = document.querySelectorAll(
    '.ccm-widget .ccm-modal--footer a',
  );

  const panelControlLinks = document.querySelectorAll(
    '.ccm-control-panel .ccm-modal--footer a',
  );

  if (bannerCookieLink) {
    bannerCookieLink.href = newPaths.cookieUrl;
  }

  if (widgetLinks.length > 1) {
    widgetLinks[0].href = newPaths.cookieUrl;
    widgetLinks[1].href = newPaths.privacyUrl;
  }

  if (panelControlLinks.length > 1) {
    panelControlLinks[0].href = newPaths.cookieUrl;
    panelControlLinks[1].href = newPaths.privacyUrl;
  }
}

// OneTrust Cookies Consent Notice
if (!window.location.pathname.includes('srcdoc')
  && !['localhost'].some((url) => window.location.host.includes(url))) {
  // when running on localhost in the block library host is empty but the path is srcdoc
  // on localhost/hlx.page/hlx.live the consent notice is displayed every time the page opens,
  // because the cookie is not persistent. To avoid this annoyance, disable unless on the
  // production page.
  const {
    langSegment, country, language, locale,
  } = getLocale();
  let cookiesLinks;

  let cookieBannerLocale = locale;
  if (language === 'en') {
    if (country === 'us' && langSegment === 'en-us') {
      cookieBannerLocale = 'en_US';
    } else if (country === 'au') {
      cookieBannerLocale = 'en_AU';
    } else {
      cookieBannerLocale = 'en_GB';
    }
  }

  await fetch('/cookies-links.json')
    .then((response) => response.json())
    .then((response) => {
      cookiesLinks = response.data;
    });
  const isUsSite = country === 'us' && langSegment === 'en-us';

  if (isUsSite) {
    const style = document.createElement('style');
    style.textContent = '.ccm-settings-summoner { display: none !important; }';
    document.head.appendChild(style);
  }

  window.addEventListener('ccm19WidgetLoaded', () => {
    updateCookieLinks(country, langSegment, cookiesLinks);
  });

  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href="#cookie-settings"]');
    if (link) {
      e.preventDefault();
      if (window.CCM && window.CCM.openControlPanel) {
        window.CCM.openControlPanel();
      }
    }
  });

  await loadScript(`https://cloud.ccm19.de/app.js?apiKey=c7d2f47f3259dd5a137414a641f559ee48d81e684564ca8f&amp;domain=67e136a8868b63fcba0a4022&amp;lang=${cookieBannerLocale}`, {
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

/**
 * Resolve the Google Analytics G-Tag (GA4 Measurement ID) for the current
 * country and push it into the Adobe Client Data Layer BEFORE Adobe Launch
 * loads. All country sites live under the same .com domain, so a single Launch
 * property fires GA4 for every path; to track only the selected country we look
 * up its Measurement ID from an author-editable placeholder sheet
 * (/gtag-config.json) and expose it on the data layer. In Launch a Data Element
 * reads `gaMeasurementId` and a single GA4 rule uses it, so adding or changing a
 * country's tag is a pure authoring change — no code deploy, no Launch republish.
 *
 * Sheet shape (single sheet, one row per country plus an optional `default`):
 *   key         | measurementId
 *   ------------ ---------------
 *   jp          | G-JP1234567
 *   it          | G-IT2345678
 *   default     | G-XXXXXXXXXX
 *
 * On any missing sheet/row the data layer simply carries no ID (or the default
 * row), so tracking degrades safely rather than firing the wrong property.
 * @returns {Promise<void>}
 */
async function pushCountryGtag() {
  window.adobeDataLayer = window.adobeDataLayer || [];
  try {
    const { country } = getLocale();
    const response = await fetch(`${window.hlx?.codeBasePath || ''}/gtag-config.json`);
    if (!response.ok) return;
    const sheet = await response.json();
    const rows = Array.isArray(sheet?.data) ? sheet.data : [];
    const rowFor = (value) => rows.find((r) => (r.key || r.Key) === value);
    const row = rowFor(country) || rowFor('default');
    const measurementId = row?.measurementId || row?.MeasurementId;
    if (measurementId) {
      window.adobeDataLayer.push({ gaMeasurementId: measurementId, country });
    }
  } catch (e) {
    // No per-country G-Tag resolved; Launch loads without one.
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

// Resolve the country's G-Tag onto the data layer, THEN load Launch so the
// Measurement ID is already present when Launch's GA4 rule reads it.
await pushCountryGtag();
loadLaunch();
