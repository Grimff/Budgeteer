// Budget → Forecast (was renderForecast, fcBody, fcDetail, fcLanes, fcChart in js/budget.js). fcRun (the month-by-month
// run, with what-ifs) stays there. renderForecast draws the frame, then fcBody draws #fcb, as before: the what-if
// sliders (data-live wf), the range buttons and "Months over budget" redraw only the body.
import { useLayoutEffect, useRef, useState } from 'react';
import { tx, onAct, onInp, drawNo, tick } from '../bridge.js';
import { BudSwitch } from './Budget.jsx';
import { AlForm, AlAdds, AlList } from '../schedule.jsx';
import { FDK, FR, WFS, fcRun, setFCT, setFDK } from '../lib/budget.js';
import { ALE, alCol, alDesc, alWhen } from '../lib/build.js';
import { S, TK, addM, f0, fk, lab, labS, mdiff, mo, mon } from '../lib/core.js';
import { alAt, destName, goalEta, goalSaved, lastK, loanGone, lp, target, xsBuild } from '../lib/math.js';

// The what-if outputs (#wfo-) follow a tick: the slider's handler sets WFS and calls wfLive (= wfLiveR).
const WT = tick();
export const wfLiveR = WT.bump;
function WfOut({ f }) { WT.use(); return (WFS[f] < 0 ? '−' : f === 'inc' && WFS[f] > 0 ? '+' : '') + f0(Math.abs(WFS[f])); }
export function Forecast() {
  const on = WFS.inc || WFS.cost || WFS.extra;
  return <>
    <div className="phead bhd" style={{ '--i': 0 }}><div><h1>Forecast</h1><p className="mut">Where your plan takes you from {lab(TK)}: every future month of your budget, one-time items and your schedule. Change the schedule here; try what-ifs without saving.</p></div><BudSwitch /></div><div id="fcb" key={'fcb' + drawNo()}></div>{' '}
    <details className="more card" style={{ marginTop: '16px', padding: '16px 18px' }} open={!!on}><summary>What if…</summary><p className="mut" style={{ fontSize: '14px', margin: '8px 0 12px' }}>Move a slider to see what changes. Nothing is saved.{on ? <> <button className="lnk" data-act="wfReset" onClick={onAct('wfReset')}>Reset</button></> : null}</p>{' '}
      <div className="wfs">{[['inc', 'Income changes by', -3000, 3000, 'a month'], ['cost', 'A new monthly cost of', 0, 3000, 'a month'], ['extra', 'Extra toward loans', 0, 3000, 'a month, highest rate first']].map(([f, l, a, b, u]) => <label className="wf" key={f}><span>{l} <output id={'wfo-' + f}><WfOut f={f} /></output> <small>{u}</small></span><input type="range" data-live="wf" data-f={f} min={a} max={b} step="50" defaultValue={WFS[f]} onInput={onInp} /></label>)}</div></details>
  </>;
}

// One month of the forecast, as its budget plans it.
function FcDetail({ r }) {
  if (!r) return null;
  const Ln = ({ l, v, c }) => <div className="fdl"><span><i style={{ background: c || 'var(--dim)' }}></i>{l}</span><b>{f0(v)}</b></div>;
  const A = alAt(r.k).filter(a => a.id !== 'wf');
  return <><div className="bh" style={{ margin: '6px 0 8px' }}><div><h3 style={{ fontSize: '17px' }}>{lab(r.k)}</h3></div><button className="btn g sm" data-act="fcEdit" onClick={onAct('fcEdit')} data-k={r.k}>Edit {mon(r.k)} in Build budget</button></div><div className="fdg">{' '}
    <div><Ln l="Income" v={r.inc} c="var(--pink)" /><Ln l="Bills" v={r.bills} c="var(--butter)" /><Ln l="Groceries & spending" v={r.spend} c="var(--coral)" />{r.once.length ? <p className="dim" style={{ fontSize: '12.5px', margin: '2px 0 6px' }}>One-time: {r.once.map(i => tx(i.name) + ' ' + f0(+i.amt || 0)).join(' · ')}</p> : null}</div>{' '}
    <div>{r.L.length ? r.L.map(([l, v]) => <Ln key={l.id} l={tx(l.name)} v={v} c={l.color} />) : <Ln l="Loans" v={0} />}</div>{' '}
    <div>{r.G.length ? r.G.map(([g, v]) => <Ln key={g.id} l={tx(g.name)} v={v} c={g.color} />) : <Ln l="Savings" v={0} c="var(--lilac)" />}<Ln l={r.left < -0.5 ? 'Short' : 'Kept'} v={r.left} c={r.left < -0.5 ? '#ff6b7f' : 'var(--lime)'} /><div className="fdl"><span>Owed after · saved</span><b>{f0(r.debt)} · {f0(r.saved)}</b></div></div></div>
    {A.length ? <p className="dim" style={{ fontSize: '12.5px', marginTop: '8px' }}>Scheduled this month: {A.map((a, j) => [j ? ' ' : null, <button key={a.id} className="lnk" data-act="scEdit" onClick={onAct('scEdit')} data-id={a.id} style={{ fontSize: '12.5px', padding: '1px 8px' }}>{tx(destName(a.to))} · {tx(alDesc(a).split(' · ')[0])}</button>])}</p> : null}</>;
}

