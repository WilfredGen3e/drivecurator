module.exports = async function (context, req) {
  context.res = { status: 200, body: JSON.stringify({ ok: true }), headers: { 'Content-Type': 'application/json' } };
};
