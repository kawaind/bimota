import { loadScript, getMetadata } from '../../scripts/aem.js';

const LOCALE_TO_LANGUAGE = {
  'fr-be': 'fr',
  'nl-be': 'nl',
  'en-be': 'en',
  'en-ca': 'en',
  'fr-ca': 'fr',
  'en-mx': 'en',
  'es-mx': 'es',
  'en-lu': 'en',
  'fr-lu': 'fr',
};

const SUPPORTED_LANGUAGES = ['en', 'it', 'ja', 'es', 'fr', 'de', 'nl', 'lu'];

const getPathSegments = (pathname = '') => pathname
  .toLowerCase()
  .split('/')
  .filter(Boolean);

const getLanguage = (defaultLang = 'it', pathname) => {
  const currentPathname = pathname
    ?? (typeof window !== 'undefined' ? window.location.pathname : '');

  const segments = getPathSegments(currentPathname);

  const foundLocale = segments.find((segment) => LOCALE_TO_LANGUAGE[segment]);
  if (foundLocale) {
    return LOCALE_TO_LANGUAGE[foundLocale];
  }

  const foundLanguage = segments.find((segment) => SUPPORTED_LANGUAGES.includes(segment));
  return foundLanguage ?? defaultLang;
};

export default async function decorate(block) {
  const dealerLocator = document.createElement('div');
  dealerLocator.classList.add('dealer-locator-map');
  dealerLocator.setAttribute('id', 'dealer-locator');
  block.append(dealerLocator);
  const isOneLocationVariant = block.classList.contains('one-location');
  const language = getLanguage();
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
  };

  const CENTER_BY_PATH = {
    'us/en-us': LOCATION_CENTERS.northAmerica,
    'mx/es-mx': LOCATION_CENTERS.northAmerica,
    'mx/en-mx': LOCATION_CENTERS.northAmerica,
    'ca/en-ca': LOCATION_CENTERS.northAmerica,
    'ca/fr-ca': LOCATION_CENTERS.northAmerica,

    'au/en': LOCATION_CENTERS.australia,
    'ph/en': LOCATION_CENTERS.philippines,
  };

  const getPathSegments = (pathname = '') => pathname
    .toLowerCase()
    .split('/')
    .filter(Boolean);

  const getInitialCenter = (pathname) => {
    const currentPathname = pathname
      ?? (typeof window !== 'undefined' ? window.location.pathname : '');

    const [country, locale] = getPathSegments(currentPathname);
    const pathKey = `${country}/${locale}`;

    return CENTER_BY_PATH[pathKey] ?? LOCATION_CENTERS.default;
  };

  const defaultLocationConfig = {
    initialCenter: getInitialCenter(),
    initialZoom: 5,
    fitBounds: false,
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
