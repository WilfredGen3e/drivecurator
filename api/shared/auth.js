async function verifyAndGetGraphUser(req) {
  const auth = req.headers['authorization'];
  if (!auth?.startsWith('Bearer ')) return { user: null, reason: 'no_bearer_header' };
  const token = auth.slice(7);

  let res;
  try {
    res = await fetch(
      'https://graph.microsoft.com/v1.0/me?$select=id,displayName,mail,userPrincipalName',
      { headers: { Authorization: `Bearer ${token}` } }
    );
  } catch (e) {
    return { user: null, reason: `fetch_error: ${e.message}` };
  }

  if (!res.ok) {
    let body = '';
    try { body = await res.text() } catch {}
    return { user: null, reason: `graph_${res.status}: ${body.slice(0, 200)}` };
  }
  return { user: await res.json(), reason: null };
}

module.exports = { verifyAndGetGraphUser };
