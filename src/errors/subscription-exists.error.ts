export class SubscriptionExistsError extends Error {
  constructor() {
    super('Subscription already exists');
    this.name = 'SubscriptionExistsError';
  }
}

