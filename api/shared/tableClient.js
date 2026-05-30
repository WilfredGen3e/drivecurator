const { TableClient } = require('@azure/data-tables');
const { DefaultAzureCredential } = require('@azure/identity');

const TABLE_NAME = 'users';

function getUsersTable() {
  const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
  if (!accountName) throw new Error('AZURE_STORAGE_ACCOUNT_NAME is not configured');

  const endpoint = `https://${accountName}.table.core.windows.net`;
  return new TableClient(endpoint, TABLE_NAME, new DefaultAzureCredential());
}

module.exports = { getUsersTable };
