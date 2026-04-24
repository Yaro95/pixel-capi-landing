const YANDEX_MAPS_API_URL = 'https://api-maps.yandex.ru/2.1/?apikey=3ced02f3-2fde-40db-9115-6159941def0a&lang=ru_RU';
const APARTMENT_COORDS = [41.312783, 69.322937];
const MAP_INITIAL_CENTER = [41.31295, 69.32335];
const MAP_POINTS = [
  {
    coords: APARTMENT_COORDS,
    title: 'Объект',
    description: '3-комнатная квартира',
    preset: 'islands#greenHomeIcon'
  },
  {
    coords: [41.314801, 69.322941],
    title: 'Рынок',
    description: 'Рядом с объектом',
    preset: 'islands#blueShoppingIcon'
  },
  {
    coords: [41.310693, 69.323457],
    title: 'Школа',
    description: 'Поблизости от дома',
    preset: 'islands#blueEducationIcon'
  },
  {
    coords: [41.313371, 69.325760],
    title: 'Детский сад',
    description: 'В пешей доступности',
    preset: 'islands#blueFamilyIcon'
  }
];

let yandexMapsPromise;

function loadYandexMaps() {
  if (window.ymaps) return Promise.resolve();
  if (yandexMapsPromise) return yandexMapsPromise;

  yandexMapsPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = YANDEX_MAPS_API_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Yandex Maps'));
    document.head.appendChild(script);
  });

  return yandexMapsPromise;
}

function createLocationMap() {
  const mapNode = document.getElementById('location-map');
  const mapShell = mapNode?.closest('.map-shell');
  if (!mapNode || !window.ymaps) return;

  ymaps.ready(() => {
    const map = new ymaps.Map(mapNode, {
      center: MAP_INITIAL_CENTER,
      zoom: 15,
      controls: ['zoomControl', 'fullscreenControl']
    }, {
      suppressMapOpenBlock: true,
      yandexMapDisablePoiInteractivity: true
    });

    MAP_POINTS.forEach((point) => {
      const placemark = new ymaps.Placemark(point.coords, {
        balloonContentHeader: point.title,
        balloonContentBody: point.description,
        hintContent: point.title
      }, {
        preset: point.preset
      });

      map.geoObjects.add(placemark);
    });

    mapShell?.classList.add('is-loaded');

    setTimeout(() => {
      map.setCenter(APARTMENT_COORDS, 17, {
        duration: 1800,
        timingFunction: 'ease-in-out'
      });
    }, 1600);
  });
}

function initLazyMap() {
  const loadButton = document.querySelector('[data-load-map]');
  if (!loadButton) return;

  loadButton.addEventListener('click', async () => {
    loadButton.disabled = true;
    loadButton.textContent = 'Загрузка...';

    try {
      await loadYandexMaps();
      createLocationMap();
    } catch (_) {
      loadButton.disabled = false;
      loadButton.textContent = 'Не удалось загрузить карту';
    }
  });
}

document.addEventListener('DOMContentLoaded', initLazyMap);
