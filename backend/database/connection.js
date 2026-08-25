const { MongoClient } = require('mongodb');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

let client = null;
let db = null;
let memoryServer = null;

async function connectDb(customUri = null, customDbName = null) {
  if (db) return db;

  let uri = customUri || process.env.MONGODB_URI;
  let dbName = customDbName || process.env.MONGODB_DB_NAME || 'customer_support';

  if (!uri) {
    console.log('MONGODB_URI environment variable not set. Launching MongoMemoryServer instance for dev/testing...');
    const { MongoMemoryServer } = require('mongodb-memory-server');
    memoryServer = await MongoMemoryServer.create();
    uri = memoryServer.getUri();
    dbName = 'customer_support_test';
  }

  client = new MongoClient(uri);
  await client.connect();
  db = client.db(dbName);
  console.log(`Connected successfully to MongoDB database "${dbName}"`);

  // Force seed fresh clean data for test memory servers
  if (memoryServer) {
    const { runMigration } = require('../scripts/migrate-to-mongodb');
    await runMigration(true);
  }

  return db;
}

function getDb() {
  if (!db) {
    throw new Error('Database not initialized. Call connectDb() first.');
  }
  return db;
}

async function closeDb() {
  if (client) {
    await client.close();
    client = null;
    db = null;
  }
  if (memoryServer) {
    await memoryServer.stop();
    memoryServer = null;
  }
}

function setDbInstance(dbInstance, clientInstance = null) {
  db = dbInstance;
  if (clientInstance) client = clientInstance;
}

module.exports = {
  connectDb,
  getDb,
  closeDb,
  setDbInstance
};
