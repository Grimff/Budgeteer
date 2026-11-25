// Server tests (run by `npm test`): page caching and gzip, saving and conflicts, a budget file edited outside the app,
// and when loan/investment details refresh. Uses a fake Plaid and a temp data folder; your real data/ is never touched.
// TEST_MODE=stale checks that day-old loan/investment details refresh on an automatic sync.
'use strict';
const fs = require('fs'), path = require('path'), http = require('http'), os = require('os'), zlib = require('zlib');
const ROOT = require('path').join(__dirname, '..'), STALE = process.env.TEST_MODE === 'stale', DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'bt-'));
const old = new Date(Date.now() - 3 * 3600e3).toISOString();
const item = (id, detailAt) => ({ item_id: id, access_token: 'fake-' + id, institution: { id: 'i', name: 'Test Bank' }, cursor: null, lastSync: old, liab: 'ok', inv: 'ok', detailAt,
  accounts: [{ id: id + '-chk', name: 'Checking', type: 'depository', subtype: 'checking' }, { id: id + '-loan', name: 'Loan', type: 'loan', subtype: 'student' }, { id: id + '-inv', name: 'Brokerage', type: 'investment', subtype: 'brokerage' }, { id: id + '-ret', name: 'Company 401(k)', type: 'other', subtype: '401k' }] });
