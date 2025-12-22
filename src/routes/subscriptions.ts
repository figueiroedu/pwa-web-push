import { FastifyInstance } from 'fastify';
import { ObjectId } from 'mongodb';
import { getDatabase } from '../config/database';
import { Subscription, CreateSubscriptionBody } from '../types/subscription';

const COLLECTION_NAME = 'subscriptions';

export const subscriptionRoutes = (app: FastifyInstance) => {
  app.post<{ Body: CreateSubscriptionBody }>('/subscriptions', async (request, reply) => {
    const { endpoint, keys } = request.body;

    if (!endpoint || !keys.p256dh || !keys.auth) {
      return reply.status(400).send({
        error: 'Missing required fields: endpoint, keys.p256dh, keys.auth',
      });
    }

    const db = getDatabase();
    const collection = db.collection<Subscription>(COLLECTION_NAME);

    const existing = await collection.findOne({ endpoint });
    if (existing) {
      return reply.status(200).send({
        message: 'Subscription already exists',
        id: existing._id.toString(),
      });
    }

    const subscription: Subscription = {
      endpoint,
      keys,
      createdAt: new Date(),
    };

    const result = await collection.insertOne(subscription);

    return reply.status(201).send({
      message: 'Subscription created',
      id: result.insertedId.toString(),
    });
  });

  app.get('/subscriptions', async (_request, reply) => {
    const db = getDatabase();
    const collection = db.collection<Subscription>(COLLECTION_NAME);

    const subscriptions = await collection.find({}).toArray();

    return reply.send(subscriptions);
  });

  app.get<{ Params: { id: string } }>('/subscriptions/:id', async (request, reply) => {
    const { id } = request.params;

    if (!ObjectId.isValid(id)) {
      return reply.status(400).send({ error: 'Invalid subscription ID' });
    }

    const db = getDatabase();
    const collection = db.collection<Subscription>(COLLECTION_NAME);

    const subscription = await collection.findOne({ _id: new ObjectId(id) });

    if (!subscription) {
      return reply.status(404).send({ error: 'Subscription not found' });
    }

    return reply.send(subscription);
  });

  app.delete<{ Params: { id: string } }>('/subscriptions/:id', async (request, reply) => {
    const { id } = request.params;

    if (!ObjectId.isValid(id)) {
      return reply.status(400).send({ error: 'Invalid subscription ID' });
    }

    const db = getDatabase();
    const collection = db.collection<Subscription>(COLLECTION_NAME);

    const result = await collection.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return reply.status(404).send({ error: 'Subscription not found' });
    }

    return reply.send({ message: 'Subscription deleted' });
  });
};
