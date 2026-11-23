// Goals tab (was renderGoals, goalChart and goalCard in js/goals.js, allocCard and goalLinks in js/goal-accounts.js).
// The math (goalSaved, goalProj, goalEta, allocAt, …) stays in those files.
import { useLayoutEffect, useRef, useState } from 'react';
import { tx } from '../bridge.js';
import { Gear, CountUp, Ring, Clh, NmA } from '../ui.jsx';

const acctOpt = a => `${tx(a.institution)} · ${tx(a.official || a.name)}${a.mask ? ' ••' + tx(a.mask) : ''} · ${tx(subI(a.subtype))} (${f0(+a.bal || 0)})`;

// Goal timeline: % of target by month for each goal with a target (history from 6 months back, projection after).
// Draws at the width its box has once on the page; hover moves the readout (#gread) to that month.
function GoalChart({ G }) {
  const ref = useRef(null), [W, setW] = useState(null);
  const st = addM(TK, -6), etas = G.map(goalEta).filter(Boolean).sort(), far = etas.length ? etas[etas.length - 1] : addM(TK, 60), en = GR === '1y' ? addM(TK, 12) : GR === '2y' ? addM(TK, 24) : GR === '5y' ? addM(TK, 60) : (far > addM(TK, 24) ? (far < addM(TK, 360) ? addM(far, 3) : addM(TK, 360)) : addM(TK, 24)), N = mdiff(st, en) + 1, ks = [];
  for (let i = 0; i < N; i++) ks.push(addM(st, i));
  const ci = mdiff(st, TK), [at, setAt] = useState(ci);
  useLayoutEffect(() => { setW(Math.round(Math.min(1000, Math.max(340, ref.current.clientWidth || Math.max(0, (document.querySelector('main') || document.body).clientWidth - 90) || 1000)))); }, []);
  if (W == null) return <><div id="gch" ref={ref}></div><div className="dread" id="gread"></div></>;
  const P = G.map(g => ks.map(k => { const t = target(g, k) || 1, v = k <= TK ? (k === TK ? goalSaved(g, TK) : goalSaved(g, k)) : goalProj(g, k); return { v, p: Math.max(0, Math.min(1, v / t)) }; }));
  const H = W < 640 ? 240 : 290, pl = 48, pr = 16, pt = 14, pb = 34, X = i => pl + i / Math.max(1, N - 1) * (W - pl - pr), Y = p => pt + (1 - p) * (H - pt - pb);
  const yStep = Math.max(1, Math.ceil(N / 12 / Math.max(1, Math.floor((W - pl - pr) / 56)))), mStep = Math.ceil(N / Math.max(1, Math.floor((W - pl - pr) / 50))), lab2 = k => new Date(+k.slice(0, 4), +k.slice(5) - 1, 1).toLocaleDateString('en-US', { month: 'short' }) + (k.endsWith('-01') || k === ks[0] ? ' ’' + k.slice(2, 4) : '');
  const ln = (arr, a, b) => arr.slice(a, b + 1).map((o, j) => (j ? 'L' : 'M') + X(a + j).toFixed(1) + ',' + Y(o.p).toFixed(1)).join('');
  const i = Math.max(0, Math.min(N - 1, at));
  const move = e => { const r = e.currentTarget.getBoundingClientRect(), vx = (e.clientX - r.left) / r.width * W; setAt(Math.round((vx - pl) / (W - pl - pr) * (N - 1))); };
  return <><div id="gch" ref={ref}><svg viewBox={`0 0 ${W} ${H}`} id="gsv" role="img" aria-label="Goal progress over time" onPointerMove={move} onPointerLeave={() => setAt(ci)}>
    {[0, .5, 1].map(f => [
      <line key={'l' + f} x1={pl} x2={W - pr} y1={Y(f)} y2={Y(f)} stroke="var(--line)" strokeDasharray={f === 1 ? '4 4' : undefined} />,
      <text key={'t' + f} x={pl - 8} y={Y(f) + 5} textAnchor="end" fill="var(--dim)" fontSize="13">{f * 100}%</text>])}
    {N <= 30
      ? ks.map((k, j) => (N - 1 - j) % mStep === 0 ? <text key={k} x={X(j)} y={H - 8} textAnchor={j === 0 ? 'start' : j === N - 1 ? 'end' : 'middle'} fill="var(--dim)" fontSize="13">{lab2(k)}</text> : null)
      : ks.map((k, j) => k.endsWith('-01') && (+k.slice(0, 4)) % yStep === 0 ? <text key={k} x={X(j)} y={H - 8} textAnchor="middle" fill="var(--dim)" fontSize="13">{k.slice(0, 4)}</text> : null)}
    <line x1={X(ci)} x2={X(ci)} y1={pt} y2={H - pb} stroke="var(--lime)" strokeOpacity=".5" strokeDasharray="2 4" />
    <text x={X(ci) + 6} y={pt + 14} fill="var(--lime)" fontSize="13" fontWeight="600">Now</text>
    {G.map((g, gi) => { const c = g.color || 'var(--lilac)', e = goalEta(g), ei = e ? mdiff(st, e) : -1, bi = g.by ? mdiff(st, g.by) : -1; return [
      <path key={'h' + gi} d={ln(P[gi], 0, ci)} fill="none" stroke={c} strokeWidth="3" />,
      <path key={'p' + gi} d={ln(P[gi], ci, N - 1)} fill="none" stroke={c} strokeWidth="2.5" strokeDasharray="7 5" />,
      ei >= 0 && ei < N ? <circle key={'e' + gi} cx={X(ei)} cy={Y(1)} r="6" fill={c} /> : null,
      bi >= 0 && bi < N ? <rect key={'b' + gi} x={X(bi) - 5} y={Y(1) - 5} width="10" height="10" transform={`rotate(45 ${X(bi)} ${Y(1)})`} fill="none" stroke={c} strokeWidth="2" /> : null]; })}
    <line id="gsl" y1={pt} y2={H - pb} stroke="var(--text)" strokeOpacity=".4" x1={X(i)} x2={X(i)} />
  </svg></div><div className="dread" id="gread"><div><small>{lab(ks[i])}{ks[i] > TK ? ' · projected' : ''}</small><b>{f0(G.reduce((a, g, gi) => a + P[gi][i].v, 0))}</b></div>{G.map((g, gi) => <div key={gi}><small><i className="gdot" style={{ background: `${g.color}` }}></i>{tx(g.name)}</small><b>{Math.round(P[gi][i].p * 100)}%</b> <span className="dim" style={{ fontSize: '13px' }}>{f0(P[gi][i].v)}</span></div>)}</div></>;
}

