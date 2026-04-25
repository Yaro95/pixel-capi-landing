function generateEventId(eventName) {
  if (window.crypto && typeof window.crypto.randomUUID === 'function') {
    return `${eventName}_${window.crypto.randomUUID()}`;
  }

  return `${eventName}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

window.generateEventId = generateEventId;
