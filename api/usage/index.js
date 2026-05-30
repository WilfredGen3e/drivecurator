const { verifyAndGetGraphUser } = require('../shared/auth');
const { getUsersTable } = require('../shared/tableClient');
const { FREE_TIER_LIMIT, toUserDto, corsHeaders } = require('../shared/userDto');

module.exports = async function (context, req) {
  if (req.method === 'OPTIONS') {
    context.res = { status: 204, headers: corsHeaders() };
    return;
  }

  const graphUser = await verifyAndGetGraphUser(req);
  if (!graphUser) {
    context.res = { status: 401, body: 'Unauthorized', headers: corsHeaders() };
    return;
  }

  const table = getUsersTable();
  let entity;

  try {
    entity = await table.getEntity('user', graphUser.id);
  } catch {
    context.res = {
      status: 404,
      body: 'User not found. Call /api/register first.',
      headers: corsHeaders(),
    };
    return;
  }

  if (!entity.isPremium && !entity.isAdmin) {
    const current = entity.photosTriaged || 0;
    if (current >= FREE_TIER_LIMIT) {
      context.res = {
        status: 403,
        headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'free_limit_reached', ...toUserDto(entity) }),
      };
      return;
    }
    await table.updateEntity(
      { partitionKey: 'user', rowKey: graphUser.id, photosTriaged: current + 1 },
      'Merge'
    );
    entity = await table.getEntity('user', graphUser.id);
  }

  context.res = {
    status: 200,
    headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(toUserDto(entity)),
  };
};