// What a goal card shows about its accounts and transfer flags (was goalLinks).
function GoalLinks({ g }) {
  if (!SRV) return null;
  const now = allocAt(S.cur), A = S.alloc || {}, mine = Object.keys(A).filter(aid => (A[aid].goals || []).includes(g.id)), R = rulesFor('g:' + g.id);
  const parts = mine.map(aid => { const a = (BK.accts || []).find(x => x.id === aid), v = (now.by[aid] || {})[g.id] || 0, sh = (A[aid].goals || []).length > 1; return <span key={aid} className="pill" style={{ gap: '4px' }}>{f0(v)} from {a ? tx(a.official || a.name) + (a.mask ? ' ••' + tx(a.mask) : '') : 'an account not connected'}{sh ? ' (shared)' : ''}<button type="button" className="x" data-act="alRm" data-a={tx(aid)} data-g={g.id} aria-label={`Stop using this account for ${tx(g.name)}`}>×</button></span>; });
  const avail = (BK.accts || []).filter(a => ['depository', 'investment'].includes(a.type) && !mine.includes(a.id));
  const iv = invInfo(g);
  return <div className="gl"><small className="mut">Accounts for this goal</small><div className="chips" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>{parts.length ? parts : <span className="dim" style={{ fontSize: '13.5px' }}>None yet.</span>}{avail.length ? <select className="in" data-gacct={g.id} style={{ width: 'auto', maxWidth: '260px', fontSize: '13.5px', padding: '6px 10px' }} aria-label={`Use an account for ${tx(g.name)}`}><option value="">Use an account…</option>{avail.map(a => <option key={a.id} value={tx(a.id)}>{acctOpt(a) + (A[a.id] && (A[a.id].goals || []).length ? ' · shared' : '')}</option>)}</select> : null}</div><small className="mut" style={{ marginTop: '4px' }}>Share an account between goals or change the order in <button className="lnk" data-act="alGo" style={{ fontSize: '13px', padding: 0 }}>Accounts for goals</button>.</small>{iv.has ? <small className="mut" style={{ marginTop: '4px' }}>{mon(S.cur)}: contributed {f0(iv.contrib)}{iv.payroll > 0.5 ? ` (${f0(iv.payroll)} from paychecks)` : ''} · market <span className={iv.market >= 0 ? 'pos' : 'neg'}>{sg(iv.market)}</span></small> : null}{' '}
    <small className="mut" style={{ marginTop: '6px' }}>{R.length ? 'Transfers that count as deposits: ' + R.map(r => tx(titleC(r.p))).join(', ') : 'For an account the app can’t see (another bank, a trust), flag the transfers into it and each counts as a deposit here.'}</small><button className="btn g sm" data-act="lnkPay" data-kind="goal" data-id={g.id} style={{ justifySelf: 'start', marginTop: '6px' }}>{R.length ? 'Change transfer flags' : 'Flag transfers'}</button></div>;
}

