import { loadScript } from '../../scripts/aem.js';

export default async function decorate(block) {
  const dealerLocator = document.createElement('div');
  dealerLocator.classList.add('dealer-locator-map');
  dealerLocator.setAttribute('id', 'dealer-locator');
  block.append(dealerLocator);
  const language = /\/en\//.test(window.location.pathname) ? 'en' : 'it';
  loadScript('/blocks/dealer-locator/vendor/jquery.min.js', { type: 'text/javascript', charset: 'UTF-8' })
    .then(() => {
      // these scripts depend on jquery:
      loadScript('//webapp.woosmap.com/webapp.js', { type: 'text/javascript' }).then(() => {
        function loadWebApp() {
          const publicKey = 'woos-50c04d89-af71-3a3b-b0b9-0786ee130532';
          // eslint-disable-next-line no-undef
          const webapp = new window.WebApp('dealer-locator', publicKey);
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
              primaryColor: '#ff0000',
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
            woosmapview: {
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
              baseMapStyle: [
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
              ],
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
            },
          };
          webapp.setConf(config);
          webapp.render();
        }
        loadWebApp();
      });
    });
}
