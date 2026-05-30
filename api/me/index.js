const { verifyAndGetGraphUser } = require('../shared/auth');
const { getUsersTable } = require('../shared/tableClient');
const { toUserDto, corsHeaders } = require('../shared/userDto');

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

  try {
    const table = getUsersTable();
    const entity = await table.getEntity('user', graphUser.id);
    context.res = {
      status: 200,
      headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(toUserDto(entity)),
    };
  } catch {
    context.res = { status: 404, body: 'User not found', headers: corsHeaders() };
  }
};
