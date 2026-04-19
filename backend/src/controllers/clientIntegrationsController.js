const {
  ensurePersistenceAvailable,
  createClientIntegration,
  updateClientIntegrationById,
  softDeleteClientIntegration,
  listClientIntegrations,
  listIntegrationEvents,
  registerIntegrationEvent,
  upsertIntegrationSecret,
  getIntegrationSecret,
  getClientIntegrationById
} = require('../services/integrationService');
const { callEvolution, buildInstancePayload } = require('../services/evolutionService');
const { sanitizeText, isSecureHttpsUrl } = require('../utils/sanitize');

function mapIntegration(item) {
  return {
    id: item.id,
    companyId: item.company_id,
    companyName: item.company_name,
    contactEmail: item.contact_email,
    n8nEndpoint: item.n8n_endpoint,
    evolutionEndpoint: item.evolution_endpoint,
    securityLevel: item.security_level,
    status: item.status,
    createdAt: item.created_at,
    updatedAt: item.updated_at
  };
}

function buildUsageByIntegration(events = []) {
  return events.reduce((acc, event) => {
    const key = event.client_integration_id;
    if (!key) {
      return acc;
    }

    const current = acc.get(key) || {
      eventCount: 0,
      lastEventAt: null,
      lastEventType: null
    };

    current.eventCount += 1;

    if (!current.lastEventAt || new Date(event.created_at) > new Date(current.lastEventAt)) {
      current.lastEventAt = event.created_at;
      current.lastEventType = event.event_type || 'unknown';
    }

    acc.set(key, current);
    return acc;
  }, new Map());
}

function ensurePersistence(req, res) {
  if (ensurePersistenceAvailable()) {
    return true;
  }

  res.status(503).json({
    success: false,
    message: 'Persistência indisponível. Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.'
  });

  return false;
}

function buildUnavailableReport() {
  return {
    success: true,
    persistenceAvailable: false,
    generatedAt: new Date().toISOString(),
    message: 'Persistência indisponível no momento. Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY para habilitar gravação e relatórios completos.',
    metrics: {
      totalIntegrations: 0,
      totalEvents: 0,
      strictSecurityCount: 0,
      activeCount: 0
    },
    integrations: []
  };
}

function validateIntegrationInput(body = {}, companyId = '') {
  const companyName = sanitizeText(body.companyName, 120);
  const contactEmail = sanitizeText(body.contactEmail, 120).toLowerCase();
  const n8nEndpoint = sanitizeText(body.n8nEndpoint, 255);
  const evolutionEndpoint = sanitizeText(body.evolutionEndpoint, 255);
  const securityLevel = sanitizeText(body.securityLevel, 20).toLowerCase();

  const validLevels = new Set(['strict', 'high', 'standard']);

  if (!companyName || companyName.length < 3) {
    return { error: 'Informe um nome de empresa válido.' };
  }

  if (!/^\S+@\S+\.\S+$/.test(contactEmail)) {
    return { error: 'E-mail corporativo inválido.' };
  }

  if (!isSecureHttpsUrl(n8nEndpoint) || !isSecureHttpsUrl(evolutionEndpoint)) {
    return { error: 'Endpoints devem ser URLs HTTPS válidas.' };
  }

  if (!validLevels.has(securityLevel)) {
    return { error: 'Nível de segurança inválido.' };
  }

  return {
    payload: {
      company_id: companyId,
      company_name: companyName,
      contact_email: contactEmail,
      n8n_endpoint: n8nEndpoint,
      evolution_endpoint: evolutionEndpoint,
      security_level: securityLevel
    }
  };
}

async function resolveEvolutionContext(integrationId, companyId) {
  const integration = await getClientIntegrationById(integrationId, companyId);
  if (!integration) {
    return { error: 'Integração não encontrada.' };
  }

  const secret = await getIntegrationSecret(integrationId, 'evolution');
  if (!secret?.secret_key) {
    return { error: 'Credencial da Evolution API não cadastrada para esta integração.' };
  }

  return {
    integration,
    endpoint: integration.evolution_endpoint,
    apiKey: secret.secret_key
  };
}


