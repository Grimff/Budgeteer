// Budgeteer - tiny server (no dependencies).
// Serves the app and saves the budget to a JSON file in DATA_DIR.
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const zlib = require('zlib');

// Settings and Plaid keys can come from a .env file (KEY=value per line) in the project folder or the
// folder you start the server from. Real environment variables (e.g. from docker compose) always win.
for (const f of [path.join(__dirname, '..', '.env'), path.join(process.cwd(), '.env')]) {
  let txt; try { txt = fs.readFileSync(f, 'utf8'); } catch (_) { continue; }
  for (const line of txt.split(/\r?\n/)) {
    const m = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!m || m[1] in process.env) continue;
    let v = m[2];
    if (/^(['"]).*\1$/.test(v)) v = v.slice(1, -1); else v = v.replace(/\s+#.*$/, '');
    process.env[m[1]] = v;
  }
}

const PORT = Number(process.env.PORT) || 8080;
const DATA_DIR = path.resolve(path.join(__dirname, '..'), process.env.DATA_DIR || '/data');
const FILE = path.join(DATA_DIR, process.env.DATA_FILE || 'budgeteer-data.json');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
const BACKUPS_KEEP = Number(process.env.BACKUPS_KEEP) || 90;
const AUTH = process.env.BASIC_AUTH || ''; // optional "user:password"
const PUBLIC = path.join(__dirname, 'public');   // the app: index.html, css/, js/, fonts/, icons/
const MAX_BODY = 20 * 1024 * 1024;

fs.mkdirSync(BACKUP_DIR, { recursive: true });

const log = (...a) => console.log(new Date().toISOString(), ...a);

// Parsed JSON files are cached until the file changes on disk (size or modified time), so the 10-second
// revision check and repeated bank reads don't re-read and re-parse whole files. Only for read-only use:
// never change an object returned from here (code that edits a file reads it fresh with readJ).
const JC = new Map();
function readCached(f) {
  let st; try { st = fs.statSync(f); } catch (e) { if (e.code === 'ENOENT') { JC.delete(f); return null; } throw e; }
  const c = JC.get(f);
  if (c && c.m === st.mtimeMs && c.s === st.size) return c.v;
  const v = JSON.parse(fs.readFileSync(f, 'utf8'));
  JC.set(f, { m: st.mtimeMs, s: st.size, v });
  return v;
}
function readData() { return readCached(FILE); }
function revOf(j) {
  if (!j) return 0;
  if (j.rev) return j.rev;
  const t = Date.parse(j.savedAt || '');
  return isFinite(t) ? t : 1;
}
function writeAtomic(obj) {
  const tmp = FILE + '.tmp-' + process.pid;
  fs.writeFileSync(tmp, JSON.stringify(obj));
  fs.renameSync(tmp, FILE);
  const st = fs.statSync(FILE); JC.set(FILE, { m: st.mtimeMs, s: st.size, v: obj });
}
function dailyBackup() {
  if (!fs.existsSync(FILE)) return;
  const day = today();   // the server's local date (TZ), so a copy is named for the day it was made where you are
  const dest = path.join(BACKUP_DIR, `budgeteer-${day}.json`);
  if (!fs.existsSync(dest)) {
    fs.copyFileSync(FILE, dest);
    log('backup', dest);
    const old = fs.readdirSync(BACKUP_DIR).filter(f => /^budgeteer-\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort();
    while (old.length > BACKUPS_KEEP) fs.unlinkSync(path.join(BACKUP_DIR, old.shift()));
  }
  // Loan balance history only lives on the NAS, so keep daily copies of it too.
  const lf = path.join(DATA_DIR, 'bank-loans.json'), ld = path.join(BACKUP_DIR, `bank-loans-${day}.json`);
  if (fs.existsSync(lf) && !fs.existsSync(ld)) {
    fs.copyFileSync(lf, ld);
    const old = fs.readdirSync(BACKUP_DIR).filter(f => /^bank-loans-\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort();
    while (old.length > BACKUPS_KEEP) fs.unlinkSync(path.join(BACKUP_DIR, old.shift()));
  }
}

// Budget copies in backups/: budgeteer-YYYY-MM-DD.json (made before the first save of that day, so it holds the budget
// as it was when the day began) and budgeteer-before-restore-<time>.json (what was there before a restore).
function listBackups() {
  let files = []; try { files = fs.readdirSync(BACKUP_DIR); } catch (_) {}
  return files.map(f => {
    let m = f.match(/^budgeteer-(\d{4}-\d{2}-\d{2})\.json$/), kind = 'daily', at;
    if (m) at = m[1];
    else if ((m = f.match(/^budgeteer-before-restore-(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})-\d+Z\.json$/))) { kind = 'restore'; at = `${m[1]}T${m[2]}:${m[3]}:${m[4]}Z`; }
    else return null;
    let size = 0; try { size = fs.statSync(path.join(BACKUP_DIR, f)).size; } catch (_) {}
    return { id: f, kind, at, size };
  }).filter(Boolean).sort((a, b) => b.at.localeCompare(a.at));
}

// ---------- bank sync through Plaid ----------
// Keys come from the environment and never leave this server.
const PLAID_ID = process.env.PLAID_CLIENT_ID || '';
const PLAID_SECRET = process.env.PLAID_SECRET || '';
const PLAID_ENV = (process.env.PLAID_ENV || 'production').toLowerCase();
const PLAID_BASE = process.env.PLAID_BASE || `https://${PLAID_ENV === 'sandbox' ? 'sandbox' : 'production'}.plaid.com`;
const PLAID_REDIRECT = process.env.PLAID_REDIRECT_URI || '';
const SYNC_HOURS = Number(process.env.BANK_SYNC_HOURS) || 1;   // default until someone picks a refresh time in Settings
const OPEN_SYNC_MIN = 10;   // opening the app syncs only if the last sync is older than this many minutes
const BANK_FILE = path.join(DATA_DIR, 'bank-connections.json');   // access tokens: keep private
const TX_FILE = path.join(DATA_DIR, 'bank-transactions.json');
const LOAN_FILE = path.join(DATA_DIR, 'bank-loans.json');          // balances by day for every account + lender details
const INV_FILE = path.join(DATA_DIR, 'bank-investments.json');     // holdings + money moved in/out of investment accounts
const SET_FILE = path.join(DATA_DIR, 'bank-settings.json');       // refresh choices from Settings → Connections
const SYNC_CHOICES = [0, 1, 2, 3, 6, 12, 24];                       // hours between automatic checks; 0 = only Sync now
// Loan details (Liabilities) and investment holdings/activity change slowly, so automatic syncs refresh them only
// this often. Sync now, a new connection and a reconnect always refresh them.
const DETAIL_HOURS = Number(process.env.BANK_DETAIL_HOURS) || 24;
const bankOn = () => !!(PLAID_ID && PLAID_SECRET);
const readJ = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (_) { return d; } };
const writeJ = (f, o) => { const t = f + '.tmp-' + process.pid; fs.writeFileSync(t, JSON.stringify(o)); fs.renameSync(t, f); JC.delete(f); try { fs.chmodSync(f, 0o600); } catch (_) {} };
const loadBank = () => readJ(BANK_FILE, { items: [] });
const loadTx = () => readJ(TX_FILE, { tx: {} });
const loadLoans = () => readJ(LOAN_FILE, { acct: {} });
const loadInv = () => readJ(INV_FILE, { acct: {}, flows: {} });
// Read-only copies for GET requests (cached, see readCached). Don't edit what these return.
const readC = (f, d) => { try { return readCached(f) || d; } catch (_) { return d; } };
const viewBank = () => readC(BANK_FILE, { items: [] });
const viewTx = () => readC(TX_FILE, { tx: {} });
const viewLoans = () => readC(LOAN_FILE, { acct: {} });
const viewInv = () => readC(INV_FILE, { acct: {}, flows: {} });
const today = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const isDebt = a => a.type === 'loan' || a.type === 'credit';
async function plaid(endpoint, body) {
  const r = await fetch(PLAID_BASE + endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Plaid-Version': '2020-09-14' },
    body: JSON.stringify({ client_id: PLAID_ID, secret: PLAID_SECRET, ...body }) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error(j.error_message || ('Plaid HTTP ' + r.status)); e.code = j.error_code || 'HTTP_' + r.status; e.display = j.display_message || ''; throw e; }
  return j;
}
const publicItem = it => ({ kind: it.kind || '', item_id: it.item_id, institution: it.institution, accounts: it.accounts || [], lastSync: it.lastSync || null, error: it.error || null, count: it.count || 0, liab: it.liab || '', inv: it.inv || '' });
let syncing = null, lastAll = 0, lastTry = 0;
// hours: automatic check every N hours (0 = off). open: opening the app checks too (if the last check is 10+ minutes old).
const syncSet = () => { const j = readJ(SET_FILE, {}); return { hours: SYNC_CHOICES.includes(j.hours) ? j.hours : SYNC_HOURS, open: j.open !== false }; };
const syncInfo = () => { const s = syncSet(), last = lastAll || null; return { ...s, last: last && new Date(last).toISOString(), next: s.hours && last ? new Date(last + s.hours * 3600000).toISOString() : null }; };
async function syncItem(it, store) {
  let cursor = it.cursor || undefined, start = cursor, added = 0, guard = 0;
  for (;;) {
    let r;
    try { r = await plaid('/transactions/sync', { access_token: it.access_token, cursor, count: 500, options: { include_personal_finance_category: true } }); }
    catch (e) { if (e.code === 'TRANSACTIONS_SYNC_MUTATION_DURING_PAGINATION' && guard++ < 3) { cursor = start; continue; } throw e; }
    for (const t of [...r.added, ...r.modified]) {
      store.tx[t.transaction_id] = { id: t.transaction_id, item: it.item_id, account: t.account_id, date: t.date,
        name: t.name || '', merchant: t.merchant_name || '', amount: t.amount, pending: !!t.pending,
        // When a pending charge posts, Plaid removes it and adds the posted one with a new id pointing back to it.
        ppid: t.pending_transaction_id || '',
        pfc: t.personal_finance_category ? [t.personal_finance_category.primary, t.personal_finance_category.detailed] : null };
      added++;
    }
    for (const t of r.removed || []) delete store.tx[t.transaction_id];
    cursor = r.next_cursor;
    if (!r.has_more) break;
  }
  it.cursor = cursor;
  return added;
}
async function refreshAccounts(it) {
  const a = await plaid('/accounts/get', { access_token: it.access_token });
  it.accounts = a.accounts.map(x => ({ id: x.account_id, name: x.name, official: x.official_name || '', mask: x.mask || '', type: x.type, subtype: x.subtype || '',
    bal: x.balances && x.balances.current != null ? x.balances.current : null, avail: x.balances && x.balances.available != null ? x.balances.available : null,
    balAt: new Date().toISOString() }));
}
// Loan details from Plaid Liabilities (student loans, mortgages, credit cards). Other loans only get balances.
const LIAB_NONE = ['PRODUCTS_NOT_SUPPORTED', 'NO_LIABILITY_ACCOUNTS', 'INSTITUTION_NOT_SUPPORTED', 'PRODUCT_NOT_SUPPORTED'];
const LIAB_CONSENT = ['ADDITIONAL_CONSENT_REQUIRED', 'PRODUCT_NOT_READY', 'INVALID_PRODUCT', 'PRODUCTS_NOT_ENABLED', 'ITEM_PRODUCT_NOT_READY'];
async function refreshLiabilities(it, loans) {
  if (it.liab === 'none' || !(it.accounts || []).some(a => a.type === 'loan')) return;
  let r;
  try { r = await plaid('/liabilities/get', { access_token: it.access_token }); }
  catch (e) {
    if (LIAB_NONE.includes(e.code)) it.liab = 'none';
    else if (LIAB_CONSENT.includes(e.code)) it.liab = 'consent';
    else log('Liabilities error', it.institution && it.institution.name, e.code, e.message);
    return;
  }
  it.liab = 'ok';
  const L = r.liabilities || {}, at = new Date().toISOString();
  const put = (id, d) => { const a = loans.acct[id] || (loans.acct[id] = { days: {} }); a.liab = { ...d, at }; };
  for (const x of L.student || []) put(x.account_id, { kind: 'student', apr: x.interest_rate_percentage, min: x.minimum_payment_amount,
    next: x.next_payment_due_date, lastAmt: x.last_payment_amount, lastDate: x.last_payment_date, orig: x.origination_principal_amount,
    origDate: x.origination_date, payoff: x.expected_payoff_date, name: x.loan_name || '' });
  for (const x of L.mortgage || []) put(x.account_id, { kind: 'mortgage', apr: x.interest_rate && x.interest_rate.percentage, min: x.next_monthly_payment,
    next: x.next_payment_due_date, lastAmt: x.last_payment_amount, lastDate: x.last_payment_date, orig: x.origination_principal_amount,
    origDate: x.origination_date, payoff: x.maturity_date });
  for (const x of L.credit || []) { const p = (x.aprs || []).find(a => a.apr_type === 'purchase_apr') || (x.aprs || [])[0];
    put(x.account_id, { kind: 'credit', apr: p && p.apr_percentage, min: x.minimum_payment_amount, next: x.next_payment_due_date,
      lastAmt: x.last_payment_amount, lastDate: x.last_payment_date }); }
}
// Holdings and cash moved in or out of investment accounts (Plaid Investments), for Fidelity, Schwab and others.
const FLOW_SUB = ['contribution', 'deposit', 'withdrawal', 'transfer', 'distribution', 'rollover'];
async function refreshInvestments(it, inv) {
  if (it.inv === 'none' || !(it.accounts || []).some(a => a.type === 'investment')) return;
  let h;
  try { h = await plaid('/investments/holdings/get', { access_token: it.access_token }); }
  catch (e) {
    if (LIAB_NONE.includes(e.code) || e.code === 'NO_INVESTMENT_ACCOUNTS') it.inv = 'none';
    else if (LIAB_CONSENT.includes(e.code)) it.inv = 'consent';
    else log('Investments error', it.institution && it.institution.name, e.code, e.message);
    return;
  }
  it.inv = 'ok';
  const sec = {}; for (const x of h.securities || []) sec[x.security_id] = x;
  const at = new Date().toISOString();
  for (const a of h.accounts || []) if (a.type === 'investment') inv.acct[a.account_id] = { item: it.item_id, at, holdings: [] };
  for (const x of h.holdings || []) {
    const s = sec[x.security_id] || {}, e = inv.acct[x.account_id] || (inv.acct[x.account_id] = { item: it.item_id, at, holdings: [] });
    e.holdings.push({ name: s.name || 'Unknown', ticker: s.ticker_symbol || '', type: s.type || '', cash: !!s.is_cash_equivalent,
      qty: x.quantity, price: x.institution_price, value: x.institution_value, cost: x.cost_basis });
  }
  // Last 120 days of deposits and withdrawals, so gains can be told apart from money you put in.
  const end = today(), start = new Date(Date.now() - 120 * 864e5).toISOString().slice(0, 10);
  try {
    let off = 0, total = 1;
    while (off < total && off < 2000) {
      const r = await plaid('/investments/transactions/get', { access_token: it.access_token, start_date: start, end_date: end, options: { count: 500, offset: off } });
      total = r.total_investment_transactions || 0;
      for (const t of r.investment_transactions || []) {
        if (!['cash', 'transfer'].includes(t.type) || !FLOW_SUB.includes(t.subtype)) continue;
        // Plaid: negative amount = cash into the account.
        inv.flows[t.investment_transaction_id] = { account: t.account_id, item: it.item_id, date: t.date, amt: -t.amount, name: t.name || '' };
      }
      off += (r.investment_transactions || []).length; if (!(r.investment_transactions || []).length) break;
    }
  } catch (e) { log('Investment transactions error', it.institution && it.institution.name, e.code, e.message); }
}
function snapshotBalances(it, loans) {
  const d = today();
  for (const a of it.accounts || []) if (a.bal != null) {
    const e = loans.acct[a.id] || (loans.acct[a.id] = { days: {} });
    e.days[d] = a.bal; e.item = it.item_id;
  }
}
// One row per loan or credit account: live balance, month-end balances, payments seen on the account, lender details.
// Every connected account with its balance history; investment accounts also get holdings and deposits/withdrawals.
function allAccounts() {
  const bank = viewBank(), loans = viewLoans(), inv = viewInv(), out = [];
  const flows = Object.values(inv.flows || {});
  for (const it of bank.items) for (const a of it.accounts || []) {
    const e = loans.acct[a.id] || { days: {} }, days = Object.keys(e.days).sort(), months = {};
    days.forEach(d => { months[d.slice(0, 7)] = e.days[d]; });
    const cut = new Date(Date.now() - 400 * 864e5).toISOString().slice(0, 10), recent = {};
    days.filter(d => d >= cut).forEach(d => { recent[d] = e.days[d]; });
    const row = { id: a.id, item: it.item_id, institution: it.institution.name, name: a.name, official: a.official, mask: a.mask, type: a.type, subtype: a.subtype,
      bal: a.bal, avail: a.avail != null ? a.avail : null, balAt: a.balAt || it.lastSync || null, months, days: recent };
    if (a.type === 'investment') {
      const x = inv.acct[a.id];
      const fl = flows.filter(f => f.account === a.id).map(f => ({ date: f.date, amt: f.amt, name: f.name })).sort((p, q) => p.date.localeCompare(q.date));
      Object.assign(row, { holdings: x ? x.holdings : null, holdAt: x ? x.at : null, flows: fl, invState: it.inv || '' });
    }
    out.push(row);
  }
  return out;
}
function loanAccounts() {
  const bank = viewBank(), loans = viewLoans(), out = [];
  // On a loan account Plaid shows payments as money in (negative amounts). Grouped by account in one pass.
  const byAcct = {};
  for (const t of Object.values(viewTx().tx)) if (!t.pending && t.amount < 0) (byAcct[t.account] || (byAcct[t.account] = [])).push(t);
  for (const it of bank.items) for (const a of it.accounts || []) {
    if (!isDebt(a)) continue;
    const e = loans.acct[a.id] || { days: {} }, months = {}, pays = {}, payList = [];
    Object.keys(e.days).sort().forEach(d => { months[d.slice(0, 7)] = e.days[d]; });
    (byAcct[a.id] || []).forEach(t => {
      const k = t.date.slice(0, 7); pays[k] = Math.round(((pays[k] || 0) - t.amount) * 100) / 100; payList.push({ id: t.id, date: t.date, amt: -t.amount, name: t.name });
    });
    out.push({ id: a.id, item: it.item_id, institution: it.institution.name, name: a.name, official: a.official, mask: a.mask, type: a.type, subtype: a.subtype,
      bal: a.bal, balAt: a.balAt || it.lastSync || null, first: Object.keys(e.days).sort()[0] || null, months, pays,
      payList: payList.sort((x, y) => y.date.localeCompare(x.date)).slice(0, 36), liab: e.liab || null, liabState: it.liab || '' });
  }
  return out;
}
// full: also refresh loan details and investments now (Sync now, new connection, reconnect). Otherwise they
// refresh when DETAIL_HOURS have passed since the last time (or they were never fetched for this connection).
let fullNext = null;   // a full sync waiting for the running (automatic) one to finish
function syncAll(full) {
  if (!bankOn()) return Promise.resolve({ added: 0 });
  if (syncing) {
    if (!full || syncing.full) return syncing;
    return fullNext || (fullNext = syncing.catch(() => {}).then(() => { fullNext = null; return syncAll(true); }));
  }
  syncing = (async () => {
    const bank = loadBank(), store = loadTx(), loans = loadLoans(), inv = loadInv(); let added = 0;
    for (const it of bank.items) {
      try {
        await refreshAccounts(it);
        snapshotBalances(it, loans);
        if (it.kind !== 'invest') added += await syncItem(it, store);
        it.error = null; it.lastSync = new Date().toISOString();
        if (full || !it.detailAt || Date.now() - Date.parse(it.detailAt) >= DETAIL_HOURS * 3600000 || it.liab === '' || it.inv === '') {
          await refreshLiabilities(it, loans);
          await refreshInvestments(it, inv);
          it.detailAt = new Date().toISOString();
        }
      } catch (e) { it.error = { code: e.code || 'ERROR', message: e.display || e.message }; log('Bank sync error', it.institution && it.institution.name, e.code, e.message); }
      it.count = Object.values(store.tx).filter(t => t.item === it.item_id).length;
    }
    writeJ(TX_FILE, store); writeJ(BANK_FILE, bank); writeJ(LOAN_FILE, loans); writeJ(INV_FILE, inv);
    lastAll = Date.now();
    return { added };
  })().finally(() => { syncing = null; });
  syncing.full = !!full;
  return syncing;
}
// A one-minute tick checks whether the chosen refresh time has passed, so a new choice applies right away.
// The last sync time starts from the connections' saved times, so a restart doesn't trigger an extra sync.
function syncTick() { const h = syncSet().hours; if (!h || syncing) return; if (Date.now() >= Math.max(lastAll, lastTry) + h * 3600000) { lastTry = Date.now(); syncAll().catch(() => {}); } }
if (bankOn()) { lastAll = loadBank().items.reduce((m, it) => Math.max(m, Date.parse(it.lastSync || '') || 0), 0); setTimeout(syncTick, 15000); setInterval(syncTick, 60000); }
async function bankRoute(p, req, res, url) {
  if (p === '/api/bank/status' && req.method === 'GET')
    return send(res, 200, { configured: bankOn(), env: PLAID_ENV, syncing: !!syncing, refresh: syncInfo(), items: viewBank().items.map(publicItem) });
  if (p === '/api/bank/settings' && req.method === 'PUT') {
    let b = {}; try { b = JSON.parse(await readBody(req) || '{}'); } catch (_) { return send(res, 400, { error: 'bad json' }); }
    const cur = syncSet(), h = b.hours != null ? Number(b.hours) : cur.hours;
    if (!SYNC_CHOICES.includes(h)) return send(res, 400, { error: 'hours must be one of ' + SYNC_CHOICES.join(', ') });
    writeJ(SET_FILE, { hours: h, open: b.open != null ? !!b.open : cur.open });
    return send(res, 200, { ok: true, refresh: syncInfo() });
  }
  if (!bankOn()) return send(res, 400, { error: 'Plaid keys are not set on the server.' });
  if (p === '/api/bank/link-token' && req.method === 'POST') {
    const b = JSON.parse((await readBody(req)) || '{}');
    const body = { client_name: 'Budgeteer', user: { client_user_id: 'budgeteer-household' }, country_codes: (process.env.PLAID_COUNTRIES || 'US').split(','), language: 'en' };
    if (PLAID_REDIRECT) body.redirect_uri = PLAID_REDIRECT;
    if (b.item_id) {
      const it = loadBank().items.find(x => x.item_id === b.item_id); if (!it) return send(res, 404, { error: 'unknown connection' }); body.access_token = it.access_token;
      const add = [b.liabilities && 'liabilities', b.investments && 'investments'].filter(Boolean);
      if (add.length) body.additional_consented_products = add;
      // Let the person pick more accounts at this bank (for example a savings account they skipped).
      if (b.accounts) body.update = { account_selection_enabled: true };
    }
    // Brokerages (Fidelity, Schwab) often don't offer Transactions, so they connect with Investments only.
    else if (b.kind === 'invest') body.products = ['investments'];
    else { body.products = ['transactions']; body.optional_products = ['liabilities', 'investments']; body.transactions = { days_requested: Number(process.env.BANK_HISTORY_DAYS) || 365 }; }
    let r;
    try { r = await plaid('/link/token/create', body); }
    catch (e) {
      // Plaid account without these add-ons turned on: connect without them.
      if (!body.optional_products && !body.additional_consented_products) throw e;
      log('Link token without liabilities:', e.code, e.message);
      if (body.additional_consented_products) return send(res, 400, { error: `${b.investments ? 'Investments' : 'Loan details (Liabilities)'} isn’t turned on for your Plaid account yet. Turn it on in the Plaid dashboard, then try again.` });
      // Try each add-on on its own before falling back to transactions only.
      r = null;
      for (const opt of [['liabilities'], ['investments'], null]) {
        if (opt) body.optional_products = opt; else delete body.optional_products;
        try { r = await plaid('/link/token/create', body); break; } catch (e2) { if (!opt) throw e2; }
      }
    }
    return send(res, 200, { link_token: r.link_token });
  }
  if (p === '/api/bank/exchange' && req.method === 'POST') {
    const b = JSON.parse(await readBody(req));
    const r = await plaid('/item/public_token/exchange', { public_token: b.public_token });
    const bank = loadBank();
    const it = { item_id: r.item_id, access_token: r.access_token, institution: { id: b.institution && b.institution.institution_id || '', name: b.institution && b.institution.name || 'Bank' }, cursor: null, added: new Date().toISOString(), kind: b.kind === 'invest' ? 'invest' : undefined };
    bank.items = bank.items.filter(x => x.item_id !== it.item_id).concat(it);
    try { await refreshAccounts(it); } catch (_) {}
    writeJ(BANK_FILE, bank);
    syncAll(true).catch(() => {});
    return send(res, 200, { ok: true, item: publicItem(it) });
  }
  if (p === '/api/bank/reconnected' && req.method === 'POST') {
    const b = JSON.parse(await readBody(req)); const bank = loadBank(); const it = bank.items.find(x => x.item_id === b.item_id); if (it) { it.error = null; if (it.liab !== 'ok') it.liab = ''; if (it.inv !== 'ok') it.inv = ''; writeJ(BANK_FILE, bank); }
    syncAll(true).catch(() => {}); return send(res, 200, { ok: true });
  }
  if (p === '/api/bank/sync' && req.method === 'POST') {
    // {auto:true} comes from opening the app: skip it when a sync just ran. Sync now (no body) always runs.
    let b = {}; try { b = JSON.parse(await readBody(req) || '{}'); } catch (_) {}
    if (b.auto && !syncing && (!syncSet().open || Date.now() - lastAll < OPEN_SYNC_MIN * 60000)) return send(res, 200, { ok: true, added: 0, skipped: true, items: viewBank().items.map(publicItem) });
    const r = await syncAll(!b.auto); return send(res, 200, { ok: true, added: r.added, items: viewBank().items.map(publicItem) });
  }
  if (p === '/api/bank/loans' && req.method === 'GET') return send(res, 200, { accounts: loanAccounts() });
  if (p === '/api/bank/accounts' && req.method === 'GET') return send(res, 200, { accounts: allAccounts() });
  if (p === '/api/bank/transactions' && req.method === 'GET') {
    const from = url.searchParams.get('from') || '0000';
    const names = {}; viewBank().items.forEach(it => (it.accounts || []).forEach(a => { names[a.id] = `${it.institution.name} ${a.name}${a.mask ? ' ••' + a.mask : ''}`; }));
    const tx = Object.values(viewTx().tx).filter(t => t.date >= from).map(t => ({ ...t, accountName: names[t.account] || '' })).sort((a, b) => b.date.localeCompare(a.date));
    return send(res, 200, { tx });
  }
  const dm = p.match(/^\/api\/bank\/items\/([A-Za-z0-9_-]+)$/);
  if (dm && req.method === 'DELETE') {
    const bank = loadBank(), it = bank.items.find(x => x.item_id === dm[1]); if (!it) return send(res, 404, { error: 'unknown connection' });
    try { await plaid('/item/remove', { access_token: it.access_token }); } catch (e) { log('item remove', e.code); }
    bank.items = bank.items.filter(x => x !== it); writeJ(BANK_FILE, bank);
    const store = loadTx(); for (const k of Object.keys(store.tx)) if (store.tx[k].item === it.item_id) delete store.tx[k]; writeJ(TX_FILE, store);
    const loans = loadLoans(); for (const k of Object.keys(loans.acct)) if (loans.acct[k].item === it.item_id || (it.accounts || []).some(a => a.id === k)) delete loans.acct[k]; writeJ(LOAN_FILE, loans);
    const inv = loadInv(); for (const k of Object.keys(inv.acct)) if (inv.acct[k].item === it.item_id) delete inv.acct[k];
    for (const k of Object.keys(inv.flows)) if (inv.flows[k].item === it.item_id) delete inv.flows[k]; writeJ(INV_FILE, inv);
    return send(res, 200, { ok: true });
  }
  return send(res, 404, { error: 'not found' });
}

// Responses over 1 KB are gzipped when the browser accepts it (res.gz, set per request). Bank transactions
// and the app page shrink to a fraction of their size.
function send(res, code, body, headers = {}) {
  const isObj = typeof body === 'object' && !Buffer.isBuffer(body);
  let out = isObj ? JSON.stringify(body) : body;
  const h = {
    'Content-Type': isObj ? 'application/json; charset=utf-8' : (headers['Content-Type'] || 'text/plain; charset=utf-8'),
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    ...headers,
  };
  if (res.gz && !h['Content-Encoding'] && out && out.length > 1024) { out = zlib.gzipSync(out, { level: 5 }); h['Content-Encoding'] = 'gzip'; }
  if (res.gz !== undefined) h['Vary'] = 'Accept-Encoding';
  res.writeHead(code, h);
  res.end(out);
}
// The app's files, each kept in memory (text ones also gzipped) with an ETag until the file changes on disk, so an
// edit takes effect on the next reload (no restart) and browsers re-download only files that changed (304 otherwise).
// Only these file types are served, and only from inside app/public.
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.woff': 'font/woff', '.webmanifest': 'application/manifest+json' };
const FILES = new Map();
function staticFile(p) {
  let rel; try { rel = p === '/' ? 'index.html' : decodeURIComponent(p.slice(1)); } catch (_) { return null; }
  const f = path.resolve(PUBLIC, rel), type = TYPES[path.extname(f)];
  if (!type || !f.startsWith(PUBLIC + path.sep)) return null;
  let st; try { st = fs.statSync(f); } catch (_) { return null; }
  if (!st.isFile()) return null;
  let c = FILES.get(f);
  if (!c || c.m !== st.mtimeMs || c.s !== st.size) {
    const raw = fs.readFileSync(f), text = /^(text|application)\/|svg/.test(type);
    c = { m: st.mtimeMs, s: st.size, raw, type, gz: text ? zlib.gzipSync(raw, { level: 9 }) : null, etag: '"' + crypto.createHash('sha1').update(raw).digest('base64url').slice(0, 20) + '"' };
    FILES.set(f, c);
  }
  return c;
}
function authorized(req) {
  if (!AUTH) return true;
  const h = req.headers.authorization || '';
  if (!h.startsWith('Basic ')) return false;
  const given = Buffer.from(h.slice(6), 'base64');
  const want = Buffer.from(AUTH);
  return given.length === want.length && crypto.timingSafeEqual(given, want);
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', c => { size += c.length; if (size > MAX_BODY) { reject(Object.assign(new Error('too large'), { code: 413 })); req.destroy(); } else chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  try {
    if (!authorized(req)) return send(res, 401, 'Password required', { 'WWW-Authenticate': 'Basic realm="Budgeteer", charset="UTF-8"' });
    res.gz = /\bgzip\b/.test(req.headers['accept-encoding'] || '');
    let url; try { url = new URL(req.url, 'http://x'); } catch (_) { return send(res, 400, 'Bad request'); }
    const p = url.pathname.replace(/\/+$/, '') || '/';

    if (p === '/api/health') return send(res, 200, { ok: true, app: 'budgeteer' });


    if (p.startsWith('/api/bank/')) {
      try { return await bankRoute(p, req, res, url); }
      catch (e) { log('bank error', e.code, e.message); return send(res, 502, { error: e.display || e.message, code: e.code || '' }); }
    }

    if (p === '/api/rev' && req.method === 'GET') return send(res, 200, { rev: revOf(readData()) });

    // Daily copies of the budget, newest first, plus the copies saved just before a restore (so a restore can be undone).
    if (p === '/api/backups' && req.method === 'GET') return send(res, 200, { backups: listBackups() });
    if (p === '/api/backups/restore' && req.method === 'POST') {
      let b; try { b = JSON.parse(await readBody(req) || '{}'); } catch (_) { return send(res, 400, { error: 'bad json' }); }
      const bk = listBackups().find(x => x.id === b.id);
      if (!bk) return send(res, 404, { error: 'That copy no longer exists.' });
      let j; try { j = JSON.parse(fs.readFileSync(path.join(BACKUP_DIR, bk.id), 'utf8')); } catch (_) { return send(res, 400, { error: 'That copy can’t be read.' }); }
      if (!j || !j.data || !j.data.plans || !j.data.loans) return send(res, 400, { error: 'That copy isn’t budget data.' });
      const cur = readData(), curRev = revOf(cur);
      if (cur) {   // keep what's there now, so this restore can be undone
        fs.writeFileSync(path.join(BACKUP_DIR, `budgeteer-before-restore-${new Date().toISOString().replace(/[:.]/g, '-')}.json`), JSON.stringify(cur));
        const old = fs.readdirSync(BACKUP_DIR).filter(f => /^budgeteer-before-restore-/.test(f)).sort();
        while (old.length > 10) fs.unlinkSync(path.join(BACKUP_DIR, old.shift()));
      }
      const rev = Math.max(Date.now(), curRev + 2);
      writeAtomic({ app: 'budgeteer', version: 2, savedAt: new Date().toISOString(), rev, restoredFrom: bk.id, data: j.data });
      log('restored', bk.id);
      return send(res, 200, { ok: true, rev });
    }

    if (p === '/api/data' && req.method === 'GET') {
      const j = readData();
      if (!j) return send(res, 404, { error: 'no data yet' });
      return send(res, 200, { ...j, rev: revOf(j) });
    }

    if (p === '/api/data' && req.method === 'PUT') {
      let body;
      try { body = JSON.parse(await readBody(req)); } catch (e) { return send(res, e.code === 413 ? 413 : 400, { error: e.code === 413 ? 'too large' : 'bad json' }); }
      const d = body && body.data;
      if (!d || !d.plans || !d.loans) return send(res, 400, { error: 'not budget data' });
      const cur = readData(), curRev = revOf(cur);
      if (body.baseRev != null && cur && body.baseRev !== curRev) return send(res, 409, { error: 'changed', rev: curRev });
      const rev = Math.max(Date.now(), curRev + 2);
      const out = { app: 'budgeteer', version: 2, savedAt: new Date().toISOString(), rev, data: d };
      dailyBackup();
      writeAtomic(out);
      return send(res, 200, { rev, savedAt: out.savedAt });
    }

    const sf = !p.startsWith('/api/') && (req.method === 'GET' || req.method === 'HEAD') && staticFile(p);
    if (sf) {
      const h = { 'Content-Type': sf.type, 'Cache-Control': 'no-cache', ETag: sf.etag, 'Vary': 'Accept-Encoding', 'X-Content-Type-Options': 'nosniff' };
      if (req.headers['if-none-match'] === sf.etag) { res.writeHead(304, h); return res.end(); }
      const gz = res.gz && sf.gz, body = gz ? sf.gz : sf.raw; if (gz) h['Content-Encoding'] = 'gzip';
      h['Content-Length'] = body.length; res.writeHead(200, h);
      return res.end(req.method === 'HEAD' ? undefined : body);
    }
    return send(res, 404, 'Not found');
  } catch (e) {
    log('error', e);
    return send(res, 500, { error: 'server error' });
  }
});

server.listen(PORT, () => log(`Budgeteer on port ${PORT}, saving to ${FILE}${AUTH ? ' (password on)' : ''}${bankOn() ? `, bank sync on (Plaid ${PLAID_ENV})` : ''}`));
process.on('SIGTERM', () => server.close(() => process.exit(0)));
