const express = require('express');
const {
  getClients,
  createClient,
  updateClient,
  blockClient
} = require('../controllers/adminClientsController');

function buildAdminClientsRoutes(requireAdminSession) {
  const router = express.Router();

  router.get('/', requireAdminSession, getClients);
  router.post('/', requireAdminSession, createClient);
  router.put('/:accountId', requireAdminSession, updateClient);
  router.patch('/:accountId/status', requireAdminSession, blockClient);

  return router;
}

module.exports = { buildAdminClientsRoutes };
