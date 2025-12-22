import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Logger', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('deve exportar instância de pino logger com métodos básicos', async () => {
    const { logger } = await import('../../../src/config/logger');

    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.debug).toBe('function');
    expect(typeof logger.warn).toBe('function');
  });

  it('deve exportar fastifyLogger como objeto de configuração', async () => {
    const { fastifyLogger } = await import('../../../src/config/logger');

    expect(fastifyLogger).toBeDefined();
    expect(typeof fastifyLogger).toBe('object');
  });
});

