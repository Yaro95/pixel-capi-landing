const FBP_PATTERN = /^fb\.1\.\d{10,13}\.[A-Za-z0-9._-]+$/;
const FBC_PATTERN = /^fb\.1\.\d{10,13}\.[A-Za-z0-9_-]+$/;

function getCookie(name) {
  return document.cookie
    .split(';')
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${name}=`))
    ?.split('=')
    .slice(1)
    .join('=');
}

function setCookie(name, value, maxAgeDays) {
  const maxAge = maxAgeDays * 24 * 60 * 60;
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';

  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`;
}

function getLocalStorageSafe(key) {
  try {
    return window.localStorage.getItem(key);
  } catch (_) {
    return null;
  }
}

function setLocalStorageSafe(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch (_) {
    // Ignore storage failures in private mode or restricted browsers.
  }
}

function readFbclid() {
  const params = new URLSearchParams(window.location.search);
  return params.get('fbclid');
}

function buildFbcFromFbclid(fbclid) {
  if (!fbclid) return undefined;

  return `fb.1.${Math.floor(Date.now() / 1000)}.${fbclid}`;
}

function ensureFbcCookie() {
  const existingFbc = getCookie('_fbc');
  const fbclid = readFbclid();

  if (existingFbc || !fbclid) return existingFbc;

  const fbc = buildFbcFromFbclid(fbclid);
  setCookie('_fbc', fbc, 90);

  return fbc;
}

function getMetaIds() {
  const rawFbp = getCookie('_fbp');
  const rawFbc = getCookie('_fbc') || ensureFbcCookie();

  return {
    fbp: FBP_PATTERN.test(rawFbp || '') ? rawFbp : undefined,
    fbc: FBC_PATTERN.test(rawFbc || '') ? rawFbc : undefined
  };
}

function getPageContext() {
  const language = document.documentElement.lang || 'ru';
  const pathname = window.location.pathname || '/';

  return {
    page_language: language.toLowerCase(),
    page_variant: pathname.includes('/uz/') ? 'uz' : 'ru',
    page_path: pathname
  };
}

function buildPayload(eventId) {
  const metaIds = getMetaIds();
  const pageContext = getPageContext();

  return {
    event_name: 'Lead',
    event_id: eventId,
    event_time: Math.floor(Date.now() / 1000),
    source_url: window.location.href,
    fbp: metaIds.fbp,
    fbc: metaIds.fbc,
    custom_data: {
      content_ids: ['apt_001'],
      content_type: 'product',
      ...pageContext
    }
  };
}

const CAPI_REQUEST_TIMEOUT_MS = 2500;

async function sendCapiEvent(payload) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CAPI_REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    if (!response.ok) {
      let errorDetails = `HTTP ${response.status}`;

      try {
        const body = await response.json();
        errorDetails = JSON.stringify(body);
      } catch (_) {
        // Ignore JSON parse failures and keep the generic status text.
      }

      throw new Error(`CAPI request failed: ${errorDetails}`);
    }
  } finally {
    clearTimeout(timeoutId);
  }
}

async function handleTelegramClick(event) {
  const button = event.currentTarget;
  const eventId = window.generateEventId('Lead');
  const payload = buildPayload(eventId);

  button.disabled = true;

  if (typeof fbq === 'function') {
    fbq('track', 'Lead', payload.custom_data, { eventID: eventId });
  }

  try {
    await sendCapiEvent(payload);
  } catch (error) {
    console.error(error.message);
    // Telegram redirect is more important than blocking the user on tracking.
  } finally {
    window.location.href = `https://t.me/${TG_USERNAME}`;
  }
}

