// The pop-up every budget line opens (was catRender, catRow, loanNote in js/bank.js) and the trends dialog (was
// flowRender in js/compare.js). The dialogs' frames stay in index.html; each part (#tdt, #tds, #tdr, #tdrg, #tdl,
// #fds, #fdb) is drawn on its own, so the search box (#tdq) keeps what's typed. catFilter still hides rows that
// don't match the search, after each draw and while typing.
import { draw, tx, onAct, onChg } from '../bridge.js';
import { TxOpts } from '../ui.jsx';
import { Pnd, ruleTagT } from '../screens/Bank.jsx';

// ---------- trends (flowRender) ----------
// Everything the trends view shows for one line or group (key: i:/inc:/l:/g:/grp:), for month S.cur.
function flowData(key) {
  const k = S.cur, p = plan(k); let V = [], name = '', pl = 0, inc = false, isL = false;
  if (key.startsWith('grp:')) { const g = p.groups.find(x => x.id === key.slice(4)); if (!g) return null; name = g.name; V = g.items.map(i => 'i:' + i.id); pl = g.items.reduce((x, i) => x + (+i.amt || 0), 0); }
  else if (key.startsWith('inc:')) { const i = p.income.find(x => x.id === key.slice(4)); name = i ? i.name : 'Income'; V = [key]; pl = i ? +i.amt || 0 : 0; inc = true; }
  else if (key.startsWith('l:')) { const l = S.loans.find(x => x.id === key.slice(2)); name = l ? l.name : 'Loan'; V = [key]; pl = l ? loanPlan(l, k) : 0; isL = true; }
  else if (key.startsWith('g:')) { const g = S.goals.find(x => x.id === key.slice(2)); name = g ? g.name : 'Goal'; V = [key]; pl = g ? goalPlan(g, k) : 0; }
  else { const x = allItems(k).find(y => y.i.id === key.slice(2)); name = x ? x.i.name : 'Item'; V = [key]; pl = x ? +x.i.amt || 0 : 0; }
  const sg = a => inc ? -a : a, ks = []; for (let i = 5; i >= 0; i--) ks.push(addM(k, -i));
  const first = firstMonth(), span = ks.filter(m => m >= first), MK = merchKeys(), VS = new Set(V);
  const per = {}, mer = {};
  Object.entries(S.txd || {}).forEach(([id, r]) => {
    if (!VS.has(r.v) || !ks.includes(r.k)) return; const a = sg(+r.amt || 0); per[r.k] = (per[r.k] || 0) + a;
    const t = BK.tx.find(x => x.id === id), mk = t ? merchKey(t, MK) : normT(r.n), e = mer[mk] || (mer[mk] = { label: '', now: 0, nowN: 0, tot: 0, n: 0, ms: new Set() });
    if (!e.label) e.label = t && t.merchant && normT(t.merchant) === mk ? t.merchant : titleC(mk); e.tot += a; e.n++; e.ms.add(r.k); if (r.k === k) { e.now += a; e.nowN++; }
  });
  // Months before bank filing (or groceries typed by hand) still count in the history bars.
  ks.forEach(m => { if (per[m] == null && V.length && V.every(v => v.startsWith('i:'))) { const x = V.reduce((s2, v) => { const a = flexAct(m, v.slice(2)); return a == null ? s2 : (s2 || 0) + a; }, null); if (x != null) per[m] = x; } });
  const now = per[k] || 0, months = Math.max(1, span.length), avg = span.reduce((x, m) => x + (per[m] || 0), 0) / months, mx = Math.max(1, pl, ...ks.map(m => per[m] || 0));
  const ML = Object.values(mer).sort((a, b) => b.tot - a.tot);
  return { k, key, name, pl, inc, isL, V, ks, per, now, months, avg, mx, ML };
}
const FlowSub = ({ d }) => <>{lab(d.k)} · <b style={{ color: 'var(--text)' }}>{f2(d.now)}</b> of {f2(d.pl)} planned{d.pl > 0.5 ? <> · <span className={(d.isL || d.key.startsWith('g:') || d.inc) ? (d.now >= d.pl - 0.5 ? 'pos' : 'neg') : (d.now > d.pl + 0.5 ? 'neg' : 'pos')}>{d.now > d.pl ? f0(d.now - d.pl) + ' over' : f0(d.pl - d.now) + ' under'}</span></> : ''}</>;
// acts: the See transactions / Close buttons (left out when shown inside the line pop-up)
function FlowBody({ d, acts = true }) {
  const { k, ks, per, mx, pl, ML, inc, months, V } = d, nN = ML.reduce((x, e) => x + e.nowN, 0);
  return <><div className="fhist">{ks.map(m => { const v = per[m] || 0, h = v / mx * 100; return <div key={m} className={'fcol' + (m === k ? ' cur' : '')} title={`${lab(m)}: ${f2(v)}`}><span className="fv">{v ? fk(v) : ''}</span><span className="fbar"><i style={{ height: `${Math.max(v ? 3 : 0, h)}%` }}></i>{pl > 0.5 ? <em style={{ bottom: `${pl / mx * 100}%` }}></em> : null}</span><small>{mon(m).slice(0, 3)}</small></div>; })}</div>{' '}
    <div className="fkpi"><div><small>Average a month</small><b>{f0(d.avg)}</b><span>last {months} month{months === 1 ? '' : 's'}</span></div><div><small>This month</small><b>{f0(d.now)}</b><span>{nN} {inc ? 'deposit' : 'transaction'}{nN === 1 ? '' : 's'}</span></div><div><small>Planned</small><b>{f0(pl)}</b><span>a month</span></div></div>{' '}
    {ML.length ? <table className="ftab"><thead><tr><th>{inc ? 'From' : 'Store'}</th><th>{mon(k).slice(0, 3)}</th><th>Visits</th><th>Avg / month</th></tr></thead><tbody>{ML.map((e, j) => <tr key={j}><td>{tx(e.label)}</td><td>{e.now ? f2(e.now) : '—'}<small>{e.nowN > 1 ? ' ×' + e.nowN : ''}</small></td><td>{(e.n / months).toFixed(e.n / months < 10 ? 1 : 0)}<small>/mo</small></td><td>{f0(e.tot / months)}</td></tr>)}</tbody></table> : <p className="dim" style={{ padding: '10px 0' }}>No bank transactions filed here in the last 6 months.</p>}{' '}
    {acts ? <div className="dact" style={{ marginTop: '14px' }}>{V.length === 1 ? <button type="button" className="btn g sm" data-act="flowTx" onClick={onAct('flowTx')} data-v={V[0]}>See {mon(k)} transactions</button> : null}<button type="button" className="btn g" data-act="fclose" onClick={onAct('fclose')}>Close</button></div> : null}</>;
}
export function flowRenderR() {
  if (!FD) return;
  const d = flowData(FD);
  if (!d) return;
  $('#fdt').textContent = d.name;
  draw($('#fds'), <FlowSub d={d} />);
  draw($('#fdb'), <FlowBody d={d} />);
}

