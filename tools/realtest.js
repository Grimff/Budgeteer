// Local test on a copy of the real data: copies ../data to a temp folder with every Plaid token replaced, runs a
// fake Plaid that replays the stored accounts (nothing else), and starts server.js on http://localhost:18096.
// Never point a server at data/ directly. Run: node tools/realtest.js  (delete the temp copy afterwards if you like).
// Or from a troubleshooting copy (Settings → Data & math → Download a copy for troubleshooting):
//   node tools/realtest.js path/to/budgeteer-copy-YYYY-MM-DD.json
'use strict';
const fs = require('fs'), path = require('path'), http = require('http');
const SRC = path.join(__dirname, '..', 'data'), DST = path.join(require('os').tmpdir(), 'budgeteer-realtest');
fs.rmSync(DST, { recursive: true, force: true }); fs.mkdirSync(DST, { recursive: true });
const COPY = process.argv[2] ? JSON.parse(fs.readFileSync(process.argv[2], 'utf8')) : null;
if (COPY && COPY.app !== 'budgeteer-support-copy') { console.error(process.argv[2] + ' isn’t a Budgeteer troubleshooting copy.'); process.exit(1); }
for (const f of ['budgeteer-data.json', 'bank-connections.json', 'bank-transactions.json', 'bank-loans.json', 'bank-investments.json']) {
  let s = COPY ? JSON.stringify(COPY.files[f] || (f === 'bank-transactions.json' ? { tx: {} } : {})) : fs.readFileSync(path.join(SRC, f), 'utf8');
  if (f === 'bank-connections.json') { const c = JSON.parse(s); c.items.forEach(it => { it.access_token = 'fake-' + it.item_id; }); s = JSON.stringify(c); }
  fs.writeFileSync(path.join(DST, f), s);
}
const C = JSON.parse(fs.readFileSync(path.join(DST, 'bank-connections.json'), 'utf8'));
http.createServer((q, r) => { let b = ''; q.on('data', d => b += d); q.on('end', () => {
  let j = {}; try { j = JSON.parse(b || '{}'); } catch (_) {}
  const it = C.items.find(x => 'fake-' + x.item_id === j.access_token), send = (c, o) => { r.writeHead(c, { 'content-type': 'application/json' }); r.end(JSON.stringify(o)); };
  if (q.url === '/accounts/get' && it) return send(200, { accounts: it.accounts.map(a => ({ account_id: a.id, name: a.name, official_name: a.official, mask: a.mask, type: a.type, subtype: a.subtype, balances: { current: a.bal, available: a.avail } })) });
  if (q.url === '/transactions/sync') {
    // Scripted test updates: write <temp copy>/fake-sync.json as {item_id, added:[], modified:[], removed:[]}; it's replayed once.
    const fp = path.join(DST, 'fake-sync.json'); let x = null;
    try { x = JSON.parse(fs.readFileSync(fp, 'utf8')); } catch (_) {}
    if (x && it && x.item_id === it.item_id) { fs.rmSync(fp, { force: true }); return send(200, { added: x.added || [], modified: x.modified || [], removed: x.removed || [], next_cursor: 'c' + Date.now(), has_more: false }); }
    return send(200, { added: [], modified: [], removed: [], next_cursor: j.cursor || 'c', has_more: false });
  }
  send(500, { error_code: 'MOCK', error_message: 'not mocked' });
}); }).listen(18101);
Object.assign(process.env, { PORT: '18096', DATA_DIR: DST, PLAID_CLIENT_ID: 'test', PLAID_SECRET: 'test', PLAID_ENV: 'sandbox', PLAID_BASE: 'http://127.0.0.1:18101', BANK_SYNC_HOURS: '500' });
require(path.join(__dirname, '..', 'app', 'server.js'));
