const test = require('node:test');
const assert = require('node:assert/strict');

const capi = require('../src/services/capi');

function withEnv(overrides, fn) {
  const previous = {
    PIXEL_ID: process.env.PIXEL_ID,
    CAPI_ACCESS_TOKEN: process.env.CAPI_ACCESS_TOKEN,
    EVENT_SOURCE_URL: process.env.EVENT_SOURCE_URL,
    TEST_EVENT_CODE: process.env.TEST_EVENT_CODE,
    META_REQUEST_TIMEOUT_MS: process.env.META_REQUEST_TIMEOUT_MS
  };

  Object.assign(process.env, overrides);

  return Promise.resolve()
    .then(fn)
    .finally(() => {
      Object.entries(previous).forEach(([key, value]) => {
        if (value === undefined) {
          delete process.env[key];
          return;
        }

        process.env[key] = value;
      });
    });
}

test('sendEvent posts to Meta with access_token in the body', async () => {
  let request;

  global.fetch = async (url, options) => {
    request = { url, options };
    return {
      ok: true,
      json: async () => ({ events_received: 1 })
    };
  };

  await withEnv({
    PIXEL_ID: '123456789',
    CAPI_ACCESS_TOKEN: 'secret_token',
    EVENT_SOURCE_URL: 'https://example.com/landing',
    TEST_EVENT_CODE: 'TEST123',
    META_REQUEST_TIMEOUT_MS: '8000'
  }, async () => {
    const result = await capi.sendEvent({
      event_name: 'Lead',
      event_time: 1710000000,
      event_id: 'Lead_abc',
      fbp: 'fb.1.1710000000.111',
      custom_data: { content_ids: ['apt_001'] }
    });

    assert.deepEqual(result, { events_received: 1 });
  });

  assert.equal(request.url, 'https://graph.facebook.com/v19.0/123456789/events');
  assert.equal(request.options.method, 'POST');
  assert.equal(request.options.headers['Content-Type'], 'application/json');

  const body = JSON.parse(request.options.body);
  assert.equal(body.access_token, 'secret_token');
  assert.equal(body.test_event_code, 'TEST123');
  assert.equal(body.data[0].event_source_url, 'https://example.com/landing');
  assert.equal(body.data[0].user_data.fbp, 'fb.1.1710000000.111');
  assert.equal(body.data[0].user_data.fbc, undefined);
});

test('sendEvent throws a generic error when Meta rejects the request', async () => {
  global.fetch = async () => ({
    ok: false,
    status: 400,
    json: async () => ({
      error: { code: 190 }
    })
  });

  await withEnv({
    PIXEL_ID: '123456789',
    CAPI_ACCESS_TOKEN: 'secret_token',
    EVENT_SOURCE_URL: 'https://example.com/landing'
  }, async () => {
    await assert.rejects(
      capi.sendEvent({
        event_name: 'Lead',
        event_time: 1710000000,
        event_id: 'Lead_rejected'
      }),
      /Meta CAPI request failed/
    );
  });
});

test('sendEvent converts aborted fetches into a generic Meta error', async () => {
  global.fetch = async (_url, options) => new Promise((_, reject) => {
    options.signal.addEventListener('abort', () => {
      const error = new Error('The operation was aborted');
      error.name = 'AbortError';
      reject(error);
    });
  });

  await withEnv({
    PIXEL_ID: '123456789',
    CAPI_ACCESS_TOKEN: 'secret_token',
    EVENT_SOURCE_URL: 'https://example.com/landing',
    META_REQUEST_TIMEOUT_MS: '10'
  }, async () => {
    await assert.rejects(
      capi.sendEvent({
        event_name: 'Lead',
        event_time: 1710000000,
        event_id: 'Lead_timeout'
      }),
      /Meta CAPI request failed/
    );
  });
});
