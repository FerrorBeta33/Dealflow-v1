import express from 'express';
import helmet from 'helmet';
import { ZodError } from 'zod';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { openDatabase, dataRoot } from './db.js';
import { apiRoutes } from './routes.js';
export function createApp(db, uploadRoot = resolve(dataRoot, 'uploads')) {
  const app = express();
  app.disable('x-powered-by');
  app.use(
    helmet({
      frameguard: false,
      contentSecurityPolicy: {
        directives: { frameAncestors: ["'self'", 'https://revolte.ai', 'https://*.revolte.ai'] },
      },
    }),
  );
  app.get('/health', async (_request, response) => {
    response.set('Cache-Control', 'no-store');
    try {
      await db.query('SELECT 1');
      response.json({ status: 'ok' });
    } catch (error) {
      console.error('PostgreSQL readiness failed:', error.code);
      response.status(503).json({ status: 'unavailable' });
    }
  });
  app.use(express.json({ limit: '24kb' }));
  app.use('/api', (request, response, next) => {
    response.set('Cache-Control', 'no-store');
    next();
  });
  app.use('/api', apiRoutes(db, uploadRoot));
  app.use((request, response) => response.status(404).json({ error: 'Route not found' }));
  app.use((error, request, response, next) => {
    if (response.headersSent) return next(error);
    if (error instanceof ZodError)
      return response.status(400).json({
        error: 'Please correct the highlighted fields',
        fields: error.flatten().fieldErrors,
      });
    if (error.code === 'LIMIT_FILE_SIZE')
      return response.status(413).json({ error: 'Maximum file size is 4 MB' });
    if (error.name === 'MulterError')
      return response.status(400).json({ error: 'Upload one file and one document category' });
    if (['23505', '23503', '23514', '23502'].includes(error.code))
      return response
        .status(409)
        .json({ error: 'This record conflicts with existing data or a business constraint' });
    if (['40001', '40P01', '55P03'].includes(error.code))
      return response.status(409).json({ error: 'Another change is in progress. Please retry.' });
    const status = error.status || (error.type === 'entity.parse.failed' ? 400 : 500);
    if (status >= 500) console.error(error);
    response.status(status).json({
      error: status >= 500 ? 'Could not complete the request. Please retry.' : error.message,
    });
  });
  return app;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const port = Number(process.env.API_PORT || 4174);
  const db = await openDatabase();
  const server = createApp(db).listen(port, '0.0.0.0', () =>
    console.info(`DealerFlow API listening on ${port}`),
  );
  for (const signal of ['SIGTERM', 'SIGINT'])
    process.once(signal, () => {
      server.close(async () => {
        await db.close();
      });
      server.closeIdleConnections();
    });
}
