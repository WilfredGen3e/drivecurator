function decodeJwtPayload(token) {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

function verifyAndGetGraphUser(req) {
  const auth = req.headers['authorization'];
  if (!auth?.startsWith('Bearer ')) return { user: null, reason: 'no_bearer_header' };

  const payload = decodeJwtPayload(auth.slice(7));
  if (!payload) return { user: null, reason: 'invalid_jwt' };

  const id = payload.oid || payload.sub;
  if (!id) return { user: null, reason: `no_id: iss=${payload.iss} keys=${Object.keys(payload).join(',')}` };

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < now) return { user: null, reason: 'token_expired' };

  return {
    user: {
      id,
      displayName: payload.name || '',
      mail: payload.email || payload.preferred_username || '',
      userPrincipalName: payload.preferred_username || payload.email || '',
    },
    reason: null,
  };
}

module.exports = { verifyAndGetGraphUser };
