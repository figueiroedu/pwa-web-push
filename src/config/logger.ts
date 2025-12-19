import pino, { LoggerOptions } from 'pino';

const nodeEnv = process.env.NODE_ENV;
const isProduction = nodeEnv === 'production';

const loggerOptions: LoggerOptions = isProduction
  ? { level: process.env.LOG_LEVEL ?? 'info' }
  : {
      level: process.env.LOG_LEVEL ?? 'debug',
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname',
        },
      },
    };

export const logger = pino(loggerOptions);
export const fastifyLogger = loggerOptions;