function initCarousel() {
  const carousel = document.querySelector('[data-carousel]');
  if (!carousel) return;

  const track = carousel.querySelector('[data-carousel-track]');
  const slides = Array.from(carousel.querySelectorAll('.carousel__slide'));
  const prevButton = carousel.querySelector('[data-carousel-prev]');
  const nextButton = carousel.querySelector('[data-carousel-next]');
  const dotsContainer = carousel.querySelector('[data-carousel-dots]');
  let currentIndex = 0;
  let pointerStartX = null;

  function renderDots() {
    dotsContainer.innerHTML = '';

    slides.forEach((_, index) => {
      const dot = document.createElement('button');
      dot.className = 'carousel__dot';
      dot.type = 'button';
      dot.setAttribute('aria-label', `Показать фото ${index + 1}`);
      dot.addEventListener('click', () => goToSlide(index));
      dotsContainer.appendChild(dot);
    });
  }

  function updateCarousel() {
    const slide = slides[currentIndex];
    const viewport = carousel.querySelector('.carousel__viewport');
    const viewportCenter = viewport.offsetWidth / 2;
    const slideCenter = slide.offsetLeft + slide.offsetWidth / 2;

    track.style.transform = `translateX(${viewportCenter - slideCenter}px)`;

    slides.forEach((item, index) => {
      const distance = Math.abs(index - currentIndex);
      item.classList.toggle('is-active', distance === 0);
      item.classList.toggle('is-neighbor', distance === 1);
    });

    Array.from(dotsContainer.children).forEach((dot, index) => {
      dot.setAttribute('aria-current', index === currentIndex ? 'true' : 'false');
    });
  }

  function goToSlide(index) {
    currentIndex = (index + slides.length) % slides.length;
    updateCarousel();
  }

  prevButton.addEventListener('click', () => goToSlide(currentIndex - 1));
  nextButton.addEventListener('click', () => goToSlide(currentIndex + 1));

  carousel.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') goToSlide(currentIndex - 1);
    if (event.key === 'ArrowRight') goToSlide(currentIndex + 1);
  });

  carousel.addEventListener('pointerdown', (event) => {
    pointerStartX = event.clientX;
  });

  carousel.addEventListener('pointerup', (event) => {
    if (pointerStartX === null) return;

    const deltaX = event.clientX - pointerStartX;
    pointerStartX = null;

    if (Math.abs(deltaX) < 42) return;
    goToSlide(currentIndex + (deltaX < 0 ? 1 : -1));
  });

  window.addEventListener('resize', updateCarousel);

  carousel.tabIndex = 0;
  renderDots();
  updateCarousel();
}

function scheduleNonCriticalTask(task) {
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(task, { timeout: 800 });
    return;
  }

  window.setTimeout(task, 0);
}

function initCarouselWhenVisible() {
  const carousel = document.querySelector('[data-carousel]');
  if (!carousel) return;

  let initialized = false;
  let observer;

  function startCarousel() {
    if (initialized) return;
    initialized = true;
    observer?.disconnect();
    scheduleNonCriticalTask(initCarousel);
  }

  if (!('IntersectionObserver' in window)) {
    startCarousel();
    return;
  }

  observer = new IntersectionObserver((entries) => {
    if (!entries[0]?.isIntersecting) return;
    startCarousel();
  }, {
    rootMargin: '220px 0px'
  });

  observer.observe(carousel);
  carousel.addEventListener('pointerdown', startCarousel, { once: true, passive: true });
  carousel.addEventListener('focusin', startCarousel, { once: true });
}

function initCookieBanner() {
  const banner = document.querySelector('[data-cookie-banner]');
  const acceptButton = document.querySelector('[data-cookie-accept]');
  if (!banner || !acceptButton) return;

  const consentKey = 'cookie_notice_accepted';
  if (getLocalStorageSafe(consentKey) === '1') return;

  banner.hidden = false;

  acceptButton.addEventListener('click', () => {
    setLocalStorageSafe(consentKey, '1');
    banner.hidden = true;
  });
}

document.addEventListener('DOMContentLoaded', () => {
  ensureFbcCookie();
  initCarouselWhenVisible();
  initCookieBanner();

  document
    .querySelectorAll('[data-telegram-link]')
    .forEach((button) => button.addEventListener('click', handleTelegramClick));
});
