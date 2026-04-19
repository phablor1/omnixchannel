const crypto = require('crypto');
const { supabase } = require('../config/supabase');

function ensurePersistenceAvailable() {
  return Boolean(supabase);
}

function normalizeStatus(status = 'active') {
  const normalized = String(status).trim().toLowerCase();
  return normalized === 'blocked' ? 'blocked' : 'active';
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, digest = '') {
  const [salt, originalHash] = String(digest).split(':');
  if (!salt || !originalHash) {
    return false;
  }

  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  const a = Buffer.from(hash, 'hex');
  const b = Buffer.from(originalHash, 'hex');

  if (a.length !== b.length) {
    return false;
  }

  return crypto.timingSafeEqual(a, b);
}

async function listClientAccounts() {
  const { data, error } = await supabase
    .from('client_accounts')
    .select('id, company_id, username, display_name, status, created_at, updated_at, last_login_at')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

async function createClientAccount({ companyId, username, displayName, password, status = 'active' }) {
  const { data, error } = await supabase
    .from('client_accounts')
    .insert({
      company_id: companyId,
      username,
      display_name: displayName,
      password_hash: hashPassword(password),
      status: normalizeStatus(status)
    })
    .select('id, company_id, username, display_name, status, created_at, updated_at, last_login_at')
    .single();

  if (error) throw error;
  return data;
}

async function updateClientAccount(accountId, { username, displayName, password }) {
  const payload = {};
  if (username) payload.username = username;
  if (displayName) payload.display_name = displayName;
  if (password) payload.password_hash = hashPassword(password);

  const { data, error } = await supabase
    .from('client_accounts')
    .update(payload)
    .eq('id', accountId)
    .select('id, company_id, username, display_name, status, created_at, updated_at, last_login_at')
    .single();

  if (error) throw error;
  return data;
}

async function updateClientAccountStatus(accountId, status) {
  const { data, error } = await supabase
    .from('client_accounts')
    .update({ status: normalizeStatus(status) })
    .eq('id', accountId)
    .select('id, company_id, username, display_name, status, created_at, updated_at, last_login_at')
    .single();

  if (error) throw error;
  return data;
}

async function getClientAccountForLogin({ companyId, username }) {
  const { data, error } = await supabase
    .from('client_accounts')
    .select('id, company_id, username, display_name, password_hash, status')
    .eq('company_id', companyId)
    .eq('username', username)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function markLastLogin(accountId) {
  await supabase
    .from('client_accounts')
    .update({ last_login_at: new Date().toISOString() })
    .eq('id', accountId);
}

module.exports = {
  ensurePersistenceAvailable,
  verifyPassword,
  listClientAccounts,
  createClientAccount,
  updateClientAccount,
  updateClientAccountStatus,
  getClientAccountForLogin,
  markLastLogin
};
