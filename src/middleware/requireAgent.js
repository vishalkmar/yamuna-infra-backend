const jwt = require('jsonwebtoken');
const config = require('../config/env');
const AppError = require('../utils/AppError');

// Sign / verify agent-portal tokens (AMS). Kept separate from resident and
// admin tokens (own secret + a `type:'agent'` claim) so the three auth domains
// can't be confused. Mirrors middleware/requireAdmin.js.
function signAgentToken(payload) {
  return jwt.sign({ ...payload, type: 'agent' }, config.agentJwt.secret, {
    expiresIn: config.agentJwt.expiresIn,
  });
}

// requireAgent() → any authenticated, active agent. The token only ever carries
// active agents (login refuses non-active), so a valid token == an active agent.
function requireAgent() {
  return (req, res, next) => {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return next(new AppError('Missing or invalid Authorization header', 401));
    }
    let payload;
    try {
      payload = jwt.verify(header.slice(7), config.agentJwt.secret);
    } catch (e) {
      return next(new AppError('Invalid or expired agent token', 401));
    }
    if (payload.type !== 'agent') {
      return next(new AppError('Not an agent token', 401));
    }
    req.agent = payload; // { sub, name, email, type }
    return next();
  };
}

module.exports = { requireAgent, signAgentToken };
