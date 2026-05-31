const { TableClient } = require('@azure/data-tables');

const TABLE_NAME = 'users';

function getUsersTable() {
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  if (connectionString) {
    return TableClient.fromConnectionString(connectionString, TABLE_NAME);
  }
  throw new Error('AZURE_STORAGE_CONNECTION_STRING is not configured');
}

module.exports = { getUsersTable };
