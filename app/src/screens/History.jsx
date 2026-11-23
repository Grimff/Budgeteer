// History tab (was renderHistory in js/history.js). monthSum/histMonths/HR stay in history.js.
import { tx } from '../bridge.js';

const mshort = k => new Date(+k.slice(0, 4), +k.slice(5) - 1, 1).toLocaleDateString('en-US', { month: 'short' });
const dash = (v, plus, minus) => Math.abs(v) < 0.5 ? '—' : (v > 0 ? plus : minus) + f0(Math.abs(v));
const good = v => Math.abs(v) < 0.5 ? 'var(--mut)' : v > 0 ? 'var(--lime)' : '#ff9aa8';

function Chart({ D }) {
  const cw = ($('#T-history') && $('#T-history').clientWidth) || (($('main') || document.body).clientWidth - 40) || 1000, W = Math.max(320, cw - (cw < 640 ? 36 : 56)), narrow = W < 600, H = narrow ? 240 : 300, pl = narrow ? 48 : 64, pr = 12, pt = 26, pb = 48, M = Math.max(1, ...D.flatMap(d => [d.inc, d.pl, d.ac])) * 1.08, n = D.length, slot = (W - pl - pr) / Math.max(n, 1), bw = Math.min(46, slot * .32), Y = v => pt + (1 - v / M) * (H - pt - pb), step = Math.ceil(46 / slot);
  return <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Planned vs actual spending by month">
    {[0, .5, 1].map(f => { const v = M / 1.08 * f; return [
      <line key={'l' + f} x1={pl} x2={W - pr} y1={Y(v)} y2={Y(v)} stroke="var(--line)" />,
      <text key={'t' + f} x={pl - 10} y={Y(v) + 5} textAnchor="end" fill="var(--dim)" fontSize="13">{fk(v)}</text>]; })}
    {D.map((d, i) => { const cx = pl + slot * (i + .5), over = d.spX > d.spP + 0.5; return <g key={d.k}>
      <title>{`${lab(d.k)}: planned ${f0(d.pl)}, actual ${f0(d.ac)}, income ${f0(d.inc)}`}</title>
      <rect x={cx - bw - 3} y={Y(d.pl)} width={bw} height={Y(0) - Y(d.pl)} rx="8" fill="var(--butter)" fillOpacity=".85" />
      <rect x={cx + 3} y={Y(d.ac)} width={bw} height={Y(0) - Y(d.ac)} rx="8" fill={over ? 'var(--red)' : 'var(--pink)'} {...(d.anyLog ? {} : { fillOpacity: '.35', stroke: 'var(--pink)', strokeDasharray: '4 4' })} />
      <line x1={cx - bw - 10} x2={cx + bw + 10} y1={Y(d.inc)} y2={Y(d.inc)} stroke="var(--lime)" strokeWidth="3" strokeLinecap="round" />
      {(n - 1 - i) % step === 0 || d.k === S.cur ? <>
        <text x={cx} y={H - 26} textAnchor="middle" fill={d.k === S.cur ? 'var(--pink)' : 'var(--mut)'} fontSize="13" fontWeight="600">{mshort(d.k)}</text>
        {i === (n - 1) % step || d.k.endsWith('-01') ? <text x={cx} y={H - 9} textAnchor="middle" fill="var(--dim)" fontSize="12">{d.k.slice(0, 4)}</text> : null}
      </> : null}
    </g>; })}
  </svg>;
}

