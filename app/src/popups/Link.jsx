// The link dialog: Link payment / Flag a deposit / Link stores / Flag transfers (was lnkList, lnkRule and lnkCount in
// js/bank.js). lnkOpen fills LK and the dialog's title; the candidates (#lpick) and the rule options (#lrule) are drawn
// here. Ticking a candidate (the #lpick change listener) and searching (#lq) still go through bank.js, which calls
// lnkRule / lnkList by name; Save and Remove link stay there too.
import { useLayoutEffect, useState } from 'react';
import { draw, tx } from '../bridge.js';
import { LK, bankFrom, lnkCands, lnkMatches, lnkSibs, lnkSingle, normT, titleC } from '../lib/bank.js';
import { S, f0, f2, $ } from '../lib/core.js';
import { dshort, txLabel } from '../lib/linked-loans.js';
import { lnkRule } from '../named.jsx';

function LnkPick() {
  const C = lnkCands();
  if (!C.length) return <p className="dim" style={{ padding: '12px 2px' }}>{'No matching transactions since ' + dshort(bankFrom()) + '.'}</p>;
  return C.map(g => {
    const other = Object.keys(g.filed).filter(v => v !== LK.v)[0];
    return <label key={g.p}><input type="checkbox" name="lp" value={tx(g.p)} defaultChecked={LK.sels.includes(g.p)} /><span style={{ minWidth: 0 }}><b>{tx(g.label)}</b><small>Last {dshort(g.last)}{g.n > 1 ? ' · ' + g.n + ' times' : ''} · {tx(g.acct)}{g.filed[LK.v] ? ' · already filed here' : other ? ' · filed as ' + tx(txLabel({ v: other, k: g.last.slice(0, 7) })) : ''}</small></span><b className="n">{g.lo === g.hi ? f2(g.lo) : f0(g.lo) + '–' + f0(g.hi)}</b></label>;
  });
}

// The rule options under the list, with a live count of what they match. Typing the text or ticking a box redraws
// this (and the Save button's state), as lnkCount did.
function LnkRule() {
  const [, bump] = useState(0), re = () => bump(n => n + 1);
  const has = LK.sels.length > 0, one = lnkSingle();
  const M = has ? lnkMatches() : [], d = S.txd || {}, here = M.filter(t => d[t.id] && d[t.id].v === LK.v).length, other = M.filter(t => d[t.id] && d[t.id].v !== LK.v).length, un = M.length - here - other;
  useLayoutEffect(() => { $('#lok').disabled = !has || !M.length; });
  if (!has) return null;
  const sb = one ? lnkSibs(normT(LK.pat)) : [];
  return <>{one ? <><label className="f">Match transactions whose name contains<input className="in" id="lpat" defaultValue={tx(LK.pat)} autoComplete="off" onInput={e => { LK.pat = e.target.value; re(); }} /></label>{LK.ref ? <label className="chk"><input type="checkbox" id="lamt" defaultChecked={LK.amtOn} onChange={e => { LK.amtOn = e.target.checked; re(); }} />Only amounts around {f0(LK.ref)} (±25%)</label> : null}<label className="chk" id="lsibl" hidden={!sb.length}><input type="checkbox" id="lsib" defaultChecked={LK.sibOn} onChange={e => { LK.sibOn = e.target.checked; re(); }} /><span id="lsibt">{`Also include ${sb.map(([q, n]) => titleC(q) + ' (' + n + ')').join(', ')}`}</span></label></>
    : <p className="mut" style={{ fontSize: '14px' }}>{LK.sels.length} ticked: {tx(LK.sels.map(titleC).join(', '))}</p>}
    {LK.kind !== 'flex' ? <label className="chk"><input type="checkbox" id="lshift" defaultChecked={LK.shift} onChange={e => { LK.shift = e.target.checked; }} />Count {LK.kind === 'inc' ? 'deposits' : 'payments'} made in the last 5 days of a month toward the next month</label> : null}
    <label className="chk" id="lmovel" hidden={!other}><input type="checkbox" id="lmove" defaultChecked={LK.move} onChange={e => { LK.move = e.target.checked; }} /><span id="lmovet">{`Also move the ${other} filed somewhere else to ${LK.name}`}</span></label><p className="dim" id="lcount" style={{ fontSize: '13.5px', marginTop: '8px' }}>{M.length ? <>Matches <b>{M.length}</b> since {dshort(bankFrom())}: {un} not filed yet{here ? `, ${here} already here` : ''}{other ? `, ${other} filed somewhere else` : ''}.</> : 'Nothing matches that text.'}</p></>;
}

export function lnkListR() { draw($('#lpick'), <LnkPick />); lnkRule(); }
export function lnkRuleR() { draw($('#lrule'), <LnkRule />); }
