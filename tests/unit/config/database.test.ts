import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest';
import { setupTestDb, teardownTestDb, getTestUri } from '../../helpers/test-db';

vi.mock('../../../src/config/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('Database', () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.stubEnv('MONGODB_URI', '');
    vi.stubEnv('MONGODB_DB_NAME', '');
  });

  afterEach(async () => {
    vi.resetModules();
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  describe('connectDatabase', () => {
    it('should throw error when MONGODB_URI is not defined', async () => {
      vi.stubEnv('MONGODB_URI', '');

      const { connectDatabase } = await import('../../../src/config/database');

      await expect(connectDatabase()).rejects.toThrow(
        'MONGODB_URI environment variable is not defined'
      );
    });

    it('should connect to MongoDB successfully', async () => {
      await setupTestDb();
      const uri = getTestUri();
      vi.stubEnv('MONGODB_URI', uri);

      const { connectDatabase } = await import('../../../src/config/database');
      const db = await connectDatabase();

      expect(db).toBeDefined();
      expect(db.databaseName).toBeDefined();

      const { closeDatabase } = await import('../../../src/config/database');
      await closeDatabase();
      await teardownTestDb();
    });

    it('should return existing connection if already connected (singleton)', async () => {
      await setupTestDb();
      const uri = getTestUri();
      vi.stubEnv('MONGODB_URI', uri);

      const { connectDatabase, closeDatabase } = await import('../../../src/config/database');

      const db1 = await connectDatabase();
      const db2 = await connectDatabase();

      expect(db1).toBe(db2);

      await closeDatabase();
      await teardownTestDb();
    });

    it('should use default database name when MONGODB_DB_NAME is not defined', async () => {
      await setupTestDb();
      const uri = getTestUri();
      vi.stubEnv('MONGODB_URI', uri);
      vi.stubEnv('MONGODB_DB_NAME', '');

      const { connectDatabase, closeDatabase } = await import('../../../src/config/database');
      const db = await connectDatabase();

      expect(db.databaseName).toBe('pwa-web-push');

      await closeDatabase();
      await teardownTestDb();
    });

    it('should use custom database name via MONGODB_DB_NAME', async () => {
      await setupTestDb();
      const uri = getTestUri();
      vi.stubEnv('MONGODB_URI', uri);
      vi.stubEnv('MONGODB_DB_NAME', 'custom-db');

      const { connectDatabase, closeDatabase } = await import('../../../src/config/database');
      const db = await connectDatabase();

      expect(db.databaseName).toBe('custom-db');

      await closeDatabase();
      await teardownTestDb();
    });
  });

  describe('getDatabase', () => {
    it('should throw error when database is not connected', async () => {
      const { getDatabase } = await import('../../../src/config/database');

      expect(() => getDatabase()).toThrow('Database not connected. Call connectDatabase() first.');
    });

    it('should return database instance after connection', async () => {
      await setupTestDb();
      const uri = getTestUri();
      vi.stubEnv('MONGODB_URI', uri);

      const { connectDatabase, getDatabase, closeDatabase } = await import(
        '../../../src/config/database'
      );

      await connectDatabase();
      const db = getDatabase();

      expect(db).toBeDefined();
      expect(db.databaseName).toBeDefined();

      await closeDatabase();
      await teardownTestDb();
    });
  });

  describe('closeDatabase', () => {
    it('should close connection and clear variables', async () => {
      await setupTestDb();
      const uri = getTestUri();
      vi.stubEnv('MONGODB_URI', uri);

      const { connectDatabase, closeDatabase, getDatabase } = await import(
        '../../../src/config/database'
      );

      await connectDatabase();
      await closeDatabase();

      expect(() => getDatabase()).toThrow('Database not connected');

      await teardownTestDb();
    });

    it('should be idempotent (call multiple times without error)', async () => {
      await setupTestDb();
      const uri = getTestUri();
      vi.stubEnv('MONGODB_URI', uri);

      const { connectDatabase, closeDatabase } = await import('../../../src/config/database');

      await connectDatabase();
      await closeDatabase();
      await expect(closeDatabase()).resolves.not.toThrow();

      await teardownTestDb();
    });
  });
});
