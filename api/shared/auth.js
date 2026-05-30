async function verifyAndGetGraphUser(req) {
  const auth = req.headers['authorization'];
  if (!auth?.startsWith('Bearer ')) return null;
  const token = auth.slice(7);

  const res = await fetch(
    'https://graph.microsoft.com/v1.0/me?$select=id,displayName,mail,userPrincipalName',
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!res.ok) return null;
  return res.json();
}

module.exports = { verifyAndGetGraphUser };
