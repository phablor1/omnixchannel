const helmet = require('helmet');

const securityHeaders = helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
});

module.exports = { securityHeaders };