function GoalCard({ g }) {
  const fut = S.cur > TK, m = MO(S.cur), t = target(g), s = fut ? goalProj(g, S.cur) : goalSaved(g), pct = t ? s / t : 0, d = m.dep[g.id], ok = OPEN.has('g-' + g.id), ess = essentials(), isE = g.kind === 'emergency', gm = goalMon(g, xStart()), e = goalEta(g), need = goalNeed(g), pl = goalPlan(g, S.cur), ov = goalOv(g, S.cur);
  // when it's reached and whether that's on time
  let eta, st = null;
  if (!t) eta = 'Set a target to see when you’ll get there';
  else if (goalSaved(g, TK) >= t - 0.5) eta = <b>Goal reached!</b>;
  else if (!e) eta = gm > 0 ? 'Not reached in 50 years at this pace' : 'Set a monthly amount to see when you’ll get there';
  else eta = <>Reached by <b>{labS(e)}</b>{gm > 0 ? ` at ${f0(gm)}/month` : ''}</>;
  if (t && g.by && goalSaved(g, TK) < t - 0.5) st = e && e <= g.by ? <span className="pill ok">On track{mdiff(e, g.by) > 0 ? ' · ' + mo(mdiff(e, g.by)) + ' early' : ''}</span> : <><span className="pill hot">Behind · needs {f0(need)}/mo</span><button className="lnk" data-act="gNeed" data-id={g.id}>Plan {f0(Math.ceil(need))}/mo</button></>;
  const covered = ess ? s / ess : 0, auto = !!(isE && g.auto), deps = Object.keys(S.months).sort().reverse().filter(k => S.months[k].dep?.[g.id] != null);
  return <article className="card goal" style={{ '--c': `${g.color}` }}><input className="in ttl" data-k="gname2" data-id={g.id} data-key={'gt-' + g.id} defaultValue={tx(g.name)} aria-label="Goal name" style={{ marginBottom: '-6px' }} /><div className="gtop"><Ring pct={pct} c={g.color} /><div style={{ minWidth: 0, flex: 1 }}><div className="gamt">{f0(s)} <small>of {t ? f0(t) : '—'}{fut ? ' · projected' : ''}</small></div>{gAccts(g).length && !fut ? <p className="mut" style={{ fontSize: '13px', marginTop: '2px' }}>{f0(linkedSaved(g))} in {gAccts(g).map(a => tx(a.official || a.name) + (a.mask ? ' ••' + tx(a.mask) : '')).join(', ')} · {f0(manualSaved(g))} added by hand</p> : null}<p className="mut" style={{ fontSize: '14px', marginTop: '4px' }}>{eta}{g.by ? ` · target ${labS(g.by)}` : ''}</p>{st ? <div className="gst">{st}</div> : null}</div></div>{' '}
    {isE ? <div><div className="emo">{[0, 1, 2, 3, 4, 5].map(i => <span key={i}><i style={{ width: `${Math.max(0, Math.min(1, covered - i)) * 100}%` }}></i></span>)}</div><p className="mut" style={{ fontSize: '13.5px', marginTop: '6px' }}>{covered.toFixed(1)} of 6 months of your budget covered{fut ? ' (projected)' : ''}</p></div>
      : <div className="miles">{[25, 50, 75, 100].map(p => <div key={p} className={pct * 100 >= p ? 'on' : ''}>{p}%</div>)}</div>}{' '}
    <div className="gacts">{fut
      ? <><label className="gpl">Planned for {mon(S.cur)}<input className="in a" data-k="gov" data-id={g.id} data-key={'gpo-' + g.id} inputMode="decimal" defaultValue={ov != null ? ov : ''} placeholder={`${r2(pl)}`} aria-label={`${tx(g.name)} planned in ${mon(S.cur)}`} /></label><small className="dim">{ov != null ? 'just this month' : 'usual plan · type to change just this month'}</small></>
      : <>{gLinked(g) ? <span className={'pill' + (linkedChange(g) >= 0 ? ' ok' : '')}>{sg(linkedChange(g))} in accounts this month</span> : null}{d != null
        ? <><span className="pill ok">Saved {f0(d)} in {mon(S.cur)}</span><button className="lnk" data-act="logDep" data-id={g.id}>Change</button></>
        : <><button className="btn sm" data-act="quickDep" data-id={g.id} disabled={!(pl > 0)}>Save {mon(S.cur)}’s {f0(pl)}</button><button className="btn g sm" data-act="logDep" data-id={g.id}>Other amount</button></>}</>}</div>{' '}
    <details className="more" data-key={'g-' + g.id} open={ok}><summary>Goal settings &amp; deposits</summary><div className="fields">{' '}
      <label className="f">Target{isE ? ' (auto: 6 × monthly budget)' : ''}<input className="in a" data-c="goal" data-id={g.id} data-f="target" inputMode="decimal" defaultValue={auto ? t : (g.target || '')} disabled={auto} placeholder="0" /></label>{' '}
      <label className="f">Target date (optional)<input className="in" type="month" data-c="goal" data-id={g.id} data-f="by" defaultValue={g.by || ''} /></label>{' '}
      <label className="f">Monthly amount from {labS(xStart())}<input className="in a" data-c="goal" data-id={g.id} data-f="monthly" data-key={'gmo-' + g.id} inputMode="decimal" defaultValue={gm || ''} placeholder="0" /></label>{' '}
      <label className="f">Added by hand before tracking<input className="in a" data-c="goal" data-id={g.id} data-f="saved" inputMode="decimal" defaultValue={g.saved || ''} placeholder="0" /></label>{' '}
      {isE ? <label className="f" style={{ alignContent: 'center', gridAutoFlow: 'column', justifyContent: 'start', gap: '10px' }}><input type="checkbox" data-c="goal" data-id={g.id} data-f="auto" defaultChecked={!!g.auto} style={{ width: '20px', height: '20px', accentColor: 'var(--pink)' }} />Target = 6 months of my budget</label> : null}</div>{' '}
      <GoalLinks g={g} />{' '}
      <div className="hist">{deps.length ? deps.map(k => <div key={k}><span>{lab(k)}</span><b>{f2(S.months[k].dep[g.id])}</b><button className="x" data-act="unDep" data-id={g.id} data-k={k} aria-label={`Remove ${lab(k)} deposit`}>×</button></div>) : <p className="dim" style={{ fontSize: '14px' }}>No deposits logged yet.</p>}</div>{' '}
      <button className="lnk" data-act="delGoal" data-id={g.id} style={{ color: 'var(--red)', marginTop: '10px' }}>Delete this goal</button></details></article>;
}

