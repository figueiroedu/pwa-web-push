import { SubscriptionRepository } from '../repositories/subscription.repository';
import { Subscription, CreateSubscriptionBody } from '../types/subscription';
import { SubscriptionExistsError } from '../errors/subscription-exists.error';

export class SubscriptionService {
  constructor(private repository: SubscriptionRepository) {}

  async getAll(): Promise<Subscription[]> {
    return this.repository.findAll();
  }

  async getById(id: string): Promise<Subscription | null> {
    return this.repository.findById(id);
  }

  async create(data: CreateSubscriptionBody): Promise<string> {
    const existing = await this.repository.findByEndpoint(data.endpoint);
    if (existing) {
      throw new SubscriptionExistsError();
    }
    return this.repository.create(data);
  }

  async delete(id: string): Promise<boolean> {
    return this.repository.delete(id);
  }
}

