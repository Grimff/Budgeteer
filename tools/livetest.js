// Local test against what the NAS shows right now, without touching it:
//  - the budget is a copy downloaded once at start (saves go to memory only, never back to the NAS)
//  - bank data is read from the NAS with GET requests (status, transactions, loans, accounts)
//  - every other bank request (sync, connect, remove) is answered locally and never forwarded
// No Plaid tokens are involved. Run: node tools/livetest.js   then open http://localhost:18096 (set NAS=http://your-server:8095 first)
'use strict';
const fs = require('fs'), path = require('path'), http = require('http');
const NAS = process.env.NAS || 'http://localhost:8095', PORT = 18096, INDEX = path.join(__dirname, '..', 'app', 'public', 'index.html');
const get = p => new Promise((ok, no) => http.get(NAS + p, r => { let b = ''; r.on('data', d => b += d); r.on('end', () => ok({ code: r.statusCode, body: b })); }).on('error', no));
const send = (res, code, body, type) => { res.writeHead(code, { 'Content-Type': type || 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body)); };
const READ = ['/api/bank/status', '/api/bank/transactions', '/api/bank/loans', '/api/bank/accounts'];
(async () => {
  let cur = JSON.parse((await get('/api/data')).body);
  http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://x'), p = url.pathname.replace(/\/+$/, '') || '/';
    try {
      if (p === '/' || p === '/index.html') return send(res, 200, fs.readFileSync(INDEX), 'text/html; charset=utf-8');
      if (p === '/api/health') return send(res, 200, { ok: true, app: 'budgeteer' });
      if (p === '/api/rev') return send(res, 200, { rev: cur.rev });
      if (p === '/api/data' && req.method === 'GET') return send(res, 200, cur);
      if (p === '/api/data' && req.method === 'PUT') {
        let b = ''; for await (const c of req) b += c; const j = JSON.parse(b);
        if (j.baseRev != null && j.baseRev !== cur.rev) return send(res, 409, { error: 'changed', rev: cur.rev });
        cur = { ...cur, savedAt: new Date().toISOString(), rev: Math.max(Date.now(), cur.rev + 2), data: j.data };
        return send(res, 200, { rev: cur.rev, savedAt: cur.savedAt });
      }
      if (req.method === 'GET' && READ.includes(p)) { const r = await get(p + url.search); return send(res, r.code, r.body); }
      if (p === '/api/bank/sync') return send(res, 200, { ok: true, added: 0, items: JSON.parse((await get('/api/bank/status')).body).items || [] });
      if (p.startsWith('/api/bank/')) return send(res, 502, { error: 'Not available in the local test' });
      send(res, 404, 'Not found', 'text/plain');
    } catch (e) { send(res, 500, { error: String(e.message || e) }); }
  }).listen(PORT, () => console.log(`Live test on http://localhost:${PORT} (budget copy in memory, bank data read from ${NAS})`));
})();
