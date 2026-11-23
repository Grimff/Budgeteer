// The money-flow chart's zoom bar (#zb, was zbar), hover tip (#skt, the text of skTip) and click card (#skc, the text of
// skCard). The chart itself (sankey) and the placing of the tip and card (skPos, skPlace) stay in flow.js; the
// numbers come from K, which sankey fills.
import { draw, tx, onAct } from '../bridge.js';

const Dot = ({ c }) => <i style={{ background: c }}></i>;
const OpenBtn = ({ g }) => g && g.go ? <button className="btn g sm" data-act="budv" onClick={onAct('budv')} data-v="build">Edit in Build budget</button> : g && g.tab ? <button className="btn g sm" data-act="tab" onClick={onAct('tab')} data-t={g.tab}>Open {g.tab === 'loans' ? 'Loans' : 'Goals'}</button> : null;

function ZBar({ g }) {
  const k = nodeKey(g);
  return <><span>Showing <b>{tx(g.name)}</b></span>{k && k.startsWith('grp:') ? <button className="btn sm" data-act="flowDet" onClick={onAct('flowDet')} data-v={k}>Details</button> : null}<OpenBtn g={g} /><button className="btn sm" data-act="zfit" onClick={onAct('zfit')}>Zoom out</button></>;
}
export function zbarR(g) { const e = $('#zb'); if (!e) return; draw(e, g ? <ZBar g={g} /> : null); }

function SkTip({ n, l }) {
  if (l) return <><small>{tx(l.s.name)} → {tx(l.t.name)}</small><b>{f0(l.v)}</b><span>{K.I > 0 ? skShare(l.v, K.I) + ' of income · ' : ''}{skHint(l.t)}</span></>;
  const vs = skVs(n), sh = n.ci === 0 ? skShare(n.v, K.I) + ' of income' : n.id === 'b' ? '' : skShare(n.v, K.I) ? skShare(n.v, K.I) + ' of income' : '';
  return <><small><Dot c={n.c} />{tx(n.name)}</small><b>{f0(n.v)}</b>{vs || sh ? <span>{[vs, sh].filter(Boolean).join(' · ')}</span> : null}<em>{skHint(n)}</em></>;
}
export function skTipR(n, l, e) {
  const t = $('#skt'); if (!t) return; if ((!n && !l) || NOHOV.matches) { t.hidden = true; return; }
  draw(t, <SkTip n={n} l={l} />); t.hidden = false; skPos(t, e.clientX, e.clientY);
}

// One line of the card: a line with its own pop-up (skGo), or a group / Left over in the Budget card (skNode).
const Row = ({ k, name, v, col, base, node }) => <button type="button" className="skr" {...(node != null ? { 'data-act': 'skNode', 'data-n': node, onClick: onAct('skNode') } : { 'data-act': 'skGo', 'data-v': `${k}`, onClick: onAct('skGo') })}><Dot c={col} /><span>{tx(name)}</span><small>{skShare(v, base)}</small><b>{f0(v)}</b></button>;
const Sums = ({ I, O, last, v, color }) => <div className="skm"><span>Income</span><b>{f0(I)}</b><span>Everything going out</span><b>− {f0(O)}</b><span>{last}</span><b style={{ color }}>{f0(v)}</b></div>;
function SkCard({ n }) {
  const I = K.I, O = K.all.filter(x => x.ci === 2 && x.id !== 'left').reduce((a, x) => a + x.v, 0), word = K.act ? (S.cur < TK ? 'Actual' : 'So far') : 'Planned';
  let body = null, foot = null, sub = '';
  if (n.id === 'b') {
    sub = `${word} for ${mon(S.cur)}`;
    body = <><p className="skh">Coming in</p>{K.all.filter(x => x.ci === 0 && x.id !== 'over').map((x, i) => <Row key={i} k={nodeKey(x)} name={x.name} v={x.v} col={x.c} base={I} />)}<p className="skh">Going out</p>{K.all.filter(x => x.ci === 2).map((x, i) => { const j = K.all.indexOf(x), k2 = nodeKey(x); return <Row key={i} k={k2} name={x.name} v={x.v} col={x.c} base={I} node={k2 && !k2.startsWith('grp:') ? null : j} />; })}</>;
  } else if (n.id === 'left') {
    sub = `${word} for ${mon(S.cur)}`;
    body = <><Sums I={I} O={O} last="Left over" v={K.left} color="var(--lime)" /><p className="dim skp">{K.act ? 'Hasn’t gone out yet this month.' : 'Not given a job yet.'} Schedule it toward a goal or a loan, or see where it takes you.</p></>;
    foot = <><button className="btn sm" data-act="skJob" onClick={onAct('skJob')}>Give it a job</button><button className="btn g sm" data-act="budv" onClick={onAct('budv')} data-v="fc">Forecast</button></>;
  } else if (n.id === 'over') {
    sub = `${word} for ${mon(S.cur)}`;
    body = <><Sums I={I} O={O} last="Over by" v={n.v} color="var(--red)" /><p className="dim skp">More is {K.act ? 'going' : 'planned to go'} out than coming in. Trim a line or plan more income.</p></>;
    foot = <button className="btn sm" data-act="budv" onClick={onAct('budv')} data-v="build">Build budget</button>;
  } else {
    const its = n.its || [], G = n.ci === 3 ? K.all.find(x => x.id === n.p) : n, vs = skVs(n), k = nodeKey(n);
    sub = `${word} for ${mon(S.cur)} · ${skShare(n.v, I)} of income`;
    body = <>{vs ? <p className="dim skp" style={{ margin: '0 0 8px' }}>{K.act ? 'Of ' : ''}{vs}</p> : null}{its.map((x, i) => <Row key={i} k={nodeKey(x)} name={x.name} v={x.v} col={x.c} base={n.v} />)}</>;
    const f = [k && k.startsWith('grp:') ? <button key="d" className="btn sm" data-act="flowDet" onClick={onAct('flowDet')} data-v={k}>Transactions and trends</button> : null, !n.solo && G ? <button key="z" className="btn g sm" data-act="skZoom" onClick={onAct('skZoom')} data-n={K.all.indexOf(G)}>Zoom in</button> : null, <OpenBtn key="o" g={G} />];
    foot = (k && k.startsWith('grp:')) || (!n.solo && G) || (G && (G.go || G.tab)) ? f : null;
  }
  return <><div className="skc-h"><span><Dot c={n.c} /><b>{tx(n.name)}</b></span><button type="button" className="x" data-act="skX" onClick={onAct('skX')} aria-label="Close">×</button></div><div className="skc-v">{f0(n.v)}<small>{sub}</small></div><div className="skc-b">{body}</div>{foot ? <div className="skc-f">{foot}</div> : null}</>;
}
export function skCardR(n, at) {
  const c = $('#skc'); if (!c || !K) return;
  draw(c, <SkCard n={n} />);
  c.hidden = false; const s = $('#sk svg'); s && s.querySelectorAll('.nd').forEach(x => x.classList.toggle('sel', K.all[+x.dataset.n] === n));
  skPlace(c, skAt(n) || at); c.querySelector('[data-act="skX"]').focus({ preventScroll: true });
}
