const {
  ensurePersistenceAvailable,
  upsertClientIntegration,
  listClientIntegrations,
  registerIntegrationEvent
} = require('../services/integrationService');
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

async function upsertIntegration(req, res) {
  if (!ensurePersistenceAvailable()) {
    return res.status(503).json({
      success: false,
      message: 'Persistência indisponível. Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.'
    });
  }

  const companyName = sanitizeText(req.body?.companyName, 120);
  const companyId = sanitizeText(req.body?.companyId, 40);
  const contactEmail = sanitizeText(req.body?.contactEmail, 120).toLowerCase();
  const n8nEndpoint = sanitizeText(req.body?.n8nEndpoint, 255);
  const evolutionEndpoint = sanitizeText(req.body?.evolutionEndpoint, 255);
  const securityLevel = sanitizeText(req.body?.securityLevel, 20).toLowerCase();

  const companyIdRegex = /^[A-Za-z0-9_-]{4,40}$/;
  const validLevels = new Set(['strict', 'high', 'standard']);

  if (!companyName || !companyIdRegex.test(companyId)) {
    return res.status(400).json({
      success: false,
      message: 'Dados da empresa inválidos. Revise nome e ID.'
    });
  }

  if (!/^\S+@\S+\.\S+$/.test(contactEmail)) {
    return res.status(400).json({ success: false, message: 'E-mail corporativo inválido.' });
  }

  if (!isSecureHttpsUrl(n8nEndpoint) || !isSecureHttpsUrl(evolutionEndpoint)) {
    return res.status(400).json({
      success: false,
      message: 'Endpoints devem ser URLs HTTPS válidas.'
    });
  }

  if (!validLevels.has(securityLevel)) {
    return res.status(400).json({
      success: false,
      message: 'Nível de segurança inválido.'
    });
  }

  const payload = {
    company_id: companyId,
    company_name: companyName,
    contact_email: contactEmail,
    n8n_endpoint: n8nEndpoint,
    evolution_endpoint: evolutionEndpoint,
    security_level: securityLevel
  };

  try {
    const data = await upsertClientIntegration(payload);
    await registerIntegrationEvent({
      clientIntegrationId: data.id,
      companyId,
      actor: req.session.username
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

async function getIntegrations(req, res) {
  if (!ensurePersistenceAvailable()) {
    return res.status(503).json({
      success: false,
      message: 'Persistência indisponível. Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.'
    });
  }

  try {
    const data = await listClientIntegrations();
    return res.json({ success: true, integrations: data.map(mapIntegration) });
  } catch (error) {
    console.error(`[${req.requestId}] Erro ao consultar integrações no Supabase:`, error);
    return res.status(500).json({
      success: false,
      message: 'Falha ao consultar integrações no banco.'
    });
  }
}

module.exports = { upsertIntegration, getIntegrations };
