function generateEventId(eventName) {
  if (window.crypto && typeof window.crypto.randomUUID === 'function') {
    return `${eventName}_${window.crypto.randomUUID()}`;
  }

  return `${eventName}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function trackViewContent() {
  if (typeof fbq !== 'function') return;

  fbq('track', 'ViewContent', {
    content_ids: ['apt_001'],
    content_type: 'product'
  });
}

window.generateEventId = generateEventId;

document.addEventListener('DOMContentLoaded', trackViewContent);
