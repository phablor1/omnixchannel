import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import { createClient } from '@supabase/supabase-js';

const app = express();
const port = Number(process.env.PORT || 3000);

const requiredEnv = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'ADMIN_API_TOKEN'
];

const missingEnv = requiredEnv.filter(key => !process.env[key]);
if (missingEnv.length > 0) {
  // eslint-disable-next-line no-console
  console.warn(`Variáveis ausentes: ${missingEnv.join(', ')}. Algumas rotas falharão até configurar o ambiente.`);
}

const supabase = createClient(
  process.env.SUPABASE_URL || 'https://invalid.local',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'invalid'
);

app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',') || '*' }));
app.use(express.json({ limit: '200kb' }));
app.use(morgan('combined'));

function sanitizeString(value, maxLen = 200) {
  return String(value || '').trim().replace(/[<>]/g, '').slice(0, maxLen);
}

function isHttpsUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:';
  } catch {
    return false;
  }
}

function requireAdmin(req, res, next) {
  const token = req.header('x-admin-token');
  if (!token || token !== process.env.ADMIN_API_TOKEN) {
    return res.status(401).json({ error: 'Não autorizado.' });
  }
  return next();
}

async function logEvent(eventType, payload, source = 'system') {
  await supabase.from('integration_events').insert({
    event_type: eventType,
    source,
    payload
  });
}

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'omnixchannel-api' });
});

app.post('/api/clients', async (req, res) => {
  const companyId = sanitizeString(req.body.companyId, 40);
  const companyName = sanitizeString(req.body.companyName, 120);
  const contactEmail = sanitizeString(req.body.contactEmail, 120).toLowerCase();
  const n8nEndpoint = sanitizeString(req.body.n8nEndpoint, 500);
  const evolutionEndpoint = sanitizeString(req.body.evolutionEndpoint, 500);
  const securityLevel = sanitizeString(req.body.securityLevel, 20);
  const product = sanitizeString(req.body.product || 'n8n-evolution', 60);

  const companyIdPattern = /^[A-Za-z0-9_-]{4,40}$/;
  const corporateEmailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!companyIdPattern.test(companyId)) {
    return res.status(400).json({ error: 'companyId inválido.' });
  }

  if (!corporateEmailPattern.test(contactEmail)) {
    return res.status(400).json({ error: 'E-mail inválido.' });
  }

  if (!isHttpsUrl(n8nEndpoint) || !isHttpsUrl(evolutionEndpoint)) {
    return res.status(400).json({ error: 'Endpoints devem usar HTTPS.' });
  }

  const { data, error } = await supabase
    .from('client_integrations')
    .upsert({
      company_id: companyId,
      company_name: companyName,
      contact_email: contactEmail,
      n8n_endpoint: n8nEndpoint,
      evolution_endpoint: evolutionEndpoint,
      security_level: securityLevel,
      product,
      status: 'pending'
    }, { onConflict: 'company_id' })
    .select('id, company_id, status, created_at, updated_at')
    .single();

  if (error) {
    return res.status(500).json({ error: 'Falha ao persistir cliente.', details: error.message });
  }

  await logEvent('client_upserted', { companyId, securityLevel, product }, 'portal');

  return res.status(201).json({
    message: 'Cliente registrado com sucesso.',
    client: data
  });
});

app.get('/api/admin/clients', requireAdmin, async (_req, res) => {
  const { data, error } = await supabase
    .from('client_integrations')
    .select('id, company_id, company_name, contact_email, product, security_level, status, created_at, updated_at')
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) {
    return res.status(500).json({ error: 'Falha ao buscar clientes.', details: error.message });
  }

  return res.json({ clients: data || [] });
});

app.post('/api/admin/clients/:companyId/sync', requireAdmin, async (req, res) => {
  const companyId = sanitizeString(req.params.companyId, 40);

  const { data: client, error: fetchError } = await supabase
    .from('client_integrations')
    .select('*')
    .eq('company_id', companyId)
    .single();

  if (fetchError || !client) {
    return res.status(404).json({ error: 'Cliente não encontrado.' });
  }

  const syncPayload = {
    companyId: client.company_id,
    companyName: client.company_name,
    contactEmail: client.contact_email,
    securityLevel: client.security_level,
    product: client.product,
    timestamp: new Date().toISOString()
  };

  const n8nResponse = await fetch(client.n8n_endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-integration-token': process.env.N8N_SHARED_TOKEN || ''
    },
    body: JSON.stringify(syncPayload)
  }).catch(err => ({ ok: false, status: 500, text: async () => err.message }));

  const evolutionResponse = await fetch(client.evolution_endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: process.env.EVOLUTION_SHARED_TOKEN || ''
    },
    body: JSON.stringify(syncPayload)
  }).catch(err => ({ ok: false, status: 500, text: async () => err.message }));

  const n8nBody = await n8nResponse.text();
  const evolutionBody = await evolutionResponse.text();

  await supabase
    .from('client_integrations')
    .update({
      status: n8nResponse.ok && evolutionResponse.ok ? 'active' : 'error',
      last_sync_at: new Date().toISOString()
    })
    .eq('id', client.id);

  await logEvent('admin_sync_triggered', {
    companyId,
    n8nStatus: n8nResponse.status,
    evolutionStatus: evolutionResponse.status
  }, 'admin');

  return res.json({
    companyId,
    n8n: { ok: n8nResponse.ok, status: n8nResponse.status, body: n8nBody.slice(0, 400) },
    evolution: { ok: evolutionResponse.ok, status: evolutionResponse.status, body: evolutionBody.slice(0, 400) }
  });
});

app.post('/api/webhooks/n8n', async (req, res) => {
  await logEvent('n8n_webhook_received', req.body, 'n8n');
  res.status(202).json({ accepted: true });
});

app.post('/api/webhooks/evolution', async (req, res) => {
  await logEvent('evolution_webhook_received', req.body, 'evolution');
  res.status(202).json({ accepted: true });
});

app.use((err, _req, res, _next) => {
  // eslint-disable-next-line no-console
  console.error(err);
  res.status(500).json({ error: 'Erro interno.' });
});

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`API online em http://localhost:${port}`);
});
