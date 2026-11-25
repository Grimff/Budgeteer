// Loans tab (was renderLoans, loanCard, pxCard/pxText, wiText, debtChart in js/loans.js, bankLoansPanel in
// js/linked-loans.js, loanLinkLine in js/flow.js). The math (lp, row, savedL, pxSim, …) stays in those files.
// While typing / dragging, the live inputs (data-live px / wi) redraw only the plan's text and the what-if output and
// sentence: those follow a small tick of their own (pxLiveR / wiLiveR bump it), not the whole tab.
import { Fragment, useLayoutEffect, useRef, useState } from 'react';
import { tx, onAct, onInp, onChg, tick } from '../bridge.js';
import { Gear, CountUp, Clh } from '../ui.jsx';
import { BK, rulesFor, titleC } from '../lib/bank.js';
import { NOW, S, TK, addM, f0, f2, fk, lab, labS, mdiff, mo, mon, ord, r2 } from '../lib/core.js';
import { acctOf, subLab } from '../lib/linked-loans.js';
import { LR, PS, PX, pxHow, pxNow, pxSim, wiCap } from '../lib/loans.js';
import { OPEN, WI, balEnd, bankSrc, exShare, extraPaid, isShut, lastK, loanGone, loanPlan, loanUsual, lp, path, row, savedL, snowR, sooner, streak, stuck, sumI, xStart } from '../lib/math.js';
import { SRV } from '../lib/server-sync.js';
import { RANGES, debtNow } from '../lib/wealth.js';

// Read-only fields filled in by the lender (was RO/FL).
const ro = (l, f) => l.acct && l.auto && l.auto[f] ? { readOnly: true, title: 'Updated from your lender' } : {};
const Fl = ({ l, f }) => l.acct && l.auto && l.auto[f] ? <span className="fl">from lender</span> : null;

