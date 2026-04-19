const crypto = require('crypto');
const { env } = require('../config/env');
const { sanitizeText } = require('../utils/sanitize');
const {
  getClientAccountForLogin,
  verifyPassword,
  markLastLogin,
  ensurePersistenceAvailable
} = require('../services/clientAccountService');

function timingSafeCompare(a, b) {
  const aBuffer = Buffer.from(a || '', 'utf8');
  const bBuffer = Buffer.from(b || '', 'utf8');

  if (aBuffer.length !== bBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(aBuffer, bBuffer);
}

function buildClientAuthController(sessionService) {
  return {
    async login(req, res) {
      const scope = sanitizeText(req.body?.scope, 20).toLowerCase() || 'client';
      const username = sanitizeText(req.body?.username, 80).toLowerCase();
      const rawPassword = typeof req.body?.password === 'string' ? req.body.password : '';
      const password = rawPassword.slice(0, 120);
      const companyId = sanitizeText(req.body?.companyId, 40).toLowerCase();

      if (scope === 'admin') {
        const isAdminValid = timingSafeCompare(username, env.CLIENT_PORTAL_USERNAME)
          && timingSafeCompare(password, env.CLIENT_PORTAL_PASSWORD);

        if (!isAdminValid) {
          return res.status(401).json({ success: false, message: 'Credenciais administrativas inválidas.' });
        }

        const { token, expiresAt } = sessionService.createSession({
          username,
          role: 'admin'
        });

        return res.json({ success: true, token, expiresAt, role: 'admin', message: 'Acesso administrativo liberado.' });
      }

      if (!ensurePersistenceAvailable()) {
        return res.status(503).json({ success: false, message: 'Persistência indisponível para login de cliente.' });
      }

      if (!companyId) {
        return res.status(400).json({ success: false, message: 'companyId é obrigatório para login de cliente.' });
      }

      const account = await getClientAccountForLogin({ companyId, username });
      if (!account || !verifyPassword(password, account.password_hash)) {
        return res.status(401).json({ success: false, message: 'Usuário, senha ou empresa inválidos.' });
      }

      if (account.status === 'blocked') {
        return res.status(403).json({ success: false, message: 'Cliente bloqueado. Contate o administrador.' });
      }

      const { token, expiresAt } = sessionService.createSession({
        username: account.username,
        role: 'client',
        companyId: account.company_id,
        accountId: account.id,
        displayName: account.display_name
      });

      await markLastLogin(account.id);

      return res.json({
        success: true,
        token,
        expiresAt,
        role: 'client',
        companyId: account.company_id,
        displayName: account.display_name,
        message: 'Acesso autorizado com sucesso.'
      });
    },

    session(req, res) {
      return res.json({
        success: true,
        username: req.session.username,
        role: req.session.role,
        companyId: req.session.companyId,
        displayName: req.session.displayName,
        expiresAt: req.session.expiresAt
      });
    },

    logout(req, res) {
      sessionService.deleteSession(req.sessionToken);
      return res.json({ success: true, message: 'Sessão encerrada com sucesso.' });
    }
  };
}

module.exports = { buildClientAuthController };
