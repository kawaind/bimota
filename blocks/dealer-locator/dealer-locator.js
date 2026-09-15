import { loadScript, getMetadata } from '../../scripts/aem.js';
import { getPathSegments, getLanguageFromPath, getLanguageLabels } from '../../scripts/helpers.js';

// English fallback for the map's accessible name, used until the localized
// label resolves (or if the dictionary lookup fails), so the map always exposes
// a descriptive name and never a generic ("Map") or missing one (WCAG 4.1.2;
// technique H64 when the map is an iframe).
const DEALER_MAP_TITLE_FALLBACK = 'Map of Bimota dealer locations';

/**
 * Give the Woosmap map a descriptive, localized accessible name so screen
 * readers announce its purpose on focus, instead of the generic "Map" the SDK
 * sets (WCAG 4.1.2; also supports 2.4.1 / 1.3.1).
 *
 * The map is rendered asynchronously by the Woosmap WebApp SDK. Depending on
 * the SDK/provider it is either a WebGL `<canvas role="region" aria-label="Map">`
 * or an embedded `<iframe>`. This names whichever is present:
 *  - iframe: set the native `title` attribute (technique H64);
 *  - canvas map region: replace the generic `aria-label` with the descriptive
 *    name (an ARIA name is the only option a canvas can expose).
 * A MutationObserver waits for the map element to appear, names it, and
 * disconnects. No visual/behaviour/focus-order change.
 * @param {Element} container the dealer-locator map container (#dealer-locator)
 */
function nameMapRegion(container) {
  const applyName = (name) => {
    // Prefer an iframe (spec's H64 path) if the SDK ever renders one.
    const iframe = container.querySelector('iframe:not([title]), iframe[title=""]');
    if (iframe) {
      iframe.setAttribute('title', name);
      return true;
    }
    // Otherwise name the map region the SDK labels generically as "Map".
    const region = container.querySelector('[role="region"][aria-label="Map"], canvas[aria-label="Map"]');
    if (region) {
      region.setAttribute('aria-label', name);
      return true;
    }
    return false;
  };

  // The Woosmap/Mapbox attribution control is injected with role="list" but
  // holds plain <a> links (not listitems), which fails ARIA required-children.
  // It is purely decorative attribution, so drop the list roles to leave valid
  // markup (the links still render and work). Not our markup, but neutralised
  // here so the map block stays axe-clean.
  const fixAttributionRoles = () => {
    container.querySelectorAll('[role="list"]').forEach((list) => {
      if (list.closest('.mapboxgl-ctrl-attrib, .woosmap-webapp-container')) {
        list.removeAttribute('role');
      }
    });
  };

  // Resolve the localized name once; apply it as soon as the map element exists.
  getLanguageLabels('dealer-selector', { dealerMap: DEALER_MAP_TITLE_FALLBACK })
    .then((labels) => {
      const name = labels.dealerMap || DEALER_MAP_TITLE_FALLBACK;
      const done = () => applyName(name) && !container.querySelector('.mapboxgl-ctrl-attrib [role="list"]');
      fixAttributionRoles();
      if (done()) return;

      const observer = new MutationObserver(() => {
        applyName(name);
        fixAttributionRoles();
        if (done()) observer.disconnect();
      });
      observer.observe(container, { childList: true, subtree: true, attributes: true });
    });
}