// Total debt over time vs minimums only, with a hover readout (#dread).
function DebtChart() {
  const L = S.loans, ref = useRef(null), [W, setW] = useState(null);
  let N = 0, ks = [], A = [], B = [], st = '', ts = '';
  if (L.length) {
    const os = l => +l.orig > 0 && l.origStart && l.origStart < l.start ? l.origStart : '';
    ts = L.map(l => l.start).sort()[0]; st = L.map(l => os(l) || l.start).sort()[0];
    const en = L.map(l => lastK(lp(l).b)).sort().pop(); N = mdiff(st, en) + 2;
    const pre = (l, k) => { const o = os(l); if (!o) return l.bal; if (k < o) return 0; const span = mdiff(o, l.start) || 1, orig = Math.max(+l.orig, l.bal); return orig + (l.bal - orig) * mdiff(o, k) / span; };
    for (let i = 0; i < N; i++) { const k = addM(st, i); ks.push(k); let a = 0, b = 0; L.forEach(l => { if (k < l.start) { const v = pre(l, k); a += v; b += v; return; } const ia = mdiff(l.start, k), pa = lp(l).a, pb = lp(l).b; a += ia < pa.length ? pa[ia].close : 0; b += ia < pb.length ? pb[ia].close : 0; }); A.push(a); B.push(b); }
    if (LR !== 'all') { const e = S.cur < st ? st : S.cur > ks[N - 1] ? ks[N - 1] : S.cur; let s0 = LR === '1m' ? addM(e, -1) : LR === '3m' ? addM(e, -3) : LR === 'ytd' ? addM(e.slice(0, 4) + '-01', -1) : addM(e, -12); if (s0 < st) s0 = st; const i0 = mdiff(st, s0), i1 = Math.max(i0 + 1, mdiff(st, e)); ks = ks.slice(i0, i1 + 1); A = A.slice(i0, i1 + 1); B = B.slice(i0, i1 + 1); N = ks.length; }
  }
  // hv: the hovered point, null when not hovering, so the default point is worked out on every render, as a fresh draw did
  const ci = N ? Math.max(0, Math.min(N - 1, mdiff(ks[0], S.cur))) : 0, [hv, setAt] = useState(null), at = hv ?? ci;
  // measured again after every render (a re-render in place must size like a fresh draw did); setW skips equal values
  useLayoutEffect(() => { if (L.length) setW(Math.round(Math.min(1000, Math.max(340, ref.current.clientWidth || Math.max(0, (document.querySelector('main') || document.body).clientWidth - 90) || 1000)))); });
  if (!L.length) return <><div id="dch"><p className="mut">Add a loan to see your path to debt free.</p></div><div className="dread" id="dread"></div></>;
  if (W == null) return <><div id="dch" ref={ref}></div><div className="dread" id="dread"></div></>;
  const H = W < 640 ? 260 : 320, pl = 64, pr = 16, pt = 16, pb = 34, hi0 = Math.max(...B, ...A, 1), lo0 = LR === 'all' ? 0 : Math.min(...B, ...A), pd = LR === 'all' ? hi0 * .05 : Math.max((hi0 - lo0) * .15, hi0 * .004), M = hi0 + pd, lo = LR === 'all' ? 0 : Math.max(0, lo0 - pd), X = i => pl + i / Math.max(1, N - 1) * (W - pl - pr), Y = v => pt + (1 - (v - lo) / (M - lo)) * (H - pt - pb);
  const line = arr => arr.map((v, i) => (i ? 'L' : 'M') + X(i).toFixed(1) + ',' + Y(v).toFixed(1)).join('');
  const gap = line(A) + B.map((v, i) => 'L' + X(N - 1 - i).toFixed(1) + ',' + Y(B[N - 1 - i]).toFixed(1)).join('') + 'Z';
  const gv = f => LR === 'all' ? hi0 * f : lo + (M - lo) * f;
  const yStep = Math.max(N > 150 ? (N > 300 ? 5 : 2) : 1, Math.ceil(N / 12 / Math.max(1, Math.floor((W - pl - pr) / 52))));
  const mStep = Math.ceil(N / Math.max(1, Math.floor((W - pl - pr) / 46))), short = N <= 16, mlab = k => new Date(+k.slice(0, 4), +k.slice(5) - 1, 1).toLocaleDateString('en-US', { month: 'short' }) + (k.endsWith('-01') || k === ks[0] ? ' ' + k.slice(2, 4).replace(/^/, '’') : '');
  const ti = Math.min(N - 1, mdiff(ks[0], ts)), i = Math.max(0, Math.min(N - 1, at)), x = X(i), nearEnd = X(ci) > W - pr - 40;
  const move = e => { const r = e.currentTarget.getBoundingClientRect(), vx = (e.clientX - r.left) / r.width * W; setAt(Math.round((vx - pl) / (W - pl - pr) * (N - 1))); };
  return <><div id="dch" ref={ref}><svg viewBox={`0 0 ${W} ${H}`} id="dsv" role="img" aria-label="Total debt over time" onPointerMove={move} onPointerLeave={() => setAt(null)}>
    <defs><linearGradient id="ga" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffb6d9" stopOpacity=".35" /><stop offset="1" stopColor="#ffb6d9" stopOpacity="0" /></linearGradient></defs>
    {ti > 0 ? <><rect x={X(0)} y={pt} width={X(ti) - X(0)} height={H - pt - pb} fill="rgba(255,255,255,.035)" /><text x={X(0) + 8} y={H - pb - 10} fill="var(--dim)" fontSize="13">Before tracking (estimated)</text></> : null}
    {[0, .5, 1].map(f => [
      <line key={'l' + f} x1={pl} x2={W - pr} y1={Y(gv(f))} y2={Y(gv(f))} stroke="var(--line)" />,
      <text key={'t' + f} x={pl - 10} y={Y(gv(f)) + 5} textAnchor="end" fill="var(--dim)" fontSize="13">{fk(gv(f))}</text>])}
    {short
      ? ks.map((k, j) => (N - 1 - j) % mStep === 0 ? <text key={k} x={X(j)} y={H - 8} textAnchor={j === 0 ? 'start' : j === N - 1 ? 'end' : 'middle'} fill="var(--dim)" fontSize="13">{mlab(k)}</text> : null)
      : ks.map((k, j) => k.endsWith('-01') && (+k.slice(0, 4)) % yStep === 0 ? <text key={k} x={X(j)} y={H - 8} textAnchor="middle" fill="var(--dim)" fontSize="13">{k.slice(0, 4)}</text> : null)}
    <path d={`${line(A)}L${X(N - 1)},${Y(lo)}L${X(0)},${Y(lo)}Z`} fill="url(#ga)" /><path d={gap} fill="var(--lime)" fillOpacity=".28" />
    <path d={line(B)} fill="none" stroke="var(--mut)" strokeWidth="2" strokeDasharray="6 6" /><path d={line(A)} fill="none" stroke="var(--pink)" strokeWidth="3" strokeLinejoin="round" />
    <line x1={X(ci)} x2={X(ci)} y1={pt} y2={H - pb} stroke="var(--lime)" strokeOpacity=".5" strokeDasharray="2 4" /><text x={nearEnd ? X(ci) - 6 : X(ci) + 6} y={pt + 14} textAnchor={nearEnd ? 'end' : 'start'} fill="var(--lime)" fontSize="13" fontWeight="600">{mon(S.cur).slice(0, 3)}</text>
    <line id="dsl" y1={pt} y2={H - pb} stroke="var(--text)" strokeOpacity=".45" x1={x} x2={x} /><circle id="dsa" r="6" fill="var(--pink)" cx={x} cy={Y(A[i])} /><circle id="dsb" r="5" fill="var(--bg)" stroke="var(--mut)" strokeWidth="2" cx={x} cy={Y(B[i])} />
  </svg></div><div className="dread" id="dread"><div><small>{lab(ks[i])}</small><b style={{ color: 'var(--pink)' }}>{f0(A[i])}</b></div><div><small>Minimums only</small><b className="mut">{f0(B[i])}</b></div><div><small>Interest saved{ks[i] > TK ? ' (with plans)' : ''}</small><b style={{ color: 'var(--lime)' }}>{f0(L.reduce((a, l) => a + savedL(l, ks[i]), 0))}</b></div></div></>;
}

