import { MongoClient, Db } from 'mongodb';
import { logger } from './logger';

let client: MongoClient | null = null;
let db: Db | null = null;

export const connectDatabase = async (): Promise<Db> => {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error('MONGODB_URI environment variable is not defined');
  }

  if (db) {
    return db;
  }

  client = new MongoClient(uri);
  await client.connect();

  const dbName = process.env.MONGODB_DB_NAME || 'pwa-web-push';
  db = client.db(dbName);

  logger.info(`Connected to MongoDB database: ${dbName}`);

  return db;
};

export const getDatabase = (): Db => {
  if (!db) {
    throw new Error('Database not connected. Call connectDatabase() first.');
  }
  return db;
};

export const closeDatabase = async (): Promise<void> => {
  if (client) {
    await client.close();
    client = null;
    db = null;
    logger.info('MongoDB connection closed');
  }
};
