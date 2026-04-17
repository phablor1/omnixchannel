function getTokenFromRequest(req) {
  const authHeader = req.header('authorization') || '';
  if (!authHeader.toLowerCase().startsWith('bearer ')) {
    return null;
  }

  return authHeader.slice(7).trim();
}

function buildRequireClientSession(sessionService) {
  return (req, res, next) => {
    const token = getTokenFromRequest(req);
    const session = token ? sessionService.getSession(token) : null;

    if (!token || !session) {
      return res.status(401).json({
        success: false,
        message: 'Sessão inválida ou expirada. Faça login novamente.'
      });
    }

    req.session = session;
    req.sessionToken = token;
    return next();
  };
}

module.exports = { buildRequireClientSession };
