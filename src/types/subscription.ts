import { ObjectId } from 'mongodb';

export interface SubscriptionKeys {
  p256dh: string;
  auth: string;
}

export interface Subscription {
  _id?: ObjectId;
  endpoint: string;
  keys: SubscriptionKeys;
  createdAt: Date;
}

export interface CreateSubscriptionBody {
  endpoint: string;
  keys: SubscriptionKeys;
}