// The schedule as lanes on a month axis: one per loan and goal that has something scheduled, plus snowballs and kept.
function FcLanes({ R }) {
  const ks = R.map(r => r.k), N = ks.length, pos = k => Math.max(0, Math.min(N, mdiff(ks[0], k))), A = S.al || [], pct = v => (v / N * 100).toFixed(2) + '%';
  const fin = a => { if (a.to.startsWith('l:')) { const l = S.loans.find(x => 'l:' + x.id === a.to); return l ? lastK(lp(l).a) : ''; } if (a.to.startsWith('g:')) { const g = S.goals.find(x => 'g:' + x.id === a.to); return g ? goalEta(g) || '' : ''; } return ''; };
  const geo = a => { const s0 = pos(a.from), f = fin(a); let e0 = a.until ? pos(addM(a.until, 1)) : N; if (f) e0 = Math.min(e0, pos(addM(f, 1))); return e0 > s0 ? { s: s0, e: e0 } : null; };
  const bar = (a, g, r) => <button key={a.id} type="button" className={'flb ' + a.src + (ALE === a.id ? ' on' : '')} style={{ left: pct(g.s), width: pct(g.e - g.s), top: `${4 + r * 26}px`, height: '22px', bottom: 'auto', '--c': alCol(a) }} data-act="scEdit" onClick={onAct('scEdit')} data-id={a.id} title={`${tx(alDesc(a))} · ${tx(alWhen(a))}`}>{a.to === 'snow' ? (a.src === 'plan' ? f0(a.v) : a.mode === '%' ? a.v + '%' : f0(a.v)) : a.src === 'plan' ? f0(a.v) + '/mo' : a.mode === '%' ? a.v + '% of left' : f0(a.v) + ' of left'}</button>;
  // items that overlap in time go on separate rows of their lane
  const place = (list, extra) => { const rows = []; const h = list.map(a => { const g = geo(a); if (!g) return null; let r = rows.findIndex(e => e <= g.s); if (r < 0) { r = rows.length; rows.push(0); } rows[r] = g.e; return bar(a, g, r); }); const n = rows.length, x = extra ? extra(n) : []; return { h: [...h, ...x], n: Math.max(1, n + (x.length ? 1 : 0)) }; };
  const mk = (k, cls, t, key) => (!k || k < ks[0] || k > ks[N - 1]) ? null : <span key={key} className={'flm ' + cls} style={{ left: pct(pos(k) + .5) }} title={tx(t)}></span>;
  const ed = A.find(a => a.id === ALE);
  const lane = (name, c, P, marks, sub, dest) => [<div className="fcl" key={dest}><span className="fcln"><i style={{ background: c }}></i><b>{tx(name)}</b>{sub ? <small>{sub}</small> : null}</span><div className="fclt" style={{ height: `${8 + P.n * 26}px` }}>{P.h}{marks}</div><button className="fcp" data-act="scAddTo" onClick={onAct('scAddTo')} data-to={dest} title={`Add to ${tx(name)}`} aria-label={`Add to ${tx(name)}`}>+</button></div>,
    ed && ed.to === dest ? <div className="fcle" key={dest + 'e'}><AlForm a={ed} /></div> : null];
  const near = ks.slice(1, Math.max(2, Math.round(N / 6))).some(k => k.endsWith('-01')), ms = N <= 14 ? 1 : N <= 26 ? 3 : 0;
  const yrs = ks.map((k, i) => k.endsWith('-01') || (i === 0 && !near) ? <span key={k} style={{ left: pct(i) }}><b>{i === 0 ? mon(k).slice(0, 3) + ' ' : ''}{k.slice(0, 4)}</b></span> : ms && i % ms === 0 ? <span key={k} style={{ left: pct(i) }}>{mon(k).slice(0, 3)}</span> : null);
  const Ls = S.loans.filter(l => !loanGone(l, TK)), Gs = S.goals.filter(g => target(g) > 0 || A.some(a => a.to === 'g:' + g.id));
  const out = [<div className="fcla" key="axis"><span></span><div className="fclx">{yrs}</div><span></span></div>];
  const SN = A.filter(a => a.to === 'snow');
  if (SN.length) { const ids = new Set(SN.flatMap(a => a.loans && a.loans.length ? a.loans : S.loans.map(l => l.id))); out.push(lane('Snowball', 'var(--sky)', place(SN), null, S.loans.filter(l => ids.has(l.id) && !loanGone(l, TK)).map(l => tx(l.name.replace(/ loan$/i, ''))).join(', '), 'snow')); }
  const XX = xsBuild(), sruns = (l, row) => { const o = []; let st = -1; for (let i = 0; i <= N; i++) { const on = i < N && (XX[ks[i]] && XX[ks[i]]['s|l:' + l.id] || 0) > 0.5; if (on && st < 0) st = i; if (!on && st >= 0) { o.push(<span key={'s' + st} className="fls" style={{ left: pct(st), width: pct(i - st), top: `${8 + row * 26}px`, bottom: 'auto', height: '14px' }} title={`Snowball pays ${tx(l.name)} ${labS(ks[st])} – ${labS(ks[i - 1])}`}>snowball</span>); st = -1; } } return o; };
  Ls.forEach(l => { const e = lastK(lp(l).a); out.push(lane(l.name, l.color, place(A.filter(a => a.to === 'l:' + l.id), n => sruns(l, n)), mk(e, 'ok', `${l.name} paid off ${labS(e)}`, 'e'), `min ${f0(l.min)} · paid off ${labS(e)}`, 'l:' + l.id)); });
  Gs.forEach(g => { const e = goalEta(g); out.push(lane(g.name, g.color, place(A.filter(a => a.to === 'g:' + g.id)), [mk(e, 'ok', `${g.name} reached ${labS(e || TK)}`, 'e'), mk(g.by, 'by', `Target date ${g.by ? labS(g.by) : ''}`, 'b')], target(g) > 0 ? `${f0(goalSaved(g, TK))} of ${f0(target(g))}${e ? ' · reached ' + labS(e) : ''}` : 'no target', 'g:' + g.id)); });
  if (A.filter(a => a.to === 'keep').length) out.push(lane('Kept', 'var(--lime)', place(A.filter(a => a.to === 'keep')), null, 'left-over rules that keep money', 'keep'));
  return <><div className="fclw">{out}</div>{A.length ? null : <p className="dim" style={{ fontSize: '13.5px', marginTop: '8px' }}>Nothing scheduled yet. Press + on a loan or goal, or use the buttons below.</p>}</>;
}

