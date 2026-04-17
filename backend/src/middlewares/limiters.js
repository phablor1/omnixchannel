const rateLimit = require('express-rate-limit');
const { env } = require('../config/env');
const { allowedMethods, allowedHeaders } = require('./cors');

const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    error: 'Muitas requisições. Tente novamente em 15 minutos.',
    code: 'TOO_MANY_REQUESTS'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    res.header('Access-Control-Allow-Origin', env.FRONTEND_URL);
    res.header('Access-Control-Allow-Methods', allowedMethods);
    res.header('Access-Control-Allow-Headers', allowedHeaders);
    res.status(options.statusCode).json(options.message);
  }
});

const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 8,
  message: {
    success: false,
    message: 'Muitas tentativas de login. Aguarde alguns minutos e tente novamente.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = { contactLimiter, authLimiter };
