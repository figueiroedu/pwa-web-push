import { FastifyInstance, FastifyPluginCallback } from 'fastify';
import { SubscriptionService } from '../services/subscription.service';
import { CreateSubscriptionBody } from '../types/subscription';
import { SubscriptionExistsError } from '../errors/subscription-exists.error';

export const subscriptionRoutes = (service: SubscriptionService): FastifyPluginCallback => {
  return (app: FastifyInstance, _opts, done) => {
    app.post<{ Body: CreateSubscriptionBody }>('/subscriptions', async (request, reply) => {
      const { endpoint, keys } = request.body;

      if (!endpoint || !keys.p256dh || !keys.auth) {
        return reply.status(400).send({
          error: 'Missing required fields: endpoint, keys.p256dh, keys.auth',
        });
      }

      try {
        const id = await service.create({ endpoint, keys });
        return await reply.status(201).send({
          message: 'Subscription created',
          id,
        });
      } catch (error) {
        if (error instanceof SubscriptionExistsError) {
          return reply.status(409).send({
            error: 'Subscription already exists',
          });
        }
        throw error;
      }
    });

    app.get('/subscriptions', async (_request, reply) => {
      const subscriptions = await service.getAll();
      return reply.send(subscriptions);
    });

    app.get<{ Params: { id: string } }>('/subscriptions/:id', async (request, reply) => {
      const { id } = request.params;

      const subscription = await service.getById(id);

      if (!subscription) {
        return reply.status(404).send({ error: 'Subscription not found' });
      }

      return reply.send(subscription);
    });

    app.delete<{ Params: { id: string } }>('/subscriptions/:id', async (request, reply) => {
      const { id } = request.params;

      const deleted = await service.delete(id);

      if (!deleted) {
        return reply.status(404).send({ error: 'Subscription not found' });
      }

      return reply.send({ message: 'Subscription deleted' });
    });

    done();
  };
};
