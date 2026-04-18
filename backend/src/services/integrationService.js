const { supabase } = require('../config/supabase');

function ensurePersistenceAvailable() {
  return Boolean(supabase);
}

async function checkPersistenceHealth() {
  if (!supabase) {
    return false;
  }

  try {
    const { error } = await supabase
      .from('client_integrations')
      .select('id', { count: 'exact', head: true });

    return !error;
  } catch (_error) {
    return false;
  }
}

async function createClientIntegration(payload) {
  const { data, error } = await supabase
    .from('client_integrations')
    .insert(payload)
    .select('id, company_id, company_name, contact_email, n8n_endpoint, evolution_endpoint, security_level, status, created_at, updated_at')
    .single();

  if (error) {
    throw error;
  }

  return data;
}

async function updateClientIntegrationById(id, payload) {
  const { data, error } = await supabase
    .from('client_integrations')
    .update(payload)
    .eq('id', id)
    .is('deleted_at', null)
    .select('id, company_id, company_name, contact_email, n8n_endpoint, evolution_endpoint, security_level, status, created_at, updated_at')
    .single();

  if (error) {
    throw error;
  }

  return data;
}

async function softDeleteClientIntegration(id) {
  const { data, error } = await supabase
    .from('client_integrations')
    .update({ deleted_at: new Date().toISOString(), status: 'deleted' })
    .eq('id', id)
    .is('deleted_at', null)
    .select('id, company_id, company_name')
    .single();

  if (error) {
    throw error;
  }

  return data;
}

async function listClientIntegrations() {
  const { data, error } = await supabase
    .from('client_integrations')
    .select('id, company_id, company_name, contact_email, n8n_endpoint, evolution_endpoint, security_level, status, created_at, updated_at')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data;
}

async function getClientIntegrationById(integrationId) {
  const { data, error } = await supabase
    .from('client_integrations')
    .select('id, company_id, company_name, contact_email, evolution_endpoint, status')
    .eq('id', integrationId)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

async function listIntegrationEvents() {
  const { data, error } = await supabase
    .from('integration_events')
    .select('client_integration_id, event_type, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data;
}

async function registerIntegrationEvent({ clientIntegrationId, companyId, actor, eventType = 'client_integration_upsert', payload = {} }) {
  await supabase.from('integration_events').insert({
    client_integration_id: clientIntegrationId,
    event_type: eventType,
    source: 'client-portal',
    payload: { companyId, actor, ...payload }
  });
}

async function upsertIntegrationSecret({ clientIntegrationId, provider, secretKey, metadata = {} }) {
  const { data, error } = await supabase
    .from('integration_secrets')
    .upsert({
      client_integration_id: clientIntegrationId,
      provider,
      secret_key: secretKey,
      metadata
    }, {
      onConflict: 'client_integration_id,provider'
    })
    .select('id, client_integration_id, provider, metadata, updated_at')
    .single();

  if (error) {
    throw error;
  }

  return data;
}

async function getIntegrationSecret(clientIntegrationId, provider) {
  const { data, error } = await supabase
    .from('integration_secrets')
    .select('id, secret_key, metadata, updated_at')
    .eq('client_integration_id', clientIntegrationId)
    .eq('provider', provider)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

module.exports = {
  ensurePersistenceAvailable,
  checkPersistenceHealth,
  createClientIntegration,
  updateClientIntegrationById,
  softDeleteClientIntegration,
  listClientIntegrations,
  getClientIntegrationById,
  listIntegrationEvents,
  registerIntegrationEvent,
  upsertIntegrationSecret,
  getIntegrationSecret
};
