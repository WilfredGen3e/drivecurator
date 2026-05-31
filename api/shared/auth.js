function decodeJwtPayload(token) {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

function verifyAndGetGraphUser(req) {
  const token = req.body?.token;
  if (!token) return { user: null, reason: 'no_token_in_body' };

  const payload = decodeJwtPayload(token);
  if (!payload) return { user: null, reason: 'invalid_jwt' };

  const id = payload.oid || payload.sub;
  if (!id) return { user: null, reason: 'no_user_id_in_token' };

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