// What the plan does (was pxText).
function PxText() {
  const X = Math.max(0, PX ?? pxNow()), a = pxSim(0, pxHow(), true), b = pxSim(X, pxHow());
  if (!b.L.length) return <p className="mut">No loans left to pay off.</p>;
  // never: a loan this plan doesn't pay off (its payment doesn't cover its interest); aNo: one that minimums alone don't
  const never = b.L.some(o => !o.end), aNo = a.L.some(o => !o.end), sn = never || aNo ? 0 : mdiff(b.end, a.end), fin = [...b.L].sort((x, y) => (x.end || '9999').localeCompare(y.end || '9999'));
  return <><div className="pxk"><div><small>Debt free</small><b>{never ? 'Never' : labS(b.end)}</b><span className={sn > 0 || (aNo && !never) ? 'up' : ''}>{never ? 'a loan isn’t paid off at this rate' : aNo ? 'minimums alone never pay it off' : sn > 0 ? mo(sn) + ' sooner than minimums' : 'same as minimums'}</span></div><div><small>Interest saved</small><b className="g">{f0(Math.max(0, a.int - b.int))}</b><span>vs paying only minimums</span></div><div><small>Total interest left</small><b>{f0(b.int)}</b><span>from {labS(b.m0)} on</span></div></div>{' '}
    <ol className="pxo">{fin.map((o, j) => { const f = Object.keys(o.x).sort()[0]; return <li key={j}><b>{tx(o.l.name)}</b> <span className="dim">{`${o.l.apr}`}% · {f0(o.b0 ?? 0)}</span><span>{f ? `extra from ${labS(f)}, ` : ''}{o.end ? 'paid off ' + labS(o.end) : 'not paid off at this rate'}</span></li>; })}</ol></>;
}

function PxCard() {
  const m0 = xStart(), X = PX ?? pxNow(), hand = Object.keys(S.months).some(k => k >= m0 && S.months[k].lxp && Object.keys(S.months[k].lxp).length), how = pxHow();
  return <section className="card pxc" style={{ '--i': 2 }}><div className="bh"><div><h2>Extra payment plan</h2><p>Put a set amount toward your loans each month, one loan at a time. When a loan is paid off, its payment rolls into the next one.</p></div></div>{' '}
    <div className="pxf"><label className="f">Extra each month<input className="in a" data-live="px" data-key="px" inputMode="decimal" defaultValue={X || ''} placeholder="$0" onInput={onInp} /></label><div className="seg" role="group" aria-label="Order"><button data-act="ps" onClick={onAct('ps')} data-v="rate" className={how === 'rate' ? 'on' : ''}>Highest rate first</button><button data-act="ps" onClick={onAct('ps')} data-v="bal" className={how === 'bal' ? 'on' : ''}>Smallest balance first</button></div></div>{' '}
    <div id="pxr"><PxLive /></div>{' '}
    <div className="pxa">{snowR() && PX == null && !PS ? <><span className="pill ok">In your schedule</span><button className="lnk" data-act="pxClear" onClick={onAct('pxClear')}>Stop the plan</button></> : <button className="btn sm" data-act="pxApply" onClick={onAct('pxApply')}>Use this plan</button>}<small className="dim">Adds a planned snowball to your schedule from {labS(m0)}; set a stop month or pick loans in Forecast → Your plan over time{how === 'rate' ? ' (highest rate first saves the most interest)' : ' (quicker wins, a little more interest)'}. It goes in the budget.{hand ? ' Months you set by hand in Build budget keep their amounts.' : ''}</small></div></section>;
}

