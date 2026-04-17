const express = require('express');
const { authLimiter } = require('../middlewares/limiters');

function buildClientAuthRoutes(clientAuthController, requireClientSession) {
  const router = express.Router();

  router.post('/login', authLimiter, clientAuthController.login);
  router.get('/session', requireClientSession, clientAuthController.session);
  router.post('/logout', requireClientSession, clientAuthController.logout);

  return router;
}

module.exports = { buildClientAuthRoutes };
