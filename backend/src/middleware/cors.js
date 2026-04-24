const cors = require('cors');

const corsOptions = {
  origin: (origin, callback) => {
    const allowNoOrigin = process.env.NODE_ENV === 'development';

    if (origin === process.env.ALLOWED_ORIGIN || (!origin && allowNoOrigin)) {
      callback(null, true);
      return;
    }

    callback(new Error('CORS: origin not allowed'));
  },
  methods: ['POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
  optionsSuccessStatus: 204
};

module.exports = cors(corsOptions);
