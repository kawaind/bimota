import { loadScript } from './aem.js';

// OneTrust Cookies Consent Notice
if (!window.location.pathname.includes('srcdoc')
  && !['localhost', 'hlx.page', 'hlx.live', 'aem.page', 'aem.live'].some((url) => window.location.host.includes(url))) {
  // when running on localhost in the block library host is empty but the path is srcdoc
  // on localhost/hlx.page/hlx.live the consent notice is displayed every time the page opens,
  // because the cookie is not persistent. To avoid this annoyance, disable unless on the
  // production page.
  loadScript('https://cdn.cookielaw.org/consent/0192f83d-f23b-72a4-88ba-54e881a37a86/OtAutoBlock.js', {
    type: 'text/javascript',
    charset: 'UTF-8',
  });

  loadScript('https://cdn.cookielaw.org/scripttemplates/otSDKStub.js', {
    type: 'text/javascript',
    charset: 'UTF-8',
    'data-domain-script': '0192f83d-f23b-72a4-88ba-54e881a37a86',
  });

  loadScript('https://assets.adobedtm.com/53c8e773d591/d826b4085ef5/launch-268ad0976d20.min.js', {
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
