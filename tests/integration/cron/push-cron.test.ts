import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { setupTestDb, teardownTestDb, getTestDb, clearTestDb } from '../../helpers/test-db';
import { validSubscriptionData, generateUniqueEndpoint } from '../../helpers/test-fixtures';
import { SubscriptionRepository } from '../../../src/repositories/subscription.repository';
import { SubscriptionService } from '../../../src/services/subscription.service';

const mockSchedule = vi.fn();

vi.mock('node-cron', () => ({
  default: {
    schedule: (...args: unknown[]) => mockSchedule(...args),
  },
}));

const mockSendPushNotification = vi.fn();

vi.mock('../../../src/services/push-notification', () => ({
  sendPushNotification: (...args: unknown[]) => mockSendPushNotification(...args),
}));

vi.mock('../../../src/config/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('../../../src/config/database', async () => {
  const { getTestDb } = await import('../../helpers/test-db');
  return {
    getDatabase: () => getTestDb(),
  };
});

let service: SubscriptionService;

describe('Push Cron', () => {
  beforeAll(async () => {
    await setupTestDb();

    const repository = new SubscriptionRepository();
    service = new SubscriptionService(repository);
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
    vi.clearAllMocks();
  });

  describe('startPushCron', () => {
    it('should schedule cron to run every 5 minutes', async () => {
      const { startPushCron } = await import('../../../src/cron/push-cron');

      startPushCron(service);

      expect(mockSchedule).toHaveBeenCalledTimes(1);
      expect(mockSchedule).toHaveBeenCalledWith('*/5 * * * *', expect.any(Function));
    });
  });

  describe('cron callback', () => {
    it('should fetch all subscriptions from database', async () => {
      const db = getTestDb();
      await db.collection('subscriptions').insertOne({
        endpoint: generateUniqueEndpoint('cron-test'),
        keys: validSubscriptionData.keys,
        createdAt: new Date(),
      });

      mockSendPushNotification.mockResolvedValue({ success: true });

      const { startPushCron } = await import('../../../src/cron/push-cron');

      startPushCron(service);

      const cronCallback = mockSchedule.mock.calls[0][1] as () => Promise<void>;
      await cronCallback();

      expect(mockSendPushNotification).toHaveBeenCalledTimes(1);
    });

    it('should not send push when no subscriptions exist', async () => {
      const { startPushCron } = await import('../../../src/cron/push-cron');

      startPushCron(service);

      const cronCallback = mockSchedule.mock.calls[0][1] as () => Promise<void>;
      await cronCallback();

      expect(mockSendPushNotification).not.toHaveBeenCalled();
    });

    it('should send push for each subscription', async () => {
      const db = getTestDb();
      await db.collection('subscriptions').insertMany([
        { endpoint: generateUniqueEndpoint('sub-1'), keys: validSubscriptionData.keys, createdAt: new Date() },
        { endpoint: generateUniqueEndpoint('sub-2'), keys: validSubscriptionData.keys, createdAt: new Date() },
        { endpoint: generateUniqueEndpoint('sub-3'), keys: validSubscriptionData.keys, createdAt: new Date() },
      ]);

      mockSendPushNotification.mockResolvedValue({ success: true });

      const { startPushCron } = await import('../../../src/cron/push-cron');

      startPushCron(service);

      const cronCallback = mockSchedule.mock.calls[0][1] as () => Promise<void>;
      await cronCallback();

      expect(mockSendPushNotification).toHaveBeenCalledTimes(3);
    });

    it('should build payload with title, body, icon and url', async () => {
      const db = getTestDb();
      await db.collection('subscriptions').insertOne({
        endpoint: generateUniqueEndpoint('payload-test'),
        keys: validSubscriptionData.keys,
        createdAt: new Date(),
      });

      mockSendPushNotification.mockResolvedValue({ success: true });

      const { startPushCron } = await import('../../../src/cron/push-cron');

      startPushCron(service);

      const cronCallback = mockSchedule.mock.calls[0][1] as () => Promise<void>;
      await cronCallback();

      expect(mockSendPushNotification).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          title: 'PWA Web Push',
          body: expect.any(String),
          icon: '/icon-192x192.png',
          data: { url: '/' },
        })
      );
    });

    it('should remove expired subscription (statusCode 410)', async () => {
      const db = getTestDb();
      const insertResult = await db.collection('subscriptions').insertOne({
        endpoint: generateUniqueEndpoint('expired-cron'),
        keys: validSubscriptionData.keys,
        createdAt: new Date(),
      });

      mockSendPushNotification.mockResolvedValue({
        success: false,
        statusCode: 410,
      });

      const { startPushCron } = await import('../../../src/cron/push-cron');

      startPushCron(service);

      const cronCallback = mockSchedule.mock.calls[0][1] as () => Promise<void>;
      await cronCallback();

      const subscription = await db.collection('subscriptions').findOne({
        _id: insertResult.insertedId,
      });

      expect(subscription).toBeNull();
    });

    it('should keep subscription when other error occurs', async () => {
      const db = getTestDb();
      const insertResult = await db.collection('subscriptions').insertOne({
        endpoint: generateUniqueEndpoint('other-error'),
        keys: validSubscriptionData.keys,
        createdAt: new Date(),
      });

      mockSendPushNotification.mockResolvedValue({
        success: false,
        statusCode: 500,
        error: 'Server error',
      });

      const { startPushCron } = await import('../../../src/cron/push-cron');

      startPushCron(service);

      const cronCallback = mockSchedule.mock.calls[0][1] as () => Promise<void>;
      await cronCallback();

      const subscription = await db.collection('subscriptions').findOne({
        _id: insertResult.insertedId,
      });

      expect(subscription).not.toBeNull();
    });

    it('should log error when exception occurs', async () => {
      const { logger } = await import('../../../src/config/logger');

      const db = getTestDb();
      await db.collection('subscriptions').insertOne({
        endpoint: generateUniqueEndpoint('exception-test'),
        keys: validSubscriptionData.keys,
        createdAt: new Date(),
      });

      mockSendPushNotification.mockRejectedValue(new Error('Unexpected error'));

      const { startPushCron } = await import('../../../src/cron/push-cron');

      startPushCron(service);

      const cronCallback = mockSchedule.mock.calls[0][1] as () => Promise<void>;
      await cronCallback();

      expect(logger.error).toHaveBeenCalled();
    });
  });
});
