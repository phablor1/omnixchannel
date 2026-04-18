const { sanitizeText } = require('../utils/sanitize');

function normalizeEndpoint(endpoint) {
  return endpoint.replace(/\/+$/, '');
}

function normalizePath(path) {
  if (!path) {
    return '/';
  }

  return path.startsWith('/') ? path : `/${path}`;
}

async function callEvolution({ endpoint, apiKey, method = 'GET', path = '/', query = {}, payload }) {
  const base = normalizeEndpoint(endpoint);
  const requestPath = normalizePath(path);
  const url = new URL(`${base}${requestPath}`);

  Object.entries(query || {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return;
    }

    url.searchParams.set(key, `${value}`);
  });

  const headers = {
    apikey: apiKey,
    'Content-Type': 'application/json'
  };

  const options = {
    method: method.toUpperCase(),
    headers
  };

  if (!['GET', 'HEAD'].includes(options.method) && payload !== undefined) {
    options.body = JSON.stringify(payload);
  }

  const response = await fetch(url, options);
  const text = await response.text();

  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch (_error) {
    body = { raw: text };
  }

  return {
    ok: response.ok,
    status: response.status,
    body
  };
}

function buildInstancePayload(rawPayload) {
  const payload = rawPayload && typeof rawPayload === 'object' ? rawPayload : {};
  const instanceName = sanitizeText(payload.instanceName || '', 80);

  if (!instanceName) {
    return {
      error: 'O nome da instância é obrigatório.'
    };
  }

  return {
    payload: {
      instanceName,
      token: sanitizeText(payload.token || '', 180),
      qrcode: Boolean(payload.qrcode ?? true),
      integration: sanitizeText(payload.integration || 'WHATSAPP-BAILEYS', 60),
      rejectCall: Boolean(payload.rejectCall ?? false),
      msgCall: sanitizeText(payload.msgCall || '', 240),
      groupsIgnore: Boolean(payload.groupsIgnore ?? false),
      alwaysOnline: Boolean(payload.alwaysOnline ?? false),
      readMessages: Boolean(payload.readMessages ?? false),
      readStatus: Boolean(payload.readStatus ?? false),
      syncFullHistory: Boolean(payload.syncFullHistory ?? false),
      ...payload.extra
    }
  };
}

module.exports = {
  callEvolution,
  buildInstancePayload
};
