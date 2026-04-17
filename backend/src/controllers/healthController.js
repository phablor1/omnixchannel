const { env } = require('../config/env');
const { supabase } = require('../config/supabase');
const { checkPersistenceHealth } = require('../services/integrationService');

async function healthCheck(req, res) {
  const persistenceConfigured = Boolean(supabase);
  const persistenceHealthy = await checkPersistenceHealth();

  res.json({
    status: 'OK',
    service: 'ConectXIP Backend',
    environment: env.NODE_ENV,
    persistenceConfigured,
    persistenceHealthy,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    requestId: req.requestId
  });
}

module.exports = { healthCheck };
