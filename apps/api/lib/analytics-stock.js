import { dataCte, scope, metadata, paginated, likeTerm } from './analytics-query.js';
export async function stock(db, input) {
  return await db.transaction(async () => {
    const scoped = scope(input);
    const where = `${scoped.sql}${input.status ? ' AND status = ?' : ''}`;
    const args = [...scoped.args, ...(input.status ? [input.status] : [])];
    const distribution = await db
      .prepare(
        `${dataCte} SELECT status, COUNT(*) AS count FROM vehicle_data data
      WHERE ${where} GROUP BY status ORDER BY status LIMIT 4`,
      )
      .all(...args);
    const age = await db
      .prepare(
        `${dataCte} SELECT COUNT(*) AS known,
      SUM(CASE WHEN created_at <= ?::timestamptz - INTERVAL '30 days' THEN 1 ELSE 0 END) AS aged30,
      SUM(CASE WHEN created_at <= ?::timestamptz - INTERVAL '45 days' THEN 1 ELSE 0 END) AS aged45
      FROM vehicle_data data WHERE ${scoped.sql} AND status = 'available' AND created_at IS NOT NULL`,
      )
      .get(input.asOf, input.asOf, ...scoped.args);
    const modelArgs = [...args];
    let modelWhere = input.model_id ? 'WHERE m.id = ?' : 'WHERE 1=1';
    if (input.model_id) modelArgs.push(input.model_id);
    if (input.q) {
      modelWhere += " AND (m.brand || ' ' || m.name || ' ' || m.variant) ILIKE ? ESCAPE '\\'";
      modelArgs.push(likeTerm(input.q));
    }
    const models = await paginated(
      db,
      `${dataCte}, scoped_stock AS (
      SELECT * FROM vehicle_data data WHERE ${where}
    ) SELECT m.*, m.brand || ' ' || m.name || ' · ' || m.variant AS label,
      COUNT(v.id) AS units, SUM(CASE WHEN v.status = 'available' THEN 1 ELSE 0 END) AS available,
      SUM(CASE WHEN v.status = 'reserved' THEN 1 ELSE 0 END) AS reserved,
      STRING_AGG(DISTINCT v.branch, ',') AS branches
      FROM vehicle_models m LEFT JOIN scoped_stock v ON v.model_id = m.id
      ${modelWhere} GROUP BY m.id ORDER BY units DESC,m.id`,
      modelArgs,
      input,
    );
    return {
      ...metadata(input),
      distribution,
      age: { ...age, aged30: age.aged30 ?? 0, aged45: age.aged45 ?? 0 },
      models,
      note: 'Stock is current. Ages measure record creation, not physical days-on-lot. Model counts share branch/status scope.',
    };
  })();
}
