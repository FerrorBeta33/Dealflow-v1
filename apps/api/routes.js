import { Router } from 'express';
import multer from 'multer';
import { resolve } from 'node:path';
import { authenticate, authorize, login } from './lib/auth.js';
import { schemas, parse, idOf, orderIdOf, listQuery } from './lib/validation.js';
import { row } from './lib/errors.js';
import { dashboard, listRecords, recordDetail, saveCatalog } from './lib/records.js';
import {
  createBooking,
  cancelBooking,
  convertBooking,
  requestPayment,
  transitionPayment,
  deliverOrder,
} from './lib/workflow.js';
import { uploadDocument, reviewDocument, orderCollection } from './lib/documents.js';
import { invoiceHtml } from './lib/invoice.js';
import { analyticsRoutes } from './analytics-routes.js';
export function apiRoutes(db, uploadRoot) {
  const router = Router();
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 4194304, files: 1, fields: 1, fieldSize: 100 },
  });
  router.post('/auth/login', async (request, response) =>
    response.json(await login(db, parse(schemas.login, request.body))),
  );
  router.use(authenticate(db));
  router.use('/analytics', analyticsRoutes(db));
  router.get('/auth/me', (request, response) => response.json(request.employee));
  router.post('/auth/logout', async (request, response) => {
    await db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(request.tokenHash);
    response.json({ message: 'Signed out' });
  });
  router.get('/dashboard', async (request, response) => response.json(await dashboard(db)));
  router.get('/branches', async (request, response) =>
    response.json({
      items: await db.prepare('SELECT * FROM branches ORDER BY name LIMIT 100').all(),
    }),
  );
  for (const entity of ['models', 'vehicles', 'customers', 'bookings', 'orders']) {
    router.get(`/${entity}`, async (request, response) =>
      response.json(await listRecords(db, entity, request.query)),
    );
    router.get(`/${entity}/:id`, async (request, response) =>
      response.json(await recordDetail(db, entity, idOf(request))),
    );
  }
  for (const entity of ['models', 'vehicles', 'customers']) {
    const action = entity === 'customers' ? 'sales' : 'catalog';
    router.post(`/${entity}`, authorize(action), async (request, response) =>
      response
        .status(201)
        .json(await saveCatalog(db, entity, null, parse(schemas[entity], request.body))),
    );
    router.patch(`/${entity}/:id`, authorize(action), async (request, response) =>
      response.json(
        await saveCatalog(db, entity, idOf(request), parse(schemas[entity], request.body)),
      ),
    );
  }
  router.post('/bookings', authorize('sales'), async (request, response) =>
    response
      .status(201)
      .json(await createBooking(db, parse(schemas.bookings, request.body), request.employee)),
  );
  router.post('/bookings/:id/cancel', authorize('sales'), async (request, response) =>
    response.json(await cancelBooking(db, idOf(request))),
  );
  router.post('/bookings/:id/convert', authorize('sales'), async (request, response) =>
    response
      .status(201)
      .json(await convertBooking(db, idOf(request), parse(schemas.conversion, request.body))),
  );
  router.get('/orders/:id/invoice', async (request, response) =>
    response.type('html').send(invoiceHtml(await recordDetail(db, 'orders', idOf(request)))),
  );
  router.post('/orders/:id/deliver', authorize('approve'), async (request, response) =>
    response.json(await deliverOrder(db, idOf(request), request.employee)),
  );
  router.get('/orders/:orderId/payments', async (request, response) =>
    response.json(
      await orderCollection(
        db,
        'payment_requests',
        orderIdOf(request),
        listQuery.parse(request.query),
      ),
    ),
  );
  router.post('/orders/:orderId/payments', authorize('sales'), async (request, response) =>
    response
      .status(201)
      .json(
        await requestPayment(
          db,
          orderIdOf(request),
          parse(schemas.payment, request.body),
          request.employee,
        ),
      ),
  );
  router.post('/payments/:id/settle', authorize('approve'), async (request, response) =>
    response.json(await transitionPayment(db, idOf(request), 'paid', request.employee)),
  );
  router.post('/payments/:id/cancel', authorize('sales'), async (request, response) =>
    response.json(await transitionPayment(db, idOf(request), 'cancelled', request.employee)),
  );
  router.get('/orders/:orderId/documents', async (request, response) =>
    response.json(
      await orderCollection(db, 'documents', orderIdOf(request), listQuery.parse(request.query)),
    ),
  );
  router.post(
    '/orders/:orderId/documents',
    authorize('sales'),
    upload.single('file'),
    async (request, response) => {
      const input = parse(schemas.upload, request.body);
      response
        .status(201)
        .json(
          await uploadDocument(
            db,
            uploadRoot,
            orderIdOf(request),
            input.type,
            request.file,
            request.employee,
          ),
        );
    },
  );
  router.patch('/documents/:id/review', authorize('approve'), async (request, response) =>
    response.json(
      await reviewDocument(
        db,
        idOf(request),
        parse(schemas.review, request.body),
        request.employee,
      ),
    ),
  );
  router.get('/documents/:id/content', async (request, response, next) => {
    const document = await row(db, 'documents', idOf(request));
    response
      .type(document.mime)
      .set('Content-Disposition', `inline; filename="${document.filename.replace(/"/g, '_')}"`);
    response.sendFile(
      resolve(uploadRoot, document.storage_name),
      { dotfiles: 'allow' },
      (error) => {
        if (error) next(error);
      },
    );
  });
  return router;
}
