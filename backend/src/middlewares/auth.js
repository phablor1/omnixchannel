function getTokenFromRequest(req) {
  const authHeader = req.header('authorization') || '';
  if (!authHeader.toLowerCase().startsWith('bearer ')) {
    return null;
  }

  return authHeader.slice(7).trim();
}

function buildRequireClientSession(sessionService, expectedRole = null) {
  return (req, res, next) => {
    const token = getTokenFromRequest(req);
    const session = token ? sessionService.getSession(token) : null;

    if (!token || !session) {
      return res.status(401).json({
        success: false,
        message: 'Sessão inválida ou expirada. Faça login novamente.'
      });
    }

    if (expectedRole && session.role !== expectedRole) {
      return res.status(403).json({ success: false, message: 'Perfil sem permissão para esta operação.' });
    }

    req.session = session;
    req.sessionToken = token;
    return next();
  };
}

module.exports = { buildRequireClientSession };
