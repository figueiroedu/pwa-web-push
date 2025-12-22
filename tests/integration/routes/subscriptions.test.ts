import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import { ObjectId } from 'mongodb';
import { setupTestDb, teardownTestDb, getTestDb, clearTestDb } from '../../helpers/test-db';
import { validSubscriptionData, generateUniqueEndpoint } from '../../helpers/test-fixtures';

vi.mock('../../../src/config/database', async () => {
  const { getTestDb } = await import('../../helpers/test-db');
  return {
    getDatabase: () => getTestDb(),
  };
});

import { subscriptionRoutes } from '../../../src/routes/subscriptions';

let app: FastifyInstance;

describe('Subscription Routes', () => {
  beforeAll(async () => {
    await setupTestDb();
    app = Fastify();
    await app.register(subscriptionRoutes);
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    await teardownTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
  });

  describe('POST /subscriptions', () => {
    it('should create subscription with valid data', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/subscriptions',
        payload: validSubscriptionData,
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body.message).toBe('Subscription created');
      expect(body.id).toBeDefined();
      expect(ObjectId.isValid(body.id)).toBe(true);
    });

    it('should return 400 when endpoint is missing', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/subscriptions',
        payload: {
          keys: validSubscriptionData.keys,
        },
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.error).toContain('Missing required fields');
    });

    it('should return 400 when keys.p256dh is missing', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/subscriptions',
        payload: {
          endpoint: validSubscriptionData.endpoint,
          keys: {
            auth: validSubscriptionData.keys.auth,
          },
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 when keys.auth is missing', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/subscriptions',
        payload: {
          endpoint: validSubscriptionData.endpoint,
          keys: {
            p256dh: validSubscriptionData.keys.p256dh,
          },
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 200 when subscription already exists', async () => {
      const endpoint = generateUniqueEndpoint('duplicate');
      const payload = {
        endpoint,
        keys: validSubscriptionData.keys,
      };

      const firstResponse = await app.inject({
        method: 'POST',
        url: '/subscriptions',
        payload,
      });

      expect(firstResponse.statusCode).toBe(201);
      const firstBody = firstResponse.json();

      const secondResponse = await app.inject({
        method: 'POST',
        url: '/subscriptions',
        payload,
      });

      expect(secondResponse.statusCode).toBe(200);
      const secondBody = secondResponse.json();
      expect(secondBody.message).toBe('Subscription already exists');
      expect(secondBody.id).toBe(firstBody.id);
    });

    it('should save createdAt as Date', async () => {
      const endpoint = generateUniqueEndpoint('date-test');
      const response = await app.inject({
        method: 'POST',
        url: '/subscriptions',
        payload: {
          endpoint,
          keys: validSubscriptionData.keys,
        },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();

      const db = getTestDb();
      const subscription = await db.collection('subscriptions').findOne({
        _id: new ObjectId(body.id),
      });

      expect(subscription).toBeDefined();
      expect(subscription!.createdAt).toBeInstanceOf(Date);
    });
  });

  describe('GET /subscriptions', () => {
    it('should return empty array when no subscriptions exist', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/subscriptions',
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body).toEqual([]);
    });

    it('should return all subscriptions', async () => {
      const db = getTestDb();
      await db.collection('subscriptions').insertMany([
        { endpoint: generateUniqueEndpoint('1'), keys: validSubscriptionData.keys, createdAt: new Date() },
        { endpoint: generateUniqueEndpoint('2'), keys: validSubscriptionData.keys, createdAt: new Date() },
        { endpoint: generateUniqueEndpoint('3'), keys: validSubscriptionData.keys, createdAt: new Date() },
      ]);

      const response = await app.inject({
        method: 'GET',
        url: '/subscriptions',
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body).toHaveLength(3);
    });
  });

  describe('GET /subscriptions/:id', () => {
    it('should return existing subscription', async () => {
      const db = getTestDb();
      const insertResult = await db.collection('subscriptions').insertOne({
        endpoint: generateUniqueEndpoint('get-test'),
        keys: validSubscriptionData.keys,
        createdAt: new Date(),
      });

      const response = await app.inject({
        method: 'GET',
        url: `/subscriptions/${insertResult.insertedId.toString()}`,
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.endpoint).toContain('get-test');
    });

    it('should return 404 for non-existent ID', async () => {
      const nonExistentId = new ObjectId().toString();

      const response = await app.inject({
        method: 'GET',
        url: `/subscriptions/${nonExistentId}`,
      });

      expect(response.statusCode).toBe(404);
      const body = response.json();
      expect(body.error).toBe('Subscription not found');
    });

    it('should return 400 for invalid ID', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/subscriptions/invalid-id',
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.error).toBe('Invalid subscription ID');
    });
  });

  describe('DELETE /subscriptions/:id', () => {
    it('should delete existing subscription', async () => {
      const db = getTestDb();
      const insertResult = await db.collection('subscriptions').insertOne({
        endpoint: generateUniqueEndpoint('delete-test'),
        keys: validSubscriptionData.keys,
        createdAt: new Date(),
      });

      const response = await app.inject({
        method: 'DELETE',
        url: `/subscriptions/${insertResult.insertedId.toString()}`,
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.message).toBe('Subscription deleted');
    });

    it('should return 404 for non-existent ID', async () => {
      const nonExistentId = new ObjectId().toString();

      const response = await app.inject({
        method: 'DELETE',
        url: `/subscriptions/${nonExistentId}`,
      });

      expect(response.statusCode).toBe(404);
      const body = response.json();
      expect(body.error).toBe('Subscription not found');
    });

    it('should return 400 for invalid ID', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/subscriptions/invalid-id',
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.error).toBe('Invalid subscription ID');
    });

    it('should effectively remove from database', async () => {
      const db = getTestDb();
      const insertResult = await db.collection('subscriptions').insertOne({
        endpoint: generateUniqueEndpoint('remove-test'),
        keys: validSubscriptionData.keys,
        createdAt: new Date(),
      });

      await app.inject({
        method: 'DELETE',
        url: `/subscriptions/${insertResult.insertedId.toString()}`,
      });

      const getResponse = await app.inject({
        method: 'GET',
        url: `/subscriptions/${insertResult.insertedId.toString()}`,
      });

      expect(getResponse.statusCode).toBe(404);
    });
  });
});
