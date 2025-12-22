import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { setupTestDb, teardownTestDb, getTestDb, clearTestDb } from '../../helpers/test-db';
import { validSubscriptionData, generateUniqueEndpoint } from '../../helpers/test-fixtures';

const mockSchedule = vi.fn();
const mockSendPushNotification = vi.fn();
const mockLoggerInfo = vi.fn();
const mockLoggerError = vi.fn();

vi.mock('node-cron', () => ({
  default: {
    schedule: (...args: unknown[]) => mockSchedule(...args),
  },
}));

vi.mock('../../../src/services/push-notification', () => ({
  sendPushNotification: (...args: unknown[]) => mockSendPushNotification(...args),
}));

vi.mock('../../../src/config/logger', () => ({
  logger: {
    info: (...args: unknown[]) => mockLoggerInfo(...args),
    error: (...args: unknown[]) => mockLoggerError(...args),
    debug: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock('../../../src/config/database', async () => {
  const { getTestDb } = await import('../../helpers/test-db');
  return {
    getDatabase: () => getTestDb(),
  };
});

describe('Push Cron', () => {
  beforeAll(async () => {
    await setupTestDb();
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
    vi.clearAllMocks();
    vi.resetModules();
  });

  describe('startPushCron', () => {
    it('should schedule cron to run every 5 minutes', async () => {
      const { startPushCron } = await import('../../../src/cron/push-cron');

      startPushCron();

      expect(mockSchedule).toHaveBeenCalledWith('*/5 * * * *', expect.any(Function));
    });
  });

  describe('cron callback', () => {
    let cronCallback: () => Promise<void>;

    beforeEach(async () => {
      mockSchedule.mockImplementation((_pattern: string, callback: () => Promise<void>) => {
        cronCallback = callback;
      });

      const { startPushCron } = await import('../../../src/cron/push-cron');
      startPushCron();
    });

    it('should fetch all subscriptions from database', async () => {
      const db = getTestDb();
      await db.collection('subscriptions').insertMany([
        { endpoint: generateUniqueEndpoint('1'), keys: validSubscriptionData.keys, createdAt: new Date() },
        { endpoint: generateUniqueEndpoint('2'), keys: validSubscriptionData.keys, createdAt: new Date() },
      ]);

      mockSendPushNotification.mockResolvedValue({ success: true });

      await cronCallback();

      expect(mockSendPushNotification).toHaveBeenCalledTimes(2);
    });

    it('should not send push when no subscriptions exist', async () => {
      await cronCallback();

      expect(mockSendPushNotification).not.toHaveBeenCalled();
      expect(mockLoggerInfo).toHaveBeenCalledWith('No subscriptions found, skipping push');
    });

    it('should send push for each subscription', async () => {
      const db = getTestDb();
      await db.collection('subscriptions').insertMany([
        { endpoint: generateUniqueEndpoint('a'), keys: validSubscriptionData.keys, createdAt: new Date() },
        { endpoint: generateUniqueEndpoint('b'), keys: validSubscriptionData.keys, createdAt: new Date() },
        { endpoint: generateUniqueEndpoint('c'), keys: validSubscriptionData.keys, createdAt: new Date() },
      ]);

      mockSendPushNotification.mockResolvedValue({ success: true });

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

      await cronCallback();

      expect(mockSendPushNotification).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          title: 'PWA Web Push',
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

      mockSendPushNotification.mockResolvedValueOnce({
        success: false,
        statusCode: 410,
      });

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

      mockSendPushNotification.mockResolvedValueOnce({
        success: false,
        statusCode: 500,
        error: 'Server error',
      });

      await cronCallback();

      const subscription = await db.collection('subscriptions').findOne({
        _id: insertResult.insertedId,
      });

      expect(subscription).not.toBeNull();
    });

    it('should log error when exception occurs', async () => {
      vi.doMock('../../../src/config/database', () => ({
        getDatabase: () => {
          throw new Error('Database connection failed');
        },
      }));

      vi.resetModules();

      mockSchedule.mockImplementation((_pattern: string, callback: () => Promise<void>) => {
        cronCallback = callback;
      });

      const { startPushCron } = await import('../../../src/cron/push-cron');
      startPushCron();

      await cronCallback();

      expect(mockLoggerError).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.any(Error) }),
        'Error in push notification cron job'
      );
    });
  });
});