async function createIntegration(req, res) {
  if (!ensurePersistence(req, res)) {
    return;
  }

  const validation = validateIntegrationInput(req.body, req.session.companyId);
  if (validation.error) {
    return res.status(400).json({ success: false, message: validation.error });
  }

  try {
    const data = await createClientIntegration(validation.payload);
    await registerIntegrationEvent({
      clientIntegrationId: data.id,
      companyId: data.company_id,
      actor: req.session.username,
      eventType: 'client_integration_create'
    });

    return res.status(201).json({
      success: true,
      message: 'Integração registrada com sucesso.',
      integration: mapIntegration(data)
    });
  } catch (error) {
    console.error(`[${req.requestId}] Erro ao persistir integração no Supabase:`, error);
    return res.status(500).json({
      success: false,
      message: 'Falha ao persistir integração no banco.'
    });
  }
}

async function updateIntegration(req, res) {
  if (!ensurePersistence(req, res)) {
    return;
  }

  const integrationId = sanitizeText(req.params.integrationId, 80);
  if (!integrationId) {
    return res.status(400).json({ success: false, message: 'ID da integração é obrigatório.' });
  }

  const validation = validateIntegrationInput(req.body, req.session.companyId);
  if (validation.error) {
    return res.status(400).json({ success: false, message: validation.error });
  }

  try {
    const data = await updateClientIntegrationById(integrationId, req.session.companyId, validation.payload);
    await registerIntegrationEvent({
      clientIntegrationId: data.id,
      companyId: data.company_id,
      actor: req.session.username,
      eventType: 'client_integration_update'
    });

    return res.status(200).json({
      success: true,
      message: 'Integração atualizada com sucesso.',
      integration: mapIntegration(data)
    });
  } catch (error) {
    console.error(`[${req.requestId}] Erro ao atualizar integração no Supabase:`, error);
    return res.status(500).json({
      success: false,
      message: 'Falha ao atualizar integração no banco.'
    });
  }
}

async function deleteIntegration(req, res) {
  if (!ensurePersistence(req, res)) {
    return;
  }

  const integrationId = sanitizeText(req.params.integrationId, 80);
  if (!integrationId) {
    return res.status(400).json({ success: false, message: 'ID da integração é obrigatório.' });
  }

  try {
    const data = await softDeleteClientIntegration(integrationId, req.session.companyId);

    await registerIntegrationEvent({
      clientIntegrationId: data.id,
      companyId: data.company_id,
      actor: req.session.username,
      eventType: 'client_integration_delete'
    });

    return res.status(200).json({
      success: true,
      message: 'Integração deletada com sucesso.'
    });
  } catch (error) {
    console.error(`[${req.requestId}] Erro ao deletar integração no Supabase:`, error);
    return res.status(500).json({
      success: false,
      message: 'Falha ao deletar integração no banco.'
    });
  }
}

async function getIntegrations(req, res) {
  if (!ensurePersistenceAvailable()) {
    return res.json(buildUnavailableReport());
  }

  try {
    const data = await listClientIntegrations(req.session.companyId);
    return res.json({ success: true, integrations: data.map(mapIntegration) });
  } catch (error) {
    console.error(`[${req.requestId}] Erro ao consultar integrações no Supabase:`, error);
    return res.json({
      ...buildUnavailableReport(),
      message: 'Persistência indisponível no momento (falha de conexão com o Supabase).'
    });
  }
}

async function getIntegrationsReport(req, res) {
  if (!ensurePersistenceAvailable()) {
    return res.json(buildUnavailableReport());
  }

  try {
    const [integrationsRaw, events] = await Promise.all([
      listClientIntegrations(req.session.companyId),
      listIntegrationEvents(req.session.companyId)
    ]);

    const usageByIntegration = buildUsageByIntegration(events);
    const integrations = integrationsRaw.map((item) => {
      const mapped = mapIntegration(item);
      const usage = usageByIntegration.get(mapped.id) || {
        eventCount: 0,
        lastEventAt: null,
        lastEventType: null
      };

      return {
        ...mapped,
        usage
      };
    });

    const metrics = integrations.reduce((acc, integration) => {
      acc.totalIntegrations += 1;
      acc.totalEvents += integration.usage.eventCount;

      if (integration.securityLevel === 'strict') {
        acc.strictSecurityCount += 1;
      }

      if (integration.status === 'active') {
        acc.activeCount += 1;
      }

      return acc;
    }, {
      totalIntegrations: 0,
      totalEvents: 0,
      strictSecurityCount: 0,
      activeCount: 0
    });

    return res.json({
      success: true,
      generatedAt: new Date().toISOString(),
      metrics,
      integrations
    });
  } catch (error) {
    console.error(`[${req.requestId}] Erro ao consultar relatório de integrações:`, error);
    return res.json({
      ...buildUnavailableReport(),
      message: 'Persistência indisponível no momento (falha de conexão com o Supabase).'
    });
  }
}

