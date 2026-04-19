const {
  ensurePersistenceAvailable,
  listClientAccounts,
  createClientAccount,
  updateClientAccount,
  updateClientAccountStatus
} = require('../services/clientAccountService');
const { sanitizeText } = require('../utils/sanitize');

function mapAccount(account) {
  return {
    id: account.id,
    companyId: account.company_id,
    username: account.username,
    displayName: account.display_name,
    status: account.status,
    createdAt: account.created_at,
    updatedAt: account.updated_at,
    lastLoginAt: account.last_login_at
  };
}

function buildPayload(body = {}) {
  const companyId = sanitizeText(body.companyId, 40).toLowerCase();
  const username = sanitizeText(body.username, 40).toLowerCase();
  const displayName = sanitizeText(body.displayName, 120);
  const password = typeof body.password === 'string' ? body.password.slice(0, 120) : '';

  if (!companyId || !/^[a-z0-9_-]{4,40}$/.test(companyId)) {
    return { error: 'companyId inválido. Use 4-40 caracteres [a-z0-9_-].' };
  }

  if (!username || !/^[a-z0-9._-]{3,40}$/.test(username)) {
    return { error: 'username inválido. Use 3-40 caracteres [a-z0-9._-].' };
  }

  if (!displayName || displayName.length < 3) {
    return { error: 'displayName inválido.' };
  }

  if (!password || password.length < 8) {
    return { error: 'password inválido. Use ao menos 8 caracteres.' };
  }

  return { payload: { companyId, username, displayName, password } };
}

async function getClients(_req, res) {
  if (!ensurePersistenceAvailable()) {
    return res.status(503).json({ success: false, message: 'Persistência indisponível.' });
  }

  try {
    const data = await listClientAccounts();
    return res.json({ success: true, clients: data.map(mapAccount) });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Falha ao listar clientes.', detail: error.message });
  }
}

async function createClient(req, res) {
  if (!ensurePersistenceAvailable()) {
    return res.status(503).json({ success: false, message: 'Persistência indisponível.' });
  }

  const parsed = buildPayload(req.body);
  if (parsed.error) {
    return res.status(400).json({ success: false, message: parsed.error });
  }

  try {
    const data = await createClientAccount(parsed.payload);
    return res.status(201).json({ success: true, client: mapAccount(data) });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Falha ao criar cliente.', detail: error.message });
  }
}

async function updateClient(req, res) {
  const accountId = sanitizeText(req.params.accountId, 80);
  const username = sanitizeText(req.body?.username, 40).toLowerCase();
  const displayName = sanitizeText(req.body?.displayName, 120);
  const password = typeof req.body?.password === 'string' ? req.body.password.slice(0, 120) : '';

  if (!accountId) {
    return res.status(400).json({ success: false, message: 'accountId obrigatório.' });
  }

  if (!username && !displayName && !password) {
    return res.status(400).json({ success: false, message: 'Informe ao menos um campo para atualização.' });
  }

  try {
    const data = await updateClientAccount(accountId, { username, displayName, password });
    return res.json({ success: true, client: mapAccount(data) });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Falha ao atualizar cliente.', detail: error.message });
  }
}

async function blockClient(req, res) {
  const accountId = sanitizeText(req.params.accountId, 80);
  const status = sanitizeText(req.body?.status, 10).toLowerCase() === 'blocked' ? 'blocked' : 'active';

  if (!accountId) {
    return res.status(400).json({ success: false, message: 'accountId obrigatório.' });
  }

  try {
    const data = await updateClientAccountStatus(accountId, status);
    return res.json({ success: true, client: mapAccount(data) });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Falha ao alterar status do cliente.', detail: error.message });
  }
}

module.exports = {
  getClients,
  createClient,
  updateClient,
  blockClient
};
