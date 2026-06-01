const { verifyAndGetGraphUser } = require('../shared/auth');
const { getUsersTable } = require('../shared/tableClient');
const { FREE_TIER_LIMIT, isAdminEmail, resolveEmail, toUserDto, corsHeaders } = require('../shared/userDto');

module.exports = async function (context, req) {
  if (req.method === 'OPTIONS') {
    context.res = { status: 204, headers: corsHeaders() };
    return;
  }

  const { user: graphUser, reason } = await verifyAndGetGraphUser(req);
  if (!graphUser) {
    context.res = { status: 401, body: `Unauthorized: ${reason}`, headers: corsHeaders() };
    return;
  }

  const callerEmail = resolveEmail(graphUser);
  if (!isAdminEmail(callerEmail)) {
    context.res = { status: 403, body: 'Forbidden', headers: corsHeaders() };
    return;
  }

  const table = getUsersTable();
  const body = req.body || {};

  // POST — lijst alle gebruikers
  if (req.method === 'POST') {
    const users = [];
    for await (const entity of table.listEntities({ queryOptions: { filter: "PartitionKey eq 'user'" } })) {
      users.push(toUserDto(entity));
    }
    users.sort((a, b) => a.email.localeCompare(b.email));
    context.res = {
      status: 200,
      headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(users),
    };
    return;
  }

  // PATCH / DELETE — targetUserId is de te bewerken gebruiker
  const { targetUserId } = body;
  if (!targetUserId) {
    context.res = { status: 400, body: 'targetUserId is required', headers: corsHeaders() };
    return;
  }

  if (req.method === 'PATCH') {
    const patch = { partitionKey: 'user', rowKey: targetUserId };
    let hasField = false;

    if (typeof body.freeTierLimit === 'number') { patch.freeTierLimit = Math.max(0, body.freeTierLimit); hasField = true; }
    if (typeof body.isPremium === 'boolean')    { patch.isPremium = body.isPremium; hasField = true; }
    if (typeof body.isBlocked === 'boolean')    { patch.isBlocked = body.isBlocked; hasField = true; }

    if (!hasField) {
      context.res = { status: 400, body: 'No valid fields to update', headers: corsHeaders() };
      return;
    }

    try {
      await table.updateEntity(patch, 'Merge');
      const updated = await table.getEntity('user', targetUserId);
      context.res = {
        status: 200,
        headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(toUserDto(updated)),
      };
    } catch (e) {
      context.res = { status: 404, body: `User not found: ${e.message}`, headers: corsHeaders() };
    }
    return;
  }

  if (req.method === 'DELETE') {
    try {
      await table.deleteEntity('user', targetUserId);
      context.res = { status: 204, headers: corsHeaders() };
    } catch (e) {
      context.res = { status: 404, body: `User not found: ${e.message}`, headers: corsHeaders() };
    }
    return;
  }

  context.res = { status: 405, body: 'Method not allowed', headers: corsHeaders() };
};
