import { ObjectId } from 'mongodb';
import { getDatabase } from '../config/database';
import { Subscription, CreateSubscriptionBody } from '../types/subscription';

const COLLECTION_NAME = 'subscriptions';

export class SubscriptionRepository {
  private get collection() {
    return getDatabase().collection<Subscription>(COLLECTION_NAME);
  }

  async findAll(): Promise<Subscription[]> {
    return this.collection.find({}).toArray();
  }

  async findById(id: string): Promise<Subscription | null> {
    if (!ObjectId.isValid(id)) {
      return null;
    }
    return this.collection.findOne({ _id: new ObjectId(id) });
  }

  async findByEndpoint(endpoint: string): Promise<Subscription | null> {
    return this.collection.findOne({ endpoint });
  }

  async create(data: CreateSubscriptionBody): Promise<string> {
    const subscription: Subscription = {
      ...data,
      createdAt: new Date(),
    };
    const result = await this.collection.insertOne(subscription);
    return result.insertedId.toString();
  }

  async delete(id: string): Promise<boolean> {
    if (!ObjectId.isValid(id)) {
      return false;
    }
    const result = await this.collection.deleteOne({ _id: new ObjectId(id) });
    return result.deletedCount > 0;
  }
}

