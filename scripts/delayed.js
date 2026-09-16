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

  // --- Cookie dialog: return focus to the trigger on close (WCAG 2.4.3) ---
  // CCM19 owns the dialog markup and does not restore focus to the invoking
  // control when the dialog closes (Escape or its own close/accept/reject
  // buttons), dropping keyboard and screen-reader users onto <body>. We capture
  // the element that opened the dialog and, once CCM19 removes or hides the
  // dialog, move focus back to it — resolved via a stable selector so a
  // re-rendered trigger still works, and inside requestAnimationFrame so the
  // focus call isn't discarded during CCM19's teardown (ARIA APG modal pattern).
  // No visual change; CCM19 keeps ownership of the dialog's own focus trap.
  const COOKIE_TRIGGER_SELECTOR = 'a[href="#cookie-settings"]';
  const COOKIE_DIALOG_SELECTOR = '.ccm-widget, .ccm-control-panel, .ccm-modal';
  let cookieInvoker = null;
  let cookieDialogShown = false;

  const isCookieDialogShown = () => {
    const dialog = document.querySelector(COOKIE_DIALOG_SELECTOR);
    if (!dialog) return false;
    const style = window.getComputedStyle(dialog);
    return style.display !== 'none' && style.visibility !== 'hidden';
  };

  const resolveCookieTrigger = () => {
    // Prefer a live element matching the stable selector (survives CCM19
    // re-rendering the trigger); fall back to the captured node if it is still
    // connected; finally the CCM19 settings summoner, so focus never lands on
    // <body> when the original trigger is gone.
    const bySelector = document.querySelector(COOKIE_TRIGGER_SELECTOR);
    if (bySelector) return bySelector;
    if (cookieInvoker && cookieInvoker.isConnected) return cookieInvoker;
    return document.querySelector('.ccm-settings-summoner');
  };

  const restoreCookieFocus = () => {
    const invoked = !!cookieInvoker;
    cookieInvoker = null;
    // Only restore focus when the user opened the dialog; never yank focus when
    // the consent banner appears on its own (e.g. first visit).
    if (!invoked) return;
    requestAnimationFrame(() => {
      const target = resolveCookieTrigger();
      if (target && typeof target.focus === 'function') target.focus();
    });
  };

  // CCM19 exposes no reliable public close callback, so watch the DOM: once a
  // dialog is shown, its removal or hiding signals a close (the MutationObserver
  // fallback the ARIA APG allows for third-party dialogs).
  const cookieObserver = new MutationObserver(() => {
    const shown = isCookieDialogShown();
    if (shown && !cookieDialogShown) {
      cookieDialogShown = true;
      // Capture the invoking element if a click didn't already record it (e.g.
      // the dialog was opened via CCM19's own summoner button).
      if (!cookieInvoker) {
        const active = document.activeElement;
        if (active && active !== document.body && active.tagName) cookieInvoker = active;
      }
    } else if (!shown && cookieDialogShown) {
      cookieDialogShown = false;
      restoreCookieFocus();
    }
  });
  cookieObserver.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'style', 'hidden'],
  });

  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href="#cookie-settings"]');
    if (link) {
      e.preventDefault();
      // Remember the trigger so focus can return to it when the dialog closes.
      cookieInvoker = link;
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
