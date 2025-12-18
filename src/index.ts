import 'dotenv/config';
import Fastify from 'fastify';
import { fastifyLogger } from './config/logger';

const PORT = Number(process.env.PORT);
const HOST = process.env.HOST;

const app = Fastify({ logger: fastifyLogger });

app.get('/health', () => {
  return {
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  };
});

app
  .listen({ port: PORT, host: HOST })
  .then(() => {
    app.log.info(`Server listening on http://${HOST ?? 'localhost'}:${String(PORT)}`);
  })
  .catch((error: unknown) => {
    app.log.error({ error }, 'Failed to start server');
    process.exit(1);
  });