// The what-if sentence (was wiText).
function WiText({ l, w }) {
  if (!w) return 'Drag to see what a bigger monthly payment would do.';
  const a = lp(l).a, x = path(l, 'a', w, S.cur < l.start ? l.start : S.cur), s = sumI(a) - sumI(x), n = a.length - x.length;
  return <>Saves <b>{f0(s)}</b> more interest and finishes in {labS(lastK(x))}, <b>{mo(n)}</b> sooner.</>;
}

// Bank payments linked to a hand-added loan (was loanLinkLine in flow.js, still used there by Build and the pop-up).
function LoanLinkLine({ l }) {
  if (!SRV || !bankSrc(l)) return null;
  const R = rulesFor('l:' + l.id), n = Object.values(S.txd || {}).filter(x => x.v === 'l:' + l.id && x.k === S.cur).length;
  return <div className="llk"><small>{R.length ? <>Bank payments: <b>{tx(R.map(r => titleC(r.p)).join(', '))}</b>{n ? ` · ${n} in ${mon(S.cur)}` : ''}</> : (l.acct ? 'Payments from checking to ' + tx(l.link ? l.link.inst : 'this lender') + ' count on their own. Link any other way you pay it.' : 'Link the payment from your bank and it’s logged for you each month.')}</small><span><button className="lnk" data-act="catTx" onClick={onAct('catTx')} data-v={'l:' + l.id}>See payments</button><button className="lnk" data-act="lnkPay" onClick={onAct('lnkPay')} data-kind="loan" data-id={l.id}>{R.length ? 'Change' : 'Link payment'}</button></span></div>;
}