// Debt and savings by month, with the month's detail under it. Click a month to show its detail (FDK); hover moves the
// line. Draws at the width its box has once on the page.
function FcChart({ R, M }) {
  const ref = useRef(null), [W, setW] = useState(null), N = R.length;
  const [si, setSi] = useState(Math.max(0, R.findIndex(r => r.k === FDK))), [hov, setHov] = useState(null);
  useLayoutEffect(() => { setW(Math.round(Math.min(1000, Math.max(340, ref.current.clientWidth || 900)))); }, []);
  const detail = <div className="fcd"><FcDetail r={R[si]} /></div>;
  if (W == null) return <><div id="fch" ref={ref}></div>{' '}{detail}</>;
  const H = W < 640 ? 230 : 280, pl = 58, pr = 14, pt = 14, pb = 32, top = Math.max(...R.map(r => Math.max(r.debt, r.saved)), 1) * 1.08, X = i => pl + i / Math.max(1, N - 1) * (W - pl - pr), Y = v => pt + (1 - v / top) * (H - pt - pb);
  const ln = f => R.map((r, i) => (i ? 'L' : 'M') + X(i).toFixed(1) + ',' + Y(r[f]).toFixed(1)).join('');
  const step = Math.ceil(N / Math.max(1, Math.floor((W - pl - pr) / 52)));
  const at = e => { const b = e.currentTarget.getBoundingClientRect(); return Math.max(0, Math.min(N - 1, Math.round(((e.clientX - b.left) / b.width * W - pl) / (W - pl - pr) * (N - 1)))); };
  const x = X(hov ?? si);
  return <><div id="fch" ref={ref}><div className="fleg"><span><i style={{ background: 'var(--sky)' }}></i>Total owed</span><span><i style={{ background: 'var(--lilac)' }}></i>Saved toward goals</span></div><svg viewBox={`0 0 ${W} ${H}`} id="fsv" role="img" aria-label="Debt and savings by month" style={{ cursor: 'pointer' }} onPointerMove={e => setHov(at(e))} onPointerLeave={() => setHov(null)} onClick={e => { const i = at(e); setFDK(R[i].k); setSi(i); }}>
    {[0, .5, 1].map(f => [
      <line key={'l' + f} x1={pl} x2={W - pr} y1={Y(top / 1.08 * f)} y2={Y(top / 1.08 * f)} stroke="var(--line)" />,
      <text key={'t' + f} x={pl - 8} y={Y(top / 1.08 * f) + 5} textAnchor="end" fill="var(--dim)" fontSize="13">{fk(top / 1.08 * f)}</text>])}
    {R.map((r, i) => i % step === 0 ? <text key={r.k} x={X(i)} y={H - 8} textAnchor={i === 0 ? 'start' : 'middle'} fill="var(--dim)" fontSize="13">{new Date(+r.k.slice(0, 4), +r.k.slice(5) - 1, 1).toLocaleDateString('en-US', { month: 'short' }) + (r.k.endsWith('-01') || i === 0 ? ' ’' + r.k.slice(2, 4) : '')}</text> : null)}
    <path d={`${ln('debt')}L${X(N - 1)},${Y(0)}L${X(0)},${Y(0)}Z`} fill="var(--sky)" fillOpacity=".12" /><path d={ln('debt')} fill="none" stroke="var(--sky)" strokeWidth="3" /><path d={ln('saved')} fill="none" stroke="var(--lilac)" strokeWidth="3" />
    {M.map((m, j) => { const i = mdiff(R[0].k, m.k); return i >= 0 && i < N ? <circle key={j} cx={X(i)} cy={Y(m.l ? 0 : m.g ? R[i].saved : 0)} r="5.5" fill={m.c} stroke="var(--bg)" strokeWidth="2"><title>{`${tx(m.t)} · ${labS(m.k)}`}</title></circle> : null; })}
    <line id="fsl" x1={x} x2={x} y1={pt} y2={H - pb} stroke="var(--text)" strokeOpacity=".45" />
  </svg></div>{' '}{detail}</>;
}

