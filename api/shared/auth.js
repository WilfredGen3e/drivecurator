function decodeJwtPayload(token) {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

function parseBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  const raw = req.rawBody || (typeof req.body === 'string' ? req.body : '');
  try { return JSON.parse(raw || '{}'); } catch { return {}; }
}

function verifyAndGetGraphUser(req) {
  const body = parseBody(req);

  // Body-based auth (existing pattern: token + userId in body)
  let token = body.token;
  let userId = body.userId;
  let email = body.email || '';
  let displayName = body.displayName || '';

  // Fall back to Authorization header (for GET requests without body)
  if (!token) {
    const authHeader = (req.headers?.authorization || req.headers?.Authorization || '');
    if (authHeader.startsWith('Bearer ')) token = authHeader.slice(7);
  }

  if (!token) {
    return { user: null, reason: 'missing_token' };
  }

  const payload = decodeJwtPayload(token);
  if (payload?.exp) {
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) return { user: null, reason: 'token_expired' };
  }

  // If userId not in body, derive from JWT claims
  if (!userId && payload) {
    userId = payload.oid || payload.sub || null;
    email = email || payload.upn || payload.preferred_username || payload.email || '';
    displayName = displayName || payload.name || '';
  }

  if (!userId) {
    return { user: null, reason: `missing_userId: token=${!!token}` };
  }

  return {
    user: {
      id: userId,
      displayName,
      mail: email,
      userPrincipalName: email,
    },
    reason: null,
  };
}

module.exports = { verifyAndGetGraphUser };
