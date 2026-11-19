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
  router.post('/auth/login', (request, response) =>
    response.json(login(db, parse(schemas.login, request.body))),
  );
  router.use(authenticate(db));
  router.use('/analytics', analyticsRoutes(db));
  router.get('/auth/me', (request, response) => response.json(request.employee));
  router.post('/auth/logout', (request, response) => {
    db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(request.tokenHash);
    response.json({ message: 'Signed out' });
  });
  router.get('/dashboard', (request, response) => response.json(dashboard(db)));
  router.get('/branches', (request, response) =>
    response.json({ items: db.prepare('SELECT * FROM branches ORDER BY name LIMIT 100').all() }),
  );
  for (const entity of ['models', 'vehicles', 'customers', 'bookings', 'orders']) {
    router.get(`/${entity}`, (request, response) =>
      response.json(listRecords(db, entity, request.query)),
    );
    router.get(`/${entity}/:id`, (request, response) =>
      response.json(recordDetail(db, entity, idOf(request))),
    );
  }
  for (const entity of ['models', 'vehicles', 'customers']) {
    const action = entity === 'customers' ? 'sales' : 'catalog';
    router.post(`/${entity}`, authorize(action), (request, response) =>
      response
        .status(201)
        .json(saveCatalog(db, entity, null, parse(schemas[entity], request.body))),
    );
    router.patch(`/${entity}/:id`, authorize(action), (request, response) =>
      response.json(saveCatalog(db, entity, idOf(request), parse(schemas[entity], request.body))),
    );
  }
  router.post('/bookings', authorize('sales'), (request, response) =>
    response
      .status(201)
      .json(createBooking(db, parse(schemas.bookings, request.body), request.employee)),
  );
  router.post('/bookings/:id/cancel', authorize('sales'), (request, response) =>
    response.json(cancelBooking(db, idOf(request))),
  );
  router.post('/bookings/:id/convert', authorize('sales'), (request, response) =>
    response
      .status(201)
      .json(convertBooking(db, idOf(request), parse(schemas.conversion, request.body))),
  );
  router.get('/orders/:id/invoice', (request, response) =>
    response.type('html').send(invoiceHtml(recordDetail(db, 'orders', idOf(request)))),
  );
  router.post('/orders/:id/deliver', authorize('approve'), (request, response) =>
    response.json(deliverOrder(db, idOf(request), request.employee)),
  );
  router.get('/orders/:orderId/payments', (request, response) =>
    response.json(
      orderCollection(db, 'payment_requests', orderIdOf(request), listQuery.parse(request.query)),
    ),
  );
  router.post('/orders/:orderId/payments', authorize('sales'), (request, response) =>
    response
      .status(201)
      .json(
        requestPayment(
          db,
          orderIdOf(request),
          parse(schemas.payment, request.body),
          request.employee,
        ),
      ),
  );
  router.post('/payments/:id/settle', authorize('approve'), (request, response) =>
    response.json(transitionPayment(db, idOf(request), 'paid', request.employee)),
  );
  router.post('/payments/:id/cancel', authorize('sales'), (request, response) =>
    response.json(transitionPayment(db, idOf(request), 'cancelled', request.employee)),
  );
  router.get('/orders/:orderId/documents', (request, response) =>
    response.json(
      orderCollection(db, 'documents', orderIdOf(request), listQuery.parse(request.query)),
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
  router.patch('/documents/:id/review', authorize('approve'), (request, response) =>
    response.json(
      reviewDocument(db, idOf(request), parse(schemas.review, request.body), request.employee),
    ),
  );
  router.get('/documents/:id/content', (request, response, next) => {
    const document = row(db, 'documents', idOf(request));
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