export function FcBody() {
  const on = WFS.inc || WFS.cost || WFS.extra, base = on ? fcRun({ inc: 0, cost: 0, extra: 0 }) : null, cur = fcRun({ ...WFS }), R = cur.rows, N = R.length;
  const bm = base ? Object.fromEntries(base.M.map(m => [m.id, m.k])) : {}, mv = m => { if (!base || !bm[m.id] || bm[m.id] === m.k) return null; const d = mdiff(m.k, bm[m.id]); return d > 0 ? <> <span className="up">{mo(d)} sooner</span></> : <> <span className="neg">{mo(-d)} later</span></>; };
  const yr = R.slice(0, 12), kept = yr.reduce((a, r) => a + r.left, 0) / yr.length, over = R.filter(r => r.left < -0.5), ng = cur.M.find(m => m.g);
  if (!FDK || !R.some(r => r.k === FDK)) setFDK(R[0].k);   // the month shown under the chart (as the old fcBody did)
  setFCT(R);
  return <>
    <div className="fck" style={{ '--i': 1 }}><div><small>Debt free</small><b>{cur.df ? labS(cur.df) : '—'}</b><span>{cur.df ? mo(mdiff(TK, cur.df)) + ' from now' : 'no loans'}{base && base.df && cur.df && base.df !== cur.df ? ` · was ${labS(base.df)}` : ''}</span></div>{' '}
      <div><small>Next goal</small><b>{ng ? labS(ng.k) : '—'}</b><span>{ng ? tx(ng.g.name) : S.goals.some(g => target(g) > 0) ? 'schedule savings to see dates' : 'add a goal target'}</span></div>{' '}
      <div><small>Kept each month</small><b className={kept < -0.5 ? 'neg' : ''}>{f0(kept)}</b><span>average, next 12 months</span></div>{' '}
      <div className={over.length ? 'warn' : ''} {...(over.length ? { role: 'button', tabIndex: '0', 'data-act': 'fcMonth', onClick: onAct('fcMonth'), 'data-k': over[0].k, title: `Show ${lab(over[0].k)}`, style: { cursor: 'pointer' } } : {})}><small>Months over budget</small><b>{over.length}</b><span>{over.length ? `first ${labS(over[0].k)} · plan spends more than it earns` : 'in the next ' + mo(N)}</span></div></div>{' '}
    <section className="card" style={{ '--i': 2, marginTop: '16px' }}><div className="bh"><div><h2>Your plan over time</h2><p>Every set amount and left-over rule toward loans and goals, with when it starts and stops. Click a bar to change it, or add one below. Ticks mark payoffs and goals reached; diamonds are target dates.</p></div><div className="seg" role="group" aria-label="Range">{[['12', '1Y'], ['24', '2Y'], ['60', '5Y'], ['all', 'All']].map(([k, l]) => <button key={k} className={FR === k ? 'on' : ''} data-act="frng" onClick={onAct('frng')} data-r={k}>{l}</button>)}</div></div>{' '}
      <FcLanes R={R} /><div style={{ marginTop: '12px' }}><small className="dim" style={{ display: 'block', marginBottom: '6px', fontSize: '12.5px' }}>Add to your plan (or press + on a row):</small><AlAdds /></div>{' '}
      {(S.al || []).length ? <details className="more" style={{ marginTop: '12px' }}><summary>Everything scheduled, as a list ({S.al.length})</summary><AlList form={false} /></details> : null}</section>{' '}
    <section className="card" style={{ '--i': 3, marginTop: '16px' }}><div className="bh"><div><h2>Debt and savings</h2><p>Total owed and total saved toward goals, month by month. Click a month to see its budget.</p></div></div><FcChart R={R} M={cur.M} /></section>{' '}
    <section className="card" style={{ '--i': 4, marginTop: '16px' }}><div className="bh"><div><h2>Milestones</h2></div></div><div className="msl">{cur.M.length ? cur.M.map((m, j) => <div key={j} className={'ms' + (m.k > R[N - 1].k ? ' far' : '')}><i style={{ background: m.c }}></i><b>{labS(m.k)}</b><span>{tx(m.t)}{mv(m)}</span><small>{m.d}</small></div>) : <p className="dim">Set goal targets and schedule savings, or add loans, to see milestones.</p>}</div>{' '}
      <details className="more" style={{ marginTop: '12px' }}><summary>Month-by-month table</summary><div className="dmw"><table className="dmt"><tbody><tr className="th"><th>Month</th><th>Income</th><th>Planned out</th><th>Kept</th><th>Total debt</th><th>Saved toward goals</th></tr>{R.map(r => <tr key={r.k}><td>{lab(r.k)}</td><td>{f0(r.inc)}</td><td>{f0(r.bills + r.spend + r.loans + r.save)}</td><td className={r.left < -0.5 ? 'neg' : ''}>{f0(r.left)}</td><td>{f0(r.debt)}</td><td>{f0(r.saved)}</td></tr>)}</tbody></table></div></details></section>
  </>;
}
