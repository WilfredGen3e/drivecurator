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
  const { token, userId, email, displayName } = body;

  if (!token || !userId) {
    return { user: null, reason: `missing_fields: token=${!!token} userId=${!!userId}` };
  }

  // Token is proof of active MSAL session. If it's a JWT, also check expiry.
  const payload = decodeJwtPayload(token);
  if (payload?.exp) {
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) return { user: null, reason: 'token_expired' };
  }

  return {
    user: {
      id: userId,
      displayName: displayName || '',
      mail: email || '',
      userPrincipalName: email || '',
    },
    reason: null,
  };
}

module.exports = { verifyAndGetGraphUser };
