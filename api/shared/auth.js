function decodeJwtPayload(token) {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

function verifyAndGetGraphUser(req) {
  const raw = req.rawBody || (typeof req.body === 'string' ? req.body : JSON.stringify(req.body || ''));
  let body = {};
  try { body = JSON.parse(raw || '{}'); } catch {}
  const token = body.token;
  if (!token) return { user: null, reason: `no_token: body_type=${typeof req.body} rawBody_type=${typeof req.rawBody} raw_len=${(raw||'').length} raw=${raw.slice(0,80)}` };

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
