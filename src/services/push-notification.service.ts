import webpush from 'web-push';
import { Subscription } from '../types/subscription';
import { PushPayload, SendPushResult } from '../types/push-payload';
import { logger } from '../config/logger';

export const initializeWebPush = () => {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT as string;

  if (!publicKey || !privateKey) {
    throw new Error('VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY must be defined');
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);

  logger.info('Web Push initialized with VAPID credentials');
};

export const sendPushNotification = async (
  subscription: Subscription,
  payload: PushPayload
): Promise<SendPushResult> => {
  const pushSubscription = {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    },
  };

  try {
    await webpush.sendNotification(pushSubscription, JSON.stringify(payload));
    logger.info({ endpoint: subscription.endpoint }, 'Push notification sent');
    return { success: true };
  } catch (error) {
    const err = error as { statusCode?: number; message?: string };
    logger.error({ error: err, endpoint: subscription.endpoint }, 'Failed to send push notification');

    return {
      success: false,
      error: err.message || 'Unknown error',
      statusCode: err.statusCode,
    };
  }
};
