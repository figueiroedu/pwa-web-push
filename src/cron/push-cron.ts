import cron from 'node-cron';
import { getDatabase } from '../config/database';
import { Subscription } from '../types/subscription';
import { sendPushNotification } from '../services/push-notification';
import { logger } from '../config/logger';

const COLLECTION_NAME = 'subscriptions';

export const startPushCron = () => {
  cron.schedule('*/5 * * * *', async () => {
    logger.info('Running push notification cron job');

    try {
      const db = getDatabase();
      const collection = db.collection<Subscription>(COLLECTION_NAME);

      const subscriptions = await collection.find({}).toArray();

      if (subscriptions.length === 0) {
        logger.info('No subscriptions found, skipping push');
        return;
      }

      logger.info(`Sending push to ${String(subscriptions.length)} subscription(s)`);

      const payload = {
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
          await collection.deleteOne({ _id: subscription._id });
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
