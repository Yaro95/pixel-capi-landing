const { body, validationResult } = require('express-validator');

const FBP_PATTERN = /^fb\.1\.\d{10,13}\.[A-Za-z0-9._-]+$/;
const FBC_PATTERN = /^fb\.1\.\d{10,13}\.[A-Za-z0-9_-]+$/;
const MAX_CUSTOM_DATA_KEYS = 20;

const validateEvent = [
  body('event_name')
    .isString()
    .isIn(['Lead', 'Contact'])
    .withMessage('Invalid event name'),
  body('event_id')
    .isString()
    .trim()
    .notEmpty()
    .isLength({ max: 128 })
    .withMessage('Invalid event id'),
  body('event_time')
    .isInt()
    .custom((value) => {
      const eventTime = Number(value);
      const oldestAllowed = Math.floor(Date.now() / 1000) - 7 * 24 * 60 * 60;
      const newestAllowed = Math.floor(Date.now() / 1000) + 5 * 60;

      return eventTime >= oldestAllowed && eventTime <= newestAllowed;
    })
    .withMessage('Invalid event time'),
  body('source_url')
    .optional()
    .isURL({ require_protocol: true, require_tld: false })
    .withMessage('Invalid source URL'),
  body('fbp')
    .optional()
    .isString()
    .bail()
    .matches(FBP_PATTERN)
    .withMessage('Invalid browser id'),
  body('fbp')
    .optional()
    .isLength({ max: 256 })
    .withMessage('Invalid browser id'),
  body('fbc')
    .optional()
    .isString()
    .bail()
    .matches(FBC_PATTERN)
    .withMessage('Invalid click id'),
  body('fbc')
    .optional()
    .isLength({ max: 512 })
    .withMessage('Invalid click id'),
  body('custom_data')
    .optional()
    .isObject()
    .bail()
    .custom((value) => Object.keys(value).length <= MAX_CUSTOM_DATA_KEYS)
    .withMessage('Invalid custom data'),
  (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(422).json({
        error: 'Validation failed',
        details: errors.array().map((item) => ({
          field: item.path,
          message: item.msg
        }))
      });
    }

    return next();
  }
];

module.exports = { validateEvent };
