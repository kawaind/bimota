import { loadCSS, loadScript } from './aem.js';
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

  // --- Cookie dialog: accessible triggers + focus management (KAW-11190) ---
  // Authors open the CCM19 preferences with a link to "#cookie-settings". That
  // control opens a dialog rather than navigating, so it must be a button
  // (WCAG 4.1.2): ours are replaced with a native <button type="button"> (Enter
  // AND Space, no link semantics); the ones inside CCM19's own banner copy stay
  // in CCM19's markup and only get role="button" + Space activation.
  // CCM19 also leaves keyboard and screen-reader users on <body> when its
  // dialogs close (Escape, close, accept/decline or save), so we remember the
  // element focused before a dialog opened and return focus to it once the
  // dialog is hidden (WCAG 2.4.3, ARIA APG dialog pattern). CCM19 exposes no
  // reliable close callback, so a MutationObserver scoped to its root watches
  // for the dialog being hidden. Focus-visible styles live in cookie-consent.css.
  const COOKIE_TRIGGER_HREF = '#cookie-settings';
  const COOKIE_TRIGGER_SELECTOR = `a[href="${COOKIE_TRIGGER_HREF}"], button[data-cookie-settings]`;
  const COOKIE_DIALOG_SELECTOR = '.ccm-widget, .ccm-control-panel, .ccm-modal';
  const COOKIE_SUMMONER_SELECTOR = '.ccm-settings-summoner--link';
  let cookieInvoker = null;
  let cookieOpener = null;
  let lastFocusedElement = null;
  let cookieDialogShown = false;

  loadCSS(`${window.hlx?.codeBasePath || ''}/styles/cookie-consent.css`);

  const upgradeCookieTriggers = () => {
    document.querySelectorAll(`a[href="${COOKIE_TRIGGER_HREF}"]:not([role="button"])`).forEach((link) => {
      if (link.closest('.ccm-root')) {
        link.setAttribute('role', 'button');
        link.setAttribute('aria-haspopup', 'dialog');
        return;
      }
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `cookie-settings-trigger ${link.className}`.trim();
      button.dataset.cookieSettings = '';
      button.setAttribute('aria-haspopup', 'dialog');
      // a title repeating the visible text is redundant for screen readers
      const { title } = link;
      if (title && title.trim() !== link.textContent.trim()) button.title = title;
      button.append(...link.childNodes);
      const hadFocus = document.activeElement === link;
      link.replaceWith(button);
      if (hadFocus) button.focus();
    });
  };

  upgradeCookieTriggers();
  // the footer is normally decorated well before this script runs; if not, upgrade once it is
  const footerBlock = document.querySelector('footer .footer');
  if (footerBlock && footerBlock.dataset.blockStatus !== 'loaded') {
    const footerObserver = new MutationObserver(() => {
      if (footerBlock.dataset.blockStatus !== 'loaded') return;
      footerObserver.disconnect();
      upgradeCookieTriggers();
    });
    footerObserver.observe(footerBlock, { attributes: true, attributeFilter: ['data-block-status'] });
  }

  const isRendered = (el) => {
    const style = window.getComputedStyle(el);
    return !el.hidden && style.display !== 'none' && style.visibility !== 'hidden';
  };

  const isCookieDialogShown = () => [...document.querySelectorAll(COOKIE_DIALOG_SELECTOR)]
    .some(isRendered);

  // focusable, visible and outside the (closed) CCM19 dialogs
  const canReceiveFocus = (el) => !!el
    && el.isConnected
    && el !== document.body
    && !el.closest(`[hidden], [inert], ${COOKIE_DIALOG_SELECTOR}`)
    && el.getClientRects().length > 0
    && isRendered(el);

  // Track the element focused before a dialog takes focus. Capturing it when the
  // dialog opens is too late: CCM19 has already moved focus into the dialog.
  document.addEventListener('focusin', (e) => {
    if (!e.target.closest?.(COOKIE_DIALOG_SELECTOR)) lastFocusedElement = e.target;
  });

  const restoreCookieFocus = () => {
    const opener = cookieOpener;
    cookieOpener = null;
    cookieInvoker = null;
    let frames = 0;
    // in requestAnimationFrame so the focus call isn't undone by CCM19's teardown
    const attempt = () => {
      // CCM19 can swap one dialog for another (banner -> preferences); not a close
      if (isCookieDialogShown()) return;
      // a blocking dialog makes the page (and the summoner) inert, and CCM19 lifts
      // that a few frames after hiding the dialog (e.g. on save); focus() is
      // ignored until then
      if (document.querySelector('body > :not(.ccm-root)[inert], .ccm-settings-summoner[inert]')
        && frames < 30) {
        frames += 1;
        requestAnimationFrame(attempt);
        return;
      }
      const active = document.activeElement;
      const focusLost = !canReceiveFocus(active);
      if (canReceiveFocus(opener)) {
        if (active !== opener) opener.focus();
        return;
      }
      // Only step in when focus was dropped (e.g. the first-visit banner, which
      // opens on its own): fall back to the CCM19 "change consent" button, which
      // replaces the banner, then to the main content (the skip-link target).
      if (!focusLost) return;
      const summoner = document.querySelector(COOKIE_SUMMONER_SELECTOR);
      if (canReceiveFocus(summoner)) {
        summoner.focus();
        return;
      }
      document.querySelector('main[tabindex]')?.focus({ preventScroll: true });
    };
    requestAnimationFrame(attempt);
  };

  const onCookieDialogMutation = () => {
    upgradeCookieTriggers();
    const shown = isCookieDialogShown();
    if (shown && !cookieDialogShown) {
      cookieDialogShown = true;
      cookieOpener = cookieInvoker || lastFocusedElement;
    } else if (!shown && cookieDialogShown) {
      cookieDialogShown = false;
      restoreCookieFocus();
    }
  };

  // Scope the observer to CCM19's root (a direct child of <body>) so the
  // page's own class/style changes (carousels etc.) never trigger it.
  const cookieObserver = new MutationObserver(onCookieDialogMutation);
  const observeCookieRoot = () => {
    const root = document.querySelector('body > .ccm-root');
    if (!root || root.dataset.cookieObserved) return;
    root.dataset.cookieObserved = 'true';
    cookieObserver.observe(root, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'hidden'],
    });
    onCookieDialogMutation();
  };
  new MutationObserver(observeCookieRoot).observe(document.body, { childList: true });
  observeCookieRoot();

  document.addEventListener('click', (e) => {
    const trigger = e.target.closest(COOKIE_TRIGGER_SELECTOR);
    if (trigger) {
      e.preventDefault();
      // Remember the trigger so focus can return to it when the dialog closes
      // (a mouse click doesn't focus a button in every browser).
      cookieInvoker = trigger;
      if (window.CCM && window.CCM.openControlPanel) {
        window.CCM.openControlPanel();
      }
    }
  });

  // links given role="button" must also activate with Space, like a native button
  document.addEventListener('keydown', (e) => {
    if (e.key !== ' ') return;
    const link = e.target.closest?.(`a[href="${COOKIE_TRIGGER_HREF}"][role="button"]`);
    if (link) {
      e.preventDefault();
      link.click();
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
