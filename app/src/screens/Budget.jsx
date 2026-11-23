// Budget tab, This month view (was renderBudget in js/budget.js with guideCard, rvCard, xmCard there, alertsCard in
// js/alerts.js, rcList in js/linked-loans.js). Build budget and Forecast are still drawn by renderBuild /
// renderForecast. The money-flow chart (#sk) is drawn after this by sankey() in flow.js, as before.
import { tx } from '../bridge.js';
import { CountUp, Clh, Html } from '../ui.jsx';

// An attribute string like the old cards kept for their buttons (data-act=…, data-v=…) → props.
const attrs = s => Object.fromEntries([...s.matchAll(/([\w-]+)="([^"]*)"/g)].map(m => [m[1], m[2]]));

export const BudSwitch = () => <div className="seg" style={{ margin: '4px 0 6px' }}><button className={BUDV === 'month' || !['build', 'fc'].includes(BUDV) ? 'on' : ''} data-act="budv" data-v="month">This month</button><button className={BUDV === 'build' ? 'on' : ''} data-act="budv" data-v="build">Build budget</button><button className={BUDV === 'fc' ? 'on' : ''} data-act="budv" data-v="fc">Forecast</button></div>;

// Needs a look (current month only). alertsNow() builds each alert's buttons as HTML, so that row is inserted as HTML.
function AlertsCard() {
  if (S.cur !== TK) return null;
  const A = alertsNow().filter(a => !NTH[a.key]);
  if (!A.length) return null;
  const ic = { bad: '×', warn: '!', info: 'i' };
  return <section className="card nt" style={{ '--i': 1 }}><h2>Needs a look</h2><div className="hcl">{A.map(a => <div className={'hci ' + a.lv} key={a.key}><i>{ic[a.lv]}</i><div><b>{tx(a.t)}</b><p>{tx(a.d)}</p><Html as="div" className="hca" html={(a.a || '') + `<button class="lnk" data-act="ntHide" data-id="${esc(a.key)}">Hide</button>`} /></div></div>)}</div></section>;
}

// Getting set up checklist (current month, until every step is done).
function GuideCard() {
  if (!SRV || !BK.st || !BK.st.configured || S.cur !== TK) return null;
  const p = plan(TK), items = (BK.st.items || []).length, inc = p.income.filter(i => !i.once && +i.amt > 0), incL = inc.filter(i => rulesFor('inc:' + i.id).length).length, bills = p.groups.filter(g => !g.flex).flatMap(g => g.items).filter(i => +i.amt > 0), billL = bills.filter(i => rulesFor('i:' + i.id).length).length;
  const lo = S.loans.filter(l => !loanGone(l, TK)), loL = lo.filter(l => l.acct || rulesFor('l:' + l.id).length).length, gs = S.goals, gp = gs.filter(g => goalPlan(g, TK) > 0 || gLinked(g)).length, rev = items && BK.tx.length ? inbox().length : 0, bb = 'data-act="budv" data-v="build"';
  const st = [{ ok: items > 0, t: 'Connect your bank', d: items ? `${items} connection${items === 1 ? '' : 's'} bring in spending and paychecks` : 'Spending and paychecks then come in on their own.', b: 'Connections', a: 'data-act="sview" data-v="connections"' },
    { ok: inc.length > 0 && incL === inc.length, t: 'Add your paychecks and flag each deposit', d: inc.length ? `${incL} of ${inc.length} linked to their deposit` : 'What you take home each month.', b: 'Build budget', a: bb },
    { ok: bills.length > 0 && billL === bills.length, t: 'Add your bills and link each payment', d: bills.length ? `${billL} of ${bills.length} linked, so they mark themselves paid` : 'Rent, utilities, insurance, subscriptions.', b: 'Build budget', a: bb },
    { ok: loL === lo.length, t: 'Tell each loan where its payments come from', d: `${loL} of ${lo.length} update on their own`, b: 'Loans', a: 'data-act="tab" data-t="loans"' },
    { ok: gp === gs.length, t: 'Give each savings goal a monthly amount or an account', d: `${gp} of ${gs.length} set up`, b: 'Goals', a: 'data-act="tab" data-t="goals"' },
    { ok: rev === 0, t: 'Sort new transactions', d: rev ? `${rev} waiting for a category` : 'Nothing waiting', b: 'Bank', a: 'data-act="tab" data-t="bank"' }];
  const done = st.filter(x => x.ok).length;
  if (done === st.length) return null;
  const sh = isShut('guide', done >= st.length - 2);
  return <section className={'card cl' + (sh ? ' shut' : '')} style={{ '--i': 0, marginTop: '16px' }}><Clh k="guide" shut={sh} title="Getting set up" sum={`${done} of ${st.length} done`} /><p className="mut" style={{ marginBottom: '8px' }}>Each step makes the budget fill itself in. This card goes away when they’re all done.</p>{st.map((x, i) => <div className={'gst' + (x.ok ? ' ok' : '')} key={i}><i>{x.ok ? '✓' : i + 1}</i><div><b>{x.t}</b><small>{x.d}</small></div>{x.ok ? null : <button type="button" className="btn g sm" {...attrs(x.a)}>{x.b}</button>}</div>)}</section>;
}

// Last month in review (current month, until Done).
function RvCard() {
  const k = S.cur, lk = addM(TK, -1);
  if (k !== TK || !SRV || (S.months[lk] && S.months[lk].rv) || lk < budStart()) return null;
  const T = totals(lk), out = T.fixedA + T.flexA + T.loansA + T.saveA, lo = r2(T.incA - out), pl = T.fixed + T.flexP + T.loans + T.save;
  const miss = cmpRows(lk).filter(r => !r.good && r.pl > 0.5 && r.a - r.pl > 5).sort((a, b) => (b.a - b.pl) - (a.a - a.pl)).slice(0, 3), unf = inbox().filter(t => t.date.slice(0, 7) === lk).length, sw = xmOn(TK) && lo > 0.5 && !(S.months[lk] && S.months[lk].swept);
  return <section className="card rvc" style={{ '--i': 1, marginTop: '16px' }}><div className="bh"><div><h2>{mon(lk)} in review</h2><p>Income {f0(T.incA)} · out {f0(out)} (plan {f0(pl)}) · <b style={{ color: lo >= 0 ? 'var(--lime)' : '#ff9aa8' }}>{lo >= 0 ? f0(lo) + ' left over' : f0(-lo) + ' short'}</b></p></div><button className="lnk" data-act="rvDone">Done</button></div>{' '}
    <div className="rvl">{miss.length ? <div><small>Over plan</small>{miss.map(r => <button key={r.key} type="button" className="rvm" data-act="catTx" data-v={r.key} data-k={lk}><b>{tx(r.name)}</b><span>+{f0(r.a - r.pl)}</span></button>)}</div> : <div><small>Over plan</small><p className="dim">Nothing went over. Nice.</p></div>}{' '}
      <div><small>To sort</small>{unf ? <><p>{unf} transaction{unf === 1 ? '' : 's'} from {mon(lk)} not filed yet</p><button className="btn g sm" data-act="bview" data-v="review">Sort them</button></> : <p className="dim">Everything is filed.</p>}</div>{' '}
      <div><small>Left over</small>{sw ? <><p>Send {f0(lo)} by your Extra money rules: goal shares are logged as saved, loan shares added to this month’s extra.</p><button className="btn sm" data-act="xSweep">Send {f0(lo)}</button></> : S.months[lk] && S.months[lk].swept ? <p className="dim">{f0(S.months[lk].swept)} sent by your rules.</p> : lo > 0.5 ? <p className="dim">Set up Extra money rules in Build budget to send it to goals or loans.</p> : <p className="dim">Nothing left to send.</p>}</div></div></section>;
}

// Where this month's extra money goes by the left-over rules.
function XmCard() {
  const k = S.cur, x = xsBuild()[k];
  if (!x || !xmOn(k)) return null;
  return <section className="card xmc" style={{ '--i': 1, marginTop: '16px' }}><div className="bh"><div><h2>Extra money in {mon(k)}</h2><p>{x ? `Your plan leaves ${f0(x.pool)} after bills, spending, minimums and set amounts. Your left-over rules send it here:` : ''}</p></div><button className="btn g sm" data-act="budv" data-v="build">Change rules</button></div>{' '}
    {x ? <div className="xmr">{Object.entries(x).filter(([d, v]) => /^x\|[gl]:/.test(d) && v > 0.5).map(([d, v]) => <div key={d}><small>{d.startsWith('x|g:') ? 'Goal' : 'Loan'}</small><b>{f0(v)}</b><span>{tx(destName(d.slice(2)))}</span></div>)}<div><small>Kept</small><b>{f0(x.keep)}</b><span>stays in checking</span></div></div> : null}{' '}
  </section>;
}

// Purchases entered by hand this month (was rcList; the Budget page passes only the non-bank ones).
export function RcList({ m }) {
  const rc = (m.rc || []).slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  if (!rc.length) return null;
  const names = {}; allItems(S.cur).forEach(x => { names[x.i.id] = x.i.name; });
  const tot = rc.reduce((a, r) => a + r.amt, 0);
  return <details className="more rcl" data-key="rcl" open={OPEN.has('rcl')}><summary>Bank purchases in {mon(S.cur)} <span className="mut n" style={{ marginLeft: 'auto' }}>{rc.length} · {f2(tot)}</span></summary><div style={{ marginTop: '8px' }}>{rc.map((r, j) => <div className="rcr" key={j}>{r.bank ? <span className="rth bk" title="From your bank">BANK</span> : <span className="rth"></span>}<div className="nm"><b>{tx(r.store || 'Purchase')}{r.txid && PSET.has(r.txid) ? <> <span className="pnd">Pending</span></> : null}</b><small>{tx(names[r.item] || 'Removed item')}{r.date ? ' · ' + new Date(r.date + 'T12:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}</small></div><span className="n">{f2(r.amt)}</span><button className="x" data-act="delRc" data-k={S.cur} data-id={tx(r.id)} aria-label="Remove">×</button></div>)}</div></details>;
}

const Stp = ({ t, c }) => <span className={'lst ' + (c || '')}>{t}</span>;
// One budget line: opens its pop-up (catTx), or holds an input when there's no bank (was lrw).
function Lr({ o }) {
  const inner = <><span className="ln"><b>{tx(o.name)}{o.tag || null}</b>{o.meta ? <small>{o.meta}</small> : null}</span><span className="lp n">{f0(o.pl)}</span>{o.inp || <span className={'la n' + (o.a == null ? ' dim' : '')}>{o.a == null ? '—' : f0(o.a)}</span>}{o.s || <span></span>}</>;
  return o.inp ? <div className="lr">{inner}</div> : <button type="button" data-act="catTx" data-v={o.v} className="lr">{inner}</button>;
}
// One card of budget lines (was sec).
function Sec({ o }) {
  const pc = o.pl > 0 ? Math.min(100, Math.max(0, o.a - (o.ua || 0)) / o.pl * 100) : 0;
  return <section className="card lsec" style={{ '--c': `${o.c}` }}><header><i className="dot"></i><div className="lt"><small>{o.kind}</small><h3>{tx(o.name)}</h3></div><span className="lsum"><b className="n">{f0(o.a)}</b><small>{o.pl > 0.5 ? 'of ' + f0(o.pl) : 'no plan'}{o.ua > 0.5 && o.pl > 0.5 ? ` · ${f0(o.ua)} with no plan` : ''}</small></span></header><div className={'mbar' + (o.over ? ' over' : '')}><span style={{ width: `${pc}%` }}></span></div><div className="lhd"><span></span><span>Planned</span><span>{o.ah || 'Actual'}</span><span></span></div>{o.rows.length ? o.rows.map((r, i) => <Lr key={i} o={r} />) : <p className="dim" style={{ fontSize: '13.5px', padding: '8px 10px' }}>Nothing here yet.</p>}{o.foot || null}</section>;
}

export function ThisMonth() {
  const p = plan(), m = MO(S.cur), T = totals(), left = T.left;
  const flexGroups = p.groups.filter(g => g.flex), fixedGroups = p.groups.filter(g => !g.flex);
  const spentA = T.fixedA + T.flexA + T.loansA + T.saveA, planOut = T.fixed + T.flexP + T.loans + T.save, leftA = T.incA - spentA;
  // soFar: only money that has really moved (paid bills, filed spending, logged loan payments, savings)
  const soFar = soFarOf(S.cur, T), xLo = S.loans.reduce((a, l) => { const r = S.cur < l.start ? null : row(l, S.cur); return a + (r && r.lg ? Math.max(0, r.pay - loanPlan(l, S.cur)) : 0); }, 0);
  // summary bar
  const arr = plan().income.reduce((a, i) => a + (i.once ? 0 : (incGot(S.cur, i.id)?.amt || 0)), 0), fut = S.cur > TK, up = unplannedA(S.cur), diff = (T.fixed + T.flexP) - (T.fixedA + T.flexA - up), xs = xsBuild()[S.cur];
  SB = S.cur === TK ? [arr, soFar, Math.max(0, spentA - soFar), leftA] : fut ? [T.inc, planOut, xs ? xs.pool : T.save, left] : [T.incA, spentA, Math.abs(diff), leftA];
  const t = (c, l, id, sub, j) => <div style={{ '--c': c }} key={id}><small>{l}</small><CountUp id={id} k={id} to={SB[j]} /><span>{sub}</span></div>;
  const sbar = S.cur === TK ? [t('var(--lime)', 'Income arrived', 'sInc', `of ${f0(T.incA)} expected this month`, 0), t('var(--coral)', 'Spent so far', 'sPlan', `of ${f0(planOut)} planned${xLo > 0.5 ? ` · incl. ${f0(xLo)} extra to loans` : ''}`, 1), t('var(--butter)', 'Still to come', 'sAct', 'planned, not paid yet', 2), t(leftA >= 0 ? 'var(--pink)' : 'var(--red)', 'Left over (projected)', 'sLeft', xmOn(S.cur) ? 'kept after your extra money rules' : 'if the rest goes to plan', 3)]
    : fut ? [t('var(--lime)', 'Income', 'sInc', 'planned', 0), t('var(--coral)', 'Planned out', 'sPlan', 'bills, spending, loans, savings', 1), t('var(--butter)', xs ? 'Extra money' : 'To goals', 'sAct', xs ? `goes to your rules · ${f0(xs.keep)} kept` : 'planned savings', 2), t(left >= 0 ? 'var(--pink)' : 'var(--red)', 'Left over (planned)', 'sLeft', left >= 0 ? 'not assigned to anything' : 'the plan spends more than it earns', 3)]
      : [t('var(--lime)', 'Income', 'sInc', `plan was ${f0(T.inc)}`, 0), t('var(--coral)', 'Spent', 'sPlan', `plan was ${f0(planOut)}${xLo > 0.5 ? ` · incl. ${f0(xLo)} extra to loans` : ''}`, 1), t(diff >= 0 ? 'var(--butter)' : 'var(--red)', diff >= 0 ? 'Under plan' : 'Over plan', 'sAct', (diff >= 0 ? 'spent less than planned' : 'spent more than planned') + (up > 0.5 ? ` · ${f0(up)} more with no plan` : ''), 2), t(leftA >= 0 ? 'var(--pink)' : 'var(--red)', 'Left over', 'sLeft', 'income minus what went out', 3)];

  // Read-only view of every budget line, grouped like the plan. Each row opens its pop-up; editing lives in Build budget.
  const k = S.cur, LG = [], stp = (t, c) => <Stp t={t} c={c} />, once1 = i => i.once ? <> <em className="o1">{mon(k).slice(0, 3)} only</em></> : null;
  { let pl = 0, a = 0; const rows = p.income.map(i => {
      const g = SRV ? incGot(k, i.id) : null, rl = SRV ? rulesFor('inc:' + i.id) : [], amt = +i.amt || 0; pl += amt; if (g) a += g.amt;
      const s = !SRV ? '' : g ? (g.amt >= amt - 0.5 || k < TK ? stp('Received', 'ok') : stp(f0(amt - g.amt) + ' to come')) : i.once ? '' : !rl.length ? stp('Not linked', 'dim') : k < TK ? stp('Not seen', 'bad') : amt > 0 ? stp('Expected') : stp('No plan', 'dim');
      return { v: 'inc:' + i.id, name: i.name, tag: once1(i), meta: g ? (g.list.length > 1 ? g.list.length + ' deposits' : 'Arrived ' + dshort(g.list[0].d)) : '', pl: amt, a: g ? g.amt : null, s };
    });
    LG.push({ kind: 'Income', name: 'Take-home pay', c: 'var(--lime)', pl, a, rows, ah: 'Received' }); }
  fixedGroups.forEach(gr => {
    if (!gr.items.length) return; let pl = 0, a = 0, ua = 0;
    const rows = gr.items.map(i => {
      const pd = SRV ? billPaid(k, i.id) : null, rl = SRV ? rulesFor('i:' + i.id) : [], due = +i.due || 0, amt = +i.amt || 0, sk = +i.freq > 1, dm = isDue(i, k), aside = sk && !pd && !dm; pl += amt; if (pd) { a += pd.amt; if (amt <= 0.5) ua += pd.amt; } else if (aside) a += amt;
      let s = ''; if (aside) s = stp('Set aside', 'ok'); else if (SRV) { if (pd) s = pd.list.every(x => PSET.has(x.id)) ? stp('Pending', 'hot') : stp('Paid', 'ok'); else if (!rl.length) s = stp('Not linked', 'dim'); else if (k < TK) s = stp('Not seen', 'bad'); else if (k === TK && due && NOW.getDate() > due + 3) s = stp('Not seen yet', 'hot'); else s = stp(due ? 'Due ' + ord(due) : 'Upcoming'); }
      return { v: 'i:' + i.id, name: i.name, tag: once1(i), meta: [sk ? `${f0(i.base)} ${FQ[i.freq] || 'every ' + i.freq + ' months'} · ${pd ? 'paid ' + f0(pd.real) + ' from the set-aside' : 'due ' + MN[+nextDue(i, k).slice(5) - 1]} · ${f0(sinkFund(i.id, k))} set aside` : '', due ? 'Due the ' + ord(due) : '', pd && !sk ? (pd.list.length > 1 ? pd.list.length + ' payments' : 'Paid ' + dshort(pd.list[0].d)) : ''].filter(Boolean).join(' · '), pl: amt, a: pd ? pd.amt : aside ? amt : null, s };
    });
    LG.push({ kind: gr.loose ? 'Not in a group' : 'Bills', name: gr.name, c: gr.color, pl, a, ua, rows, ah: 'Paid' });
  });
  const fdf = SRV ? flexDefault(k) : null;
  flexGroups.forEach(gr => {
    if (!gr.items.length) return; let pl = 0, a = 0, ua = 0, ov = 0;
    const rows = gr.items.map(i => {
      const amt = +i.amt || 0, fa = flexAct(k, i.id), nr = SRV ? rulesFor('i:' + i.id).length : 0; pl += amt; a += fa || 0; if (amt <= 0.5) ua += fa || 0; else if (fa > amt + 0.5) ov += fa - amt;
      const s = fa == null ? stp('Nothing yet', 'dim') : amt <= 0.5 ? stp('No plan', 'dim') : fa <= amt + 0.5 ? stp(f0(amt - fa) + ' left', 'ok') : stp(f0(fa - amt) + ' over', 'bad');
      const inp = SRV ? null : <input className="in a" data-k="act" data-id={i.id} data-key={'fa-' + i.id} inputMode="decimal" defaultValue={m.act[i.id] != null ? m.act[i.id] : ''} placeholder="—" aria-label={`${tx(i.name)} actual`} />;
      return { v: 'i:' + i.id, name: i.name, tag: once1(i), meta: [nr ? nr + ' store' + (nr === 1 ? '' : 's') + ' linked' : '', i.id === fdf ? 'unlinked purchases land here' : ''].filter(Boolean).join(' · '), pl: amt, a: fa, s, inp };
    });
    LG.push({ kind: gr.loose ? 'Not in a group' : 'Spending', name: gr.name, c: gr.color, pl, a, ua, rows, over: ov > 0.5, ah: 'Spent' });
  });
  { let pl = 0, a = 0, un = null; const rows = S.loans.filter(l => !loanGone(l, k)).map(l => {
      const r = k < l.start ? null : row(l, k), mn = loanPlan(l, k), xt = loanXtra(l, k), lk = l.acct && l.link ? l.link.inst : '', pd = r && (r.auto || r.lg) ? r.pay : null; pl += mn; a += pd || 0;
      const lr = bankSrc(l) && SRV ? rulesFor('l:' + l.id).length + (lk ? 1 : 0) : 0; let s;
      if (pd != null && xt > 0.5 && pd < mn - 0.5) s = k < TK ? stp('Paid ' + f0(pd), '') : stp(f0(mn - pd) + ' extra to go', '');
      else if (pd != null) s = stp('Paid', 'ok'); else if (mn <= 0) s = stp('Paid off', 'ok'); else if (lk && !lr && k >= TK) s = stp(k === TK ? 'Waiting' : 'Upcoming');
      else if (lr) s = k < TK ? stp('Not seen', 'bad') : k === TK && l.due && NOW.getDate() > l.due + 3 ? stp('Not seen yet', 'hot') : stp(l.due ? 'Due ' + ord(l.due) : 'Upcoming');
      else { s = stp(SRV && !lk ? 'Not linked' : 'Not logged', k < TK ? 'bad' : SRV && !lk ? 'dim' : ''); if (!lk && !un) un = l.id; }
      return { v: 'l:' + l.id, name: l.name, meta: [xt > 0.5 ? `min ${f0(Math.min(l.min, mn))} + ${f0(xt)} extra${exShare('l:' + l.id, k) > 0.5 ? ` (${f0(exShare('l:' + l.id, k))} from extra money)` : ''}` : '', lk ? 'Linked · ' + tx(lk) + (lr ? ' · payments from your bank' : '') : lr ? 'Bank payment linked' : '', l.due ? 'Due the ' + ord(l.due) : ''].filter(Boolean).join(' · '), pl: mn, a: pd, s };
    });
    if (rows.length) LG.push({ kind: 'Loans', name: 'Loan payments', c: 'var(--sky)', pl, a, rows, ah: 'Paid', foot: <div className="lft">{un ? <button className="btn g sm" data-act="logPay" data-id={un}>Log a payment</button> : null}<button className="lnk" data-act="tab" data-t="loans">Open Loans</button></div> }); }
  { let pl = 0, a = 0; const rows = S.goals.map(g => {
      const gp = goalPlan(g, k), sv = savedIn(g, k), ov = goalOv(g, k); pl += gp; a += sv;
      const s = gp <= 0.5 && Math.abs(sv) < 0.5 ? stp(target(g, k) > 0 && goalSaved(g, k) >= target(g, k) ? 'Reached' : 'No plan', 'dim') : sv >= gp - 0.5 ? stp('On track', 'ok') : Math.abs(sv) > 0.5 ? stp(f0(gp - sv) + ' to go') : stp(k < TK ? 'Missed' : 'Not yet', k < TK ? 'bad' : '');
      return { v: 'g:' + g.id, name: g.name, tag: ov != null ? <> <em className="o1">{mon(k).slice(0, 3)} amount</em></> : null, meta: [gLinked(g) ? 'Linked account' : '', exShare('g:' + g.id, k) > 0.5 ? `${f0(exShare('g:' + g.id, k))} from extra money` : ''].filter(Boolean).join(' · '), pl: gp, a: Math.abs(sv) > 0.004 ? sv : null, s };
    });
    if (S.goals.length) LG.push({ kind: 'Savings', name: 'Savings goals', c: 'var(--lilac)', pl, a, rows, ah: 'Saved', foot: <div className="lft"><button className="lnk" data-act="tab" data-t="goals">Open Goals</button></div> }); }
  const nRec = SRV ? recurring().length : 0;
  return <>
    <div className="phead bhd" style={{ '--i': 0 }}><div><h1>{lab(S.cur)}</h1><p className="mut">Where {mon(S.cur)} stands. Click anything for its transactions; change the plan in Build budget.</p></div><BudSwitch /></div>{' '}
    <div className="sbar" style={{ '--i': 0 }}>{sbar}</div><AlertsCard /><GuideCard /><RvCard /><XmCard />
    <section className="card flowc" style={{ '--i': 1 }}><div className="bh"><div><h2>Where the money goes</h2><p>{S.flow === 'compare' ? 'Each line’s plan against what’s really happened, worst first. Click a line for its transactions.' : 'Income on the left flows into each part of the budget. Point at anything for its share; click a name for its transactions, or a group for its breakdown.'}</p></div><div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}><div className="seg" hidden={S.flow === 'compare'}><button data-act="zout" aria-label="Zoom out">−</button><button data-act="zfit">Fit</button><button data-act="zin" aria-label="Zoom in">+</button></div><div className="seg"><button data-act="flow" data-v="plan" className={S.flow !== 'actual' ? 'on' : ''}>Planned</button><button data-act="flow" data-v="actual" className={S.flow === 'actual' ? 'on' : ''}>Actual</button><button data-act="flow" data-v="compare" className={S.flow === 'compare' ? 'on' : ''}>Compare</button></div></div></div><div className="zb" id="zb"></div><div className="skw"><div id="sk"></div><div id="skt" className="skt" hidden></div><div id="skc" className="skc" role="dialog" aria-label="Breakdown" hidden></div></div></section>
    <div className="lhead" style={{ '--i': 2 }}><div><h2>Budget lines</h2><p className="mut">Click any line to see its transactions, move one, or link it to your bank.</p></div><button className="btn g sm" data-act="budv" data-v="build">Edit budget</button></div>{' '}
    {nRec ? <div className="tip" style={{ '--i': 2, marginBottom: '16px' }}><i>!</i><p><b>{nRec} charge{nRec === 1 ? ' looks' : 's look'} like a bill</b> but {nRec === 1 ? 'isn’t' : 'aren’t'} tied to one yet. <button className="lnk" data-act="budv" data-v="build" style={{ padding: 0 }}>Review in Build budget</button></p></div> : null}{' '}
    <div className="ledger" style={{ '--i': 3 }}>{LG.map((o, i) => <Sec key={i} o={o} />)}</div><RcList m={{ rc: (m.rc || []).filter(r => !r.bank) }} />
  </>;
}
