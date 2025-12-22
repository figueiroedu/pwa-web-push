import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Logger', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('should export pino logger instance with basic methods', async () => {
    const { logger } = await import('../../../src/config/logger');

    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.debug).toBe('function');
    expect(typeof logger.warn).toBe('function');
  });

  it('should export fastifyLogger as configuration object', async () => {
    const { fastifyLogger } = await import('../../../src/config/logger');

    expect(fastifyLogger).toBeDefined();
    expect(typeof fastifyLogger).toBe('object');
  });
});
