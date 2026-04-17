const crypto = require('crypto');
const { sanitizeText } = require('../utils/sanitize');

function requestContext(req, res, next) {
  const incomingRequestId = req.header('x-request-id');
  const requestId = sanitizeText(incomingRequestId, 120) || crypto.randomUUID();

  req.requestId = requestId;
  res.locals.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);

  next();
}

module.exports = { requestContext };
