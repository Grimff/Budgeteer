// The React screens. Loaded by index.html after the other js files (which it uses by name: S, plan, f0, …) and
// before sample.js / server-sync.js, so the app starts with these screens in place.
import { draw, replaceScreen, LEGACY } from './bridge.js';
import { addParity, addPiece, runParity, monthsToTry, emptyHousehold, withS, at } from './parity.js';
import { History } from './screens/History.jsx';
import { Wealth } from './screens/Wealth.jsx';
import { Goals } from './screens/Goals.jsx';
import { Loans } from './screens/Loans.jsx';
import { Settings, NtCard } from './screens/Settings.jsx';
import { Bank } from './screens/Bank.jsx';
import { ThisMonth, RcList } from './screens/Budget.jsx';
import { Forecast, FcBody } from './screens/Forecast.jsx';
import { Build } from './screens/Build.jsx';
import { catRenderR, flowRenderR } from './popups/Category.jsx';
import { lnkListR, lnkRuleR } from './popups/Link.jsx';
import { openDR } from './popups/Amount.jsx';
import { spFormR, spAddPartR } from './popups/Split.jsx';
import { compareViewR } from './flow/Compare.jsx';
import { zbarR, skTipR, skCardR } from './flow/Card.jsx';
import { sankeyR } from './flow/Sankey.jsx';
import { bankBadgeR, fsUIR } from './chrome.jsx';

replaceScreen('renderHistory', () => draw($('#T-history'), <History />));
// Budget: This month is React; Build budget and Forecast are still drawn by renderBuild / renderForecast. The
// money-flow chart is drawn into #sk by sankey() afterwards, as before.
replaceScreen('renderBudget', () => { if (BUDV === 'build') return renderBuild(); if (BUDV === 'fc') return renderForecast(); draw($('#T-budget'), <ThisMonth />); sankey(); });
// Forecast: the frame, then the body into #fcb (the what-if sliders, range and month buttons redraw only the body);
// FSC: scroll the open schedule editor or the month detail into view after adding/opening.
replaceScreen('fcBody', () => { const el = $('#fcb'); if (!el) return; draw(el, <FcBody />); if (FSC) { FSC = false; const t = $('.fcle') || ($('.fcd') && FDK ? $('.fcd') : null); if (t) t.scrollIntoView({ block: 'nearest', behavior: RM ? 'auto' : 'smooth' }); } });
// Pop-ups (phase 2): drawn into the parts of their dialogs in index.html.
replaceScreen('catRender', catRenderR);
replaceScreen('flowRender', flowRenderR);
replaceScreen('lnkList', lnkListR);
replaceScreen('lnkRule', lnkRuleR);
replaceScreen('openD', openDR);
replaceScreen('spForm', spFormR);
replaceScreen('spAddPart', spAddPartR);
replaceScreen('compareView', compareViewR);
replaceScreen('zbar', zbarR);
replaceScreen('skTip', skTipR);
replaceScreen('skCard', skCardR);
replaceScreen('sankey', sankeyR);
replaceScreen('bankBadge', bankBadgeR);
replaceScreen('fsUI', fsUIR);
replaceScreen('renderBuild', () => draw($('#T-budget'), <Build />));
replaceScreen('renderForecast', () => { draw($('#T-budget'), <Forecast />); fcBody(); });
// bankBadge (the count on the Bank tab) ran at the end of the old renderBank once the bank was set up.
replaceScreen('renderBank', () => { const el = $('#T-bank'); if (!el) return; draw(el, <Bank />); if (SRV && BK.st && BK.st.configured) bankBadge(); });
replaceScreen('renderSettings', () => { const el = $('#T-settings'); if (el) draw(el, <Settings />); });
replaceScreen('renderLoans', () => draw($('#T-loans'), <Loans />));
replaceScreen('renderGoals', () => draw($('#T-goals'), <Goals />));
replaceScreen('renderWealth', () => { const el = $('#T-wealth'); if (el) draw(el, <Wealth />); });

