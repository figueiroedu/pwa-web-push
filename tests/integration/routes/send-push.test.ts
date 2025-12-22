import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import { ObjectId } from 'mongodb';
import { setupTestDb, teardownTestDb, getTestDb, clearTestDb } from '../../helpers/test-db';
import { validSubscriptionData, generateUniqueEndpoint } from '../../helpers/test-fixtures';

const mockSendPushNotification = vi.fn();

vi.mock('../../../src/services/push-notification', () => ({
  sendPushNotification: (...args: unknown[]) => mockSendPushNotification(...args),
}));

vi.mock('../../../src/config/database', async () => {
  const { getTestDb } = await import('../../helpers/test-db');
  return {
    getDatabase: () => getTestDb(),
  };
});

import { sendPushRoutes } from '../../../src/routes/send-push';

let app: FastifyInstance;

describe('Send Push Routes', () => {
  beforeAll(async () => {
    await setupTestDb();
    app = Fastify();
    await app.register(sendPushRoutes);
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    await teardownTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
    vi.clearAllMocks();
  });

  describe('POST /send-push/:subscription_id', () => {
    it('should send push with valid data', async () => {
      mockSendPushNotification.mockResolvedValueOnce({ success: true });

      const db = getTestDb();
      const insertResult = await db.collection('subscriptions').insertOne({
        endpoint: generateUniqueEndpoint('push-test'),
        keys: validSubscriptionData.keys,
        createdAt: new Date(),
      });

      const response = await app.inject({
        method: 'POST',
        url: `/send-push/${insertResult.insertedId.toString()}`,
        payload: {
          title: 'Test Title',
          body: 'Test Body',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.message).toBe('Push notification sent');
    });

    it('should return 400 when title is missing', async () => {
      const db = getTestDb();
      const insertResult = await db.collection('subscriptions').insertOne({
        endpoint: generateUniqueEndpoint('no-title'),
        keys: validSubscriptionData.keys,
        createdAt: new Date(),
      });

      const response = await app.inject({
        method: 'POST',
        url: `/send-push/${insertResult.insertedId.toString()}`,
        payload: {
          body: 'Test Body',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.error).toContain('Missing required fields');
    });

    it('should return 400 when body is missing', async () => {
      const db = getTestDb();
      const insertResult = await db.collection('subscriptions').insertOne({
        endpoint: generateUniqueEndpoint('no-body'),
        keys: validSubscriptionData.keys,
        createdAt: new Date(),
      });

      const response = await app.inject({
        method: 'POST',
        url: `/send-push/${insertResult.insertedId.toString()}`,
        payload: {
          title: 'Test Title',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 for invalid ID', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/send-push/invalid-id',
        payload: {
          title: 'Test Title',
          body: 'Test Body',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.error).toBe('Invalid subscription ID');
    });

    it('should return 404 for non-existent subscription', async () => {
      const nonExistentId = new ObjectId().toString();

      const response = await app.inject({
        method: 'POST',
        url: `/send-push/${nonExistentId}`,
        payload: {
          title: 'Test Title',
          body: 'Test Body',
        },
      });

      expect(response.statusCode).toBe(404);
      const body = response.json();
      expect(body.error).toBe('Subscription not found');
    });

    it('should remove subscription and return 410 when expired', async () => {
      mockSendPushNotification.mockResolvedValueOnce({
        success: false,
        statusCode: 410,
      });

      const db = getTestDb();
      const insertResult = await db.collection('subscriptions').insertOne({
        endpoint: generateUniqueEndpoint('expired'),
        keys: validSubscriptionData.keys,
        createdAt: new Date(),
      });

      const response = await app.inject({
        method: 'POST',
        url: `/send-push/${insertResult.insertedId.toString()}`,
        payload: {
          title: 'Test Title',
          body: 'Test Body',
        },
      });

      expect(response.statusCode).toBe(410);
      const body = response.json();
      expect(body.error).toContain('expired');

      const subscription = await db.collection('subscriptions').findOne({
        _id: insertResult.insertedId,
      });
      expect(subscription).toBeNull();
    });

    it('should return 500 when sending fails for other reasons', async () => {
      mockSendPushNotification.mockResolvedValueOnce({
        success: false,
        statusCode: 500,
        error: 'Server error',
      });

      const db = getTestDb();
      const insertResult = await db.collection('subscriptions').insertOne({
        endpoint: generateUniqueEndpoint('server-error'),
        keys: validSubscriptionData.keys,
        createdAt: new Date(),
      });

      const response = await app.inject({
        method: 'POST',
        url: `/send-push/${insertResult.insertedId.toString()}`,
        payload: {
          title: 'Test Title',
          body: 'Test Body',
        },
      });

      expect(response.statusCode).toBe(500);
      const body = response.json();
      expect(body.error).toBe('Failed to send push notification');
      expect(body.details).toBe('Server error');
    });

    it('should pass optional icon and url to service', async () => {
      mockSendPushNotification.mockResolvedValueOnce({ success: true });

      const db = getTestDb();
      const insertResult = await db.collection('subscriptions').insertOne({
        endpoint: generateUniqueEndpoint('with-optionals'),
        keys: validSubscriptionData.keys,
        createdAt: new Date(),
      });

      await app.inject({
        method: 'POST',
        url: `/send-push/${insertResult.insertedId.toString()}`,
        payload: {
          title: 'Test Title',
          body: 'Test Body',
          icon: '/custom-icon.png',
          url: '/custom-url',
        },
      });

      expect(mockSendPushNotification).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          title: 'Test Title',
          body: 'Test Body',
          icon: '/custom-icon.png',
          data: { url: '/custom-url' },
        })
      );
    });
  });
});