// Loan card: balance and progress, three facts (this month, payoff, interest saved), the extra-a-month box, and
// everything else (payment source, bank links, what-if, details, history) folded into one "More" section.
function LoanCard({ l }) {
  const p = lp(l), before = S.cur < l.start, r = before ? null : row(l, S.cur), lv = l.acct && l.live && S.cur === TK ? l.live.bal : null, bal = lv != null ? lv : balEnd(l, S.cur), inst = tx(l.link ? l.link.inst : 'your bank'), orig = +l.orig > 0 ? Math.max(+l.orig, l.bal) : 0, base = orig || l.bal, pct = base ? Math.max(0, 1 - bal / base) : 0, sv = savedL(l), sn = sooner(l), mn = r ? Math.min(l.min, r.open + r.int) : 0, ok = OPEN.has('l-' + l.id), cap = wiCap(), w = Math.min(WI[l.id] || 0, cap), xs = xStart(), xu = loanUsual(l, xs), plS = Math.max(0, sumI(p.b) - sumI(p.a)) - sv;
  const hist = p.a.filter(x => x.lg), FB = {}; Object.values(S.txd || {}).forEach(x => { if (x.v === 'l:' + l.id) FB[x.k] = r2((FB[x.k] || 0) + x.amt); });
  const BS = bankSrc(l), fb = FB[S.cur] || 0, lr = BS && SRV ? rulesFor('l:' + l.id).length + (l.acct ? 1 : 0) : 0, fromB = r && r.lg && !r.auto && fb > 0.004 && Math.abs(fb - r.pay) < 0.01, early = [...Object.keys(l.rp || {}), ...Object.keys(FB)].filter(k => k < l.start).sort()[0];
  // this month: what was paid, or what's planned and how it will show up
  let tm;
  if (before) tm = { l: mon(S.cur), v: 'Not yet', s: 'tracking starts ' + labS(l.start) };
  else if (!r) tm = { l: mon(S.cur), v: 'Paid off', s: 'nothing due', c: 'ok' };
  else if (r.lg) tm = { l: 'Paid in ' + mon(S.cur), v: f2(r.pay), s: (r.pay > mn + 0.005 ? `+${f0(r.pay - mn)} extra · ` : '') + (r.auto ? 'from ' + inst : fromB ? 'from your bank' : 'logged by hand'), c: 'ok' };
  else { const pl = loanPlan(l, S.cur), ns = lr ? (S.cur < TK ? 'Not seen' : S.cur === TK && l.due && NOW.getDate() > l.due + 3 ? 'Not seen yet' : '') : ''; tm = { l: l.due ? 'Due the ' + ord(l.due) : mon(S.cur), v: f2(pl), s: (pl > mn + 0.5 ? `min ${f0(mn)} + ${f0(pl - mn)} extra · ` : '') + (l.acct && !BS ? 'shows when ' + inst + ' reports it' : lr ? 'logs itself from your bank' : 'not logged yet'), w: ns }; }
  const act = r && !r.auto && !fromB ? <button className="lnk" data-act="logPay" onClick={onAct('logPay')} data-id={l.id}>{r.lg ? 'Edit' : 'Log'}</button> : null;
  const link = l.acct
    ? (acctOf(l) ? `Linked to ${inst}${l.link.mask ? ' ••' + tx(l.link.mask) : ''} · payments from ${BS ? 'your bank' : inst}`
      : BK.loans ? (l.done || lastK(p.a) <= TK ? <><b>Paid off</b> in {labS(l.done || lastK(p.a))} · {tx(l.link ? l.link.inst : 'the lender')} has closed the account</> : <><b className="neg">Bank account not found</b> · reconnect it in Settings → Connections, or unlink</>)
        : 'Linked to a bank account')
    : lr ? 'Added by hand · payments from your bank' : 'Added by hand';
  const lxNote = (() => { const nx = (S.al || []).filter(a => a.src === 'plan' && a.to === 'l:' + l.id && a.from > xs && a.v > 0).sort((a, b) => a.from.localeCompare(b.from))[0], sn = exShare('l:' + l.id, S.cur < TK ? TK : S.cur) - xu; return nx && !xu ? `schedule adds ${f0(nx.v)} from ${labS(nx.from)}` : `from ${labS(xs)} on${sn > 0.5 ? ` · +${f0(sn)} from your schedule` : ''} · goes in the budget`; })();
  return <article className="card loan lc" style={{ '--c': `${l.color}` }}><header><input className="in ttl" data-k="lname" data-id={l.id} data-key={'ln-' + l.id} defaultValue={tx(l.name)} aria-label="Loan name" onInput={onInp} /><span className="apr">{`${l.apr}%`}</span></header>{' '}
    <p className="lsub">{link}</p>{' '}
    <div className="lbal"><small>{lv != null ? 'Owed now' : before ? 'Owed at start' : 'Owed after ' + mon(S.cur)}</small><b>{f2(bal)}</b></div>{' '}
    <div><div className="pbar"><span style={{ width: `${pct * 100}%` }}></span></div><p className="lpp">{orig ? <><b>{Math.round(pct * 100)}% paid off</b> · {f0(orig - bal)} of {f0(orig)}</> : <><b>{Math.round(pct * 100)}% paid</b> since {labS(l.start)} · <button className="lnk" data-act="origAdd" onClick={onAct('origAdd')} data-id={l.id}>Add original amount</button></>}</p></div>{' '}
    <div className="l3"><div className={tm.c || ''}><small>{tm.l}</small><b>{tm.v}</b><span>{tm.s}</span>{tm.w ? <span className={'pill ' + (tm.w === 'Not seen' ? 'bad' : 'hot')}>{tm.w}</span> : null}{act}</div>{' '}
      <div><small>Paid off</small><b>{stuck(l) ? 'Never' : labS(lastK(p.a))}</b><span className={sn > 0 ? 'up' : ''}>{stuck(l) ? 'minimum doesn’t cover interest' : sn > 0 ? mo(sn) + ' sooner' : 'on the minimum schedule'}</span></div>{' '}
      <div><small>Interest saved</small><b className="g">{f0(sv)}</b><span>{plS > 0.5 ? `+${f0(plS)} with planned extras` : sv > 0.5 ? 'from extra paid so far' : 'pay extra to start saving'}</span></div></div>{' '}
    {r || before ? <div className="lx"><label htmlFor={'lx-' + l.id}>Extra each month</label><input className="in a" id={'lx-' + l.id} data-c="loan" data-id={l.id} data-f="xtra" data-key={'lx-' + l.id} inputMode="decimal" defaultValue={xu || ''} placeholder="$0" ref={onChg} /><small>{lxNote}</small></div> : null}{' '}
    {early ? <p className="lnote">Payments go back to {lab(early)}, before tracking started. <button className="lnk" data-act="trackFrom" onClick={onAct('trackFrom')} data-id={l.id} data-k={early}>Track from {labS(early)}</button></p> : null}{' '}
    <details className="more" data-key={'l-' + l.id} open={ok}><summary>Payments, what-if and details</summary>{' '}
      {l.acct && SRV ? <div className="psrc"><small>Count payments from</small><div className="seg"><button type="button" data-act="paySrc" onClick={onAct('paySrc')} data-id={l.id} data-v="lender" className={BS ? '' : 'on'}>{inst}</button><button type="button" data-act="paySrc" onClick={onAct('paySrc')} data-id={l.id} data-v="bank" className={BS ? 'on' : ''}>Your bank</button></div></div> : null}{' '}
      <LoanLinkLine l={l} />{' '}
      {r ? <div className="wi"><label htmlFor={'wi-' + l.id}>What if we add {xu > 0 ? 'even more' : 'extra'} each month? <output id={'wo-' + l.id}><WiOut l={l} /></output></label><input type="range" id={'wi-' + l.id} data-live="wi" data-id={l.id} min="0" max={Math.floor(cap / 5) * 5} step="5" defaultValue={w} disabled={cap < 5} onInput={onInp} /><p id={'wp-' + l.id}>{cap < 5 ? 'Your budget has nothing left over this month to put toward extra payments.' : <WiLive l={l} />}</p>{cap < 5 ? null : <button className="btn g sm" data-act="wiPlan" onClick={onAct('wiPlan')} data-id={l.id}>Add to the plan</button>}</div> : null}{' '}
      <div className="fields"><label className="f">Original loan amount<Fl l={l} f="orig" /><input className="in a" data-c="loan" data-id={l.id} data-f="orig" {...ro(l, 'orig')} data-key={'lo-' + l.id} inputMode="decimal" defaultValue={l.orig || ''} placeholder="e.g. 160000" ref={onChg} /></label><label className="f">Loan started (optional)<Fl l={l} f="origStart" /><input className="in" type="month" data-c="loan" data-id={l.id} data-f="origStart" {...ro(l, 'origStart')} defaultValue={l.origStart || ''} ref={onChg} /></label>{' '}
        <label className="f">Balance when tracking started<input className="in a" data-c="loan" data-id={l.id} data-f="bal" inputMode="decimal" defaultValue={`${l.bal}`} ref={onChg} /></label><label className="f">Tracking started<input className="in" type="month" data-c="loan" data-id={l.id} data-f="start" defaultValue={`${l.start}`} ref={onChg} /></label>{' '}
        <label className="f">Interest rate (APR %)<Fl l={l} f="apr" /><input className="in a" data-c="loan" data-id={l.id} data-f="apr" {...ro(l, 'apr')} inputMode="decimal" defaultValue={`${l.apr}`} ref={onChg} /></label><label className="f">Minimum payment<Fl l={l} f="min" /><input className="in a" data-c="loan" data-id={l.id} data-f="min" {...ro(l, 'min')} inputMode="decimal" defaultValue={`${l.min}`} ref={onChg} /></label>{' '}
        <label className="f">Due day<Fl l={l} f="due" /><input className="in a" data-c="loan" data-id={l.id} data-f="due" {...ro(l, 'due')} inputMode="numeric" defaultValue={l.due || ''} placeholder="–" ref={onChg} /></label></div>{' '}
      <div className="hist">{hist.length ? hist.slice().reverse().map(x => <div key={x.k}><span>{lab(x.k)}</span><b>{f2(x.pay)}</b>{x.auto ? <span className="fl">from lender</span> : FB[x.k] > 0.004 ? <span className="fl">from bank</span> : <button className="x" data-act="unPay" onClick={onAct('unPay')} data-id={l.id} data-k={x.k} aria-label={`Remove ${lab(x.k)} payment`}>×</button>}</div>) : <p className="dim" style={{ fontSize: '14px' }}>No payments logged yet. Unlogged months count as the minimum.</p>}</div>{' '}
      {l.acct ? <button className="lnk" data-act="lnkUnlink" onClick={onAct('lnkUnlink')} data-id={l.id} style={{ margin: '10px 16px 0 0' }}>Unlink from bank</button> : null}<button className="lnk" data-act="delLoan" onClick={onAct('delLoan')} data-id={l.id} style={{ color: 'var(--red)', marginTop: '10px' }}>Delete this loan</button></details></article>;
}

