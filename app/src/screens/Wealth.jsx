// Wealth tab (was renderWealth, invCard and areaChart in js/wealth.js). The math (perf, invSeries, valueOn, debtNow…)
// stays in wealth.js.
import { useLayoutEffect, useRef, useState } from 'react';
import { tx, onAct } from '../bridge.js';
import { Gear, CountUp, NmA } from '../ui.jsx';
const bigN = { font: "700 24px 'Inter Display',Inter,sans-serif" };

// Investment value over time. Draws at the width the box has once it's on the page (measured before the first paint,
// as the old code did), with a hover readout.
function AreaChart({ pts, col }) {
  // hv: the hovered point, null when not hovering, so the default point is worked out on every render, as a fresh draw did
  const ref = useRef(null), N = pts.length, [W, setW] = useState(null), [hv, setAt] = useState(null), at = hv ?? N - 1;
  // Measured again after every render (a re-render in place must size like a fresh draw did); setW skips equal values.
  useLayoutEffect(() => { if (N >= 2) setW(Math.round(Math.min(1000, Math.max(340, ref.current.clientWidth || Math.max(0, (document.querySelector('main') || document.body).clientWidth - 90) || 1000)))); });
  if (N < 2) return <div id="wch"><p className="dim" style={{ fontSize: '14px', margin: '8px 0' }}>The chart fills in as values are saved after each sync, one point a day.</p></div>;
  if (W == null) return <div id="wch" ref={ref}></div>;
  const H = W < 640 ? 200 : 240, pl = 64, pr = 16, pt = 14, pb = 30, vs = pts.map(q => q.v), lo = Math.min(...vs), hi = Math.max(...vs), pad = (hi - lo) * .15 || hi * .02 || 1, mn = Math.max(0, lo - pad), mx = hi + pad, X = i => pl + i / (N - 1) * (W - pl - pr), Y = v => pt + (1 - (v - mn) / (mx - mn)) * (H - pt - pb);
  const line = pts.map((q, i) => (i ? 'L' : 'M') + X(i).toFixed(1) + ',' + Y(q.v).toFixed(1)).join('');
  const i = Math.max(0, Math.min(N - 1, at)), x = X(i);
  const move = e => { const r = e.currentTarget.getBoundingClientRect(); setAt(Math.round(((e.clientX - r.left) / r.width * W - pl) / (W - pl - pr) * (N - 1))); };
  return <div id="wch" ref={ref}><svg viewBox={`0 0 ${W} ${H}`} className="wsv" role="img" aria-label="Investment value over time" onPointerMove={move} onPointerLeave={() => setAt(null)}>
    <defs><linearGradient id="wgr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={col} stopOpacity=".32" /><stop offset="1" stopColor={col} stopOpacity="0" /></linearGradient></defs>
    {[0, .5, 1].map(f => { const v = mn + (mx - mn) * f; return [
      <line key={'l' + f} x1={pl} x2={W - pr} y1={Y(v)} y2={Y(v)} stroke="var(--line)" />,
      <text key={'t' + f} x={pl - 10} y={Y(v) + 5} textAnchor="end" fill="var(--dim)" fontSize="13">{fk(v)}</text>]; })}
    {[0, Math.floor((N - 1) / 2), N - 1].filter((v, j, a) => a.indexOf(v) === j).map(j => <text key={j} x={X(j)} y={H - 8} textAnchor={j === 0 ? 'start' : j === N - 1 ? 'end' : 'middle'} fill="var(--dim)" fontSize="13">{dshort(pts[j].d)}</text>)}
    <path d={`${line}L${X(N - 1)},${Y(mn)}L${X(0)},${Y(mn)}Z`} fill="url(#wgr)" />
    <path d={line} fill="none" stroke={col} strokeWidth="3" strokeLinejoin="round" />
    <line className="wl" y1={pt} y2={H - pb} stroke="var(--text)" strokeOpacity=".4" x1={x} x2={x} />
    <circle className="wc" r="6" fill={col} cx={x} cy={Y(pts[i].v)} />
  </svg><div className="dread wread"><div><small>{new Date(pts[i].d + 'T12:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</small><b style={{ color: col }}>{f0(pts[i].v)}</b></div><div><small>Change from start</small><b className={pts[i].v >= pts[0].v ? 'pos' : 'neg'}>{sg(pts[i].v - pts[0].v)}</b></div></div></div>;
}

function InvCard({ a }) {
  const hs = a.holdings || [], wc = hs.filter(h => h.cost != null && !h.cash), cost = wc.reduce((x, h) => x + h.cost, 0), val = wc.reduce((x, h) => x + (+h.value || 0), 0), g = val - cost, tot = hs.reduce((x, h) => x + (+h.value || 0), 0) || 1, p = perf([a], monthEnd0(), ymd(NOW)), ok = OPEN.has('w-' + a.id);
  return <div className="wacct"><div className="bki"><div className="nm"><b><NmA a={a} /></b><small>{tx(subI(a.subtype))}{p.ok ? <> · {sg(p.g)} market this month{Math.abs(p.fl) > 0.5 ? `, ${sg(p.fl)} deposits` : ''}</> : ''}</small></div><div className="wv"><b>{f2(+a.bal || 0)}</b>{wc.length && cost > 0 ? <small className={g >= 0 ? 'pos' : 'neg'}>{sg(g)} ({(g / cost * 100).toFixed(1)}%) total gain</small> : null}</div></div>{' '}
    {hs.length ? <details className="more" data-key={'w-' + a.id} open={ok}><summary>{hs.length} holding{hs.length === 1 ? '' : 's'}</summary><div className="hold">{hs.slice().sort((x, y) => (y.value || 0) - (x.value || 0)).map((h, j) => {
      const hg = h.cost != null && !h.cash ? (+h.value || 0) - h.cost : null;
      return <div key={j}><span className="nm"><b>{tx(h.ticker || h.name)}</b><small>{h.ticker ? tx(h.name) : ''}{h.qty != null && !h.cash ? `${h.ticker ? ' · ' : ''}${(+h.qty).toLocaleString('en-US', { maximumFractionDigits: 4 })} shares` : ''}</small></span><span className="w">{Math.round((+h.value || 0) / tot * 100)}%</span><span className="v"><b>{f2(+h.value || 0)}</b>{hg != null ? <small className={hg >= 0 ? 'pos' : 'neg'}>{sg(hg)}</small> : null}</span></div>;
    })}</div></details> : a.holdings ? null : <p className="dim" style={{ fontSize: '13.5px', paddingBottom: '12px' }}>Holdings show here once Investments is allowed for this connection.</p>}</div>;
}

export function Wealth() {
  const head = <div className="phead"><div><h1>Wealth</h1><p className="mut">Bank balances, investments and debts in one place. Updates after each bank sync.</p></div>{SRV ? <div className="phact"><button className="btn g sm ib" data-act="sview" onClick={onAct('sview')} data-v="connections" title="Connect banks and brokerages"><Gear />Connections</button></div> : null}</div>;
  if (!SRV) return <>{head}<section className="card"><p>Balances come from bank sync on the server, which can’t be reached right now. It reconnects on its own.</p></section></>;
  if (!BK.st || !BK.accts) return <>{head}<section className="card"><p className="mut">{BK.err || 'Loading…'}</p></section></>;
  if (!BK.st.configured) return <>{head}<section className="card"><p>Add your Plaid keys first. The Bank tab shows how.</p></section></>;
  const cash = acctsOf('depository'), inv = acctsOf('investment'), cards = acctsOf('credit'), cashT = sumBal(cash), invT = sumBal(inv), cardT = sumBal(cards), loanT = S.loans.reduce((x, l) => x + debtNow(l), 0), net = cashT + invT - cardT - loanT, pm = perf(inv, monthEnd0(), ymd(NOW));
  const need = (BK.st.items || []).filter(it => it.inv === 'consent'), first = inv.flatMap(a => Object.keys(a.days || {})).sort()[0] || ymd(NOW), from = rangeFrom(WR, first), rp = perf(inv, from, ymd(NOW));
  const pn = v => v >= 0 ? 'pos' : 'neg';
  return <>{head}
    <div className="hero" style={{ '--i': 0 }}><div><p className="lbl">Net worth</p><CountUp className="big" id="wNet" k="wNet" to={net} /><p className="note">Cash and investments, minus what you owe on loans{cards.length ? ' and credit cards' : ''}.</p></div>{' '}
      <div className="kpis"><div className="kpi"><small>Cash</small><b>{f0(cashT)}</b><span>{cash.length} account{cash.length === 1 ? '' : 's'}</span></div>{' '}
        <div className="kpi"><small>Investments</small><b>{f0(invT)}</b><span className={pm.ok && pm.g >= 0 ? 'up' : ''}>{pm.ok ? `${sg(pm.g)} market this month` : inv.length ? 'Gains show after a few days of tracking' : 'None connected'}</span></div>{' '}
        <div className="kpi"><small>Loans</small><b>{f0(loanT)}</b><span>{S.loans.length} loan{S.loans.length === 1 ? '' : 's'} · <button className="lnk" data-act="tab" onClick={onAct('tab')} data-t="loans" style={{ padding: 0, fontSize: 'inherit' }}>Loans tab</button></span></div>{' '}
        <div className="kpi"><small>Credit cards</small><b>{f0(cardT)}</b><span>{cards.length ? cards.length + ' card' + (cards.length === 1 ? '' : 's') : 'None connected'}</span></div></div></div>
    <section className="card" style={{ '--i': 1 }}><div className="bh"><div><h2>Investments</h2><p>{inv.length ? 'Gains leave out money you deposited or withdrew, so they show how your investments actually did.' : 'Connect Fidelity, Schwab or another brokerage to see balances, holdings and performance.'}</p></div>{inv.length ? null : <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}><button className="btn sm" data-act="bankConnect" onClick={onAct('bankConnect')} data-kind="invest">Connect a brokerage</button></div>}</div>{' '}
      {need.map(it => <div className="bki" key={it.item_id}><div className="nm"><b>{tx(it.institution.name)}</b><small>Allow investment details (holdings and cost basis) from this connection. It takes one quick sign-in through Plaid.</small></div><button className="btn g sm" data-act="invAllow" onClick={onAct('invAllow')} data-id={tx(it.item_id)}>Allow</button></div>)}{' '}
      {inv.length ? <><div className="wtools"><div className="seg" role="group" aria-label="Time range">{RANGES.map(([k, l]) => <button key={k} className={WR === k ? 'on' : ''} data-act="wr" onClick={onAct('wr')} data-r={k}>{l}</button>)}</div>{from > rangeFrom(WR, '') ? <span className="dim" style={{ fontSize: '13px' }}>Since {dshort(from)}, when tracking started</span> : null}</div>{' '}
        <div className="wperf">{rp.ok ? <><div><small>Market gain</small><b className={pn(rp.g)}>{sg(rp.g)}</b></div><div><small>Return</small><b className={pn(rp.g)}>{rp.g >= 0 ? '+' : '−'}{Math.abs(rp.pct * 100).toFixed(2)}%</b></div><div><small>Deposits</small><b>{sg(rp.fl)}</b></div><div><small>Value now</small><b>{f0(invT)}</b></div></> : <p className="dim" style={{ fontSize: '14px' }}>Performance shows once there are two days of values.</p>}</div>{' '}
        <AreaChart key={from} pts={invSeries(inv, from)} col={C.aqua} />{inv.map(a => <InvCard key={a.id} a={a} />)}</> : null}</section>
    <section className="card" style={{ '--i': 2, marginTop: '16px' }}><div className="bh"><div><h2>Bank balances</h2><p>Checking and savings across your banks.</p></div><b className="n" style={bigN}>{f2(cashT)}</b></div>{cash.length ? cash.map(a => {
      const v = valueOn(a, monthEnd0()), ch = v != null ? (+a.bal || 0) - v : null;
      return <div className="bki" key={a.id}><div className="nm"><b><NmA a={a} /></b><small>{tx(subI(a.subtype))}{a.avail != null && Math.abs(a.avail - (+a.bal || 0)) > 0.005 ? ' · ' + f2(a.avail) + ' available' : ''}{ch != null ? <> · <span className={pn(ch)}>{sg(ch)}</span> this month</> : ''}</small></div><b className="n">{f2(+a.bal || 0)}</b></div>;
    }) : <p className="mut">Connect your bank in the Bank tab to see checking and savings balances here.</p>}</section>
    {cards.length ? <section className="card" style={{ '--i': 3, marginTop: '16px' }}><div className="bh"><div><h2>Credit cards</h2><p>Current balances.</p></div><b className="n" style={bigN}>{f2(cardT)}</b></div>{cards.map(a => <div className="bki" key={a.id}><div className="nm"><b><NmA a={a} /></b></div><b className="n">{f2(+a.bal || 0)}</b></div>)}</section> : null}
  </>;
}
