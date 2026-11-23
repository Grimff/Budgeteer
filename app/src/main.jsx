// The React screens. Loaded by index.html after the other js files (which it uses by name: S, plan, f0, …) and
// before sample.js / server-sync.js, so the app starts with these screens in place.
import { draw, replaceScreen, LEGACY } from './bridge.js';
import { addParity, runParity, monthsToTry, emptyHousehold, withS, at } from './parity.js';
import { History } from './screens/History.jsx';
import { Wealth } from './screens/Wealth.jsx';
import { Goals } from './screens/Goals.jsx';
import { Loans } from './screens/Loans.jsx';

replaceScreen('renderHistory', () => draw($('#T-history'), <History />));
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
    // (A loan whose minimum never covers its interest isn't a case: the old pxText already throws on it, labS(null).)
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
window.reactParity = runParity;
if (DEMO) window.LEGACY_SCREENS = LEGACY;   // sample mode only: the old draw functions, for comparing by hand
