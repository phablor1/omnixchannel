const { env } = require('../config/env');

const allowedMethods = 'GET, POST, OPTIONS';
const allowedHeaders = 'Content-Type, Authorization, X-Request-Id';

function corsMiddleware(req, res, next) {
  res.header('Access-Control-Allow-Origin', env.FRONTEND_URL);
  res.header('Access-Control-Allow-Methods', allowedMethods);
  res.header('Access-Control-Allow-Headers', allowedHeaders);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  return next();
}

module.exports = { corsMiddleware, allowedMethods, allowedHeaders };
