import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoClient, Db } from 'mongodb';

let mongod: MongoMemoryServer | null = null;
let client: MongoClient | null = null;
let db: Db | null = null;

export const setupTestDb = async (): Promise<Db> => {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  client = new MongoClient(uri);
  await client.connect();
  db = client.db('test');
  return db;
};

export const teardownTestDb = async (): Promise<void> => {
  if (client) {
    await client.close();
    client = null;
  }
  if (mongod) {
    await mongod.stop();
    mongod = null;
  }
  db = null;
};

export const getTestDb = (): Db => {
  if (!db) {
    throw new Error('Test database not initialized. Call setupTestDb() first.');
  }
  return db;
};

export const getTestUri = (): string => {
  if (!mongod) {
    throw new Error('Test database not initialized. Call setupTestDb() first.');
  }
  return mongod.getUri();
};

export const clearTestDb = async (): Promise<void> => {
  if (!db) return;
  const collections = await db.collections();
  for (const collection of collections) {
    await collection.deleteMany({});
  }
};

