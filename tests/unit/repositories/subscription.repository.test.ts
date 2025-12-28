import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { ObjectId } from 'mongodb';
import { setupTestDb, teardownTestDb, getTestDb, clearTestDb } from '../../helpers/test-db';
import { validSubscriptionData, generateUniqueEndpoint } from '../../helpers/test-fixtures';
import { SubscriptionRepository } from '../../../src/repositories/subscription.repository';

vi.mock('../../../src/config/database', async () => {
  const { getTestDb } = await import('../../helpers/test-db');
  return {
    getDatabase: () => getTestDb(),
  };
});

let repository: SubscriptionRepository;

describe('SubscriptionRepository', () => {
  beforeAll(async () => {
    await setupTestDb();
    repository = new SubscriptionRepository();
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
  });

  describe('findAll', () => {
    it('should return empty array when no subscriptions exist', async () => {
      const result = await repository.findAll();
      expect(result).toEqual([]);
    });

    it('should return all subscriptions', async () => {
      const db = getTestDb();
      await db.collection('subscriptions').insertMany([
        { endpoint: generateUniqueEndpoint('1'), keys: validSubscriptionData.keys, createdAt: new Date() },
        { endpoint: generateUniqueEndpoint('2'), keys: validSubscriptionData.keys, createdAt: new Date() },
      ]);

      const result = await repository.findAll();
      expect(result).toHaveLength(2);
    });
  });

  describe('findById', () => {
    it('should return subscription when exists', async () => {
      const db = getTestDb();
      const insertResult = await db.collection('subscriptions').insertOne({
        endpoint: generateUniqueEndpoint('find-by-id'),
        keys: validSubscriptionData.keys,
        createdAt: new Date(),
      });

      const result = await repository.findById(insertResult.insertedId.toString());
      expect(result).not.toBeNull();
      expect(result!.endpoint).toContain('find-by-id');
    });

    it('should return null for non-existent ID', async () => {
      const result = await repository.findById(new ObjectId().toString());
      expect(result).toBeNull();
    });

    it('should return null for invalid ID', async () => {
      const result = await repository.findById('invalid-id');
      expect(result).toBeNull();
    });
  });

  describe('findByEndpoint', () => {
    it('should return subscription when exists', async () => {
      const endpoint = generateUniqueEndpoint('find-by-endpoint');
      const db = getTestDb();
      await db.collection('subscriptions').insertOne({
        endpoint,
        keys: validSubscriptionData.keys,
        createdAt: new Date(),
      });

      const result = await repository.findByEndpoint(endpoint);
      expect(result).not.toBeNull();
      expect(result!.endpoint).toBe(endpoint);
    });

    it('should return null for non-existent endpoint', async () => {
      const result = await repository.findByEndpoint('https://non-existent.example.com/');
      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create subscription and return ID', async () => {
      const endpoint = generateUniqueEndpoint('create-test');
      const id = await repository.create({
        endpoint,
        keys: validSubscriptionData.keys,
      });

      expect(id).toBeDefined();
      expect(ObjectId.isValid(id)).toBe(true);

      const db = getTestDb();
      const subscription = await db.collection('subscriptions').findOne({
        _id: new ObjectId(id),
      });

      expect(subscription).not.toBeNull();
      expect(subscription!.endpoint).toBe(endpoint);
      expect(subscription!.createdAt).toBeInstanceOf(Date);
    });
  });

  describe('delete', () => {
    it('should delete existing subscription', async () => {
      const db = getTestDb();
      const insertResult = await db.collection('subscriptions').insertOne({
        endpoint: generateUniqueEndpoint('delete-test'),
        keys: validSubscriptionData.keys,
        createdAt: new Date(),
      });

      const result = await repository.delete(insertResult.insertedId.toString());
      expect(result).toBe(true);

      const subscription = await db.collection('subscriptions').findOne({
        _id: insertResult.insertedId,
      });
      expect(subscription).toBeNull();
    });

    it('should return false for non-existent ID', async () => {
      const result = await repository.delete(new ObjectId().toString());
      expect(result).toBe(false);
    });

    it('should return false for invalid ID', async () => {
      const result = await repository.delete('invalid-id');
      expect(result).toBe(false);
    });
  });
});

