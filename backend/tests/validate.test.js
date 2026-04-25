const test = require('node:test');
const assert = require('node:assert/strict');

const { validateEvent } = require('../src/middleware/validate');

async function runValidation(body) {
  const req = { body };
  const result = { statusCode: null, body: null, nextCalled: false };
  const res = {
    status(code) {
      result.statusCode = code;
      return this;
    },
    json(payload) {
      result.body = payload;
      return this;
    }
  };
  const validators = validateEvent.slice(0, -1);
  const finalMiddleware = validateEvent[validateEvent.length - 1];

  for (const validator of validators) {
    await validator.run(req);
  }

  await finalMiddleware(req, res, () => {
    result.nextCalled = true;
  });

  return result;
}

function buildValidPayload() {
  const timestamp = Math.floor(Date.now() / 1000);

  return {
    event_name: 'Lead',
    event_id: 'Lead_test',
    event_time: timestamp,
    source_url: 'http://localhost:5500/frontend/index.html',
    fbp: `fb.1.${timestamp}.1234567890`,
    fbc: `fb.1.${timestamp}.ABC123xyz`,
    custom_data: {
      content_ids: ['apt_001'],
      content_type: 'product'
    }
  };
}

test('validateEvent accepts a valid payload', async () => {
  const result = await runValidation(buildValidPayload());

  assert.equal(result.nextCalled, true);
  assert.equal(result.statusCode, null);
  assert.equal(result.body, null);
});

test('validateEvent accepts ViewContent payloads', async () => {
  const payload = buildValidPayload();
  payload.event_name = 'ViewContent';
  payload.event_id = 'ViewContent_test';

  const result = await runValidation(payload);

  assert.equal(result.nextCalled, true);
  assert.equal(result.statusCode, null);
  assert.equal(result.body, null);
});

test('validateEvent rejects malformed fbc values', async () => {
  const payload = buildValidPayload();
  payload.fbc = 'not-valid';

  const result = await runValidation(payload);

  assert.equal(result.nextCalled, false);
  assert.equal(result.statusCode, 422);
  assert.deepEqual(result.body, {
    error: 'Validation failed',
    details: [
      { field: 'fbc', message: 'Invalid click id' }
    ]
  });
});

test('validateEvent rejects events older than 7 days', async () => {
  const payload = buildValidPayload();
  payload.event_time = Math.floor(Date.now() / 1000) - (8 * 24 * 60 * 60);

  const result = await runValidation(payload);

  assert.equal(result.nextCalled, false);
  assert.equal(result.statusCode, 422);
  assert.deepEqual(result.body, {
    error: 'Validation failed',
    details: [
      { field: 'event_time', message: 'Invalid event time' }
    ]
  });
});

test('validateEvent rejects oversized custom_data objects', async () => {
  const payload = buildValidPayload();
  payload.custom_data = Object.fromEntries(
    Array.from({ length: 21 }, (_, index) => [`field_${index}`, index])
  );

  const result = await runValidation(payload);

  assert.equal(result.nextCalled, false);
  assert.equal(result.statusCode, 422);
  assert.deepEqual(result.body, {
    error: 'Validation failed',
    details: [
      { field: 'custom_data', message: 'Invalid custom data' }
    ]
  });
});
