const META_API_VERSION = 'v19.0';
const DEFAULT_META_REQUEST_TIMEOUT_MS = 8000;

function compactObject(value) {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => {
      if (Array.isArray(entry)) return entry.length > 0 && entry.every(Boolean);
      return entry !== undefined && entry !== null && entry !== '';
    })
  );
}

async function sendEvent(event) {
  const pixelId = process.env.PIXEL_ID;
  const endpoint = `https://graph.facebook.com/${META_API_VERSION}/${pixelId}/events`;
  const timeoutMs = Number(process.env.META_REQUEST_TIMEOUT_MS || DEFAULT_META_REQUEST_TIMEOUT_MS);

  const userData = compactObject({
    fbp: event.fbp,
    fbc: event.fbc,
    client_ip_address: event.client_ip_address,
    client_user_agent: event.client_user_agent
  });

  const payload = compactObject({
    data: [
      compactObject({
        event_name: event.event_name,
        event_time: event.event_time,
        event_id: event.event_id,
        action_source: 'website',
        event_source_url: event.source_url || process.env.EVENT_SOURCE_URL,
        user_data: userData,
        custom_data: event.custom_data
      })
    ],
    test_event_code: process.env.TEST_EVENT_CODE,
    access_token: process.env.CAPI_ACCESS_TOKEN
  });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  let response;

  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error('Meta CAPI request timed out', {
        timeout_ms: timeoutMs
      });
    } else {
      console.error('Meta CAPI network error');
    }

    throw new Error('Meta CAPI request failed');
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    let errorCode = 'unknown';

    try {
      const body = await response.json();
      errorCode = body?.error?.code || body?.error?.error_subcode || 'unknown';
    } catch (_) {
      errorCode = 'unparseable';
    }

    console.error('Meta CAPI request failed', {
      status: response.status,
      error_code: errorCode
    });

    throw new Error('Meta CAPI request failed');
  }

  return response.json();
}

module.exports = { sendEvent };
