const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { once } = require('node:events');
const { Duplex } = require('node:stream');

function withEnv(overrides, fn) {
  const previous = {
    CAPI_ACCESS_TOKEN: process.env.CAPI_ACCESS_TOKEN,
    PIXEL_ID: process.env.PIXEL_ID,
    EVENT_SOURCE_URL: process.env.EVENT_SOURCE_URL,
    ALLOWED_ORIGIN: process.env.ALLOWED_ORIGIN,
    NODE_ENV: process.env.NODE_ENV,
    TRUST_PROXY_HOPS: process.env.TRUST_PROXY_HOPS,
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

test('health endpoint returns 200 with ok status payload', async () => {
  await withEnv({
    CAPI_ACCESS_TOKEN: 'secret_token',
    PIXEL_ID: '123456789',
    EVENT_SOURCE_URL: 'https://example.com/landing',
    ALLOWED_ORIGIN: 'http://localhost:5500',
    NODE_ENV: 'test',
    TRUST_PROXY_HOPS: '0',
    META_REQUEST_TIMEOUT_MS: '8000'
  }, async () => {
    delete require.cache[require.resolve('../src/app')];
    const { app } = require('../src/app');

    const request = new http.IncomingMessage();
    request.method = 'GET';
    request.url = '/health';
    request.headers = {};

    const response = new http.ServerResponse(request);
    let body = '';

    response.assignSocket(new Duplex({
      read() {},
      write(chunk, _encoding, callback) {
        body += chunk.toString();
        callback();
      }
    }));

    app.handle(request, response);
    await once(response, 'finish');

    const [, responseBody = ''] = body.split('\r\n\r\n');

    assert.equal(response.statusCode, 200);
    assert.deepEqual(JSON.parse(responseBody), { status: 'ok' });

    response.socket.destroy();
  });
});