function Month({ d }) {
  const diff = d.pl - d.ac, sd = d.spP - d.spX, left = d.inc - d.ac, open = OPEN.has('h-' + d.k) || (!OPEN.size && d.k === S.cur);
  return <details className="hm" data-key={'h-' + d.k} open={open}>
    <summary><span className="mn"><b>{lab(d.k)}</b><small>{d.k === TK ? 'In progress' : d.k > TK ? 'Upcoming' : d.anyLog ? 'Logged' : 'Nothing logged'}{d.anyLog ? (Math.abs(sd) < 0.5 ? ' · spending on plan' : sd > 0 ? ` · spending ${f0(sd)} under plan` : ` · spending ${f0(-sd)} over plan`) : ''}</small></span>{' '}
      <span className="c inc"><small>Income</small><b>{f0(d.inc)}</b></span><span className="c hide"><small>Planned out</small><b>{f0(d.pl)}</b></span><span className="c"><small>Actual out</small><b style={{ color: !d.anyLog ? 'var(--mut)' : d.spX > d.spP + 0.5 ? '#ff9aa8' : 'var(--text)' }}>{f0(d.ac)}</b></span><span className="c hide"><small>Left over</small><b style={{ color: left >= 0 ? 'var(--lime)' : '#ff9aa8' }}>{f0(left)}</b></span></summary>{' '}
    <div className="hx"><table className="htab"><thead><tr><th>Category</th><th>Planned</th><th>Actual</th><th>Difference</th></tr></thead><tbody>
      {d.rows.filter(r => r.pl || r.ac).map((r, i) => { const df = r.sav ? r.ac - r.pl : r.pl - r.ac; return <tr key={i}><td><i className="dot" style={{ '--c': r.c, marginRight: '10px' }}></i>{tx(r.name)}{r.est ? <span className="est">est.</span> : null}</td><td>{f2(r.pl)}</td><td>{f2(r.ac)}</td><td style={{ color: good(df) }}>{dash(df, '+', '−')}</td></tr>; })}
      <tr className="tot"><td>Spending (bills, groceries, flex){d.spU > 0.5 ? <small className="dim" style={{ display: 'block', fontWeight: 400 }}>incl. {f0(d.spU)} with no plan, left out of over/under</small> : null}</td><td>{f2(d.spP)}</td><td>{f2(d.spA)}</td><td style={{ color: good(sd) }}>{dash(sd, '+', '−')}</td></tr><tr><td>Total out, incl. loans &amp; savings</td><td>{f2(d.pl)}</td><td>{f2(d.ac)}</td><td className="mut">{dash(diff, '−', '+')}</td></tr></tbody></table>{' '}
      <div className="hfoot"><span>Extra on loans: <b>{f0(d.extra)}</b></span><span>Interest saved: <b style={{ color: 'var(--lime)' }}>{f2(d.isv)}</b></span><span>Saved to goals: <b>{f0(d.sa)}</b></span><button className="lnk" data-act="delMonth" data-k={d.k} style={{ marginLeft: 'auto', color: 'var(--red)', fontSize: '14px' }}>Delete {mon(d.k)}</button><button className="btn g sm" data-act="openMonth" data-k={d.k}>Open {mon(d.k)} budget</button></div>{' '}
      <p className="dim" style={{ fontSize: '13px', marginTop: '10px' }}>“est.” means nothing was logged for that line, so the planned amount is used. Green is good: spending under plan, or paying extra on loans and savings.</p></div></details>;
}

export function History() {
  const all = histMonths(), end = Math.max(0, all.includes(S.cur) ? all.indexOf(S.cur) : all.length - 1), ks = HR === 'all' ? all : all.slice(Math.max(0, end + 1 - +HR), end + 1), D = ks.map(monthSum);
  return <>
    <div className="phead" style={{ '--i': 0 }}><div><h1>History</h1><p className="mut">Plan vs. actual for every month. Months fill in as you log groceries, flex, loan payments and goal deposits.</p></div><div className="phact"><div className="seg" role="group" aria-label="Months shown">{[['6', '6 months'], ['12', '12 months'], ['all', 'All']].map(([v, l]) => <button key={v} type="button" data-act="hrng" data-v={v} className={HR === v ? 'on' : ''}>{l}</button>)}</div></div></div>{' '}
    <section className="card hchart" style={{ '--i': 1 }}><Chart D={D} />{' '}
      <div className="hleg"><span><i style={{ background: 'var(--butter)' }}></i>Planned out</span><span><i style={{ background: 'var(--pink)' }}></i>Actual out</span><span><i style={{ background: 'var(--lime)', height: '4px', verticalAlign: '3px' }}></i>Income</span><span><i style={{ background: 'transparent', border: '1.5px dashed var(--pink)' }}></i>Nothing logged yet</span></div></section>{' '}
    <section className="card" style={{ '--i': 2, marginTop: '16px', paddingBottom: '10px' }}>
      {[...D].reverse().map(d => <Month key={d.k} d={d} />)}
      {S.histFrom ? <p className="dim" style={{ fontSize: '13.5px', padding: '12px 4px 4px' }}>History starts in {lab(S.histFrom)}. <button className="lnk" data-act="histAll" style={{ fontSize: '13.5px', padding: 0 }}>Show earlier months</button></p> : null}
    </section>
  </>;
}
