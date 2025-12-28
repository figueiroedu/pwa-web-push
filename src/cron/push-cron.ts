import cron from 'node-cron';
import { SubscriptionService } from '../services/subscription.service';
import { sendPushNotification } from '../services/push-notification.service';
import { PushPayload } from '../types/push-payload';
import { logger } from '../config/logger';

export const startPushCron = (subscriptionService: SubscriptionService) => {
  cron.schedule('*/5 * * * *', async () => {
    try {
      const subscriptions = await subscriptionService.getAll();

      if (subscriptions.length === 0) {
        logger.info('No subscriptions found, skipping push');
        return;
      }

      const payload: PushPayload = {
        title: 'PWA Web Push',
        body: `Notificação automática - ${new Date().toLocaleString('pt-BR')}`,
        icon: '/icon-192x192.png',
        data: {
          url: '/',
        },
      };

      for (const subscription of subscriptions) {
        const result = await sendPushNotification(subscription, payload);

        if (!result.success && result.statusCode === 410) {
          await subscriptionService.delete(subscription._id!.toString());
          logger.info({ subscriptionId: subscription._id }, 'Expired subscription removed');
        }
      }

      logger.info('Push notification cron job completed');
    } catch (error) {
      logger.error({ error }, 'Error in push notification cron job');
    }
  });

  logger.info('Push notification cron job scheduled (every 5 minutes)');
};
