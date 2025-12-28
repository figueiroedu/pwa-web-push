import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { fastifyLogger } from './config/logger';
import { connectDatabase, closeDatabase } from './config/database';
import { initializeWebPush } from './services/push-notification.service';
import { SubscriptionRepository } from './repositories/subscription.repository';
import { SubscriptionService } from './services/subscription.service';
import { subscriptionRoutes } from './routes/subscriptions.route';
import { sendPushRoutes } from './routes/send-push.route';
import { startPushCron } from './cron/push-cron';

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';

const app = Fastify({ logger: fastifyLogger });

const start = async () => {
  try {
    await app.register(cors, {
      origin: true,
    });

    await connectDatabase();

    initializeWebPush();

    const subscriptionRepository = new SubscriptionRepository();
    const subscriptionService = new SubscriptionService(subscriptionRepository);

    await app.register(subscriptionRoutes(subscriptionService));
    await app.register(sendPushRoutes(subscriptionService));

    startPushCron(subscriptionService);

    await app.listen({ port: PORT, host: HOST });
    app.log.info(`Server listening on http://${HOST}:${String(PORT)}`);
  } catch (error) {
    app.log.error({ error }, 'Failed to start server');
    process.exit(1);
  }
};

const shutdown = () => {
  app.log.info('Shutting down...');
  void app.close();
  void closeDatabase();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

void start();
