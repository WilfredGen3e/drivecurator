const { verifyAndGetGraphUser } = require('../shared/auth');
const { getUsersTable } = require('../shared/tableClient');
const { resolveEmail, isAdminEmail, toUserDto, corsHeaders } = require('../shared/userDto');

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

  let table;
  try {
    table = getUsersTable();
  } catch (e) {
    context.res = { status: 500, body: `table_init_error: ${e.message}`, headers: corsHeaders() };
    return;
  }

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
  } catch (e1) {
    try {
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
    } catch (e2) {
      context.res = { status: 500, body: `storage_error: getEntity=${e1.message} | createEntity=${e2.message}`, headers: corsHeaders() };
      return;
    }
  }

  context.res = {
    status: 200,
    headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(toUserDto(entity)),
  };
};
