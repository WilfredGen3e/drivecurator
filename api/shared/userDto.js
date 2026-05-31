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
  return {
    id: entity.rowKey,
    displayName: entity.displayName,
    email: entity.email,
    photosTriaged: triaged,
    isPremium: premium,
    isAdmin: entity.isAdmin || false,
    freeTierLimit: FREE_TIER_LIMIT,
    hasReachedLimit: !premium && triaged >= FREE_TIER_LIMIT,
    remaining: premium ? null : Math.max(0, FREE_TIER_LIMIT - triaged),
  };
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-Id-Token',
  };
}

module.exports = { FREE_TIER_LIMIT, ADMIN_EMAILS, resolveEmail, isAdminEmail, toUserDto, corsHeaders };
