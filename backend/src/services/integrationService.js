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

async function registerIntegrationEvent({ clientIntegrationId, companyId, actor }) {
  await supabase.from('integration_events').insert({
    client_integration_id: clientIntegrationId,
    event_type: 'client_integration_upsert',
    source: 'client-portal',
    payload: { companyId, actor }
  });
}

module.exports = {
  ensurePersistenceAvailable,
  checkPersistenceHealth,
  upsertClientIntegration,
  listClientIntegrations,
  registerIntegrationEvent
};
