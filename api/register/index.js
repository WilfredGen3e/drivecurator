const { verifyAndGetGraphUser } = require('../shared/auth');
const { getUsersTable } = require('../shared/tableClient');
const { resolveEmail, isAdminEmail, toUserDto, corsHeaders } = require('../shared/userDto');

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
  await table.createTable().catch(() => {});

  const userId = graphUser.id;
  const email = resolveEmail(graphUser);
  const isAdmin = isAdminEmail(email);

  let entity;
  try {
    entity = await table.getEntity('user', userId);
    await table.updateEntity(
      { partitionKey: 'user', rowKey: userId, displayName: graphUser.displayName, email },
      'Merge'
    );
    entity = await table.getEntity('user', userId);
  } catch {
    entity = {
      partitionKey: 'user',
      rowKey: userId,
      displayName: graphUser.displayName,
      email,
      photosTriaged: 0,
      isPremium: isAdmin,
      isAdmin,
      createdAt: new Date().toISOString(),
    };
    await table.createEntity(entity);
  }

  context.res = {
    status: 200,
    headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(toUserDto(entity)),
  };
};
