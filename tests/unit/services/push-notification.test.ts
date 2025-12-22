import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validPushPayload, createMockSubscription } from '../../helpers/test-fixtures';

vi.mock('../../../src/config/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
  },
}));

const mockSetVapidDetails = vi.fn();
const mockSendNotification = vi.fn();

vi.mock('web-push', () => ({
  default: {
    setVapidDetails: (...args: unknown[]) => mockSetVapidDetails(...args),
    sendNotification: (...args: unknown[]) => mockSendNotification(...args),
  },
}));

describe('Push Notification Service', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubEnv('VAPID_PUBLIC_KEY', '');
    vi.stubEnv('VAPID_PRIVATE_KEY', '');
    vi.stubEnv('VAPID_SUBJECT', '');
  });

  describe('initializeWebPush', () => {
    it('should throw error when VAPID_PUBLIC_KEY is not defined', async () => {
      vi.stubEnv('VAPID_PUBLIC_KEY', '');
      vi.stubEnv('VAPID_PRIVATE_KEY', 'private-key');

      const { initializeWebPush } = await import('../../../src/services/push-notification');

      expect(() => initializeWebPush()).toThrow(
        'VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY must be defined'
      );
    });

    it('should throw error when VAPID_PRIVATE_KEY is not defined', async () => {
      vi.stubEnv('VAPID_PUBLIC_KEY', 'public-key');
      vi.stubEnv('VAPID_PRIVATE_KEY', '');

      const { initializeWebPush } = await import('../../../src/services/push-notification');

      expect(() => initializeWebPush()).toThrow(
        'VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY must be defined'
      );
    });

    it('should configure web-push with VAPID credentials', async () => {
      vi.stubEnv('VAPID_PUBLIC_KEY', 'test-public-key');
      vi.stubEnv('VAPID_PRIVATE_KEY', 'test-private-key');
      vi.stubEnv('VAPID_SUBJECT', 'mailto:test@example.com');

      const { initializeWebPush } = await import('../../../src/services/push-notification');
      initializeWebPush();

      expect(mockSetVapidDetails).toHaveBeenCalledWith(
        'mailto:test@example.com',
        'test-public-key',
        'test-private-key'
      );
    });
  });

  describe('sendPushNotification', () => {
    it('should send notification successfully', async () => {
      mockSendNotification.mockResolvedValueOnce({ statusCode: 201 });

      const { sendPushNotification } = await import('../../../src/services/push-notification');

      const subscription = createMockSubscription();
      const result = await sendPushNotification(subscription, validPushPayload);

      expect(result).toEqual({ success: true });
    });

    it('should format subscription correctly for web-push', async () => {
      mockSendNotification.mockResolvedValueOnce({ statusCode: 201 });

      const { sendPushNotification } = await import('../../../src/services/push-notification');

      const subscription = createMockSubscription();
      await sendPushNotification(subscription, validPushPayload);

      expect(mockSendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.keys.p256dh,
            auth: subscription.keys.auth,
          },
        }),
        expect.any(String)
      );
    });

    it('should send payload as JSON stringified', async () => {
      mockSendNotification.mockResolvedValueOnce({ statusCode: 201 });

      const { sendPushNotification } = await import('../../../src/services/push-notification');

      const subscription = createMockSubscription();
      await sendPushNotification(subscription, validPushPayload);

      expect(mockSendNotification).toHaveBeenCalledWith(
        expect.any(Object),
        JSON.stringify(validPushPayload)
      );
    });

    it('should return error with statusCode when sending fails', async () => {
      mockSendNotification.mockRejectedValueOnce({
        statusCode: 410,
        message: 'Gone',
      });

      const { sendPushNotification } = await import('../../../src/services/push-notification');

      const subscription = createMockSubscription();
      const result = await sendPushNotification(subscription, validPushPayload);

      expect(result).toEqual({
        success: false,
        error: 'Gone',
        statusCode: 410,
      });
    });

    it('should return "Unknown error" when error message does not exist', async () => {
      mockSendNotification.mockRejectedValueOnce({
        statusCode: 500,
      });

      const { sendPushNotification } = await import('../../../src/services/push-notification');

      const subscription = createMockSubscription();
      const result = await sendPushNotification(subscription, validPushPayload);

      expect(result).toEqual({
        success: false,
        error: 'Unknown error',
        statusCode: 500,
      });
    });

    it('should accept payload with optional fields (icon, data.url)', async () => {
      mockSendNotification.mockResolvedValueOnce({ statusCode: 201 });

      const { sendPushNotification } = await import('../../../src/services/push-notification');

      const subscription = createMockSubscription();
      const payloadWithOptionals = {
        title: 'Test',
        body: 'Body',
        icon: '/custom-icon.png',
        data: {
          url: '/custom-url',
        },
      };

      const result = await sendPushNotification(subscription, payloadWithOptionals);

      expect(result.success).toBe(true);
      expect(mockSendNotification).toHaveBeenCalledWith(
        expect.any(Object),
        JSON.stringify(payloadWithOptionals)
      );
    });
  });
});