fs.writeFileSync(path.join(DIR, 'bank-connections.json'), JSON.stringify({ items: [item('a', new Date(Date.now() - (STALE ? 25 * 3600e3 : 0)).toISOString())] }));
const calls = {}, txs = Array.from({ length: 3000 }, (_, i) => ({ transaction_id: 't' + i, account_id: i % 50 ? 'a-chk' : 'a-loan', date: '2026-10-' + String(1 + i % 28).padStart(2, '0'), name: 'STORE ' + (i % 40), merchant_name: 'Store ' + (i % 40), amount: i % 50 ? 12.5 + i % 90 : -300, pending: false }));
const pushed = [];   // what the fake ntfy server received
http.createServer((q, r) => { let b = ''; q.on('data', d => b += d); q.on('end', () => {
  if (q.url === '/ntfy') { pushed.push(JSON.parse(b)); r.writeHead(200); return r.end('{}'); }
  calls[q.url] = (calls[q.url] || 0) + 1; const j = JSON.parse(b || '{}'), it = j.access_token && j.access_token.slice(5), send = o => { r.writeHead(200, { 'content-type': 'application/json' }); setTimeout(() => r.end(JSON.stringify(o)), 150); };
  if (q.url === '/accounts/get') return send({ accounts: [{ account_id: it + '-chk', name: 'Checking', type: 'depository', subtype: 'checking', balances: { current: 1000 } }, { account_id: it + '-loan', name: 'Loan', type: 'loan', subtype: 'student', balances: { current: 9000 } }, { account_id: it + '-inv', name: 'Brokerage', type: 'investment', subtype: 'brokerage', balances: { current: 5000 } }, { account_id: it + '-ret', name: 'Company 401(k)', type: 'other', subtype: '401k', balances: { current: 20000 } }] });
  if (q.url === '/transactions/sync') return send({ added: j.cursor ? [] : txs, modified: [], removed: [], next_cursor: 'c1', has_more: false });
  if (q.url === '/liabilities/get') return send({ liabilities: { student: [{ account_id: it + '-loan', interest_rate_percentage: 5, minimum_payment_amount: 300 }] } });
  if (q.url === '/investments/holdings/get') return send({ accounts: [{ account_id: it + '-inv', type: 'investment' }], holdings: [], securities: [] });
  if (q.url === '/investments/transactions/get') return send({ investment_transactions: [], total_investment_transactions: 0 });
  r.writeHead(500); r.end('{}');
}); }).listen(18201);
Object.assign(process.env, { PORT: '18202', DATA_DIR: DIR, PLAID_CLIENT_ID: 'test', PLAID_SECRET: 'test', PLAID_ENV: 'sandbox', PLAID_BASE: 'http://127.0.0.1:18201', BANK_SYNC_HOURS: '24', NOTIFY_URL: 'http://127.0.0.1:18201/ntfy/budget-alerts' });
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
  // the app's other files: the script (dist/app.js, built by npm test first) gzipped, fonts sent as they are, nothing
  // outside app/public
  const js = await req('GET', '/dist/app.js', null, { 'accept-encoding': 'gzip' }), font = await req('GET', '/fonts/inter-400.woff', null, { 'accept-encoding': 'gzip' });
  ok(js.code === 200 && js.h['content-encoding'] === 'gzip' && /javascript/.test(js.h['content-type']) && js.body.startsWith("'use strict'"), 'scripts are served gzipped');
  ok(font.code === 200 && !font.h['content-encoding'] && font.h['content-type'] === 'font/woff', 'fonts are served as they are');
  const esc = await Promise.all(['/../server.js', '/js/../../server.js', '/%2e%2e/server.js', '/.env', '/../.env', '/js/nope.js'].map(u => req('GET', u)));
  ok(esc.every(x => x.code === 404), 'nothing outside the app folder is served (' + esc.map(x => x.code).join(',') + ')');
  // budget save / rev / conflict / outside edit
  const d0 = await req('GET', '/api/data'); ok(d0.code === 404, 'no budget yet → 404');
  const p1 = await req('PUT', '/api/data', { data: { plans: {}, loans: [], n: 1 } }); const r1 = JSON.parse(p1.body).rev;
  ok(p1.code === 200 && JSON.parse((await req('GET', '/api/rev')).body).rev === r1, 'rev after save matches');
  const c = await req('PUT', '/api/data', { baseRev: r1 - 5, data: { plans: {}, loans: [] } }); ok(c.code === 409, 'stale save → 409');
  const f = path.join(DIR, 'budgeteer-data.json'), j = JSON.parse(fs.readFileSync(f)); j.rev = r1 + 1000; j.data.n = 2; fs.writeFileSync(f, JSON.stringify(j));
  ok(JSON.parse((await req('GET', '/api/rev')).body).rev === r1 + 1000 && JSON.parse((await req('GET', '/api/data')).body).data.n === 2, 'a file edited outside the app is picked up (cache follows the file)');
  // phone alerts: ntfy format, each key sent once, test message
  const nt = JSON.parse((await req('GET', '/api/notify')).body);
  ok(nt.configured && /budget-alerts/.test(nt.target), 'phone alerts are on: ' + nt.target);
  const A = [{ key: 'over:x:1', title: 'Dining is $20 over plan', message: 'm1' }, { key: 'over:x:1', title: 'dup', message: '' }, { key: 'due:x:2', title: 'Rent is due tomorrow', message: 'm2' }];
  const s1 = JSON.parse((await req('POST', '/api/notify', { alerts: A })).body), s2 = JSON.parse((await req('POST', '/api/notify', { alerts: A })).body);
  ok(s1.sent === 2 && s2.sent === 0 && pushed.length === 2 && pushed[0].topic === 'budget-alerts' && pushed[0].title === 'Dining is $20 over plan', `each alert is sent once (${s1.sent} then ${s2.sent}), as ntfy JSON`);
  const tst = await req('POST', '/api/notify/test'); ok(tst.code === 200 && pushed.length === 3, 'test alert sends');
  // daily copies: a save on a day with a budget file makes one; restoring it brings that budget back and keeps an undo copy
  const pre = JSON.parse((await req('GET', '/api/data')).body);
  await req('PUT', '/api/data', { baseRev: pre.rev, data: { plans: {}, loans: [], n: 3 } });
  const list = JSON.parse((await req('GET', '/api/backups')).body).backups;
  ok(list.length === 1 && list[0].kind === 'daily', `a daily copy is listed (${list.map(x => x.id).join(', ')})`);
  const rs = await req('POST', '/api/backups/restore', { id: list[0].id }), after = JSON.parse((await req('GET', '/api/data')).body);
  ok(rs.code === 200 && after.data.n === 2 && after.rev > pre.rev, 'restoring brings back that day’s budget with a new revision');
  const list2 = JSON.parse((await req('GET', '/api/backups')).body).backups;
  ok(list2.some(x => x.kind === 'restore'), 'the budget from before the restore is kept as a copy');
  const sneaky = await Promise.all(['../budgeteer-data.json', '../bank-connections.json', 'nope.json'].map(id => req('POST', '/api/backups/restore', { id })));
  ok(sneaky.every(x => x.code === 404), 'only listed copies can be restored (' + sneaky.map(x => x.code).join(',') + ')');
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
  const ac = JSON.parse((await req('GET', '/api/bank/accounts')).body).accounts; ok(ac.length === 4 && ac.find(x => x.type === 'investment').holdings, 'accounts include holdings');
  const ret = ac.find(x => x.id.endsWith('-ret')); ok(ret && ret.type === 'investment' && Array.isArray(ret.flows), `a 401(k) the bank files under another type is an investment account (${ret && ret.type})`);
  const st = JSON.parse((await req('GET', '/api/bank/status')).body); ok(st.items[0].count === 3000 && !JSON.stringify(st).includes('fake-a'), 'status has counts and no tokens');
  // CSV import: new account, two identical rows kept as two, the same file again adds nothing, a sync leaves it alone
  const rows = [{ date: '2026-10-02', name: 'FARM STAND', amount: 12 }, { date: '2026-10-02', name: 'FARM STAND', amount: 12 }, { date: '2026-10-05', name: 'REFUND', amount: -3.5 }];
  const i1 = JSON.parse((await req('POST', '/api/bank/import', { rows, newAccount: { name: 'Credit union', type: 'checking' }, balance: 900 })).body);
  const i2 = JSON.parse((await req('POST', '/api/bank/import', { rows, account: i1.account })).body);
  ok(i1.added === 3 && i2.added === 0 && i2.skipped === 3, `CSV rows imported once (${i1.added} added, then ${i2.added} added / ${i2.skipped} skipped)`);
  const bad = await req('POST', '/api/bank/import', { rows: [{ date: '10/02/2026', name: 'X', amount: 1 }], account: i1.account });
  ok(bad.code === 400, 'rows with a bad date are refused');
  await req('POST', '/api/bank/sync', {});
  const st2 = JSON.parse((await req('GET', '/api/bank/status')).body), ci = st2.items.find(x => x.kind === 'csv');
  const tx2 = JSON.parse((await req('GET', '/api/bank/transactions')).body).tx.filter(t => t.item === 'csv'), ac2 = JSON.parse((await req('GET', '/api/bank/accounts')).body).accounts.find(a => a.id === i1.account);
  ok(ci && !ci.error && ci.count === 3 && tx2.length === 3 && /Credit union/.test(tx2[0].accountName) && ac2 && ac2.bal === 900, 'imported account and transactions are served like bank data, and a sync leaves them alone');
  const del = await req('DELETE', '/api/bank/import/' + i1.account), st3 = JSON.parse((await req('GET', '/api/bank/status')).body);
  ok(del.code === 200 && !st3.items.some(x => x.kind === 'csv') && !JSON.parse((await req('GET', '/api/bank/transactions')).body).tx.some(t => t.item === 'csv'), 'removing the imported account removes its transactions');
  console.log(fail ? `${fail} FAILED` : 'ALL PASSED'); fs.rmSync(DIR, { recursive: true, force: true }); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