// ---------- the line pop-up (catRender) ----------
// What a loan counts as paid this month and where that number comes from.
function LoanNote({ l, k }) {
  const r = k < l.start ? null : row(l, k);
  if (!r) return null;
  const mn = Math.min(l.min, r.open + r.int), ex = r.pay - mn > 0.5 ? ` · ${f0(r.pay - mn)} above the minimum` : '', st = { fontSize: '13.5px', marginTop: '10px' };
  if (r.auto) return <p className="dim" style={st}>{tx(l.link ? l.link.inst : 'Your lender')} shows <b style={{ color: 'var(--text)' }}>{f2(r.pay)}</b> paid in {mon(k)}{ex}. Linked loans use the lender's numbers, so an extra payment is counted however it's filed below.</p>;
  if (r.lg) return <p className="dim" style={st}>Counted as paid: <b style={{ color: 'var(--text)' }}>{f2(r.pay)}</b>{ex}. That's the total of payments filed here plus any you logged by hand.</p>;
  return <p className="dim" style={st}>Nothing paid yet in {mon(k)}. Move a payment here from the Bank tab, or log one in Loans.</p>;
}

// One transaction row, with Move (category + month).
function CatRow({ x, v, sgn }) {
  const r = S.txd[x.id] || {}, t = BK.tx.find(y => y.id === x.id), ac = t && (BK.accts || []).find(a => a.id === t.account), moved = x.d && r.k && x.d.slice(0, 7) !== r.k;
  // the search text keeps the old wording exactly (ruleTag gave escaped text there)
  const tagParts = auto => [r.auto === 'rest' ? 'catch-all' : r.auto === 'pair' ? 'paired transfer' : r.auto ? auto(r.auto) : '', moved ? `paid in ${mon(x.d.slice(0, 7))}, counts in ${mon(r.k)}` : ''].filter(Boolean).join(' · ');
  const tag = tagParts(ruleTagT), tagS = tagParts(ruleTag), pm = x.d.slice(0, 7), eid = tx(x.id);
  return <div className="trow" data-txt={tx((x.n + ' ' + (ac ? ac.institution + ' ' + (ac.mask || '') : '') + ' ' + tagS).toLowerCase())} data-amt={sgn(+x.amt || 0)}><span className="txd">{dshort(x.d)}</span><div className="nm"><b>{tx(x.n)}<Pnd id={x.id} /></b><small>{ac ? tx(ac.institution) + (ac.mask ? ' ••' + tx(ac.mask) : '') : ''}{tag ? ` · ${tag}` : ''}</small></div><b className="n">{f2(sgn(+x.amt || 0))}</b><button type="button" className="lnk" data-act="mvShow" onClick={onAct('mvShow')} data-id={eid} style={{ fontSize: '13px', padding: 0 }}>Move</button><div className="mvp" data-mvp={eid} hidden><label>Category<select className="in" data-mv={eid} aria-label={`Category for ${tx(x.n)}`} defaultValue={v} ref={onChg}><TxOpts k={r.k || S.cur} dir={x.amt < 0 ? 'in' : 'out'} /></select></label><label>Counts in<select className="in" data-mm={eid} aria-label={`Month ${tx(x.n)} counts in`} defaultValue={r.k} ref={onChg}>{[...new Set([addM(pm, -1), pm, addM(pm, 1), r.k].filter(Boolean))].sort().map(m => <option key={m} value={m}>{lab(m) + (m === pm ? ' (when paid)' : '')}</option>)}</select></label></div></div>;
}

