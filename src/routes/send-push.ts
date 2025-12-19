import { FastifyInstance } from 'fastify';
import { ObjectId } from 'mongodb';
import { getDatabase } from '../config/database';
import { Subscription } from '../types/subscription';
import { sendPushNotification } from '../services/push-notification';

const COLLECTION_NAME = 'subscriptions';

interface SendPushBody {
  title: string;
  body: string;
  icon?: string;
  url?: string;
}

export const sendPushRoutes = (app: FastifyInstance) => {
  app.post<{ Params: { subscription_id: string }; Body: SendPushBody }>(
    '/send-push/:subscription_id',
    async (request, reply) => {
      const { subscription_id } = request.params;
      const { title, body, icon, url } = request.body;

      if (!title || !body) {
        return reply.status(400).send({
          error: 'Missing required fields: title, body',
        });
      }

      if (!ObjectId.isValid(subscription_id)) {
        return reply.status(400).send({ error: 'Invalid subscription ID' });
      }

      const db = getDatabase();
      const collection = db.collection<Subscription>(COLLECTION_NAME);

      const subscription = await collection.findOne({ _id: new ObjectId(subscription_id) });

      if (!subscription) {
        return reply.status(404).send({ error: 'Subscription not found' });
      }

      const result = await sendPushNotification(subscription, {
        title,
        body,
        icon,
        data: { url },
      });

      if (!result.success) {
        if (result.statusCode === 410) {
          await collection.deleteOne({ _id: new ObjectId(subscription_id) });
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
};
