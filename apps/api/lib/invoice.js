import { money, date } from '../../../shared/domain.js';
const escape = (text) =>
  String(text).replace(
    /[&<>"']/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character],
  );
export function invoiceHtml(order) {
  const line = (label, value) => `<tr><th>${escape(label)}</th><td>${escape(value)}</td></tr>`;
  return `<!doctype html><html lang="en"><head>
    <meta charset="utf-8"><meta name="viewport" content="width=device-width">
    <title>${escape(order.invoice_reference)} · DealerFlow</title>
    <style>
      body{font:16px/1.6 sans-serif;color:#172033;margin:48px auto;padding:24px;max-width:800px}
      h1{font-size:30px}
      table{width:100%;border-collapse:collapse;margin:24px 0}
      th,td{text-align:left;padding:12px;border-bottom:1px solid #ddd}
      td{text-align:right}small{color:#475569}
      @media print{body{margin:0}.no-print{display:none}}
    </style></head><body>
    <p>DealerFlow · ${escape(order.branch)}</p><h1>Sales invoice</h1>
    <p>${escape(order.invoice_reference)}<br>${escape(date(order.created_at))}</p>
    <h2>Bill to</h2><p>${escape(order.customer)}<br>${escape(order.phone)}<br>${escape(order.address || 'Address not provided')}</p>
    <h2>${escape(order.label)}</h2><p>VIN: ${escape(order.vin)}</p><table>
    ${line('Base price', money(order.base_price))}
    ${line('Demo extras', money(order.extras))}
    ${line('Demo tax', money(order.tax))}
    ${line('Invoice total (INR)', money(order.total))}</table>
    <p>${escape(order.branch_address)}</p><small>Fictional demo invoice. Not a regulatory tax invoice.</small>
    <p class="no-print">Use your browser’s Print command (Ctrl/Cmd + P) and choose Save as PDF.</p></body></html>`;
}
