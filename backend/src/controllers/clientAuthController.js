const crypto = require('crypto');
const { env } = require('../config/env');
const { sanitizeText } = require('../utils/sanitize');

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
    login(req, res) {
      const username = sanitizeText(req.body?.username, 80);
      const password = sanitizeText(req.body?.password, 120);

      const isValid = timingSafeCompare(username, env.CLIENT_PORTAL_USERNAME)
        && timingSafeCompare(password, env.CLIENT_PORTAL_PASSWORD);

      if (!isValid) {
        return res.status(401).json({ success: false, message: 'Usuário ou senha inválidos.' });
      }

      const { token, expiresAt } = sessionService.createSession(username);

      return res.json({
        success: true,
        token,
        expiresAt,
        message: 'Acesso autorizado com sucesso.'
      });
    },

    session(req, res) {
      return res.json({
        success: true,
        username: req.session.username,
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
