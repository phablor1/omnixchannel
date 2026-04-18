const express = require('express');
const {
  upsertIntegration,
  getIntegrations,
  getIntegrationsReport,
  saveEvolutionCredentials,
  listEvolutionInstances,
  createEvolutionInstance,
  updateEvolutionInstance,
  deleteEvolutionInstance,
  getEvolutionQrCode,
  proxyEvolutionConfig
} = require('../controllers/clientIntegrationsController');

function buildClientIntegrationsRoutes(requireClientSession) {
  const router = express.Router();

  router.post('/', requireClientSession, upsertIntegration);
  router.get('/', requireClientSession, getIntegrations);
  router.get('/reports', requireClientSession, getIntegrationsReport);

  router.post('/:integrationId/evolution/credentials', requireClientSession, saveEvolutionCredentials);
  router.get('/:integrationId/evolution/instances', requireClientSession, listEvolutionInstances);
  router.post('/:integrationId/evolution/instances', requireClientSession, createEvolutionInstance);
  router.put('/:integrationId/evolution/instances/:instanceName', requireClientSession, updateEvolutionInstance);
  router.delete('/:integrationId/evolution/instances/:instanceName', requireClientSession, deleteEvolutionInstance);
  router.get('/:integrationId/evolution/instances/:instanceName/qrcode', requireClientSession, getEvolutionQrCode);
  router.post('/:integrationId/evolution/proxy', requireClientSession, proxyEvolutionConfig);

  return router;
}

module.exports = { buildClientIntegrationsRoutes };
