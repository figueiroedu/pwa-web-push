import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ObjectId } from 'mongodb';
import { SubscriptionService } from '../../../src/services/subscription.service';
import { SubscriptionRepository } from '../../../src/repositories/subscription.repository';
import { validSubscriptionData, createMockSubscriptionWithId } from '../../helpers/test-fixtures';

vi.mock('../../../src/repositories/subscription.repository');

const mockRepository = {
  findAll: vi.fn(),
  findById: vi.fn(),
  findByEndpoint: vi.fn(),
  create: vi.fn(),
  delete: vi.fn(),
};

describe('SubscriptionService', () => {
  let service: SubscriptionService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new SubscriptionService(mockRepository as unknown as SubscriptionRepository);
  });

  describe('getAll', () => {
    it('should return all subscriptions from repository', async () => {
      const subscriptions = [createMockSubscriptionWithId(), createMockSubscriptionWithId()];
      mockRepository.findAll.mockResolvedValue(subscriptions);

      const result = await service.getAll();

      expect(mockRepository.findAll).toHaveBeenCalled();
      expect(result).toEqual(subscriptions);
    });

    it('should return empty array when no subscriptions exist', async () => {
      mockRepository.findAll.mockResolvedValue([]);

      const result = await service.getAll();

      expect(result).toEqual([]);
    });
  });

  describe('getById', () => {
    it('should return subscription when exists', async () => {
      const subscription = createMockSubscriptionWithId();
      mockRepository.findById.mockResolvedValue(subscription);

      const result = await service.getById('some-id');

      expect(mockRepository.findById).toHaveBeenCalledWith('some-id');
      expect(result).toEqual(subscription);
    });

    it('should return null when subscription does not exist', async () => {
      mockRepository.findById.mockResolvedValue(null);

      const result = await service.getById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create new subscription when endpoint does not exist', async () => {
      const newId = new ObjectId().toString();
      mockRepository.findByEndpoint.mockResolvedValue(null);
      mockRepository.create.mockResolvedValue(newId);

      const result = await service.create({
        endpoint: validSubscriptionData.endpoint,
        keys: validSubscriptionData.keys,
      });

      expect(mockRepository.findByEndpoint).toHaveBeenCalledWith(validSubscriptionData.endpoint);
      expect(mockRepository.create).toHaveBeenCalled();
      expect(result).toBe(newId);
    });

    it('should throw error when endpoint already exists', async () => {
      const existingSubscription = createMockSubscriptionWithId();
      mockRepository.findByEndpoint.mockResolvedValue(existingSubscription);

      await expect(
        service.create({
          endpoint: existingSubscription.endpoint,
          keys: validSubscriptionData.keys,
        })
      ).rejects.toThrow('Subscription already exists');

      expect(mockRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should delete subscription and return true', async () => {
      mockRepository.delete.mockResolvedValue(true);

      const result = await service.delete('some-id');

      expect(mockRepository.delete).toHaveBeenCalledWith('some-id');
      expect(result).toBe(true);
    });

    it('should return false when subscription does not exist', async () => {
      mockRepository.delete.mockResolvedValue(false);

      const result = await service.delete('non-existent');

      expect(result).toBe(false);
    });
  });
});

