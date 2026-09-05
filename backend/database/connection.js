import { MongoClient } from 'mongodb';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

let client = null;
let db = null;
let memoryServer = null;

export async function connectDb(customUri = null, customDbName = null) {
  if (db && client && client.topology && client.topology.isConnected()) {
    return db;
  }

  if (client) {
    try { await client.close(); } catch (_) {}
    client = null;
    db = null;
  }


  const useMemoryDb = process.env.USE_MEMORY_DB === 'true' || process.env.NODE_ENV === 'test';
  let uri = useMemoryDb ? null : (customUri || process.env.MONGODB_URI);
  let dbName = customDbName || process.env.MONGODB_DB_NAME || 'customer_support';

  if (!uri) {
    console.log('Using MongoMemoryServer instance for testing/isolated environment...');
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    memoryServer = await MongoMemoryServer.create();
    uri = memoryServer.getUri();
    dbName = 'customer_support_test';
  }

  try {
    client = new MongoClient(uri, { tlsAllowInvalidCertificates: true, serverSelectionTimeoutMS: 5000 });
    await client.connect();
    db = client.db(dbName);
    console.log(`Connected successfully to MongoDB database "${dbName}"`);
  } catch (err) {
    if (!useMemoryDb && !customUri) {
      console.warn(`MongoDB connection attempt failed (${err.message}). Falling back to memory database...`);
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      memoryServer = await MongoMemoryServer.create();
      uri = memoryServer.getUri();
      dbName = 'customer_support_local';
      client = new MongoClient(uri);
      await client.connect();
      db = client.db(dbName);
      console.log(`Connected successfully to fallback database "${dbName}"`);
    } else {
      throw err;
    }
  }

  // Seed initial sample data if database is empty
  if (memoryServer) {
    const { runMigration } = await import('../scripts/migrate-to-mongodb.js');
    await runMigration(false);
  }

  return db;
}

export function getDb() {
  if (!db) {
    throw new Error('Database not initialized. Call connectDb() first.');
  }
  return db;
}

export async function closeDb() {
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

export function setDbInstance(dbInstance, clientInstance = null) {
  db = dbInstance;
  if (clientInstance) client = clientInstance;
}
