import { mkdir, writeFile, unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { insert, row, requireCondition, timestamp } from './errors.js';
const signatures = [
  {
    mime: 'application/pdf',
    extensions: ['pdf'],
    matches: (bytes) => bytes.subarray(0, 5).equals(Buffer.from('%PDF-')),
  },
  {
    mime: 'image/jpeg',
    extensions: ['jpg', 'jpeg'],
    matches: (bytes) => bytes.subarray(0, 3).equals(Buffer.from([255, 216, 255])),
  },
  {
    mime: 'image/png',
    extensions: ['png'],
    matches: (bytes) => bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
  },
];
export async function uploadDocument(db, root, orderId, type, file, employee) {
  requireCondition(file, 'Choose a PDF, JPEG or PNG file', 400);
  requireCondition(
    file.size > 0 && file.size <= 4194304,
    'Files must be between 1 byte and 4 MB',
    400,
  );
  requireCondition(
    !/[\\/]/.test(file.originalname) &&
      !Array.from(file.originalname).some((character) => character.charCodeAt(0) < 32),
    'Invalid filename',
    400,
  );
  const extension = file.originalname.split('.').at(-1)?.toLowerCase();
  const signature = signatures.find((item) => item.matches(file.buffer));
  requireCondition(
    signature && signature.mime === file.mimetype && signature.extensions.includes(extension),
    'File content must match its PDF, JPEG or PNG type',
    400,
  );
  requireCondition(
    (await row(db, 'orders', orderId)).status === 'open',
    'Documents are frozen after delivery',
  );
  await mkdir(root, { recursive: true });
  const storageName = `${randomUUID()}.${extension}`;
  const path = resolve(root, storageName);
  await writeFile(path, file.buffer, { flag: 'wx', mode: 0o600 });
  try {
    return await db
      .transaction(async () => {
        requireCondition(
          (await row(db, 'orders', orderId)).status === 'open',
          'Documents are frozen after delivery',
        );
        // A replacement invalidates earlier reviews of the same category.
        await db
          .prepare(
            "UPDATE documents SET status = 'rejected', note = 'Superseded by a newer upload' WHERE order_id = ? AND type = ?",
          )
          .run(orderId, type);
        return await insert(db, 'documents', {
          order_id: orderId,
          type,
          filename: file.originalname.replace(/[^a-zA-Z0-9._ -]/g, '_').slice(0, 120),
          storage_name: storageName,
          mime: signature.mime,
          size: file.size,
          uploaded_by: employee.id,
        });
      })
      .immediate();
  } catch (error) {
    await unlink(path);
    throw error;
  }
}
export async function reviewDocument(db, id, input, employee) {
  return await db
    .transaction(async () => {
      const document = await row(db, 'documents', id);
      requireCondition(
        (await row(db, 'orders', document.order_id)).status === 'open',
        'Documents are frozen after delivery',
      );
      const latest = await db
        .prepare(
          'SELECT id FROM documents WHERE order_id = ? AND type = ? ORDER BY id DESC LIMIT 1',
        )
        .get(document.order_id, document.type);
      requireCondition(latest.id === id, 'Review the latest upload for this document category');
      await db
        .prepare(
          `UPDATE documents SET status = ?, note = ?, reviewed_by = ?, reviewed_at = ${timestamp} WHERE id = ?`,
        )
        .run(input.status, input.note, employee.id, id);
      return await row(db, 'documents', id);
    })
    .immediate();
}
export async function orderCollection(db, table, orderId, input) {
  await row(db, 'orders', orderId);
  const { page = 1, limit = 20, status, q = '', type, sort = 'newest' } = input;
  const values = [orderId];
  const conditions = ['order_id = ?'];
  if (status) {
    conditions.push('status = ?');
    values.push(status);
  }
  if (type && table === 'documents') {
    conditions.push('type = ?');
    values.push(type);
  }
  if (q) {
    conditions.push(
      table === 'documents' ? 'filename ILIKE ?' : '(note ILIKE ? OR CAST(id AS TEXT) ILIKE ?)',
    );
    values.push(`%${q}%`);
    if (table !== 'documents') values.push(`%${q}%`);
  }
  const where = conditions.join(' AND ');
  const total = (
    await db.prepare(`SELECT COUNT(*) AS count FROM ${table} WHERE ${where}`).get(...values)
  ).count;
  const fields =
    table === 'documents'
      ? 'id,order_id,type,filename,mime,size,status,note,created_at,reviewed_at'
      : '*';
  const items = await db
    .prepare(
      `SELECT ${fields} FROM ${table} WHERE ${where} ORDER BY id ${sort === 'oldest' ? 'ASC' : 'DESC'} LIMIT ? OFFSET ?`,
    )
    .all(...values, limit, (page - 1) * limit);
  return { items, total, page, pages: Math.max(1, Math.ceil(total / limit)), limit };
}
