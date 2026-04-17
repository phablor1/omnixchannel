const express = require('express');
const { upsertIntegration, getIntegrations, getIntegrationsReport } = require('../controllers/clientIntegrationsController');

function buildClientIntegrationsRoutes(requireClientSession) {
  const router = express.Router();

  router.post('/', requireClientSession, upsertIntegration);
  router.get('/', requireClientSession, getIntegrations);
  router.get('/reports', requireClientSession, getIntegrationsReport);

  return router;
}

module.exports = { buildClientIntegrationsRoutes };