function catData() {
  const k = S.cur, v = CT, inc = v.startsWith('inc:'), isL = v.startsWith('l:'), id = v.slice(inc ? 4 : 2), all = CR === 'all';
  const isG = v.startsWith('g:'), goal = isG ? S.goals.find(g => g.id === id) : null, loan = isL ? S.loans.find(l => l.id === id) : null, x0 = inc || isL || isG ? null : allItems(k).find(x => x.i.id === id), nm = isG ? (goal || {}).name : isL ? (loan || {}).name : inc ? (plan(k).income.find(i => i.id === id) || {}).name : (x0 ? x0.i.name : ''), kind = isG ? 'goal' : isL ? 'loan' : inc ? 'inc' : x0 && x0.g.flex ? 'flex' : 'bill';
  const L = Object.entries(S.txd || {}).filter(([, r]) => r.v === v && (all || r.k === k)).map(([tid, r]) => ({ id: tid, d: r.d, n: r.n, amt: r.amt, k: r.k })).sort((a, b) => (b.k + (b.d || '')).localeCompare(a.k + (a.d || '')));
  const man = inc || isL || isG ? [] : Object.keys(S.months).filter(m => all || m === k).flatMap(m => (S.months[m].rc || []).filter(r => !r.bank && r.item === id).map(r => ({ ...r, k: m })));
  const sgn = a => inc ? -a : a, tot = L.reduce((a, x) => a + sgn(+x.amt || 0), 0) + man.reduce((a, r) => a + (+r.amt || 0), 0), n = L.length + man.length, R = rulesFor(v), what = inc ? 'deposit' : isG ? 'transfer' : kind === 'flex' ? 'purchase' : 'payment';
  const months = new Set(L.map(x => x.k)).size || 1;
  return { k, v, inc, isL, isG, id, all, goal, loan, nm, kind, L, man, sgn, tot, n, R, what, months };
}
const CatSub = ({ d }) => <>{d.all ? 'All months' : lab(d.k)} · <b style={{ color: 'var(--text)' }}>{f2(d.tot)}</b> · {d.n} {d.what}{d.n === 1 ? '' : 's'}{d.all && d.n ? ` · about ${f0(d.tot / d.months)} a month` : ''}</>;
function CatRules({ d }) {
  const { kind, inc, isG, isL, loan, goal, R, id, k } = d;
  return <><small className="mut">{kind === 'flex' ? 'Stores that file here on their own' : inc ? 'Deposits that file here on their own' : isG ? 'Transfers that count as deposits here' : 'Payments that file here on their own'}</small><div className="chips">{R.length ? R.map(r => <span className="pill" key={r.id}>{tx(titleC(r.p))}<button type="button" className="x" data-act="catRuleDel" onClick={onAct('catRuleDel')} data-id={r.id} aria-label={`Stop filing ${tx(titleC(r.p))} here`}>×</button></span>) : <span className="dim" style={{ fontSize: '13.5px' }}>None yet</span>}{isL && (!loan || !bankSrc(loan)) ? null : <button type="button" className="btn g sm" data-act="catLink" onClick={onAct('catLink')} data-kind={kind} data-id={id}>{kind === 'flex' ? (R.length ? 'Add stores' : 'Link stores') : R.length ? 'Change' : inc ? 'Flag a deposit' : isG ? 'Flag transfers' : 'Link payment'}</button>}</div>{isL && loan ? <LoanNote l={loan} k={k} /> : null}{isG && goal ? <p className="dim" style={{ fontSize: '13.5px', marginTop: '10px' }}>Saved toward {tx(goal.name)}: <b style={{ color: 'var(--text)' }}>{f0(goalSaved(goal, k))}</b>{gLinked(goal) ? ` (${f0(linkedSaved(goal, k))} from accounts)` : ''}. Deposits you log by hand are on the Goals tab.</p> : null}</>;
}
const CatRange = ({ d }) => <><button type="button" className={CR === 'month' ? 'on' : ''} data-act="crng" onClick={onAct('crng')} data-v="month">{mon(d.k)}</button><button type="button" className={d.all ? 'on' : ''} data-act="crng" onClick={onAct('crng')} data-v="all">All months</button><button type="button" className={CR === 'trend' ? 'on' : ''} data-act="crng" onClick={onAct('crng')} data-v="trend">Trends</button></>;
function CatList({ d }) {
  const { L, man, all, v, sgn, inc, k } = d, rows = [];
  let last = '';
  L.forEach(x => { if (all && x.k !== last) { last = x.k; const mt = L.filter(y => y.k === x.k).reduce((a, y) => a + sgn(+y.amt || 0), 0); rows.push(<div className="tmon" key={'m' + x.k}><b>{lab(x.k)}</b><span>{f2(mt)}</span></div>); } rows.push(<CatRow key={x.id} x={x} v={v} sgn={sgn} />); });
  man.forEach((r, j) => rows.push(<div className="trow" key={'h' + j} data-txt={tx(((r.store || '') + ' added by hand').toLowerCase())} data-amt={+r.amt || 0}><span className="txd">{r.date ? dshort(r.date) : ''}</span><div className="nm"><b>{tx(r.store || 'Entry')}</b><small>Added by hand{all ? ' · ' + mon(r.k) : ''}</small></div><b className="n">{f2(+r.amt || 0)}</b><span></span></div>));
  const SP = samePayee(v, inc, all ? '0000' : k);
  if (SP.length) {
    rows.push(<div className="tmon other" key="sp"><b>Same payee, filed somewhere else</b><span>{SP.length}</span></div>);
    SP.slice(0, 40).forEach(t => { const r = S.txd && S.txd[t.id]; rows.push(<div className="trow" key={'s' + t.id} data-txt={tx(((t.merchant || t.name) + ' ' + (r ? txLabel(r) : 'not filed')).toLowerCase())} data-amt="0"><span className="txd">{dshort(t.date)}</span><div className="nm"><b>{tx(t.merchant || t.name)}<Pnd id={t.id} /></b><small>{r ? 'Filed as ' + tx(txLabel(r)) + (r.k !== t.date.slice(0, 7) ? ' in ' + mon(r.k) : '') : 'Not filed yet'}</small></div><b className="n">{f2(sgn(+t.amount || 0))}</b><button type="button" className="lnk" data-act="mvHere" onClick={onAct('mvHere')} data-id={tx(t.id)} style={{ fontSize: '13px', padding: 0 }}>Move here</button></div>); });
  }
  return rows.length ? rows : <p className="dim" style={{ padding: '14px 2px' }}>Nothing filed here {all ? 'yet' : 'in ' + mon(k)}.</p>;
}
export function catRenderR() {
  if (!CT) return;
  const d = catData();
  $('#tdt').textContent = d.nm || 'Category';
  draw($('#tdr'), <CatRules d={d} />);
  draw($('#tdrg'), <CatRange d={d} />);
  $('#tdq').hidden = CR === 'trend';
  // Trends: the trends view's summary and body, without its buttons.
  if (CR === 'trend') { $('#tdf').hidden = true; const f = flowData(CT); if (f) { draw($('#tds'), <FlowSub d={f} />); draw($('#tdl'), <FlowBody d={f} acts={false} />); } return; }
  draw($('#tds'), <CatSub d={d} />);
  draw($('#tdl'), <CatList d={d} />);
  catFilter();
}