// Parity cases: the same data drawn both ways (self-test only).
const setHR = v => { const o = HR; HR = v; return () => { HR = o; }; };
addParity({
  name: 'History', fn: 'renderHistory', el: '#T-history', cases: () => {
    const c = [];
    for (const k of monthsToTry()) for (const r of ['6', '12', 'all']) c.push({ label: `${k} ${r}`, set: () => at(k, () => setHR(r)) });
    c.push({ label: 'folds open', set: () => { OPEN.add('h-' + addM(TK, -1)); OPEN.add('h-' + addM(TK, -2)); return () => { OPEN.delete('h-' + addM(TK, -1)); OPEN.delete('h-' + addM(TK, -2)); }; } });
    c.push({ label: 'history start set', set: () => { const o = S.histFrom; S.histFrom = addM(TK, -2); return () => { S.histFrom = o; }; } });
    c.push({ label: 'empty household', set: () => withS(emptyHousehold()) });
    return c;
  },
});
// Set obj[key] for one case; returns the undo.
const swap = (obj, key, v) => { const had = key in obj, o = obj[key]; obj[key] = v; return () => { if (had) obj[key] = o; else delete obj[key]; }; };
const both = (...u) => () => u.reverse().forEach(f => f && f());
// The bank accounts changed for one case.
const accts = fn => () => swap(BK, 'accts', fn(clone(BK.accts || [])));
addParity({
  name: 'Wealth', fn: 'renderWealth', el: '#T-wealth', cases: () => {
    const c = [], ks = monthsToTry();
    for (const k of ks) c.push({ label: k, set: () => at(k) });
    for (const r of RANGES.map(x => x[0])) for (const k of [addM(TK, -1), TK, addM(TK, 1)]) c.push({ label: `${k} ${r}`, set: () => at(k, () => { const o = WR; WR = r; return () => { WR = o; }; }) });
    c.push({ label: 'server unreachable', set: () => { const o = SRV; SRV = false; return () => { SRV = o; }; } });
    c.push({ label: 'loading', set: () => swap(BK, 'accts', null) });
    c.push({ label: 'bank error', set: () => both(swap(BK, 'accts', null), swap(BK, 'err', 'Couldn’t reach the bank service on the server.')) });
    c.push({ label: 'no keys', set: () => swap(BK, 'st', { ...BK.st, configured: false }) });
    c.push({ label: 'needs consent', set: () => swap(BK, 'st', { ...BK.st, items: [...(BK.st.items || []), { item_id: 'x1', institution: { name: 'A & B <Bank>' }, inv: 'consent' }] }) });
    c.push({ label: 'holdings open', set: () => { const ids = (BK.accts || []).map(a => 'w-' + a.id); ids.forEach(i => OPEN.add(i)); return () => ids.forEach(i => OPEN.delete(i)); } });
    c.push({ label: 'no holdings yet', set: accts(A => A.map(a => a.type === 'investment' ? { ...a, holdings: undefined } : a)) });
    c.push({ label: 'empty holdings', set: accts(A => A.map(a => a.type === 'investment' ? { ...a, holdings: [] } : a)) });
    c.push({ label: 'one holding, cash, no cost', set: accts(A => A.map(a => a.type === 'investment' ? { ...a, holdings: [{ name: 'Cash', cash: true, value: 12.5 }, { name: 'Fund\uFFFD', ticker: null, qty: 1.23456, value: 99, cost: null }].slice(0, 2) } : a)) });
    c.push({ label: 'masks, available, odd names', set: accts(A => A.map((a, i) => ({ ...a, mask: '12' + i, avail: (+a.bal || 0) + 10, official: i % 2 ? 'Joint & <Savings>' : a.official, subtype: i % 3 ? a.subtype : 'some type' }))) });
    c.push({ label: 'one day of values', set: accts(A => A.map(a => a.type === 'investment' ? { ...a, days: { [ymd(NOW)]: +a.bal || 0 }, flows: [] } : a)) });
    c.push({ label: 'no history at all', set: accts(A => A.map(a => ({ ...a, days: {}, flows: [] }))) });
    c.push({ label: 'no investments or cards', set: accts(A => A.filter(a => a.type === 'depository')) });
    c.push({ label: 'no accounts', set: accts(() => []) });
    c.push({ label: 'empty household', set: () => withS(emptyHousehold()) });
    return c;
  },
});
// A changed copy of the budget for one case.
const tweak = fn => () => { const c = clone(S); fn(c); return withS(c); };
const goalAccts = () => (BK.accts || []).filter(a => ['depository', 'investment'].includes(a.type));
addParity({
  name: 'Goals', fn: 'renderGoals', el: '#T-goals', cases: () => {
    const c = [];
    for (const k of monthsToTry()) c.push({ label: k, set: () => at(k) });
    for (const r of ['1y', '2y', '5y', 'all']) for (const k of [TK, addM(TK, 2)]) c.push({ label: `${k} ${r}`, set: () => at(k, () => { const o = GR; GR = r; return () => { GR = o; }; }) });
    const shut = v => () => { const had = BCL.has('galloc'), had2 = BCL.has('!galloc'); BCL.delete('galloc'); BCL.delete('!galloc'); BCL.add(v ? 'galloc' : '!galloc'); return () => { BCL.delete('galloc'); BCL.delete('!galloc'); if (had) BCL.add('galloc'); if (had2) BCL.add('!galloc'); }; };
    c.push({ label: 'accounts card open', set: shut(false) });
    c.push({ label: 'accounts card shut', set: shut(true) });
    c.push({ label: 'folds open', set: () => { const ids = S.goals.map(g => 'g-' + g.id); ids.forEach(i => OPEN.add(i)); return () => ids.forEach(i => OPEN.delete(i)); } });
    for (const k of [addM(TK, -1), TK, addM(TK, 1)]) {
      c.push({ label: k + ' split by %', set: () => both(shut(false)(), tweak(s => { const A = goalAccts(); s.alloc = {}; A.forEach((a, i) => { s.alloc[a.id] = { mode: i % 2 ? 'order' : 'split', goals: s.goals.map(g => g.id), pct: Object.fromEntries(s.goals.map((g, j) => [g.id, 30 + j * 20])), rest: i % 3 === 2 ? 'none' : 'last' }; }); s.alloc['gone-acct'] = { mode: 'order', goals: [], rest: 'none' }; })(), at(k)) });
      c.push({ label: k + ' dates, deposits, odd names', set: () => both(tweak(s => { s.goals.forEach((g, i) => { g.by = addM(TK, i % 2 ? 2 : 40); g.name = g.name + (i ? ' & <co>' : '\uFFFD'); if (g.kind === 'emergency') g.auto = !g.auto; }); const m = s.months[k] || (s.months[k] = { act: {}, pay: {}, dep: {} }); m.dep = m.dep || {}; if (s.goals[0]) m.dep[s.goals[0].id] = 123.45; })(), at(k)) });
    }
    c.push({ label: 'split over 100%', set: () => both(shut(false)(), tweak(s => { const A = goalAccts(); s.alloc = {}; A.forEach(a => { s.alloc[a.id] = { mode: 'split', goals: s.goals.map(g => g.id), pct: Object.fromEntries(s.goals.map(g => [g.id, 75])) }; }); })()) });
    c.push({ label: 'one-month override', set: () => both(tweak(s => { const k = addM(TK, 1), m = s.months[k] || (s.months[k] = { act: {}, pay: {}, dep: {} }); m.gplan = {}; s.goals.forEach(g => { m.gplan[g.id] = 77; }); })(), at(addM(TK, 1))) });
    c.push({ label: 'server unreachable', set: () => { const o = SRV; SRV = false; return () => { SRV = o; }; } });
    c.push({ label: 'bank loading', set: () => swap(BK, 'accts', null) });
    c.push({ label: 'no goals', set: tweak(s => { s.goals = []; s.alloc = {}; }) });
    c.push({ label: 'empty household', set: () => withS(emptyHousehold()) });
    return c;
  },
});
addParity({
  name: 'Loans', fn: 'renderLoans', el: '#T-loans', cases: () => {
    const c = [], ids = () => S.loans.map(l => 'l-' + l.id);
    const shutK = (key, v) => () => { const a = BCL.has(key), b = BCL.has('!' + key); BCL.delete(key); BCL.delete('!' + key); BCL.add(v ? key : '!' + key); return () => { BCL.delete(key); BCL.delete('!' + key); if (a) BCL.add(key); if (b) BCL.add('!' + key); }; };
    const folds = () => { const L = ids(); L.forEach(i => OPEN.add(i)); return () => L.forEach(i => OPEN.delete(i)); };
    for (const k of monthsToTry()) c.push({ label: k, set: () => at(k, folds) });
    for (const r of RANGES.map(x => x[0])) for (const k of [addM(TK, -3), TK, addM(TK, 2)]) c.push({ label: `${k} ${r}`, set: () => at(k, () => { const o = LR; LR = r; return () => { LR = o; }; }) });
    c.push({ label: 'what-if moved, plan typed, smallest first', set: () => { const w = { ...WI }, o = [PX, PS]; S.loans.forEach(l => { WI[l.id] = 45; }); PX = 150; PS = 'bal'; const u = folds(); return () => { u(); Object.keys(WI).forEach(k => delete WI[k]); Object.assign(WI, w); [PX, PS] = o; }; } });
    c.push({ label: 'plan typed 0', set: () => { const o = PX; PX = 0; return () => { PX = o; }; } });
    c.push({ label: 'lenders card open', set: shutK('lsetup', false) });
    c.push({ label: 'a linked loan', set: () => both(linkOne(), folds()) });
    c.push({ label: 'a linked loan, payments from your bank', set: () => both(linkOne(), tweak(s => { s.loans.forEach(l => { if (l.acct) l.paySrc = 'bank'; }); })(), folds()) });
    c.push({ label: 'lenders card shut', set: shutK('lsetup', true) });
    c.push({ label: 'syncing', set: () => both(swap(BK, 'busy', true), shutK('lsetup', false)()) });
    c.push({ label: 'lender needs consent, loans to track', set: () => both(shutK('lsetup', false)(), swap(BK, 'st', { ...BK.st, items: [...(BK.st.items || []), { item_id: 'x2', institution: { name: 'Lender & Co' }, liab: 'consent' }] }), swap(BK, 'loans', [...(BK.loans || []), { id: 'free1', type: 'loan', institution: 'Lender & Co', official: 'Auto <loan>', mask: '9876', subtype: 'auto', bal: 5400.5, liab: { apr: 6.9, min: 210 }, months: {}, pays: {} }, { id: 'free2', type: 'loan', institution: 'Other', name: 'Personal', subtype: 'weird', bal: null, months: {}, pays: {} }])) });
    c.push({ label: 'no loan accounts', set: () => both(shutK('lsetup', false)(), swap(BK, 'loans', (BK.loans || []).filter(a => a.type !== 'loan'))) });
    c.push({ label: 'loans changed by hand', set: () => both(folds(), tweak(s => { s.loans.forEach((l, i) => { l.name += i ? ' & <b>' : '\uFFFD'; if (i % 2) { l.orig = l.bal * 1.5; l.origStart = addM(l.start, -12); } else { l.due = 28; } if (i === 0) l.paySrc = 'bank'; }); const k = TK, m = s.months[k] || (s.months[k] = { act: {}, pay: {}, dep: {} }); m.pay = m.pay || {}; if (s.loans[0]) m.pay[s.loans[0].id] = s.loans[0].min + 100; m.lxp = { [s.loans[0] && s.loans[0].id]: 50 }; })()) });
    c.push({ label: 'a loan paid off, paid-off card open', set: () => both(shutK('lpaid', false)(), tweak(s => { s.loans.push({ id: 'done1', name: 'Old card', apr: 20, bal: 300, min: 100, due: 5, start: addM(TK, -10), color: '#fff' }); })()) });
    c.push({ label: 'every loan paid off', set: tweak(s => { s.loans = [{ id: 'done1', name: 'Old card', apr: 20, bal: 300, min: 100, due: 5, start: addM(TK, -10), color: '#fff' }]; s.al = []; }) });
    c.push({ label: 'never paid off', set: tweak(s => { s.loans.push({ id: 'big1', name: 'Huge', apr: 30, bal: 100000, min: 50, due: 0, start: TK, color: '#abc' }); }) });
    c.push({ label: 'never paid off, plan pays it', set: () => both(tweak(s => { s.loans.push({ id: 'big2', name: 'Big', apr: 20, bal: 5000, min: 50, due: 0, start: TK, color: '#abc' }); })(), (() => { const o = PX; PX = 500; return () => { PX = o; }; })()) });
    c.push({ label: 'starts later', set: () => both(folds(), tweak(s => { s.loans.push({ id: 'late1', name: 'Later', apr: 4, bal: 2000, min: 100, due: 1, start: addM(TK, 3), color: '#abc' }); })()) });
    const linkedIds = () => new Set(S.loans.map(l => l.acct).filter(Boolean));
    // a loan linked to the sample's student-loan account, as Track does (linkLoan)
    const linkOne = () => tweak(s => { const a = (BK.loans || []).find(x => x.type === 'loan'); if (a && !s.loans.some(l => l.acct === a.id)) s.loans.push({ id: 'lk1', name: 'Linked loan', apr: 5, bal: openBal(a), min: 200, due: 10, start: TK, color: '#8fc9ff', acct: a.id, anch: { k: TK, eob: openBal(a) } }); })();
    c.push({ label: 'lender fills the details', set: () => both(linkOne(), folds(), swap(BK, 'loans', (BK.loans || []).map(a => linkedIds().has(a.id) ? { ...a, liab: { ...(a.liab || {}), apr: 5.5, min: 300, next: TK + '-15', orig: 50000, origDate: '2019-08-01' } } : a))) });
    c.push({ label: 'linked account gone', set: () => both(linkOne(), folds(), swap(BK, 'loans', (BK.loans || []).filter(a => !linkedIds().has(a.id)))) });
    c.push({ label: 'lender connected twice', set: () => both(linkOne(), shutK('lsetup', false)(), swap(BK, 'loans', [...(BK.loans || []), ...(BK.loans || []).filter(a => linkedIds().has(a.id)).map(a => ({ ...a, id: a.id + '-again' }))])) });
    for (const k of [addM(TK, -1), TK]) c.push({ label: k + ' linked payment not seen', set: () => both(folds(), tweak(s => { s.loans.push({ id: 'hand1', name: 'Hand loan', apr: 7, bal: 4000, min: 150, due: 1, start: addM(TK, -3), color: '#abc' }); s.rules = [...(s.rules || []), { id: 'rhand', p: 'HAND LENDER PAYMENT', dir: 'out', v: 'l:hand1' }]; })(), at(k)) });
    c.push({ label: 'loans from before tracking', set: tweak(s => { s.loans.forEach(l => { l.orig = l.bal * 1.4; l.origStart = addM(l.start, -24); }); }) });
    c.push({ label: 'server unreachable', set: () => { const o = SRV; SRV = false; return () => { SRV = o; }; } });
    c.push({ label: 'no bank loans data', set: () => swap(BK, 'loans', null) });
    c.push({ label: 'empty household', set: () => withS(emptyHousehold()) });
    return c;
  },
});
const setVar = (get, set) => v => () => { const o = get(); set(v); return () => set(o); };
const sv = setVar(() => SV, v => { SV = v; }), rq = setVar(() => RQ, v => { RQ = v; }), bkp = setVar(() => BKP, v => { BKP = v; }), nt = setVar(() => NOTIFY, v => { NOTIFY = v; });
const cvSet = (text, more) => () => { const o = CV; CV = {}; cvLoadText(text, 'my bank & co.csv'); if (more) Object.assign(CV, more); return () => { CV = o; }; };
const CSV = 'Date,Description,Amount,Credit\n01/05/2026,COFFEE & CO,-4.50,\n01/06/2026,PAYROLL,,1200.00\n13/45/2026,BAD DATE,-1,\n01/07/2026,ZERO,0,\n';
addParity({
  name: 'Settings', fn: 'renderSettings', el: '#T-settings', cases: () => {
    const c = [], V = ['general', 'rules', 'connections', 'data', 'bogus'];
    for (const v of V) c.push({ label: v, set: sv(v) });
    for (const k of monthsToTry()) for (const v of ['rules', 'data']) c.push({ label: `${k} ${v}`, set: () => both(sv(v)(), at(k)) });
    for (const q of ['gro', 'ZZZ', 'transfer', ' ']) c.push({ label: 'rules search ' + q, set: () => both(sv('rules')(), rq(q)()) });
    c.push({ label: 'rule folds open', set: () => { const ids = (S.rules || []).map(r => 'rm-' + r.id); ids.forEach(i => OPEN.add(i)); return both(sv('rules')(), () => ids.forEach(i => OPEN.delete(i))); } });
    c.push({ label: 'odd rules', set: () => both(sv('rules')(), tweak(s => { const r = s.rules || []; if (r[0]) { r[0].v = 'i:gone'; r[0].shift = 'next'; r[0].min = 5; r[0].max = 99.5; } if (r[1]) { r[1].x = ['some store', 'other & co']; r[1].shift = 'prev'; } if (r[2]) r[2].p += ' & <x>'; s.catchAll = 'review'; })()) });
    c.push({ label: 'no rules', set: () => both(sv('rules')(), tweak(s => { s.rules = []; })()) });
    // Health checks that fail (the sample passes them all): each message and button kind, with odd names.
    const bkSet = (f) => () => { const o = { st: BK.st, accts: BK.accts, tx: BK.tx }; BK.st = clone(BK.st); BK.accts = (BK.accts || []).slice(); BK.tx = (BK.tx || []).slice(); f(); return () => { Object.assign(BK, o); }; };
    // the card's bank named like its payments' text, so the payments are matched to it
    const rwd = C => { BK.accts = BK.accts.map(a => C.includes(a.id) ? { ...a, institution: 'Rwd & <Co>' } : a); };
    const crd = () => (BK.accts || []).filter(a => a.type === 'credit').map(a => a.id);
    // card payments from checking that aren't paired: filed Ignore by hand, so the card's own purchases must be there
    const cardPays = tweak(s => { Object.entries(s.txd).forEach(([id, r]) => { if (r.auto === 'pair' && r.amt > 0) { const t = BK.tx.find(x => x.id === id); if (t && acctType(t.account) === 'depository') { delete r.auto; r.v = 'skip'; } } }); });
    const H = [
      ['bank needs sign-in', bkSet(() => { (BK.st.items || []).forEach((it, i) => { if (i === 0) it.error = { code: 'ITEM_LOGIN_REQUIRED' }; it.institution = { ...(it.institution || {}), name: 'Bank & <Co>' }; }); })],
      ['transfers as spending', tweak(s => { const f = plan().groups.find(g => g.flex).items[0].id; Object.values(s.txd).filter(r => r.auto === 'pair').slice(0, 3).forEach(r => { r.v = 'i:' + f; delete r.auto; }); })],
      ['card not connected', () => both(cardPays(), bkSet(() => { const C = crd(); BK.accts = BK.accts.filter(a => !C.includes(a.id)); BK.tx = BK.tx.filter(t => !C.includes(t.account)); })())],
      ['card sends nothing', () => both(cardPays(), bkSet(() => { const C = crd(); rwd(C); BK.tx = BK.tx.filter(t => !C.includes(t.account)); })())],
      ['card starts late', () => both(cardPays(), bkSet(() => { const C = crd(); rwd(C); BK.tx = BK.tx.filter(t => !C.includes(t.account) || t.date >= TK); })())],
      ['to review, paycheck and bill missed', tweak(s => { const lm = addM(TK, -1), p = plan(lm), inc = p.income[0], bill = p.groups.find(g => !g.flex).items[0]; p.income[0] && Object.values(s.plans).forEach(q => q.income.forEach(i => { if (i.id === inc.id) i.name = 'Pay & <bonus>'; })); for (const [id, r] of Object.entries(s.txd)) if (r.k === lm && (r.v === 'inc:' + inc.id || r.v === 'i:' + bill.id)) delete s.txd[id]; })],
      ['split over 100%', tweak(s => { const a = (BK.accts || []).find(x => x.type === 'depository'); s.alloc = { ...(s.alloc || {}), [a.id]: { mode: 'split', goals: s.goals.map(g => g.id), pct: Object.fromEntries(s.goals.map(g => [g.id, 80])), rest: 'last' } }; })],
    ];
    for (const [l, f] of H) c.push({ label: 'health: ' + l, set: () => both(sv('data')(), f()) });
    c.push({ label: 'health: everything at once', set: () => both(sv('data')(), ...H.slice(0, 2).map(([, f]) => f()), H[5][1](), H[6][1]()) });
    for (const b of [null, 'wait', [], [{ id: 'budgeteer-2026-11-01.json', kind: 'daily', at: '2026-11-01' }, { id: 'budgeteer-before-restore-1.json', kind: 'restore', at: '2026-11-02T10:30:00Z' }]]) c.push({ label: 'backups ' + JSON.stringify(b), set: () => both(sv('general')(), bkp(b)()) });
    c.push({ label: 'household named, catch-all set', set: () => both(sv('general')(), tweak(s => { s.hh = { name: 'The <Smiths> & co', sub: '' }; const g = plan().groups.find(g => g.items.length); if (g) s.catchAll = g.items[0].id; })()) });
    c.push({ label: 'catch-all to review', set: () => both(sv('general')(), tweak(s => { s.catchAll = 'review'; })()) });
    c.push({ label: 'catch-all removed item', set: () => both(sv('general')(), tweak(s => { s.catchAll = 'gone'; })()) });
    for (const v of ['general', 'rules', 'connections', 'data']) c.push({ label: v + ' server unreachable', set: () => both(sv(v)(), (() => { const o = SRV; SRV = false; return () => { SRV = o; }; })()) });
    c.push({ label: 'connections loading', set: () => both(sv('connections')(), swap(BK, 'st', null)) });
    c.push({ label: 'connections error', set: () => both(sv('connections')(), swap(BK, 'st', null), swap(BK, 'err', 'Couldn’t reach the bank service on the server.')) });
    c.push({ label: 'connections no keys', set: () => both(sv('connections')(), swap(BK, 'st', { ...BK.st, configured: false })) });
    c.push({ label: 'connections no keys, csv open', set: () => both(sv('connections')(), swap(BK, 'st', { ...BK.st, configured: false }), cvSet(CSV)()) });
    c.push({ label: 'csv open', set: () => both(sv('connections')(), cvSet(CSV)()) });
    c.push({ label: 'csv two columns, new account', set: () => both(sv('connections')(), cvSet(CSV, { two: '1', oc: '2', ic: '3', acct: 'new', nname: 'Credit <union>', ntype: 'credit', bal: '12.5' })()) });
    c.push({ label: 'csv day first, positive out, no name', set: () => both(sv('connections')(), cvSet(CSV, { df: 'dmy', sign: 'pos', acct: 'new', nname: ' ' })()) });
    c.push({ label: 'syncing, items with errors', set: () => both(sv('connections')(), swap(BK, 'busy', true), swap(BK, 'st', { ...BK.st, items: [...(BK.st.items || []).map((it, i) => i ? it : { ...it, error: { code: 'ITEM_LOGIN_REQUIRED' } }), { item_id: 'e2', institution: { name: 'Other & <Bank>' }, accounts: [], error: { code: 'X', message: 'Something <broke>' } }, { item_id: 'csv', kind: 'csv', institution: { name: 'Imported' }, accounts: [{ name: 'CU', mask: '' }], count: 3 }, { item_id: 'n1', institution: { name: 'New' }, accounts: [{ name: 'Chk', mask: '1' }], count: 0 }] })) });
    for (const rf of [null, { hours: 5, open: false, last: null, next: null }, { hours: 0, open: true, last: '2026-11-20T10:00:00Z', next: null }, { hours: 24, open: false, last: '2026-11-20T10:00:00Z', next: '2026-11-21T10:00:00Z' }]) c.push({ label: 'refresh ' + JSON.stringify(rf), set: () => both(sv('connections')(), swap(BK, 'st', { ...BK.st, refresh: rf })) });
    c.push({ label: 'no banks', set: () => both(sv('connections')(), swap(BK, 'st', { ...BK.st, items: [] })) });
    c.push({ label: 'data, things to look at', set: () => both(sv('data')(), swap(BK, 'st', { ...BK.st, items: (BK.st.items || []).map((it, i) => i ? it : { ...it, institution: { name: 'Bank & Trust' }, error: { code: 'ITEM_LOGIN_REQUIRED' } }) }), tweak(s => { const ids = Object.keys(s.txd || {}).slice(0, 3); ids.forEach(id => delete s.txd[id]); s.alloc = { x: { mode: 'split', goals: [], pct: { a: 80, b: 40 } } }; })()) });
    c.push({ label: 'data, no bank data', set: () => both(sv('data')(), swap(BK, 'accts', null), swap(BK, 'tx', [])) });
    c.push({ label: 'data, linked loan, goals, removed', set: () => both(sv('data')(), tweak(s => { s.loans.forEach(l => { l.name += ' & <b>'; }); s.goals.forEach(g => { g.target = 0; }); })()) });
    c.push({ label: 'empty household', set: () => withS(emptyHousehold()) });
    c.push({ label: 'empty household data', set: () => both(sv('data')(), withS(emptyHousehold())) });
    return c;
  },
});
// The phone-alerts card is hidden in sample mode; compared on its own with sample mode off.
addPiece({
  name: 'Phone alerts card', html: () => (0, eval)('(function(DEMO){return (' + ntCard.toString() + ')()})')(false), node: () => <NtCard demo={false} />,
  cases: () => [null, { configured: false }, { configured: true, target: 'ntfy.sh/our-topic & <x>' }, { configured: true }].map(n => ({ label: JSON.stringify(n), set: nt(n) })),
});
const bv = setVar(() => BV, v => { BV = v; }), flf = setVar(() => FLF, v => { FLF = v; }), flq = setVar(() => FLQ, v => { FLQ = v; }), fln = setVar(() => FLN, v => { FLN = v; });
// Some transactions back in To review (unfiled), some pending, some moved to another month.
const unfile = n => tweak(s => { Object.keys(s.txd || {}).filter(id => !s.txd[id].sp && s.txd[id].v !== 'split').slice(0, n).forEach(id => delete s.txd[id]); });
addParity({
  name: 'Bank', fn: 'renderBank', el: '#T-bank', cases: () => {
    const c = [];
    for (const k of monthsToTry()) for (const v of ['review', 'filed', null]) c.push({ label: `${k} ${v}`, set: () => both(bv(v)(), at(k)) });
    for (const f of FLKIND.map(x => x[0])) c.push({ label: 'filter ' + f, set: () => both(bv('filed')(), flf(f)()) });
    for (const q of ['gro', 'zzz', 'Rent']) c.push({ label: 'search ' + q, set: () => both(bv('filed')(), flq(q)()) });
    c.push({ label: 'first 3 only', set: () => both(bv('filed')(), fln(3)()) });
    c.push({ label: 'filed: pending, moved, split, odd names', set: () => both(bv('filed')(), tweak(s => { const E = Object.entries(s.txd || {}).filter(([, r]) => r.k === TK); E.slice(0, 2).forEach(([id, r]) => { r.d = addM(TK, -1) + '-28'; }); if (E[2]) { E[2][1].n += ' & <co>\uFFFD'; } if (E[3]) { const [id, r] = E[3]; s.txd[id + '~0'] = { ...r, sp: id, amt: r.amt / 2 }; s.txd[id] = { ...r, v: 'split', parts: [id + '~0'], amt: 0 }; } if (E[4]) E[4][1].amt = -Math.abs(E[4][1].amt); })(), (() => { const ids = Object.keys(S.txd || {}).slice(0, 4); ids.forEach(i => PSET.add(i)); return () => ids.forEach(i => PSET.delete(i)); })()) });
    c.push({ label: 'to review', set: () => both(bv('review')(), unfile(12)()) });
    c.push({ label: 'to review, show 5, pending, how open', set: () => both(bv('review')(), unfile(12)(), swap(BK, 'show', 5), (() => { BK.tx.slice(0, 6).forEach(t => PSET.add(t.id)); OPEN.add('bhow'); return () => { BK.tx.slice(0, 6).forEach(t => PSET.delete(t.id)); OPEN.delete('bhow'); }; })()) });
    c.push({ label: 'to review, catch-all off', set: () => both(bv('review')(), tweak(s => { s.catchAll = 'review'; })()) });
    c.push({ label: 'double counts', set: () => both(bv('review')(), tweak(s => { const it = plan().groups.flatMap(g => g.items)[0], P = txPairs(); [...P.keys()].slice(0, 3).forEach(id => { if (s.txd[id]) { s.txd[id].v = 'i:' + (it ? it.id : 'x'); delete s.txd[id].auto; } }); })()) });
    c.push({ label: 'sandbox, syncing, errors', set: () => both(swap(BK, 'busy', true), swap(BK, 'st', { ...BK.st, env: 'sandbox', items: (BK.st.items || []).map((it, i) => i ? it : { ...it, error: { code: 'X' } }) })) });
    c.push({ label: 'two errors, never synced', set: () => swap(BK, 'st', { ...BK.st, syncing: true, items: (BK.st.items || []).map(it => ({ ...it, error: { code: 'X' }, lastSync: null })) }) });
    c.push({ label: 'no rules', set: tweak(s => { s.rules = []; }) });
    c.push({ label: 'no banks', set: () => swap(BK, 'st', { ...BK.st, items: [] }) });
    c.push({ label: 'no keys', set: () => swap(BK, 'st', { ...BK.st, configured: false }) });
    c.push({ label: 'loading', set: () => swap(BK, 'st', null) });
    c.push({ label: 'bank error', set: () => both(swap(BK, 'st', null), swap(BK, 'err', 'Couldn’t reach the bank service on the server.')) });
    c.push({ label: 'server unreachable', set: () => { const o = SRV; SRV = false; return () => { SRV = o; }; } });
    c.push({ label: 'empty household', set: () => withS(emptyHousehold()) });
    return c;
  },
});
const budv = setVar(() => BUDV, v => { BUDV = v; }), flow = setVar(() => S.flow, v => { S.flow = v; });
addParity({
  name: 'Budget (This month)', fn: 'renderBudget', el: '#T-budget', cases: () => {
    const c = [];
    for (const k of monthsToTry()) for (const f of ['plan', 'actual', 'compare']) c.push({ label: `${k} ${f}`, set: () => both(budv('month')(), flow(f)(), at(k)) });
    const guide = v => () => { const a = BCL.has('guide'), b = BCL.has('!guide'); BCL.delete('guide'); BCL.delete('!guide'); BCL.add(v ? 'guide' : '!guide'); return () => { BCL.delete('guide'); BCL.delete('!guide'); if (a) BCL.add('guide'); if (b) BCL.add('!guide'); }; };
    c.push({ label: 'set-up open, things to sort, alerts', set: () => both(budv('month')(), guide(false)(), unfile(6)(), swap(BK, 'st', { ...BK.st, items: (BK.st.items || []).map((it, i) => i ? it : { ...it, institution: { name: 'Bank & <Co>' }, error: { code: 'X', message: 'Sign <in>' } }) })) });
    c.push({ label: 'set-up shut', set: () => both(budv('month')(), guide(true)(), unfile(2)()) });
    // the other alert kinds: a linked bill due tomorrow and one due today (not paid yet), a spending line over plan; odd names
    c.push({ label: 'alerts: due soon, over plan', set: tweak(s => { const d = new Date().getDate(), p = plan(TK), B = p.groups.filter(g => !g.flex).flatMap(g => g.items).filter(i => rulesFor('i:' + i.id).length), F = p.groups.find(g => g.flex).items[0]; Object.values(s.plans).forEach(q => q.groups.forEach(g => g.items.forEach(i => { if (B[0] && i.id === B[0].id) { i.due = Math.min(31, d + 1); i.name += ' & <co>'; } if (B[1] && i.id === B[1].id) i.due = d; if (i.id === F.id) { i.amt = 1; i.name = '"' + i.name + '"'; } }))); for (const [id, r] of Object.entries(s.txd)) if (r.k === TK && B.slice(0, 2).some(b => r.v === 'i:' + b.id)) delete s.txd[id]; }) });
    c.push({ label: 'alerts hidden', set: () => { const o = { ...NTH }; alertsNow().forEach(a => { NTH[a.key] = 1; }); return () => { Object.keys(NTH).forEach(k => delete NTH[k]); Object.assign(NTH, o); }; } });
    c.push({ label: 'review done / swept', set: tweak(s => { const lk = addM(TK, -1), m = s.months[lk] || (s.months[lk] = { act: {}, pay: {}, dep: {} }); m.swept = 321; }) });
    c.push({ label: 'review dismissed', set: tweak(s => { const lk = addM(TK, -1), m = s.months[lk] || (s.months[lk] = { act: {}, pay: {}, dep: {} }); m.rv = 1; }) });
    c.push({ label: 'left-over rules', set: tweak(s => { const g = s.goals[0], l = s.loans[0]; s.al = [...(s.al || []), g && { id: 'x1', to: 'g:' + g.id, src: 'extra', mode: '%', v: 50, from: addM(TK, -2) }, l && { id: 'x2', to: 'l:' + l.id, src: 'extra', mode: '%', v: 30, from: addM(TK, -2) }].filter(Boolean); }) });
    for (const k of [addM(TK, -1), TK, addM(TK, 1)]) c.push({ label: k + ' one-time items, overrides, set-asides', set: () => both(at(k), tweak(s => {
      // the changes go in a new plan version from two months back
      const m = s.months[k] || (s.months[k] = { act: {}, pay: {}, dep: {} }), k0 = addM(k, -2), P = s.plans[k0] = clone(s.plans[Object.keys(s.plans).sort().filter(x => x <= k0).pop() || Object.keys(s.plans).sort()[0]]);
      m.extra = [{ id: 'oi1', kind: 'inc', name: 'Bonus & <tip>', amt: 400 }]; const fx = P.groups.find(g => !g.flex), fl = P.groups.find(g => g.flex);
      if (fx) { m.extra.push({ id: 'oi2', kind: 'item', gid: fx.id, name: 'Repair', amt: 150 }); if (fx.items[0]) { fx.items[0].freq = 6; fx.items[0].dm = 3; } if (fx.items[1]) fx.items[1].due = 2; if (fx.items[2]) fx.items[2].amt = 0; }
      if (fl && fl.items[1]) fl.items[1].amt = 0;
      if (s.goals[0]) { m.gplan = { [s.goals[0].id]: 90 }; } if (s.loans[0]) { m.lxp = { [s.loans[0].id]: 60 }; s.loans[0].due = 3; } })()) });
    c.push({ label: 'pending payments, hand purchases', set: () => both(tweak(s => { const m = s.months[TK] || (s.months[TK] = { act: {}, pay: {}, dep: {} }); const it = plan(TK).groups.find(g => g.flex); m.rc = [{ id: 'rc1', store: 'Corner & <shop>', amt: 12.5, item: it && it.items[0] && it.items[0].id, date: TK + '-05' }, { id: 'rc2', amt: 3, item: 'gone' }, { id: 'rc3', store: 'Bank one', amt: 9, bank: true }]; })(), (() => { const ids = Object.keys(S.txd || {}).filter(id => S.txd[id].k === TK); ids.forEach(i => PSET.add(i)); OPEN.add('rcl'); return () => { ids.forEach(i => PSET.delete(i)); OPEN.delete('rcl'); }; })()) });
    c.push({ label: 'linked loan', set: () => (tweak(s => { const a = (BK.loans || []).find(x => x.type === 'loan'); if (a) s.loans.push({ id: 'lk1', name: 'Linked loan', apr: 5, bal: openBal(a), min: 200, due: 10, start: TK, color: '#8fc9ff', acct: a.id, anch: { k: TK, eob: openBal(a) } }); s.loans.push({ id: 'h2', name: 'Hand & loan', apr: 3, bal: 900, min: 100, due: 0, start: addM(TK, -2), color: '#abc' }); }))() });
    c.push({ label: 'hand loan with a late linked payment', set: tweak(s => { s.loans.push({ id: 'h3', name: 'Late loan', apr: 4, bal: 2000, min: 150, due: 1, start: addM(TK, -2), color: '#abc' }); s.rules = [...(s.rules || []), { id: 'rh3', p: 'LATE LENDER PAY', dir: 'out', v: 'l:h3' }]; }) });
    c.push({ label: 'no bank (inputs)', set: () => { const o = SRV; SRV = false; return () => { SRV = o; }; } });
    c.push({ label: 'no bank, last month', set: () => both((() => { const o = SRV; SRV = false; return () => { SRV = o; }; })(), at(addM(TK, -1))) });
    c.push({ label: 'empty household', set: () => withS(emptyHousehold()) });
    c.push({ label: 'empty household, future', set: () => both(withS(emptyHousehold()), at(addM(TK, 2))) });
    return c;
  },
});
// The purchases list (rcList) as other callers use it, bank rows included.
addPiece({
  name: 'Purchases list', html: () => rcList({ rc: [{ id: 'a', store: 'Shop & <co>', amt: 12.5, item: (allItems(S.cur)[0] || { i: {} }).i.id, date: S.cur + '-03' }, { id: 'b', amt: 4, item: 'gone', bank: true, txid: 'p1' }, { id: 'c', store: 'X', amt: 1, bank: true, txid: 'p2', date: S.cur + '-09' }] }),
  node: () => <RcList m={{ rc: [{ id: 'a', store: 'Shop & <co>', amt: 12.5, item: (allItems(S.cur)[0] || { i: {} }).i.id, date: S.cur + '-03' }, { id: 'b', amt: 4, item: 'gone', bank: true, txid: 'p1' }, { id: 'c', store: 'X', amt: 1, bank: true, txid: 'p2', date: S.cur + '-09' }] }} />,
  cases: () => [{ label: 'closed' }, { label: 'open, one pending', set: () => { OPEN.add('rcl'); PSET.add('p1'); return () => { OPEN.delete('rcl'); PSET.delete('p1'); }; } }],
});
const fr = setVar(() => FR, v => { FR = v; }), wfs = setVar(() => WFS, v => { WFS = v; }), ale = setVar(() => ALE, v => { ALE = v; }), fdk = setVar(() => FDK, v => { FDK = v; });
// A schedule with every kind of item: set amounts, left-over shares, a snowball on some loans, kept, a stop month.
const sched = tweak(s => { const g = s.goals, l = s.loans.filter(x => !loanGone(x, TK)); s.al = [
  ...g.map((x, i) => ({ id: 'sg' + i, to: 'g:' + x.id, src: 'plan', mode: '$', v: 150 + i * 50, from: TK, until: i ? addM(TK, 9) : '', loans: [] })),
  ...l.map((x, i) => ({ id: 'sl' + i, to: 'l:' + x.id, src: i % 2 ? 'extra' : 'plan', mode: i % 2 ? '%' : '$', v: i % 2 ? 25 : 80, from: addM(TK, i), until: '', loans: [] })),
  ...g.slice(0, 1).map(x => ({ id: 'sd', to: 'g:' + x.id, src: 'extra', mode: '$', v: 60, from: addM(TK, 1), until: '', loans: [] })),
  { id: 'ss', to: 'snow', src: 'plan', mode: '$', v: 300, how: 'bal', roll: false, loans: l.slice(0, 1).map(x => x.id), from: addM(TK, 2), until: addM(TK, 30) },
  { id: 'sx', to: 'snow', src: 'extra', mode: '%', v: 40, how: 'rate', roll: true, loans: [], from: TK, until: '' },
  { id: 'sk', to: 'keep', src: 'extra', mode: '%', v: 100, from: TK, until: '' }]; g.forEach((x, i) => { x.by = addM(TK, i ? 6 : 48); }); });
