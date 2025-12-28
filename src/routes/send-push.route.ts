import { FastifyInstance, FastifyPluginCallback } from 'fastify';
import { SubscriptionService } from '../services/subscription.service';
import { sendPushNotification } from '../services/push-notification.service';
import { PushPayload } from '../types/push-payload';

export const sendPushRoutes = (service: SubscriptionService): FastifyPluginCallback => {
  return (app: FastifyInstance, _opts, done) => {
    app.post<{ Params: { subscription_id: string }; Body: PushPayload }>(
      '/send-push/:subscription_id',
      async (request, reply) => {
        const { subscription_id } = request.params;
        const payload = request.body;

        if (!payload.title || !payload.body) {
          return reply.status(400).send({
            error: 'Missing required fields: title, body',
          });
        }

        const subscription = await service.getById(subscription_id);

        if (!subscription) {
          return reply.status(404).send({ error: 'Subscription not found' });
        }

        const result = await sendPushNotification(subscription, payload);

        if (!result.success) {
          if (result.statusCode === 410) {
            await service.delete(subscription_id);
            return reply.status(410).send({
              error: 'Subscription expired and was removed',
            });
          }

          return reply.status(500).send({
            error: 'Failed to send push notification',
            details: result.error,
          });
        }

        return reply.send({ message: 'Push notification sent' });
      }
    );

    done();
  };
};
