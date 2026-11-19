import { Router } from 'express';
import { parseAnalytics } from './lib/analytics-query.js';
import { summary } from './lib/analytics-metrics.js';
import { metricRecords, exceptions, journey, vinJourney, search } from './lib/analytics-records.js';
import { stock } from './lib/analytics-stock.js';
import { trends } from './lib/analytics-trends.js';
import { idOf } from './lib/validation.js';

export function analyticsRoutes(db) {
  const router = Router();
  for (const [path, handler] of Object.entries({
    summary,
    stock,
    exceptions,
    trends,
    records: metricRecords,
    search,
  })) {
    router.get(`/${path}`, (request, response) => {
      const input = parseAnalytics(request.query);
      response.json(db.transaction(() => handler(db, input))());
    });
  }
  router.get('/vins/:id', (request, response) => {
    const input = parseAnalytics(request.query);
    response.json(db.transaction(() => vinJourney(db, idOf(request), input))());
  });
  router.get('/journeys/:id', (request, response) => {
    const input = parseAnalytics(request.query);
    response.json(db.transaction(() => journey(db, idOf(request), input))());
  });
  return router;
}
