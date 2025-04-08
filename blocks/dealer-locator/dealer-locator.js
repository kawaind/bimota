import { loadScript, getMetadata } from '../../scripts/aem.js';

export default async function decorate(block) {
  const dealerLocator = document.createElement('div');
  dealerLocator.classList.add('dealer-locator-map');
  dealerLocator.setAttribute('id', 'dealer-locator');
  block.append(dealerLocator);
  const isOneLocationVariant = block.classList.contains('one-location');
  const language = /\/en\//.test(window.location.pathname) ? 'en' : 'it';
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

  const defaultLocationConfig = {
    initialCenter: {
      lat: 52.4862,
      lng: 1.8904,
    },
    initialZoom: 5,
    fitBounds: true,
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