// "Loans from your bank": track or link Plaid loan accounts (was bankLoansPanel).
function BankLoansPanel() {
  if (!SRV || !BK.st || !BK.st.configured || !BK.loans) return null;
  const A = BK.loans.filter(a => a.type === 'loan'), linked = new Set(S.loans.map(l => l.acct).filter(Boolean)), free0 = A.filter(a => !linked.has(a.id)), dup = free0.filter(a => A.some(b => linked.has(b.id) && b.institution === a.institution && b.subtype === a.subtype && Math.abs((+b.bal || 0) - (+a.bal || 0)) < 0.005)), free = free0.filter(a => !dup.includes(a)), need = (BK.st.items || []).filter(it => it.liab === 'consent'), man = S.loans.filter(l => !l.acct);
  const sub = !A.length ? 'No loan accounts in your connected banks yet. Connect your loan servicers (for example your student loan or auto lender) and they show up here.' : free.length ? 'Pick a loan account to track. Its balance and payments update on their own after each bank sync. Link it to a loan you already have to keep that loan’s history.' : `All ${A.length} loan account${A.length === 1 ? ' is' : 's are'} linked. Balances and payments update after each bank sync.`;
  const sh = isShut('lsetup', !free.length && !need.length);
  return <section className={'card cl' + (sh ? ' shut' : '')} id="lsetup" style={{ '--i': 5, marginTop: '24px' }}><Clh k="lsetup" shut={sh} title="Loans from your bank" sum={free.length ? `${free.length} to track` : need.length ? 'Needs your OK' : A.length ? `${A.length} linked` : 'None connected'} /><div className="bh"><div><p>{sub}</p></div><div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}><button className="btn g sm" data-act="bankSync" onClick={onAct('bankSync')} disabled={!!BK.busy}>{BK.busy ? 'Syncing…' : 'Sync now'}</button><button className="btn sm" data-act="bankConnect" onClick={onAct('bankConnect')}>Connect a lender</button></div></div>
    {need.map(it => <div className="bki" key={it.item_id}><div className="nm"><b>{tx(it.institution.name)}</b><small>Allow loan details (APR, minimum, due date, original amount) from this lender. It takes one quick sign-in through Plaid.</small></div><button className="btn g sm" data-act="liabAllow" onClick={onAct('liabAllow')} data-id={tx(it.item_id)}>Allow</button></div>)}
    {free.map(a => { const y = a.liab; return <div className="bki" key={a.id}><div className="nm"><b>{tx(a.institution)} · {tx(a.official || a.name)}{a.mask ? ' ••' + tx(a.mask) : ''}</b><small>{tx(subLab(a.subtype))}{a.bal != null ? ' · balance ' + f2(a.bal) : ''}{y && +y.apr > 0 ? ' · ' + (+y.apr) + '% APR' : ''}{y && +y.min > 0 ? ' · minimum ' + f2(+y.min) : ''}</small></div>{man.length ? <select className="in" data-lsel={tx(a.id)} aria-label={`Track ${tx(a.official || a.name)} as`}><option value="">As a new loan</option>{man.map(l => <option key={l.id} value={l.id}>{'Link to ' + tx(l.name)}</option>)}</select> : null}<button className="btn sm" data-act="lnkAdd" onClick={onAct('lnkAdd')} data-id={tx(a.id)}>Track</button></div>; })}
    {dup.length ? <p className="dim" style={{ fontSize: '13px', marginTop: '10px' }}>Left out: {dup.map(a => tx(a.institution) + ' · ' + tx(a.official || a.name)).join(', ')} {dup.length === 1 ? 'looks like the same loan as one' : 'look like the same loans as ones'} you already track (same lender, type and balance), connected a second time.</p> : null}</section>;
}