// "Accounts for goals" card (was allocCard).
function AllocCard() {
  if (!SRV || !BK.accts) return null;
  const A = S.alloc || {}, avail = BK.accts.filter(a => ['depository', 'investment'].includes(a.type)), now = allocAt(S.cur), free = avail.filter(a => !A[a.id]);
  const blocks = Object.keys(A).map(aid => {
    const a = avail.find(x => x.id === aid), e = A[aid], G = (e.goals || []).map(id => S.goals.find(g => g.id === id)).filter(Boolean), add = S.goals.filter(g => !e.goals.includes(g.id)), pt = G.reduce((x, g) => x + (+(e.pct || {})[g.id] || 0), 0), by = now.by[aid] || {}, ea = tx(aid), split = e.mode === 'split';
    return <div className="acb" key={aid}><div className="acbh"><div className="nm"><b>{a ? <NmA a={a} /> : 'Account not connected right now'}</b><small>{a ? `${tx(subI(a.subtype))}${isInv(a) ? ' · investment' : ''} · ${f2(+a.bal || 0)}` : ''}</small></div><div className="seg"><button className={!split ? 'on' : ''} data-act="alMode" data-a={ea} data-v="order">Fill in order</button><button className={split ? 'on' : ''} data-act="alMode" data-a={ea} data-v="split">Split by %</button></div><button className="x" data-act="alDel" data-a={ea} aria-label="Stop using this account for goals">×</button></div>{' '}
      {G.length ? G.map((g, i) => <div className="alr" key={g.id}><i className="dot" style={{ '--c': `${g.color}` }}></i><span className="nm">{split ? '' : <><b className="mut">{i + 1}.</b> </>}{tx(g.name)}{!split && target(g) ? <small> · target {f0(target(g))}</small> : null}</span>{split
        ? <span className="pct"><input className="in a" data-alpct={ea} data-g={g.id} data-key={`alp-${aid}-${g.id}`} inputMode="decimal" defaultValue={(e.pct || {})[g.id] ?? ''} placeholder="0" aria-label={`${tx(g.name)} percent`} />%</span>
        : <span className="mv"><button className="lnk" data-act="alUp" data-a={ea} data-g={g.id} disabled={!i} aria-label="Move up">↑</button><button className="lnk" data-act="alDn" data-a={ea} data-g={g.id} disabled={!(i < G.length - 1)} aria-label="Move down">↓</button></span>}<b className="n">{f0(by[g.id] || 0)}</b><button className="x" data-act="alRm" data-a={ea} data-g={g.id} aria-label={`Remove ${tx(g.name)}`}>×</button></div>)
        : <p className="dim" style={{ fontSize: '13.5px', padding: '6px 0' }}>No goals yet. Add one below.</p>}{' '}
      <div className="acbf">{add.length ? <select className="in" data-aladd={ea} aria-label="Add a goal to this account"><option value="">Add a goal…</option>{add.map(g => <option key={g.id} value={g.id}>{tx(g.name)}</option>)}</select> : null}{' '}
        {split ? <span className={pt > 100.001 ? 'neg' : 'mut'} style={{ fontSize: '13.5px' }}>{pt > 100.001 ? `Adds up to ${pt}%, over 100%` : `${pt}% assigned · ${f0(now.un[aid] || 0)} unassigned`}</span>
          : <><label className="chk" style={{ margin: 0 }}><input type="checkbox" data-alrest={ea} defaultChecked={e.rest !== 'none'} />Leftover goes to the last goal</label>{e.rest === 'none' ? <span className="mut" style={{ fontSize: '13.5px' }}>{f0(now.un[aid] || 0)} unassigned</span> : null}</>}</div></div>;
  });
  const sh = isShut('galloc', true), nA = Object.keys(A).length;
  return <section className={'card cl' + (sh ? ' shut' : '')} id="sec-alloc" style={{ '--i': 2, marginTop: '24px' }}><Clh k="galloc" shut={sh} title="Accounts for goals" sum={nA ? `${nA} account${nA === 1 ? '' : 's'} in use` : 'None in use yet'} /><div className="bh"><div><p>Savings, brokerage and retirement accounts. Share one account between goals: <b>Fill in order</b> fills the first goal to its target, then the next; <b>Split by %</b> divides the balance. Money you add by hand on a goal still counts on top. For investment accounts only contributions count as saving; market changes count toward the goal but not as money you saved.</p></div></div>{' '}
    {blocks.length ? blocks : <p className="mut">No accounts are used for goals yet.</p>}{free.length ? <select className="in" data-alacct="1" style={{ width: 'auto', maxWidth: '100%', marginTop: '12px' }} aria-label="Use an account for goals"><option value="">Use an account for goals (savings, brokerage, retirement)…</option>{free.map(a => <option key={a.id} value={tx(a.id)}>{acctOpt(a)}</option>)}</select> : null}</section>;
}

