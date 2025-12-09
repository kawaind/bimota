// privacy-ccm19-override.js

let mapPromise;

async function fetchPrivacyMap() {
  if (!mapPromise) {
    mapPromise = fetch('/privacy-map.json', { credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : { data: [] }))
      .then((j) => j.data || [])
      .catch(() => []);
  }
  return mapPromise;
}

function getSitePrefix() {
  const parts = window.location.pathname.split('/').filter(Boolean);

  // Pattern: /{country}/{lang}/...
  if (parts.length >= 2) {
    return `${parts[0].toLowerCase()}/${parts[1].toLowerCase()}`;
  }

  return 'default';
}

function resolvePrivacyHref(rows, prefix) {
  const norm = (v) => String(v || '').toLowerCase();

  const exact = rows.find((r) => norm(r.site_prefix) === norm(prefix));
  if (exact?.privacy_path) return exact.privacy_path;

  const fallback = rows.find((r) => norm(r.site_prefix) === 'default');
  if (fallback?.privacy_path) return fallback.privacy_path;

  return '/privacy';
}

function findCcm19FooterLinks() {
  // Keep this single-line to avoid comma-dangle-on-multiline-call configs
  return Array.from(document.querySelectorAll('.ccm-modal--footer .ccm-link-container a'));
}

function pickPrivacyAnchor(anchors) {
  return anchors.find((a) => {
    const href = (a.getAttribute('href') || '').toLowerCase();
    return href.includes('/privacy');
  });
}

async function applyCcm19PrivacyOverride() {
  const rows = await fetchPrivacyMap();
  const prefix = getSitePrefix();
  const resolved = resolvePrivacyHref(rows, prefix);

  const footerLinks = findCcm19FooterLinks();
  const privacyAnchor = pickPrivacyAnchor(footerLinks);

  if (privacyAnchor) {
    privacyAnchor.setAttribute('href', resolved);
  }
}

export default function initCcm19PrivacyOverride() {
  applyCcm19PrivacyOverride();

  const observer = new MutationObserver(() => {
    applyCcm19PrivacyOverride();
  });

  observer.observe(document.body, { childList: true, subtree: true });
}
