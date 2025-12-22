import { ObjectId } from 'mongodb';
import { Subscription } from '../../src/types/subscription';

export const validSubscriptionData = {
  endpoint: 'https://push.example.com/test-subscription-abc123',
  keys: {
    p256dh: 'BLc4xRzKlKORKWlWtest1234567890',
    auth: 'Uo7a6Ctest123',
  },
};

export const validPushPayload = {
  title: 'Test Title',
  body: 'Test Body',
  icon: '/icon.png',
  data: {
    url: '/test',
  },
};

export const createMockSubscription = (overrides: Partial<Subscription> = {}): Subscription => ({
  endpoint: validSubscriptionData.endpoint,
  keys: validSubscriptionData.keys,
  createdAt: new Date(),
  ...overrides,
});

export const createMockSubscriptionWithId = (overrides: Partial<Subscription> = {}): Subscription => ({
  _id: new ObjectId(),
  endpoint: validSubscriptionData.endpoint,
  keys: validSubscriptionData.keys,
  createdAt: new Date(),
  ...overrides,
});

export const generateUniqueEndpoint = (suffix: string) =>
  `https://push.example.com/${suffix}-${Date.now()}`;