async function saveEvolutionCredentials(req, res) {
  if (!ensurePersistenceAvailable()) {
    return res.status(503).json({ success: false, message: 'Persistência indisponível.' });
  }

  const integrationId = sanitizeText(req.params.integrationId || '', 80);
  const apiKey = sanitizeText(req.body?.apiKey || '', 300);

  if (!integrationId || !apiKey) {
    return res.status(400).json({ success: false, message: 'integrationId e apiKey são obrigatórios.' });
  }

  try {
    const integration = await getClientIntegrationById(integrationId, req.session.companyId);
    if (!integration) {
      return res.status(404).json({ success: false, message: 'Integração não encontrada.' });
    }

    await upsertIntegrationSecret({
      clientIntegrationId: integrationId,
      provider: 'evolution',
      secretKey: apiKey,
      metadata: { updatedBy: req.session.username }
    });

    await registerIntegrationEvent({
      clientIntegrationId: integrationId,
      companyId: integration.company_id,
      actor: req.session.username,
      eventType: 'evolution_credentials_updated'
    });

    return res.json({ success: true, message: 'Credencial da Evolution API atualizada.' });
  } catch (error) {
    console.error(`[${req.requestId}] Erro ao salvar credencial Evolution:`, error);
    return res.status(500).json({ success: false, message: 'Falha ao salvar credencial da Evolution API.' });
  }
}

async function listEvolutionInstances(req, res) {
  const integrationId = sanitizeText(req.params.integrationId || '', 80);

  try {
    const context = await resolveEvolutionContext(integrationId, req.session.companyId);
    if (context.error) {
      return res.status(404).json({ success: false, message: context.error });
    }

    const evolutionResponse = await callEvolution({
      endpoint: context.endpoint,
      apiKey: context.apiKey,
      method: 'GET',
      path: '/instance/fetchInstances'
    });

    return res.status(evolutionResponse.status).json({
      success: evolutionResponse.ok,
      integrationId,
      data: evolutionResponse.body
    });
  } catch (error) {
    console.error(`[${req.requestId}] Erro ao listar instâncias Evolution:`, error);
    return res.status(500).json({ success: false, message: 'Falha ao listar instâncias da Evolution API.' });
  }
}

async function createEvolutionInstance(req, res) {
  const integrationId = sanitizeText(req.params.integrationId || '', 80);
  const instanceResult = buildInstancePayload(req.body || {});

  if (instanceResult.error) {
    return res.status(400).json({ success: false, message: instanceResult.error });
  }

  try {
    const context = await resolveEvolutionContext(integrationId, req.session.companyId);
    if (context.error) {
      return res.status(404).json({ success: false, message: context.error });
    }

    const evolutionResponse = await callEvolution({
      endpoint: context.endpoint,
      apiKey: context.apiKey,
      method: 'POST',
      path: '/instance/create',
      payload: instanceResult.payload
    });

    await registerIntegrationEvent({
      clientIntegrationId: integrationId,
      companyId: context.integration.company_id,
      actor: req.session.username,
      eventType: 'evolution_instance_created',
      payload: { instanceName: instanceResult.payload.instanceName }
    });

    return res.status(evolutionResponse.status).json({
      success: evolutionResponse.ok,
      message: evolutionResponse.ok ? 'Instância criada com sucesso.' : 'Falha ao criar instância.',
      data: evolutionResponse.body
    });
  } catch (error) {
    console.error(`[${req.requestId}] Erro ao criar instância Evolution:`, error);
    return res.status(500).json({ success: false, message: 'Falha ao criar instância na Evolution API.' });
  }
}

async function updateEvolutionInstance(req, res) {
  const integrationId = sanitizeText(req.params.integrationId || '', 80);
  const instanceName = sanitizeText(req.params.instanceName || '', 80);

  if (!instanceName) {
    return res.status(400).json({ success: false, message: 'Nome da instância é obrigatório.' });
  }

  try {
    const context = await resolveEvolutionContext(integrationId, req.session.companyId);
    if (context.error) {
      return res.status(404).json({ success: false, message: context.error });
    }

    const evolutionResponse = await callEvolution({
      endpoint: context.endpoint,
      apiKey: context.apiKey,
      method: 'PUT',
      path: `/instance/update/${encodeURIComponent(instanceName)}`,
      payload: req.body || {}
    });

    await registerIntegrationEvent({
      clientIntegrationId: integrationId,
      companyId: context.integration.company_id,
      actor: req.session.username,
      eventType: 'evolution_instance_updated',
      payload: { instanceName }
    });

    return res.status(evolutionResponse.status).json({
      success: evolutionResponse.ok,
      data: evolutionResponse.body
    });
  } catch (error) {
    console.error(`[${req.requestId}] Erro ao atualizar instância Evolution:`, error);
    return res.status(500).json({ success: false, message: 'Falha ao atualizar instância na Evolution API.' });
  }
}

