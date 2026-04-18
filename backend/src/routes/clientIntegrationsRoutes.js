const express = require('express');
const {
  upsertIntegration,
  updateIntegration,
  deleteIntegration,
  getIntegrations,
  getIntegrationsReport
} = require('../controllers/clientIntegrationsController');

function buildClientIntegrationsRoutes(requireClientSession) {
  const router = express.Router();

  router.post('/', requireClientSession, upsertIntegration);
  router.get('/', requireClientSession, getIntegrations);
  router.get('/reports', requireClientSession, getIntegrationsReport);
  router.put('/:integrationId', requireClientSession, updateIntegration);
  router.delete('/:integrationId', requireClientSession, deleteIntegration);

  return router;
}

module.exports = { buildClientIntegrationsRoutes };
