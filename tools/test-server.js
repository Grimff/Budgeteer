// Server tests (run by `npm test`): page caching and gzip, saving and conflicts, a budget file edited outside the app,
// and when loan/investment details refresh. Uses a fake Plaid and a temp data folder; your real data/ is never touched.
// TEST_MODE=stale checks that day-old loan/investment details refresh on an automatic sync.
'use strict';
const fs = require('fs'), path = require('path'), http = require('http'), os = require('os'), zlib = require('zlib');
const ROOT = require('path').join(__dirname, '..'), STALE = process.env.TEST_MODE === 'stale', DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'bt-'));
const old = new Date(Date.now() - 3 * 3600e3).toISOString();
const item = (id, detailAt) => ({ item_id: id, access_token: 'fake-' + id, institution: { id: 'i', name: 'Test Bank' }, cursor: null, lastSync: old, liab: 'ok', inv: 'ok', detailAt,
  accounts: [{ id: id + '-chk', name: 'Checking', type: 'depository', subtype: 'checking' }, { id: id + '-loan', name: 'Loan', type: 'loan', subtype: 'student' }, { id: id + '-inv', name: 'Brokerage', type: 'investment', subtype: 'brokerage' }] });
fs.writeFileSync(path.join(DIR, 'bank-connections.json'), JSON.stringify({ items: [item('a', new Date(Date.now() - (STALE ? 25 * 3600e3 : 0)).toISOString())] }));
const calls = {}, txs = Array.from({ length: 3000 }, (_, i) => ({ transaction_id: 't' + i, account_id: i % 50 ? 'a-chk' : 'a-loan', date: '2026-10-' + String(1 + i % 28).padStart(2, '0'), name: 'STORE ' + (i % 40), merchant_name: 'Store ' + (i % 40), amount: i % 50 ? 12.5 + i % 90 : -300, pending: false }));
http.createServer((q, r) => { let b = ''; q.on('data', d => b += d); q.on('end', () => {
  calls[q.url] = (calls[q.url] || 0) + 1; const j = JSON.parse(b || '{}'), it = j.access_token && j.access_token.slice(5), send = o => { r.writeHead(200, { 'content-type': 'application/json' }); setTimeout(() => r.end(JSON.stringify(o)), 150); };
  if (q.url === '/accounts/get') return send({ accounts: [{ account_id: it + '-chk', name: 'Checking', type: 'depository', subtype: 'checking', balances: { current: 1000 } }, { account_id: it + '-loan', name: 'Loan', type: 'loan', subtype: 'student', balances: { current: 9000 } }, { account_id: it + '-inv', name: 'Brokerage', type: 'investment', subtype: 'brokerage', balances: { current: 5000 } }] });
  if (q.url === '/transactions/sync') return send({ added: j.cursor ? [] : txs, modified: [], removed: [], next_cursor: 'c1', has_more: false });
  if (q.url === '/liabilities/get') return send({ liabilities: { student: [{ account_id: it + '-loan', interest_rate_percentage: 5, minimum_payment_amount: 300 }] } });
  if (q.url === '/investments/holdings/get') return send({ accounts: [{ account_id: it + '-inv', type: 'investment' }], holdings: [], securities: [] });
  if (q.url === '/investments/transactions/get') return send({ investment_transactions: [], total_investment_transactions: 0 });
  r.writeHead(500); r.end('{}');
}); }).listen(18201);
Object.assign(process.env, { PORT: '18202', DATA_DIR: DIR, PLAID_CLIENT_ID: 'test', PLAID_SECRET: 'test', PLAID_ENV: 'sandbox', PLAID_BASE: 'http://127.0.0.1:18201', BANK_SYNC_HOURS: '24' });
require(path.join(ROOT, 'app', 'server.js'));
const req = (method, p, body, headers = {}) => new Promise((ok, no) => { const q = http.request({ host: '127.0.0.1', port: 18202, path: p, method, headers: { 'content-type': 'application/json', ...headers } }, r => { const c = []; r.on('data', d => c.push(d)); r.on('end', () => { let buf = Buffer.concat(c); if (r.headers['content-encoding'] === 'gzip') buf = zlib.gunzipSync(buf); ok({ code: r.statusCode, h: r.headers, raw: Buffer.concat(c).length, body: buf.toString() }); }); }); q.on('error', no); if (body) q.write(JSON.stringify(body)); q.end(); });
let fail = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fail++; };
const det = () => (calls['/liabilities/get'] || 0) + '/' + (calls['/investments/holdings/get'] || 0);
(async () => {
  await new Promise(r => setTimeout(r, 300));
  if (STALE) {
    await req('POST', '/api/bank/sync', { auto: true });
    ok(det() === '1/1', `automatic sync with day-old details refreshes them (${det()})`);
    const c0 = JSON.parse(fs.readFileSync(path.join(DIR, 'bank-connections.json'))).items[0];
    ok(Date.now() - Date.parse(c0.detailAt) < 60000, 'detail time saved on the connection');
    console.log(fail ? `${fail} FAILED` : 'ALL PASSED'); fs.rmSync(DIR, { recursive: true, force: true }); process.exit(fail ? 1 : 0);
  }
  // page: gzip + ETag + 304
  const a = await req('GET', '/', null, { 'accept-encoding': 'gzip' });
  ok(a.code === 200 && a.h['content-encoding'] === 'gzip' && a.h.etag, `page gzipped ${Math.round(a.raw / 1024)} KB of ${Math.round(a.body.length / 1024)} KB, etag ${a.h.etag}`);
  const b = await req('GET', '/', null, { 'if-none-match': a.h.etag });
  ok(b.code === 304 && b.raw === 0, 'repeat visit gets 304 with no body');
  const plain = await req('GET', '/');
  ok(plain.code === 200 && !plain.h['content-encoding'] && plain.body === a.body, 'browser without gzip gets the plain page');
  // budget save / rev / conflict / outside edit
  const d0 = await req('GET', '/api/data'); ok(d0.code === 404, 'no budget yet → 404');
  const p1 = await req('PUT', '/api/data', { data: { plans: {}, loans: [], n: 1 } }); const r1 = JSON.parse(p1.body).rev;
  ok(p1.code === 200 && JSON.parse((await req('GET', '/api/rev')).body).rev === r1, 'rev after save matches');
  const c = await req('PUT', '/api/data', { baseRev: r1 - 5, data: { plans: {}, loans: [] } }); ok(c.code === 409, 'stale save → 409');
  const f = path.join(DIR, 'budgeteer-data.json'), j = JSON.parse(fs.readFileSync(f)); j.rev = r1 + 1000; j.data.n = 2; fs.writeFileSync(f, JSON.stringify(j));
  ok(JSON.parse((await req('GET', '/api/rev')).body).rev === r1 + 1000 && JSON.parse((await req('GET', '/api/data')).body).data.n === 2, 'a file edited outside the app is picked up (cache follows the file)');
  // sync: opening the app (auto) with details fresh → no detail calls; Sync now → detail calls
  let s = await req('POST', '/api/bank/sync', { auto: true });
  ok(s.code === 200 && det() === '0/0' && calls['/transactions/sync'] === 1, `automatic sync with fresh details skips loan/investment calls (${det()})`);
  s = await req('POST', '/api/bank/sync', {});
  ok(det() === '1/1', `Sync now refreshes loan details and investments (${det()})`);
  // auto + Sync now at the same time: the manual one must still be a full sync
  const before = det(); fs.writeFileSync(path.join(DIR, 'bank-settings.json'), '{"hours":1,"open":true}');
  const conn = JSON.parse(fs.readFileSync(path.join(DIR, 'bank-connections.json'))); conn.items[0].lastSync = old; fs.writeFileSync(path.join(DIR, 'bank-connections.json'), JSON.stringify(conn));
  const both = await Promise.all([req('POST', '/api/bank/sync', {}), req('POST', '/api/bank/sync', {}), req('POST', '/api/bank/sync', {})]);
  ok(both.every(x => x.code === 200) && det() === '2/2', `three Sync now clicks at once → one full sync (${before} → ${det()})`);
  // bank reads: gzip, cached reads stay correct after a sync rewrites the files
  const t = await req('GET', '/api/bank/transactions', null, { 'accept-encoding': 'gzip' }), tj = JSON.parse(t.body);
  ok(tj.tx.length === 3000 && t.h['content-encoding'] === 'gzip', `transactions: ${tj.tx.length} rows, ${Math.round(t.raw / 1024)} KB sent instead of ${Math.round(t.body.length / 1024)} KB`);
  const l = JSON.parse((await req('GET', '/api/bank/loans')).body).accounts[0];
  ok(l && Object.values(l.pays).reduce((x, y) => x + y, 0) === 60 * 300 && l.liab && l.liab.apr === 5, `loan payments grouped correctly (${Object.keys(l.pays).length} month(s), $${Object.values(l.pays).reduce((x, y) => x + y, 0)}) with lender details`);
  const ac = JSON.parse((await req('GET', '/api/bank/accounts')).body).accounts; ok(ac.length === 3 && ac.find(x => x.type === 'investment').holdings, 'accounts include holdings');
  const st = JSON.parse((await req('GET', '/api/bank/status')).body); ok(st.items[0].count === 3000 && !JSON.stringify(st).includes('fake-a'), 'status has counts and no tokens');
  console.log(fail ? `${fail} FAILED` : 'ALL PASSED'); fs.rmSync(DIR, { recursive: true, force: true }); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
