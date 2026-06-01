const FREE_TIER_LIMIT = 200;
const ADMIN_EMAILS = ['stefansiemerink@outlook.com'];

function resolveEmail(graphUser) {
  return (graphUser.mail || graphUser.userPrincipalName || '').toLowerCase();
}

function isAdminEmail(email) {
  return ADMIN_EMAILS.includes((email || '').toLowerCase());
}

function toUserDto(entity) {
  const triaged = entity.photosTriaged || 0;
  const premium = entity.isPremium || false;
  const admin = entity.isAdmin || false;
  const limit = entity.freeTierLimit ?? FREE_TIER_LIMIT;
  const unlimited = premium || admin;
  return {
    id: entity.rowKey,
    displayName: entity.displayName,
    email: entity.email,
    photosTriaged: triaged,
    isPremium: premium,
    isAdmin: admin,
    isBlocked: entity.isBlocked || false,
    freeTierLimit: limit,
    hasReachedLimit: !unlimited && triaged >= limit,
    remaining: unlimited ? null : Math.max(0, limit - triaged),
  };
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-Id-Token',
  };
}

module.exports = { FREE_TIER_LIMIT, ADMIN_EMAILS, resolveEmail, isAdminEmail, toUserDto, corsHeaders };