async function deleteEvolutionInstance(req, res) {
  const integrationId = sanitizeText(req.params.integrationId || '', 80);
  const instanceName = sanitizeText(req.params.instanceName || '', 80);

  if (!instanceName) {
    return res.status(400).json({ success: false, message: 'Nome da instância é obrigatório.' });
  }

  try {
    const context = await resolveEvolutionContext(integrationId, req.session.companyId);
    if (context.error) {
      return res.status(404).json({ success: false, message: context.error });
    }

    const evolutionResponse = await callEvolution({
      endpoint: context.endpoint,
      apiKey: context.apiKey,
      method: 'DELETE',
      path: `/instance/delete/${encodeURIComponent(instanceName)}`
    });

    await registerIntegrationEvent({
      clientIntegrationId: integrationId,
      companyId: context.integration.company_id,
      actor: req.session.username,
      eventType: 'evolution_instance_deleted',
      payload: { instanceName }
    });

    return res.status(evolutionResponse.status).json({
      success: evolutionResponse.ok,
      data: evolutionResponse.body
    });
  } catch (error) {
    console.error(`[${req.requestId}] Erro ao remover instância Evolution:`, error);
    return res.status(500).json({ success: false, message: 'Falha ao remover instância da Evolution API.' });
  }
}

async function getEvolutionQrCode(req, res) {
  const integrationId = sanitizeText(req.params.integrationId || '', 80);
  const instanceName = sanitizeText(req.params.instanceName || '', 80);

  if (!instanceName) {
    return res.status(400).json({ success: false, message: 'Nome da instância é obrigatório.' });
  }

  try {
    const context = await resolveEvolutionContext(integrationId, req.session.companyId);
    if (context.error) {
      return res.status(404).json({ success: false, message: context.error });
    }

    const evolutionResponse = await callEvolution({
      endpoint: context.endpoint,
      apiKey: context.apiKey,
      method: 'GET',
      path: `/instance/connect/${encodeURIComponent(instanceName)}`
    });

    return res.status(evolutionResponse.status).json({
      success: evolutionResponse.ok,
      data: evolutionResponse.body
    });
  } catch (error) {
    console.error(`[${req.requestId}] Erro ao gerar QR Code Evolution:`, error);
    return res.status(500).json({ success: false, message: 'Falha ao gerar QR Code da instância.' });
  }
}

async function proxyEvolutionConfig(req, res) {
  const integrationId = sanitizeText(req.params.integrationId || '', 80);
  const method = sanitizeText(req.body?.method || 'GET', 10).toUpperCase();
  const path = sanitizeText(req.body?.path || '/', 255);

  if (!path.startsWith('/')) {
    return res.status(400).json({ success: false, message: 'path deve iniciar com /' });
  }

  try {
    const context = await resolveEvolutionContext(integrationId, req.session.companyId);
    if (context.error) {
      return res.status(404).json({ success: false, message: context.error });
    }

    const evolutionResponse = await callEvolution({
      endpoint: context.endpoint,
      apiKey: context.apiKey,
      method,
      path,
      query: req.body?.query || {},
      payload: req.body?.payload
    });

    await registerIntegrationEvent({
      clientIntegrationId: integrationId,
      companyId: context.integration.company_id,
      actor: req.session.username,
      eventType: 'evolution_config_proxy',
      payload: { method, path }
    });

    return res.status(evolutionResponse.status).json({
      success: evolutionResponse.ok,
      request: { method, path },
      data: evolutionResponse.body
    });
  } catch (error) {
    console.error(`[${req.requestId}] Erro no proxy de configuração Evolution:`, error);
    return res.status(500).json({ success: false, message: 'Falha ao executar operação avançada na Evolution API.' });
  }
}

module.exports = {
  createIntegration,
  updateIntegration,
  deleteIntegration,
  getIntegrations,
  getIntegrationsReport,
  saveEvolutionCredentials,
  listEvolutionInstances,
  createEvolutionInstance,
  updateEvolutionInstance,
  deleteEvolutionInstance,
  getEvolutionQrCode,
  proxyEvolutionConfig
};
