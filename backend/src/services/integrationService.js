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

async function upsertClientIntegration(payload) {
  const { data, error } = await supabase
    .from('client_integrations')
    .upsert(payload, { onConflict: 'company_id' })
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

async function registerIntegrationEvent({ clientIntegrationId, companyId, actor, eventType }) {
  await supabase.from('integration_events').insert({
    client_integration_id: clientIntegrationId,
    event_type: eventType || 'client_integration_upsert',
    source: 'client-portal',
    payload: { companyId, actor }
  });
}

module.exports = {
  ensurePersistenceAvailable,
  checkPersistenceHealth,
  upsertClientIntegration,
  updateClientIntegrationById,
  softDeleteClientIntegration,
  listClientIntegrations,
  listIntegrationEvents,
  registerIntegrationEvent
};
