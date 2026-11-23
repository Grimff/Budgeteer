// The money-flow card's Compare view (was compareView in js/compare.js): every budget line this month, what's happened
// so far against the plan, worst first. cmpRows (the numbers) stays in compare.js; the Budget tab and the monthly
// review use it too.
import { draw, tx, onAct } from '../bridge.js';

// "good" lines (loans, savings) are fine above plan; spending lines are not.
function cmpSt(r, k) {
  const d = r.a - r.pl;
  if (r.pend || r.none) return { cls: 'pend', t: r.pend ? (k < TK ? 'Not seen' : 'Not paid yet') : 'Nothing yet', bad: 0 };
  if (!r.good && r.pl <= 0.5) return { cls: 'pend', t: 'No plan', bad: 0 };
  if (Math.abs(d) < 0.5) return { cls: 'ok', t: 'On plan', bad: 0 };
  if (r.good) return d > 0 ? { cls: 'ok', t: `${f0(d)} extra`, bad: 0 } : { cls: 'bad', t: `${f0(-d)} short`, bad: -d };
  return d > 0 ? { cls: 'bad', t: `${f0(d)} over`, bad: d } : { cls: 'ok', t: `${f0(-d)} under`, bad: 0 };
}

export function Compare() {
  const k = S.cur, R = cmpRows(k), M = Math.max(1, ...R.map(r => Math.max(r.pl, r.a)));
  const S2 = R.map(r => ({ ...r, s: cmpSt(r, k) })).sort((a, b) => b.s.bad - a.s.bad || (b.pl - b.a) - (a.pl - a.a));
  const over = S2.filter(r => r.s.cls === 'bad'), overT = over.reduce((x, r) => x + r.s.bad, 0), under = S2.filter(r => r.s.cls === 'ok' && !r.good && r.a < r.pl - 0.5).reduce((x, r) => x + (r.pl - r.a), 0), pend = S2.filter(r => r.pend).reduce((x, r) => x + r.pl, 0);
  return <div className="cmp"><div className="cmph"><div><small>Over plan</small><b className="neg">{f0(overT)}</b><span>{over.length} line{over.length === 1 ? '' : 's'}</span></div><div><small>Under plan</small><b className="pos">{f0(under)}</b></div><div><small>Not paid yet</small><b>{f0(pend)}</b></div></div>{' '}
    {S2.map(r => {
      const aw = Math.min(100, r.a / M * 100), pw = r.pl / M * 100;
      return <button key={r.key} type="button" className="cmr" data-act="catTx" onClick={onAct('catTx')} data-v={r.key}><span className="nm"><b>{tx(r.name)}</b><small>{tx(r.grp)}</small></span><span className="bar"><i className={'a ' + r.s.cls} style={{ width: `${Math.max(0, aw)}%`, '--c': r.c }}></i>{r.pl > 0.5 ? <i className="p" style={{ left: `${pw}%` }} title={`Planned ${f0(r.pl)}`}></i> : null}</span><span className="nums"><b>{f0(r.a)}</b><small>of {f0(r.pl)}</small></span><span className={'df ' + r.s.cls}>{r.s.t}</span></button>;
    })}{' '}
    <p className="dim" style={{ fontSize: '13px', marginTop: '10px' }}>The bar is what’s happened so far; the white mark is the plan. Click a line for its transactions and trends.</p></div>;
}
export const compareViewR = el => draw(el, <Compare />);
