const express = require('express');
const { upsertIntegration, getIntegrations } = require('../controllers/clientIntegrationsController');

function buildClientIntegrationsRoutes(requireClientSession) {
  const router = express.Router();

  router.post('/', requireClientSession, upsertIntegration);
  router.get('/', requireClientSession, getIntegrations);

  return router;
}

module.exports = { buildClientIntegrationsRoutes };
