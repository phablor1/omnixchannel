const express = require('express');
const bodyParser = require('body-parser');
const morgan = require('morgan');

const { env, validateRuntimeConfig } = require('./config/env');
const { SessionService } = require('./services/sessionService');
const { requestContext } = require('./middlewares/requestContext');
const { securityHeaders } = require('./middlewares/security');
const { corsMiddleware } = require('./middlewares/cors');
const { buildRequireClientSession } = require('./middlewares/auth');
const { createLifecycleState, buildDrainMiddleware } = require('./middlewares/serverLifecycle');
const { notFoundHandler, errorHandler } = require('./middlewares/errorHandler');
const { buildClientAuthController } = require('./controllers/clientAuthController');

const healthRoutes = require('./routes/healthRoutes');
const contactRoutes = require('./routes/contactRoutes');
const { buildClientAuthRoutes } = require('./routes/clientAuthRoutes');
const { buildClientIntegrationsRoutes } = require('./routes/clientIntegrationsRoutes');

function createApp() {
  validateRuntimeConfig();

  const app = express();
  const lifecycleState = createLifecycleState();
  const sessionService = new SessionService(env.SESSION_TTL_MS);
  const requireClientSession = buildRequireClientSession(sessionService);
  const clientAuthController = buildClientAuthController(sessionService);

  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(requestContext);
  morgan.token('request-id', (req) => req.requestId || '-');
  app.use(morgan(':date[iso] :method :url :status :response-time ms req_id=:request-id'));

  app.use(securityHeaders);
  app.use(buildDrainMiddleware(lifecycleState));
  app.use(corsMiddleware);
  app.use(bodyParser.json({ limit: '10mb' }));

  app.use(healthRoutes);
  app.use('/api/contact', contactRoutes);
  app.use('/api/client-auth', buildClientAuthRoutes(clientAuthController, requireClientSession));
  app.use('/api/client-integrations', buildClientIntegrationsRoutes(requireClientSession));

  app.use('*', notFoundHandler);
  app.use(errorHandler);

  return { app, lifecycleState };
}

module.exports = { createApp };