export function Goals() {
  const G = S.goals, fut = S.cur > TK, lm = mon(S.cur), bal = g => fut ? goalProj(g, S.cur) : goalSaved(g), tot = G.reduce((a, g) => a + bal(g), 0), mon$ = G.reduce((a, g) => a + goalPlan(g, S.cur), 0), ess = essentials(), em = G.find(g => g.kind === 'emergency');
  const thisM = G.reduce((a, g) => a + savedIn(g), 0), tg = G.filter(g => target(g) > 0), late = tg.filter(g => g.by && (!goalEta(g) || goalEta(g) > g.by)), dated = tg.filter(g => g.by);
  const n = tg.map(g => [g, goalEta(g)]).filter(([g, e]) => e && goalSaved(g, TK) < target(g, TK) - 0.5).sort((a, b) => a[1].localeCompare(b[1]))[0];
  return <>
    <div className="phead" style={{ '--i': 0 }}><div><h1>Goals</h1><p className="mut">What you’re saving for, when you’ll get there, and whether you’re on track.</p></div><div className="phact"><button className="btn g sm ib" data-act="alGo" title="Choose which accounts count toward goals"><Gear />Accounts</button></div></div>
    <div className="hero hg" style={{ '--i': 0 }}><div><p className="lbl">{fut ? 'Projected toward your goals by ' + lab(S.cur) : 'Saved toward your goals'}</p><CountUp className="big" id="gTot" k="gTot" to={tot} /><p className="note">{f0(mon$)} planned in {lm} across {G.length} goal{G.length === 1 ? '' : 's'}.{fut ? ' Future months add each goal’s plan; nothing is counted as saved until it happens.' : ' Linked accounts and deposits you log count toward each goal.'}</p></div>{' '}
      <div className="kpis"><div className="kpi"><small>{fut ? 'Planned in' : 'Saved in'} {lm}</small><b>{f0(fut ? mon$ : thisM)}</b><span>{fut ? 'goes in the budget' : 'of ' + f0(mon$) + ' planned'}</span></div>{' '}
        <div className="kpi"><small>Emergency fund covers</small><b>{em ? ((bal(em) / (ess || 1)).toFixed(1) + ' months') : '—'}</b><span>of your {f0(ess)}/mo budget{fut ? ' (projected)' : ''}</span></div>{' '}
        <div className="kpi"><small>On track</small><b>{dated.length ? `${dated.length - late.length} of ${dated.length}` : '—'}</b><span>{late.length ? tx(late.map(g => g.name).join(', ')) + ' behind its date' : dated.length ? 'every dated goal on time' : 'add target dates to check'}</span></div>{' '}
        <div className="kpi"><small>Next goal reached</small>{n ? <><b>{labS(n[1])}</b><span>{tx(n[0].name)}</span></> : <><b>—</b><span>set monthly amounts</span></>}</div></div></div>
    {tg.length ? <section className="card" style={{ '--i': 1, marginBottom: '16px' }}><div className="bh"><div><h2>Goal timeline</h2><p>Each goal’s progress toward its target, projected with its monthly plan. Dots mark when it’s reached; diamonds mark target dates.</p></div><div className="seg" role="group" aria-label="Time range">{[['1y', '1Y'], ['2y', '2Y'], ['5y', '5Y'], ['all', 'All']].map(([k, l]) => <button key={k} className={GR === k ? 'on' : ''} data-act="grng" data-r={k}>{l}</button>)}</div></div><GoalChart G={tg} /></section> : null}
    <div className="ggrid" style={{ '--i': 2 }}>{G.map(g => <GoalCard key={g.id} g={g} />)}</div><button className="add" data-act="addGoal" style={{ marginTop: '16px' }}>Add a goal</button><AllocCard />
  </>;
}