addParity({
  name: 'Budget (Forecast)', fn: 'renderForecast', also: ['fcBody'], el: '#T-budget', cases: () => {
    const c = [];
    for (const r of ['12', '24', '60', 'all']) { c.push({ label: 'range ' + r, set: fr(r) }); c.push({ label: 'range ' + r + ', full schedule', set: () => both(fr(r)(), sched()) }); }
    for (const w of [{ inc: -800, cost: 0, extra: 0 }, { inc: 500, cost: 300, extra: 0 }, { inc: 0, cost: 0, extra: 700 }, { inc: -3000, cost: 3000, extra: 0 }]) c.push({ label: 'what if ' + JSON.stringify(w), set: () => both(wfs(w)(), sched()) });
    for (const id of ['sg0', 'sl0', 'sl1', 'ss', 'sx', 'sk']) c.push({ label: 'editing ' + id, set: () => both(sched(), ale(id)(), fr('all')()) });
    c.push({ label: 'month picked', set: () => both(sched(), fdk(addM(TK, 5))()) });
    c.push({ label: 'month picked outside range', set: () => both(fdk(addM(TK, 400))(), fr('12')()) });
    c.push({ label: 'one-time items', set: () => both(fdk(addM(TK, 1))(), tweak(s => { const k = addM(TK, 1), m = s.months[k] || (s.months[k] = { act: {}, pay: {}, dep: {} }); m.extra = [{ id: 'o1', kind: 'inc', name: 'Bonus & tip', amt: 400 }, { id: 'o2', kind: 'item', gid: (plan(k).groups[0] || {}).id, name: 'Repair', amt: 900 }]; })()) });
    c.push({ label: 'over budget', set: tweak(s => { Object.values(s.plans).forEach(p => p.income.forEach(i => { i.amt = 100; })); }) });
    c.push({ label: 'no schedule', set: tweak(s => { s.al = []; }) });
    c.push({ label: 'no loans', set: tweak(s => { s.loans = []; s.al = (s.al || []).filter(a => !a.to.startsWith('l:') && a.to !== 'snow'); }) });
    c.push({ label: 'no goal targets', set: tweak(s => { s.goals.forEach(g => { g.target = 0; delete g.by; }); }) });
    c.push({ label: 'empty household', set: () => withS(emptyHousehold()) });
    return c;
  },
});
const bscope = setVar(() => BSCOPE, v => { BSCOPE = v; });
const steps = shut => () => { const K = ['b1', 'b2', 'b3', 'b4', 'b5', 'b6', 'bx'], had = K.map(k => [BCL.has(k), BCL.has('!' + k)]); K.forEach(k => { BCL.delete(k); BCL.delete('!' + k); BCL.add(shut ? k : '!' + k); }); return () => K.forEach((k, i) => { BCL.delete(k); BCL.delete('!' + k); if (had[i][0]) BCL.add(k); if (had[i][1]) BCL.add('!' + k); }); };
addParity({
  name: 'Budget (Build)', fn: 'renderBuild', el: '#T-budget', cases: () => {
    const c = [];
    for (const k of monthsToTry()) c.push({ label: k, set: () => both(steps(false)(), at(k)) });
    c.push({ label: 'steps shut', set: steps(true) });
    c.push({ label: 'from this month', set: () => both(steps(false)(), bscope('from')()) });
    c.push({ label: 'items missing from earlier months', set: () => both(steps(false)(), tweak(s => { const ks = Object.keys(s.plans).sort(), k = addM(TK, -1); s.plans[k] = clone(s.plans[ks[ks.length - 1]]); s.plans[k].income.push({ id: 'ni', name: 'Side job', amt: 300 }); const g = s.plans[k].groups.find(g => !g.flex); if (g) g.items.push({ id: 'nb', name: 'New bill & co', amt: 45, due: 9 }); })()) });
    c.push({ label: 'set-aside bills, due days, no plan', set: () => both(steps(false)(), tweak(s => { Object.values(s.plans).forEach(p => { const b = p.groups.filter(g => !g.flex).flatMap(g => g.items), f = p.groups.filter(g => g.flex).flatMap(g => g.items); if (b[0]) { b[0].freq = 12; b[0].dm = 2; } if (b[1]) { b[1].freq = 3; b[1].dm = 11; } if (b[2]) { b[2].due = 1; } if (b[3]) b[3].amt = 0; f.forEach((i, j) => { if (j % 2) i.amt = ''; }); }); })()) });
    c.push({ label: 'ignored suggestions, schedule open', set: () => both(steps(false)(), sched(), ale('sl0')(), tweak(s => { s.notBill = { 'streaming co': 1, 'gym & spa': 1 }; s.notInc = { 'side pay': 1 }; })()) });
    c.push({ label: 'only ignored suggestions', set: () => both(steps(false)(), tweak(s => { s.notBill = Object.fromEntries(recurring().map(x => [x.p, 1]).concat([['old thing', 1]])); })()) });
    c.push({ label: 'one-time items, plan ahead, overrides', set: () => both(steps(false)(), tweak(s => { const m = s.months[TK] || (s.months[TK] = { act: {}, pay: {}, dep: {} }); const g = plan(TK).groups[0]; m.extra = [{ id: 'o1', kind: 'inc', name: 'Bonus', amt: 250 }, g && { id: 'o2', kind: 'item', gid: g.id, name: 'Repair & parts', amt: 120, due: 4 }].filter(Boolean); const m2 = s.months[addM(TK, 3)] || (s.months[addM(TK, 3)] = { act: {}, pay: {}, dep: {} }); m2.extra = [{ id: 'o3', kind: 'item', gid: g && g.id, name: 'Vet', amt: 300 }, { id: 'o4', kind: 'inc', name: 'Refund', amt: 80 }, { id: 'o5', kind: 'item', gid: 'gone', name: 'Old', amt: 5 }]; m.gplan = s.goals[0] ? { [s.goals[0].id]: 75 } : {}; m.lxp = s.loans[0] ? { [s.loans[0].id]: 40 } : {}; })()) });
    c.push({ label: 'loans paid off, linked, hand with rules', set: () => both(steps(false)(), tweak(s => { s.loans.push({ id: 'done1', name: 'Old card', apr: 20, bal: 300, min: 100, due: 5, start: addM(TK, -10), color: '#fff' }); s.loans.push({ id: 'h3', name: 'Hand & loan', apr: 4, bal: 2000, min: 150, due: 1, start: addM(TK, -2), color: '#abc' }); s.rules = [...(s.rules || []), { id: 'rh3', p: 'HAND LENDER PAY', dir: 'out', v: 'l:h3' }]; const a = (BK.loans || []).find(x => x.type === 'loan'); if (a) s.loans.push({ id: 'lk1', name: 'Linked loan', apr: 5, bal: openBal(a), min: 200, due: 10, start: TK, color: '#8fc9ff', acct: a.id, anch: { k: TK, eob: openBal(a) } }); })()) });
    c.push({ label: 'loose items', set: () => both(steps(false)(), tweak(s => { Object.values(s.plans).forEach(p => { const fx = p.groups.find(g => g.flex && !g.loose), b = p.groups.find(g => !g.flex && !g.loose); const L1 = ensureLoose(p, true), L2 = ensureLoose(p, false); if (fx && fx.items.length) L1.items.push(fx.items.shift()); if (b && b.items.length) L2.items.push(b.items.shift()); }); })()) });
    c.push({ label: 'late linked bill, short paycheck, subscriptions group, early start', set: () => both(steps(false)(), tweak(s => {
      Object.values(s.plans).forEach(p => { const g = p.groups.find(g => !g.flex && !g.loose); if (g) g.items.push({ id: 'lateb', name: 'Late bill', amt: 60, due: 1 }); p.groups.push({ id: 'subs', name: 'Subscriptions', color: '#abc', flex: false, items: [] }); p.income.forEach(i => { i.amt = (+i.amt || 0) * 3; }); });
      s.rules = [...(s.rules || []), { id: 'rlate', p: 'LATE BILL CO', dir: 'out', v: 'i:lateb' }]; s.bankFrom = '2020-01-01'; s.notBill = {}; })()) });
    // suggestions as recurring() finds them (the sample files everything, so it finds none on its own)
    const fakeRec = () => { const o = window.recurring; window.recurring = () => [{ p: 'streamco', label: 'StreamCo & <Plus>', amt: 15.99, day: 3, months: 4 }, { p: 'gymx', label: 'Gym X', amt: 40, day: 21, months: 6 }]; return () => { window.recurring = o; }; };
    c.push({ label: 'bill suggestions, subscriptions group', set: () => both(steps(false)(), fakeRec(), tweak(s => { Object.values(s.plans).forEach(p => p.groups.push({ id: 'subs', name: 'Subscriptions', color: '#abc', flex: false, items: [] })); s.notBill = { old: 1 }; })()) });
    c.push({ label: 'bill suggestions, no subscriptions group', set: () => both(steps(false)(), fakeRec()) });
    c.push({ label: 'next month', set: () => both(steps(false)(), at(addM(TK, 1))) });
    c.push({ label: 'no bank', set: () => both(steps(false)(), (() => { const o = SRV; SRV = false; return () => { SRV = o; }; })()) });
    c.push({ label: 'empty household', set: () => both(steps(false)(), withS(emptyHousehold())) });
    return c;
  },
});
// Every line the pop-up can open: income, bills and spending, loans, goals (and groups for the trends dialog).
const allLines = (k = S.cur) => [...plan(k).income.map(i => 'inc:' + i.id), ...plan(k).groups.flatMap(g => g.items.map(i => 'i:' + i.id)), ...S.loans.map(l => 'l:' + l.id), ...S.goals.map(g => 'g:' + g.id)];
const ct = setVar(() => CT, v => { CT = v; }), cr = setVar(() => CR, v => { CR = v; }), fd = setVar(() => FD, v => { FD = v; });
const tdq = v => () => { const e = $('#tdq'), o = e.value; e.value = v; return () => { e.value = o; }; };
addParity({
  name: 'Line pop-up', fn: 'catRender', also: ['flowRender'], el: '#tdlg form', dialog: '#tdlg', cases: () => {
    const c = [];
    for (const v of allLines()) for (const r of ['month', 'all', 'trend']) c.push({ label: `${v} ${r}`, set: () => both(ct(v)(), cr(r)(), tdq('')()) });
    for (const v of allLines().slice(0, 6)) for (const k of [addM(TK, -1), addM(TK, -4), addM(TK, 1)]) c.push({ label: `${v} ${k}`, set: () => both(ct(v)(), cr('month')(), at(k), tdq('')()) });
    for (const q of ['a', 'zzz', 'catch']) c.push({ label: 'search ' + q, set: () => both(ct(allLines().find(v => v.startsWith('i:')))(), cr('all')(), tdq(q)()) });
    c.push({ label: 'hand entries, pending, moved, odd names', set: () => { const v = allLines().find(v => S.txd && Object.values(S.txd).some(r => r.v === v && r.k === TK && plan().groups.some(g => g.flex && g.items.some(i => 'i:' + i.id === v)))) || allLines()[0], id = v.slice(2); return both(ct(v)(), cr('all')(), tdq('')(), tweak(s => { const m = s.months[TK] || (s.months[TK] = { act: {}, pay: {}, dep: {} }); m.rc = [{ id: 'h1', store: 'Corner & <shop>', amt: 9.5, item: id, date: TK + '-02' }, { id: 'h2', amt: 3, item: id }, { id: 'h3', store: 'Bank row', amt: 7, item: id, bank: true }]; Object.entries(s.txd || {}).filter(([, r]) => r.v === v).slice(0, 2).forEach(([, r]) => { r.k = addM(r.k, 1); r.n += ' & co'; }); })(), (() => { const ids = Object.keys(S.txd || {}).filter(i => S.txd[i].v === v).slice(0, 3); ids.forEach(i => PSET.add(i)); return () => ids.forEach(i => PSET.delete(i)); })()); } });
    c.push({ label: 'linked loan', set: () => (tweak(s => { const a = (BK.loans || []).find(x => x.type === 'loan'); if (a) s.loans.push({ id: 'lk1', name: 'Linked loan', apr: 5, bal: openBal(a), min: 200, due: 10, start: TK, color: '#8fc9ff', acct: a.id, anch: { k: TK, eob: openBal(a) } }); }))() });
    for (const r of ['month', 'trend']) c.push({ label: 'linked loan ' + r, set: () => both(tweak(s => { const a = (BK.loans || []).find(x => x.type === 'loan'); if (a) s.loans.push({ id: 'lk1', name: 'Linked loan', apr: 5, bal: openBal(a), min: 200, due: 10, start: TK, color: '#8fc9ff', acct: a.id, anch: { k: TK, eob: openBal(a) } }); })(), ct('l:lk1')(), cr(r)(), tdq('')()) });
    // a line whose payments were partly filed elsewhere, a rule named with "&", a store visited 10+ times a month
    const busy = () => { const E = Object.entries(S.txd || {}).filter(([, r]) => r.auto && r.auto !== 'pair' && r.auto !== 'rest' && r.v.startsWith('i:')); return E.length ? E[0][1].v : allLines()[0]; };
    for (const r of ['month', 'all', 'trend']) c.push({ label: 'filed elsewhere, odd rule, busy store ' + r, set: () => { const v = busy(); return both(ct(v)(), cr(r)(), tdq('')(), tweak(s => { const E = Object.entries(s.txd).filter(([, x]) => x.v === v); if (E[1]) E[1][1].v = 'skip'; if (E[2]) { E[2][1].v = 'xfer'; E[2][1].k = addM(E[2][1].k, -1); } const rid = E[0] && E[0][1].auto, rr = (s.rules || []).find(x => x.id === rid); if (rr) rr.p += ' & co'; if (E[0]) for (let n = 0; n < 70; n++) s.txd[E[0][0] + '-dup' + n] = { ...E[0][1], k: TK }; })()); } });
    c.push({ label: 'removed line', set: () => both(ct('i:gone')(), cr('month')(), tdq('')()) });
    return c;
  },
});
addParity({
  name: 'Trends dialog', fn: 'flowRender', el: '#fdlg form', dialog: '#fdlg', cases: () => {
    const c = [], keys = [...plan().groups.map(g => 'grp:' + g.id), ...allLines()];
    for (const key of keys) c.push({ label: key, set: fd(key) });
    for (const key of keys.slice(0, 5)) for (const k of [addM(TK, -2), addM(TK, 2)]) c.push({ label: `${key} ${k}`, set: () => both(fd(key)(), at(k)) });
    c.push({ label: 'missing group', set: fd('grp:gone') });
    return c;
  },
});
// The link dialog for every kind of line, as lnkOpen leaves it (showModal skipped: parity opens it), then with the
// candidate ticks, text, amount and search changed the way its own listeners change LK.
const lkOpen = (kind, id, fn) => () => { const d = $('#ldlg'), o = LK, q = $('#lq').value; d.showModal = () => {}; try { lnkOpen(kind, id); } finally { delete d.showModal; } if (LK && fn) fn(LK); return () => { LK = o; $('#lq').value = q; }; };
const lkLines = () => { const p = plan(), C = []; p.income.forEach(i => C.push(['inc', i.id])); p.groups.forEach(g => g.items.forEach(i => C.push([g.flex ? 'flex' : 'bill', i.id]))); S.loans.forEach(l => C.push(['loan', l.id])); S.goals.forEach(g => C.push(['goal', g.id])); return C; };
const lkTick = n => L => { const C = lnkCands(); L.sels = C.slice(0, n).map(g => g.p); L.sibOn = false; if (L.sels.length === 1) { const s = L.sels[0]; L.pat = s; L.ref = L.refs[s] || 0; L.amtOn = !!L.wide[s]; } else { L.pat = ''; L.amtOn = false; L.ref = 0; } };
addParity({
  name: 'Link dialog', fn: 'lnkList', also: ['lnkRule'], el: '#lform', dialog: '#ldlg', cases: () => {
    const c = [];
    for (const [kind, id] of lkLines()) {
      c.push({ label: `${kind} ${id}`, set: lkOpen(kind, id) });
      for (const n of [0, 1, 2, 4]) c.push({ label: `${kind} ${id} ${n} ticked`, set: lkOpen(kind, id, lkTick(n)) });
      c.push({ label: `${kind} ${id} amount on, shift, move`, set: lkOpen(kind, id, L => { lkTick(1)(L); if (!L.ref) L.ref = 42.5; L.amtOn = true; L.shift = true; L.move = false; }) });
      c.push({ label: `${kind} ${id} move, no shift`, set: lkOpen(kind, id, L => { lkTick(1)(L); L.shift = false; L.move = true; }) });
      c.push({ label: `${kind} ${id} siblings on`, set: lkOpen(kind, id, L => { lkTick(1)(L); L.sibOn = true; }) });
    }
    const [k0, i0] = lkLines().find(x => x[0] === 'flex') || lkLines()[0];
    for (const pat of ['', 'zzz', 'a', 'co & <x>']) c.push({ label: `text "${pat}"`, set: lkOpen(k0, i0, L => { lkTick(1)(L); L.pat = pat; }) });
    for (const q of ['zzz', 'a', 'transfer']) c.push({ label: `search ${q}`, set: lkOpen(k0, i0, L => { L.q = q; $('#lq').value = q; }) });
    // a store filed elsewhere ticked here ("filed as …", the move box); a short name with longer siblings
    c.push({ label: 'filed elsewhere ticked', set: lkOpen(k0, i0, L => { const g = lnkCands().find(g => Object.keys(g.filed).some(v => v !== L.v)); if (g) { L.sels = [g.p]; L.pat = g.p; L.ref = L.refs[g.p] || 0; } }) });
    c.push({ label: 'short text with siblings', set: lkOpen(k0, i0, L => { const g = lnkCands()[0]; if (g) { L.sels = [g.p]; L.pat = g.p.split(' ')[0]; } }) });
    c.push({ label: 'next month', set: () => both(at(addM(TK, 1)), lkOpen(k0, i0)()) });
    return c;
  },
});
// The amount dialog as payDialog / depDialog open it (showModal skipped: parity opens it): each loan and goal, with a
// suggested amount, an amount already logged, other months, odd names, a typed amount, and one with no choices.
const noModal = () => { const d = $('#dlg'); d.showModal = () => {}; return () => { delete d.showModal; }; };
addParity({
  name: 'Amount dialog', fn: 'openD', el: '#dform', dialog: '#dlg', cases: () => {
    const c = [], add = (label, call, ...set) => c.push({ label, call, set: () => both(noModal(), ...set.map(f => f())) });
    for (const l of S.loans) {
      add('pay ' + l.id, () => payDialog(l.id));
      add('pay ' + l.id + ' + left over', () => payDialog(l.id, 321.5));
      add('pay ' + l.id + ' logged', () => payDialog(l.id), tweak(s => { const m = s.months[TK] || (s.months[TK] = { act: {}, pay: {}, dep: {} }); (m.pay || (m.pay = {}))[l.id] = 777; }));
      add('pay ' + l.id + ' typed', () => { payDialog(l.id); $('#da').value = '1,234.5'; dprev(); });
      for (const k of [addM(TK, -2), addM(TK, 3)]) add(`pay ${l.id} ${k}`, () => payDialog(l.id), () => at(k));
    }
    for (const g of S.goals) {
      add('dep ' + g.id, () => depDialog(g.id));
      add('dep ' + g.id + ' amount', () => depDialog(g.id, 50));
      add('dep ' + g.id + ' saved', () => depDialog(g.id), tweak(s => { const m = s.months[TK] || (s.months[TK] = { act: {}, pay: {}, dep: {} }); (m.dep || (m.dep = {}))[g.id] = 0; }));
      add('dep ' + g.id + ' typed', () => { depDialog(g.id); $('#da').value = '99999'; dprev(); });
      add(`dep ${g.id} next month`, () => depDialog(g.id), () => at(addM(TK, 1)));
    }
    add('odd names', () => { payDialog(S.loans[0] && S.loans[0].id); depDialog(S.goals[0] && S.goals[0].id); }, tweak(s => { s.loans.forEach(l => { l.name += ' & <co>'; }); s.goals.forEach(g => { g.name = '"' + g.name + '" & <x>'; }); }));
    add('no choices or chips', () => openD({ title: 'Plain', amt: null, save: () => {} }));
    add('choice matching none', () => openD({ title: 'Plain', sel: [{ v: 'a', l: 'A' }, { v: 'b', l: 'B & <b>' }], selV: 'zz', chips: [{ l: 'x', v: 0 }], amt: 0, ok: 'Go', del: () => {}, save: () => {} }));
    return c;
  },
});
// The split form in a scratch .spf box, for filings of each kind (money out and in, each category type, a removed
// item): as opened, after Add a part twice, and with values typed and chosen before adding (they must stay).
const spBox = id => () => { const b = document.createElement('div'); b.className = 'spf'; b.id = 'spx'; b.dataset.spf = id; $('main').appendChild(b); return () => b.remove(); };
addParity({
  name: 'Split form', fn: 'spForm', also: ['spAddPart'], el: '#spx', cases: () => {
    const c = [], E = Object.entries(S.txd || {}).filter(([, r]) => r.v !== 'split' && !r.sp && Math.abs(+r.amt || 0) > 0.02), seen = new Set();
    const pick = E.filter(([, r]) => { const t = (r.amt < 0 ? 'in ' : 'out ') + r.v.split(':')[0]; if (seen.has(t)) return false; seen.add(t); return true; });
    for (const [id, r] of pick) {
      const t = `${r.amt < 0 ? 'in' : 'out'} ${r.v}`, b = () => $('#spx');
      c.push({ label: t, set: spBox(id), call: () => spForm(b(), id) });
      c.push({ label: t + ' + 2 parts', set: spBox(id), call: () => { spForm(b(), id); spAddPart(b()); spAddPart(b()); } });
      c.push({ label: t + ' typed, then a part', set: spBox(id), call: () => { spForm(b(), id); const s = b().querySelectorAll('.spr'); s[0].querySelector('input').value = '1.5'; s[1].querySelector('input').value = '7'; s[1].querySelector('select').selectedIndex = 3; spLeft(b()); spAddPart(b()); } });
    }
    const [id0] = pick[0] || [];
    if (id0) for (const v of ['xfer', 'skip', 'once', 'i:gone', S.loans[0] ? 'l:' + S.loans[0].id : 'xfer', S.goals[0] ? 'g:' + S.goals[0].id : 'skip']) c.push({ label: 'filed as ' + v, set: () => both(tweak(s => { s.txd[id0].v = v; })(), spBox(id0)()), call: () => { spForm($('#spx'), id0); spAddPart($('#spx')); } });
    if (id0) c.push({ label: 'odd names, other month', set: () => both(tweak(s => { s.txd[id0].k = addM(TK, -1); Object.values(s.plans).forEach(p => p.groups.forEach(g => { g.name += ' & <g>'; g.items.forEach(i => { i.name = '"' + i.name + '" <i>'; }); })); })(), spBox(id0)()), call: () => spForm($('#spx'), id0) });
    return c;
  },
});
// The money-flow card's Compare view, drawn into a scratch box: every month, no-plan lines, odd names, a goal saved
// over plan, a loan short, an empty household.
const scratch = (id, cls = '') => () => { const b = document.createElement('div'); b.id = id; b.className = cls; $('main').appendChild(b); return () => b.remove(); };
addParity({
  name: 'Compare view', fn: 'compareView', el: '#cmx', call: () => compareView($('#cmx')), cases: () => {
    const c = [];
    for (const k of monthsToTry()) c.push({ label: k, set: () => both(scratch('cmx', 'sk cmpv')(), at(k)) });
    c.push({ label: 'no plan, odd names', set: () => both(scratch('cmx', 'sk cmpv')(), tweak(s => { Object.values(s.plans).forEach(p => p.groups.forEach(g => { g.name += ' & <g>'; g.items.forEach((i, n) => { i.name += ' "<i>"'; if (n === 0) i.amt = 0; }); })); })()) });
    c.push({ label: 'saved over, loan short', set: () => both(scratch('cmx', 'sk cmpv')(), tweak(s => { const m = s.months[TK] || (s.months[TK] = { act: {}, pay: {}, dep: {} }); m.dep = m.dep || {}; m.pay = m.pay || {}; s.goals.forEach(g => { m.dep[g.id] = 5000; }); s.loans.forEach(l => { m.pay[l.id] = 1; }); })()) });
    c.push({ label: 'empty household', set: () => both(scratch('cmx', 'sk cmpv')(), withS(emptyHousehold())) });
    // this month: a bill not paid yet (its filings removed), a spending line planned at 30¢
    c.push({ label: 'bill unpaid this month, tiny plan', set: () => both(scratch('cmx', 'sk cmpv')(), tweak(s => { const p = plan(TK), b = p.groups.find(g => !g.flex).items[0], f = p.groups.find(g => g.flex).items[0]; for (const [id, r] of Object.entries(s.txd)) if (r.v === 'i:' + b.id && r.k === TK) delete s.txd[id]; Object.values(s.plans).forEach(q => q.groups.forEach(g => g.items.forEach(i => { if (i.id === f.id) i.amt = 0.3; }))); })()) });
    return c;
  },
});
// The money-flow chart's card, tip and zoom bar for every node and ribbon, planned and actual, in a past, this and a
// future month, and over budget. sankey (still the old one) fills K first; the Budget tab is shown so #sk exists.
const skSet = (flow, k, tw) => () => {
  const o = { tab: S.tab, budv: BUDV, flow: S.flow }, u = [tw ? tw() : null, at(k)];
  S.tab = 'budget'; BUDV = 'month'; S.flow = flow; renderAll();
  return () => { u.reverse().forEach(f => f && f()); S.tab = o.tab; BUDV = o.budv; S.flow = o.flow; };
};
const skViews = () => [['plan', TK], ['actual', TK], ['actual', addM(TK, -1)], ['plan', addM(TK, 2)], ['plan', TK, tweak(s => { Object.values(s.plans).forEach(p => p.income.forEach(i => { i.amt = 100; })); })]];
const ev = { clientX: 200, clientY: 200 };
addParity({
  name: 'Money-flow card', fn: 'skCard', el: '#skc', cases: () => {
    const c = [];
    for (const [f, k, tw] of skViews()) { const u = skSet(f, k, tw)(); const n = K ? K.all.length : 0; u(); for (let j = 0; j < n; j++) c.push({ label: `${f} ${k}${tw ? ' over' : ''} node ${j}`, set: skSet(f, k, tw), call: () => skCard(K.all[j], { l: 0, r: 0, y: 0 }) }); }
    return c;
  },
});
addParity({
  name: 'Money-flow tip', fn: 'skTip', el: '#skt', cases: () => {
    const c = [];
    for (const [f, k, tw] of skViews()) { const u = skSet(f, k, tw)(); const n = K ? K.all.length : 0, nl = K ? K.L.length : 0; u(); for (let j = 0; j < n; j++) c.push({ label: `${f} ${k} node ${j}`, set: skSet(f, k, tw), call: () => skTip(K.all[j], null, ev) }); for (let j = 0; j < nl; j++) c.push({ label: `${f} ${k} ribbon ${j}`, set: skSet(f, k, tw), call: () => skTip(null, K.L[j], ev) }); }
    c.push({ label: 'nothing', set: skSet('plan', TK), call: () => skTip(null, null, ev) });
    return c;
  },
});
addParity({
  name: 'Money-flow zoom bar', fn: 'zbar', el: '#zb', cases: () => {
    const c = [];
    for (const [f, k] of skViews().slice(0, 3)) { const u = skSet(f, k)(); const ids = K ? K.all.map((x, j) => j) : []; u(); for (const j of ids) c.push({ label: `${f} ${k} node ${j}`, set: skSet(f, k), call: () => zbar(K.all[j]) }); }
    c.push({ label: 'none', set: skSet('plan', TK), call: () => zbar(null) });
    return c;
  },
});
// The chart itself: every month planned, actual and Compare, over budget, odd names, items not in a group, zoomed in,
// and a household with nothing planned.
addParity({
  name: 'Money-flow chart', fn: 'sankey', el: '#sk', also: ['compareView'], cases: () => {
    const c = [];
    for (const k of monthsToTry()) for (const f of ['plan', 'actual', 'compare']) c.push({ label: `${f} ${k}`, set: skSet(f, k) });
    for (const [f, k, tw] of skViews().slice(4)) c.push({ label: 'over budget ' + f, set: skSet(f, k, tw) });
    c.push({ label: 'odd names, loose items', set: skSet('plan', TK, tweak(s => { Object.values(s.plans).forEach(p => { p.income.forEach(i => { i.name += ' & <i>'; }); p.groups.forEach((g, n) => { g.name = '"' + g.name + '" <g>'; if (n === 1) { g.loose = true; } }); }); })) });
    c.push({ label: 'zoomed in', set: () => { const u = skSet('plan', TK)(), o = { Z, SEL }; Z = { ...Z, x: 120.5, y: 40, w: Z.w / 2, h: Z.h / 2 }; SEL = K.all.find(n => n.ci === 2).id; return () => { Z = o.Z; SEL = o.SEL; u(); }; } });
    // $10 over budget: income cut by what was left plus $10
    const by10 = () => { const u = skSet('plan', TK)(), d = K.I - K.O; u(); return tweak(s => { Object.values(s.plans).forEach(p => { if (p.income[0]) p.income[0].amt = (+p.income[0].amt || 0) - d - 10; }); })(); };
    c.push({ label: '$10 over budget', set: skSet('plan', TK, by10) });
    c.push({ label: 'empty household', set: () => both(skSet('plan', TK)(), withS(emptyHousehold())) });
    c.push({ label: 'empty household actual', set: () => both(skSet('actual', TK)(), withS(emptyHousehold())) });
    return c;
  },
});
// The Bank tab's count (none, some, 100+, no bank) and the save status in every state, as the sample and as a real
// budget (fsUI's demo parameter): connecting, saved (with and without a time), saving, unreachable (with details).
addParity({
  name: 'Bank tab count', fn: 'bankBadge', el: '#tbank', cases: () => {
    const many = tweak(s => { s.txd = {}; }), some = tweak(s => { Object.keys(s.txd).slice(0, 7).forEach(k => delete s.txd[k]); });
    return [{ label: 'as loaded' }, { label: 'some to sort', set: some }, { label: 'many to sort', set: many }, { label: 'no bank', set: () => { const o = SRV; SRV = false; return () => { SRV = o; }; } }];
  },
});
const fsCases = () => {
  const c = [], at10 = new Date(2026, 3, 5, 10, 7);
  const st = { wait: { state: 'wait' }, ok: { state: 'ok', last: null }, 'ok at time': { state: 'ok', last: at10 }, saving: { state: 'ok', dirty: true, last: at10 }, busy: { state: 'ok', busy: true }, err: { state: 'err', err: 'Can’t reach the server.' }, 'err details': { state: 'err', err: 'Save failed <500>.', detail: 'HTTP 500 & "oops"' } };
  for (const [l, v] of Object.entries(st)) for (const demo of [true, false]) c.push({ label: `${l}${demo ? ' sample' : ''}`, set: () => { const o = { ...FS }; Object.assign(FS, { dirty: false, busy: false, detail: '', err: '' }, v); return () => { Object.assign(FS, o); }; }, call: () => fsUI(demo) });
  return c;
};
for (const [n, el] of [['banner', '#sync'], ['footer', '#saved'], ['header pill', '#spill']]) addParity({ name: 'Save status ' + n, fn: 'fsUI', el, cases: fsCases });
window.reactParity = runParity;
if (DEMO) window.LEGACY_SCREENS = LEGACY;   // sample mode only: the old draw functions, for comparing by hand
