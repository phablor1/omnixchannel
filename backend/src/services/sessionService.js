const crypto = require('crypto');

class SessionService {
  constructor(ttlMs) {
    this.ttlMs = ttlMs;
    this.sessions = new Map();
  }

  cleanupExpiredSessions() {
    const now = Date.now();
    for (const [token, session] of this.sessions.entries()) {
      if (session.expiresAt <= now) {
        this.sessions.delete(token);
      }
    }
  }

  createSession(sessionData = {}) {
    this.cleanupExpiredSessions();
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + this.ttlMs;
    this.sessions.set(token, {
      username: sessionData.username || '',
      role: sessionData.role || 'client',
      companyId: sessionData.companyId || null,
      accountId: sessionData.accountId || null,
      displayName: sessionData.displayName || null,
      createdAt: Date.now(),
      expiresAt
    });
    return { token, expiresAt };
  }

  getSession(token) {
    this.cleanupExpiredSessions();
    const session = this.sessions.get(token);

    if (!session) {
      return null;
    }

    session.expiresAt = Date.now() + this.ttlMs;
    return session;
  }

  deleteSession(token) {
    this.sessions.delete(token);
  }
}

module.exports = { SessionService };
