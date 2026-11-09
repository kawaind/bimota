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

  // The preferences panel can also be opened from the banner's own "Cookie
  // Settings" link and closed while the banner stays open; focus then goes back
  // to that link (CCM19 doesn't always do it, e.g. after a Space activation).
  let panelShown = false;
  let panelOpener = null;
  const restoreBannerFocus = (opener) => {
    let frames = 0;
    const attempt = () => {
      if (!opener.isConnected || !isRendered(opener.closest('.ccm-widget'))) return;
      // the banner can stay inert for a few frames after the blocking panel closes
      if (opener.closest('[inert]') && frames < 30) {
        frames += 1;
        requestAnimationFrame(attempt);
        return;
      }
      const active = document.activeElement;
      if (!active || active === document.body || !active.closest('.ccm-widget')) opener.focus();
    };
    requestAnimationFrame(attempt);
  };

  // CCM19 makes the text block of its dialogs (".ccm-inner-overflow",
  // role="document") a Tab stop, so Tab lands on plain informational text
  // between the dialog's controls (KAW-11070, WCAG 2.4.3). Take such
  // non-interactive elements out of the Tab order: tabindex="-1" keeps them
  // focusable from script (CCM19 may still put the initial focus there) and
  // their text readable. A shown text block that scrolls and contains no
  // control of its own keeps its Tab stop, so keyboard users can still scroll
  // it (WCAG 2.1.1).
  const INTERACTIVE_SELECTOR = 'a[href], button, input, select, textarea, summary, [contenteditable="true"], '
    + '[role="button"], [role="link"], [role="checkbox"], [role="switch"], [role="radio"], [role="tab"], '
    + '[role="combobox"], [role="option"], [role="menuitem"], [role="slider"], [role="textbox"]';
  const removeTextTabStops = () => {
    document.querySelectorAll('.ccm-root [tabindex="0"]').forEach((el) => {
      if (el.matches(INTERACTIVE_SELECTOR) || !isRendered(el)) return;
      const scrolls = el.scrollHeight > el.clientHeight + 1;
      const hasControls = !!el.querySelector(`${INTERACTIVE_SELECTOR}, [tabindex="0"]`);
      if (scrolls && !hasControls) return;
      el.setAttribute('tabindex', '-1');
    });
  };

  // --- First-visit banner: focus order and containment (KAW-11326) ---
  // CCM19 renders its cookie banner (#ccm-widget) as a non-modal dialog whose
  // close (X) button comes right after the language selector in the DOM, so
  // Tab reached the X before the text links and buttons, and Tab / Shift+Tab
  // and the screen reader's reading cursor left the banner for the page behind
  // it. While the banner is shown and has focus:
  // - Tab / Shift+Tab follow the visual reading order (language selector, the
  //   links in the text, the action buttons, the close button last) and wrap
  //   around inside the banner (WCAG 2.4.3);
  // - it is exposed as a modal dialog and the rest of the page is hidden from
  //   assistive technology (aria-modal + aria-hidden, WCAG 1.3.2 / 4.1.2).
  // The page stays usable with the mouse: when focus moves into the page, it
  // is revealed again (and hidden again once focus returns to the banner).
  const BANNER_SELECTOR = '#ccm-widget.ccm-widget';
  const BANNER_CLOSE_SELECTOR = '.ccm-dismiss-button';
  const TABBABLE_SELECTOR = 'a[href], button, input, select, textarea, [tabindex]';
  const hiddenBehindBanner = new Set();
  let bannerModal = false;

  const hideBehindBanner = () => {
    [...document.body.children].forEach((el) => {
      if (el.matches('.ccm-root, script, style, link, noscript')
        || el.getAttribute('aria-hidden') === 'true') return;
      el.setAttribute('aria-hidden', 'true');
      hiddenBehindBanner.add(el);
    });
  };

  const revealBehindBanner = () => {
    hiddenBehindBanner.forEach((el) => el.removeAttribute('aria-hidden'));
    hiddenBehindBanner.clear();
  };

  const setBannerModal = (on) => {
    if (on === bannerModal) return;
    bannerModal = on;
    const banner = document.querySelector(BANNER_SELECTOR);
    if (on) {
      banner?.setAttribute('aria-modal', 'true');
      hideBehindBanner();
    } else {
      banner?.removeAttribute('aria-modal');
      revealBehindBanner();
    }
  };

  const updateBannerModal = () => {
    const banner = document.querySelector(BANNER_SELECTOR);
    if (!banner || !isRendered(banner)) {
      setBannerModal(false);
      return;
    }
    const active = document.activeElement;
    if (!active || active === document.body || banner.contains(active)) setBannerModal(true);
  };

  document.addEventListener('focusin', (e) => {
    const banner = document.querySelector(BANNER_SELECTOR);
    if (!banner || !isRendered(banner)) return;
    if (banner.contains(e.target)) setBannerModal(true);
    else if (!e.target.closest?.('.ccm-root')) setBannerModal(false);
  });

  // Visual reading order of the banner's controls: DOM order with the close
  // button moved to the end.
  const bannerTabOrder = (banner) => {
    const tabbables = [...banner.querySelectorAll(TABBABLE_SELECTOR)].filter((el) => (
      el.tabIndex >= 0
      && !el.disabled
      && !el.closest('[hidden], [inert]')
      && el.getClientRects().length > 0
      && isRendered(el)
    ));
    return [
      ...tabbables.filter((el) => !el.matches(BANNER_CLOSE_SELECTOR)),
      ...tabbables.filter((el) => el.matches(BANNER_CLOSE_SELECTOR)),
    ];
  };

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab' || e.altKey || e.ctrlKey || e.metaKey) return;
    const banner = document.querySelector(BANNER_SELECTOR);
    const active = document.activeElement;
    if (!banner || !isRendered(banner) || banner.closest('[inert]') || !banner.contains(active)) return;
    const order = bannerTabOrder(banner);
    if (!order.length) return;
    let next;
    const index = order.indexOf(active);
    if (index >= 0) {
      next = order[(index + (e.shiftKey ? -1 : 1) + order.length) % order.length];
    } else {
      // Focus is on an element that is not a Tab stop (e.g. the text block
      // CCM19 focuses on open): go to the nearest control in reading order.
      const flow = order.filter((el) => !el.matches(BANNER_CLOSE_SELECTOR));
      const domOrder = [...banner.querySelectorAll('*')];
      const follows = (el) => domOrder.indexOf(el) > domOrder.indexOf(active);
      next = e.shiftKey ? [...flow].reverse().find((el) => !follows(el)) : flow.find(follows);
      next = next || (e.shiftKey ? order[order.length - 1] : order[0]);
    }
    e.preventDefault();
    next.focus();
  }, true);

  const onCookieDialogMutation = () => {
    upgradeCookieTriggers();
    removeTextTabStops();
    updateBannerModal();
    const panel = document.querySelector('.ccm-control-panel');
    const panelNowShown = !!panel && isRendered(panel);
    if (panelNowShown && !panelShown) {
      panelOpener = cookieInvoker?.closest('.ccm-widget') ? cookieInvoker : null;
    } else if (!panelNowShown && panelShown) {
      if (panelOpener && isCookieDialogShown()) {
        cookieInvoker = null;
        restoreBannerFocus(panelOpener);
      }
      panelOpener = null;
    }
    panelShown = panelNowShown;

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
      attributeFilter: ['class', 'style', 'hidden', 'tabindex'],
    });
    onCookieDialogMutation();
  };
  new MutationObserver(() => {
    observeCookieRoot();
    // content added to <body> while the banner is modal is hidden too
    if (bannerModal) hideBehindBanner();
  }).observe(document.body, { childList: true });
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

  // links given role="button" must also activate with Space, like a native
  // button: on key release (keydown only stops the page from scrolling), and
  // only if the key was pressed on the same link
  let spacePressedLink = null;
  const roleButtonLink = (e) => e.target.closest?.(`a[href="${COOKIE_TRIGGER_HREF}"][role="button"]`);
  document.addEventListener('keydown', (e) => {
    if (e.key !== ' ') return;
    const link = roleButtonLink(e);
    if (link) {
      e.preventDefault();
      spacePressedLink = link;
    }
  });
  document.addEventListener('keyup', (e) => {
    if (e.key !== ' ') return;
    const link = roleButtonLink(e);
    const pressed = spacePressedLink;
    spacePressedLink = null;
    if (link && link === pressed) {
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