export default async function decorate(block) {
  const dealerLocator = document.createElement('div');
  dealerLocator.classList.add('dealer-locator-map');
  dealerLocator.setAttribute('id', 'dealer-locator');
  block.append(dealerLocator);
  const isOneLocationVariant = block.classList.contains('one-location');
  const language = getLanguageFromPath();
  const isRedVariant = block.classList.contains('red');
  const redConfig = [
    {
      featureType: 'water',
      elementType: 'geometry',
      stylers: [
        { color: '#9c3030' },
      ],
    },
    {
      featureType: 'road',
      elementType: 'geometry',
      stylers: [
        { color: '#7e4c4c' },
      ],
    },
    {
      featureType: 'landscape',
      elementType: 'geometry.fill',
      stylers: [
        { color: '#562c2c' },
      ],
    },
    {
      featureType: 'poi.park',
      elementType: 'geometry.fill',
      stylers: [
        {
          color: '#3c3838',
        },
      ],
    },
    {
      featureType: 'administrative.country',
      elementType: 'geometry.stroke',
      stylers: [
        {
          color: '#ffffff',
        },
        {
          weight: 1,
        },
      ],
    },
  ];

  const colorsConfig = isRedVariant ? redConfig : [];
  const woosmapKey = getMetadata('wooskey');

  const selectedLocationConfig = {
    initialZoom: 11,
    breakPoint: 10,
    baseMapStyle: colorsConfig,
    tileStyle: {
      color: '#ed1d24',
      size: 13,
      minSize: 7,
    },
    style: {
      default: {
        icon: {
          url: 'https://www.kawasaki.eu/content/dam/dealerlocator/location-default-bimoto.png',
          scaledSize: {
            height: 16,
            width: 16,
          },
        },
        selectedIcon: {
          url: 'https://www.kawasaki.eu/content/dam/dealerlocator/location-active-bimoto.png',
          scaledSize: {
            height: 32,
            width: 32,
          },
        },
      },
    },
  };

  const LOCATION_CENTERS = {
    default: {
      lat: 48.76491381275538,
      lng: 9.448189738271257,
    },
    northAmerica: {
      lat: 40.77165313148952,
      lng: -98.07848718537002,
    },
    australia: {
      lat: -23.697594814272342,
      lng: 133.8791213901413,
    },
    philippines: {
      lat: 13.374468169723215,
      lng: 122.00808081554484,
    },
    japan: {
      lat: 36.204824,
      lng: 138.252924,
    },
  };

  const CENTER_BY_PATH = {
    'us/en-us': LOCATION_CENTERS.northAmerica,
    'mx/es-mx': LOCATION_CENTERS.northAmerica,
    'mx/en-mx': LOCATION_CENTERS.northAmerica,
    'ca/en-ca': LOCATION_CENTERS.northAmerica,
    'ca/fr-ca': LOCATION_CENTERS.northAmerica,
    'au/en': LOCATION_CENTERS.australia,
    'ph/en': LOCATION_CENTERS.philippines,
    'jp/ja': LOCATION_CENTERS.japan,
  };

  const ZOOM_BY_PATH = {
    'ph/en': 5,
    'jp/ja': 5,
  };

  const DEFAULT_ZOOM = 5;

  const getPathKey = (pathname) => {
    const currentPathname = pathname
      ?? (typeof window !== 'undefined' ? window.location.pathname : '');

    const [country, locale] = getPathSegments(currentPathname);
    return `${country}/${locale}`;
  };

  const getInitialCenter = (pathname) => {
    const pathKey = getPathKey(pathname);
    return CENTER_BY_PATH[pathKey] ?? LOCATION_CENTERS.default;
  };

  const getInitialZoom = (pathname) => {
    const pathKey = getPathKey(pathname);
    return ZOOM_BY_PATH[pathKey] ?? DEFAULT_ZOOM;
  };

  const FIT_BOUNDS_PATHS = ['jp/ja', 'ph/en'];

  const shouldFitBounds = (pathname) => {
    const pathKey = getPathKey(pathname);
    return FIT_BOUNDS_PATHS.includes(pathKey);
  };

  const defaultLocationConfig = {
    initialCenter: getInitialCenter(),
    initialZoom: getInitialZoom(),
    fitBounds: shouldFitBounds(),
    tileStyle: {
      color: '#ed1d24',
      size: 12,
      minSize: 10,
    },
    breakPoint: 10,
    baseMapStyle: colorsConfig,
    style: {
      default: {
        icon: {
          url: 'https://www.kawasaki.eu/content/dam/dealerlocator/location-default-bimoto.png',
          anchor: {
            x: 16,
            y: 16,
          },
        },
        selectedIcon: {
          url: 'https://www.kawasaki.eu/content/dam/dealerlocator/location-active-bimoto.png',
          anchor: {
            x: 16,
            y: 16,
          },
        },
      },
    },
  };

  const loadDealerLocator = () => {
    loadScript('/blocks/dealer-locator/vendor/jquery.min.js', { type: 'text/javascript', charset: 'UTF-8' })
      .then(() => {
        // these scripts depend on jquery:
        loadScript('//webapp.woosmap.com/webapp.js', { type: 'text/javascript' }).then(() => {
          function loadWebApp() {
            // eslint-disable-next-line no-undef
            const webapp = new window.WebApp('dealer-locator', woosmapKey);
            const config = {
              maps: {
                provider: 'woosmap',
                language,
                channel: '',
                localities: {
                  language,
                  data: 'advanced',
                },
              },
              theme: {
                primaryColor: '#ed1d24',
              },
              datasource: {
                maxResponses: 5,
                maxDistance: 1000000,
                useDistanceMatrix: true,
                distanceMatrixProvider: 'woosmap',
              },
              internationalization: {
                lang: language,
              },
              woosmapview: isOneLocationVariant ? selectedLocationConfig : defaultLocationConfig,
            };
            webapp.setConf(config);
            if (isOneLocationVariant) {
              webapp.setInitialStateToSelectedStore('990002');
            }
            webapp.render();
            // Give the map a descriptive, localized accessible name once the
            // SDK injects it (async) — iframe title or canvas region aria-label.
            nameMapRegion(dealerLocator);
          }
          loadWebApp();
        });
      });
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.intersectionRatio > 0) {
        loadDealerLocator();
        observer.disconnect();
      }
    });
  }, { threshold: [0.1], rootMargin: '500px' });

  observer.observe(block);
}
