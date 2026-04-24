require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const corsMiddleware = require('./middleware/cors');
const rateLimiter = require('./middleware/rateLimit');
const eventsRouter = require('./routes/events');

const REQUIRED_ENV = ['CAPI_ACCESS_TOKEN', 'PIXEL_ID', 'EVENT_SOURCE_URL', 'ALLOWED_ORIGIN', 'NODE_ENV'];
const ALLOWED_NODE_ENVS = new Set(['development', 'test', 'production']);

function validateEnv() {
  const missing = REQUIRED_ENV.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required env vars: ${missing.join(', ')}`);
  }

  if (!ALLOWED_NODE_ENVS.has(process.env.NODE_ENV)) {
    throw new Error('NODE_ENV must be one of: development, test, production');
  }

  const trustProxyHops = Number(process.env.TRUST_PROXY_HOPS || 0);
  if (!Number.isInteger(trustProxyHops) || trustProxyHops < 0) {
    throw new Error('TRUST_PROXY_HOPS must be a non-negative integer');
  }

  const metaRequestTimeoutMs = Number(process.env.META_REQUEST_TIMEOUT_MS || 8000);
  if (!Number.isInteger(metaRequestTimeoutMs) || metaRequestTimeoutMs <= 0) {
    throw new Error('META_REQUEST_TIMEOUT_MS must be a positive integer');
  }
}

validateEnv();

function createApp() {
  const app = express();
  const trustProxyHops = Number(process.env.TRUST_PROXY_HOPS || 0);

  app.set('trust proxy', trustProxyHops);
  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
  });
  app.use(helmet());
  app.use(corsMiddleware);
  app.use(express.json({ limit: '10kb' }));
  app.use('/api', rateLimiter, eventsRouter);

  app.use((err, req, res, next) => {
    if (err.message === 'CORS: origin not allowed') {
      return res.status(403).json({ error: 'Origin not allowed' });
    }

    console.error('Unhandled error', {
      message: err.message,
      path: req.path,
      method: req.method
    });

    return res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}

const app = createApp();

if (require.main === module) {
  const port = process.env.PORT || 3000;

  app.listen(port, () => {
    console.log(`CAPI server listening on port ${port}`);
  });
}

module.exports = { app, createApp };