const LT = tick(), useLv = LT.use, lvBump = LT.bump;
function PxLive() { useLv(); return <PxText />; }
// the what-if amount shown and used while dragging: WI as the card computes it (the slider never goes past the cap)
const wiW = l => Math.min(WI[l.id] || 0, wiCap());
function WiOut({ l }) { useLv(); return f0(wiW(l)); }
function WiLive({ l }) { useLv(); return <WiText l={l} w={wiW(l)} />; }
export const pxLiveR = lvBump;
export const wiLiveR = lvBump;

export function Loans() {
  const L = S.loans, lm = mon(S.cur), saved = L.reduce((a, l) => a + savedL(l), 0), extra = L.reduce((a, l) => a + extraPaid(l), 0);
  const oweAt = l => S.cur === TK ? debtNow(l) : balEnd(l, S.cur), owed = L.reduce((a, l) => a + oweAt(l), 0), dfA = L.length ? L.map(l => lastK(lp(l).a)).sort().pop() : TK, dfB = L.length ? L.map(l => lastK(lp(l).b)).sort().pop() : TK, soon = mdiff(dfA, dfB);
  let paidM = 0, minM = 0, logged = 0;
  L.forEach(l => { const r = S.cur < l.start ? null : row(l, S.cur); if (r) { minM += Math.min(l.min, r.open + r.int); if (r.lg) { paidM += r.pay; logged++; } } });
  const withO = L.filter(l => +l.orig > 0), origT = withO.reduce((a, l) => a + Math.max(+l.orig, l.bal), 0), owedO = withO.reduce((a, l) => a + oweAt(l), 0);
  const st = streak(), best = [...L].filter(l => balEnd(l, S.cur) > 0.5).sort((a, b) => b.apr - a.apr)[0];
  const LA = L.filter(l => !loanGone(l)), LG0 = L.filter(l => loanGone(l)), psh = isShut('lpaid', true);
  return <>
    <div className="phead" style={{ '--i': 0 }}><div><h1>Loans</h1><p className="mut">Balances, payments, and how much paying early saves you.</p></div><div className="phact"><button className="btn g sm ib" data-act="lenders" onClick={onAct('lenders')} title="Connect lenders and link loan accounts"><Gear />Lenders</button></div></div>{' '}
    <section className="card" style={{ '--i': 0 }}><div className="bh"><div><h2>Total debt over time</h2><p>Your path compared with paying only the minimums. The green gap is debt you got rid of early. Move across the chart.</p></div><div className="seg" role="group" aria-label="Time range">{RANGES.map(([k, l]) => <button key={k} className={LR === k ? 'on' : ''} data-act="lr" onClick={onAct('lr')} data-r={k}>{l}</button>)}</div></div><DebtChart key={LR + '|' + S.cur} /></section>{' '}
    <div className="hero hl" style={{ '--i': 1 }}><div><p className="lbl">Interest saved by paying early{S.cur > TK ? ' (by ' + lm + ', with planned extras)' : ''}</p><CountUp className="big" id="lSaved" k="lSaved" to={Math.max(0, saved)} fmt={f2} />{' '}
      <p className="note">{extra > 0.5 ? <>From {f0(extra)} paid above the minimums. Every extra dollar has saved about <b style={{ color: 'var(--lime)' }}>{Math.round(saved / extra * 100)}¢</b> in interest so far.</> : 'Log a payment above the minimum and watch this number grow. Every extra dollar goes straight to principal.'}</p>{' '}
      <div className="acts"><button className="btn lime" data-act="logPay" onClick={onAct('logPay')} data-id={best ? best.id : ''} disabled={!best}>Log a payment</button></div></div>{' '}
      <div className="kpis"><div className="kpi"><small>Total owed {S.cur === TK ? 'today' : 'after ' + lm}</small><CountUp id="lOwed" k="lOwed" to={owed} /><span>{!origT ? '' : withO.length === L.length ? `${Math.round((1 - owedO / origT) * 100)}% of ${f0(origT)} borrowed is paid off` : `${f0(origT - owedO)} paid off on ${withO.length} of ${L.length} loans`}</span></div>{' '}
        <div className="kpi"><small>Debt free</small><b>{labS(dfA)}</b><span className={soon > 0 ? 'up' : ''}>{soon > 0 ? mo(soon) + ' sooner' : 'On the minimum schedule'}</span></div>{' '}
        <div className="kpi"><small>Paid in {lm}</small><b>{f0(paidM)}</b><span>{logged} of {L.filter(l => row(l, S.cur)).length} logged · min {f0(minM)}</span></div>{' '}
        <div className="kpi"><small>Extra-payment streak</small><b>{mo(st)}</b><span>{st ? 'Keep it going' : 'Pay extra this month to start one'}</span></div></div></div>
    <PxCard />
    {LA.length ? <div className="lgrid" style={{ '--i': 4 }}>{LA.map(l => <LoanCard key={l.id} l={l} />)}</div> : <section className="card" style={{ '--i': 4 }}><p className="mut">Every loan is paid off. Nice work.</p></section>}<button className="add" data-act="addLoan" onClick={onAct('addLoan')} style={{ marginTop: '16px' }}>{SRV ? 'Add a loan by hand' : 'Add a loan'}</button>
    {LG0.length ? <section className={'card cl' + (psh ? ' shut' : '')} style={{ '--i': 4, marginTop: '24px' }}><Clh k="lpaid" shut={psh} title="Paid off" sum={`${LG0.length} loan${LG0.length === 1 ? '' : 's'}`} /><p className="mut" style={{ marginBottom: '12px' }}>{LG0.map((l, j) => { const a = lp(l).a, last = a[a.length - 1]; return <Fragment key={l.id}>{j ? ' · ' : ''}<b style={{ color: 'var(--text)' }}>{tx(l.name)}</b> in {labS(last ? last.k : l.start)}</Fragment>; })}. They no longer count toward the budget; earlier months keep their payments.</p><div className="lgrid">{LG0.map(l => <LoanCard key={l.id} l={l} />)}</div></section> : null}
    <BankLoansPanel />
  </>;
}
