// The schedule editor (was alForm, alAdds, alList in js/build.js), used by Build budget step 6 and the Forecast.
// alDesc/alWhen/alCol/destName stay in build.js and math.js. Its inputs keep data-al / data-k="alv" for events.js.
import { tx } from './bridge.js';

export function AlForm({ a }) {
  const cur = a.to === 'snow' ? 'snow' : a.to;
  const dests = [...S.goals.map(g => ['g:' + g.id, 'Goal: ' + g.name]), ['snow', 'Snowball: loans one at a time'], ...S.loans.filter(l => !loanGone(l, TK)).map(l => ['l:' + l.id, 'Loan: ' + l.name]), ...(a.src === 'extra' ? [['keep', 'Keep in checking']] : [])];
  return <div className="alf"><label className="f">For<select className="in" data-al={a.id} data-f="to" defaultValue={cur}>{dests.map(([v, l]) => <option key={v} value={v}>{tx(l)}</option>)}</select></label>{' '}
    <div className="f"><span>Comes from</span><div className="seg"><button data-act="scSrc" data-id={a.id} data-v="plan" className={a.src === 'plan' ? 'on' : ''}>Set amount</button><button data-act="scSrc" data-id={a.id} data-v="extra" className={a.src === 'extra' ? 'on' : ''}>Left over</button></div></div>{' '}
    <label className="f">Amount{a.src === 'extra' && a.to !== 'keep' ? <> <span className="seg sm"><button data-act="scMode" data-id={a.id} data-v="$" className={a.mode !== '%' ? 'on' : ''}>$</button><button data-act="scMode" data-id={a.id} data-v="%" className={a.mode === '%' ? 'on' : ''}>%</button></span></> : null}<input className="in a" data-k="alv" data-id={a.id} data-key={'alv-' + a.id} inputMode="decimal" defaultValue={a.v || ''} placeholder={a.mode === '%' && a.src === 'extra' ? '%' : '$0'} /></label>{' '}
    <label className="f">Starts<input className="in" type="month" data-al={a.id} data-f="from" defaultValue={`${a.from}`} /></label>{' '}
    <label className="f">Stops (optional)<input className="in" type="month" data-al={a.id} data-f="until" defaultValue={a.until || ''} /></label>{' '}
    {a.to === 'snow' ? <><div className="f" style={{ gridColumn: '1/-1' }}><span>Order</span><div className="seg"><button data-act="scHow" data-id={a.id} data-v="rate" className={a.how !== 'bal' ? 'on' : ''}>Highest rate first</button><button data-act="scHow" data-id={a.id} data-v="bal" className={a.how === 'bal' ? 'on' : ''}>Smallest balance first</button></div></div>{' '}
      <div className="f" style={{ gridColumn: '1/-1' }}><span>Loans in this snowball (none ticked = all)</span><div className="alls">{S.loans.filter(l => !loanGone(l, TK)).map(l => <label key={l.id} className="rlt"><input type="checkbox" data-al={a.id} data-f="loan" data-l={l.id} defaultChecked={(a.loans || []).includes(l.id)} /> {tx(l.name)}</label>)}<label className="rlt"><input type="checkbox" data-al={a.id} data-f="roll" defaultChecked={a.roll !== false} /> Add each loan’s payment once it’s paid off</label></div></div></> : null}{' '}
    <p className="dim" style={{ gridColumn: '1/-1', fontSize: '13px' }}>{a.src === 'plan' ? 'Goes in the budget every month from the start, like a bill.' : 'Only uses money the plan leaves over; rules run top to bottom.'} {a.to.startsWith('g:') ? 'Stops by itself once the goal is reached.' : a.to === 'keep' ? '' : 'Stops by itself once paid off; what it frees goes to the next rule or is kept.'}</p>{' '}
    <div className="adds" style={{ gridColumn: '1/-1' }}><button className="btn sm" data-act="scEdit" data-id={a.id}>Done</button><button className="lnk" data-act="scDel" data-id={a.id} style={{ color: 'var(--red)' }}>Remove</button></div></div>;
}

export const AlAdds = () => <div className="adds"><button className="add" data-act="scAdd" data-v="goal">Save for a goal</button><button className="add" data-act="scAdd" data-v="loan">Extra on a loan</button><button className="add" data-act="scAdd" data-v="snow">Snowball</button><button className="add" data-act="scAdd" data-v="extra">Share of what’s left</button></div>;

// The schedule as a list; form=false leaves out the open item's form and the add buttons (the Forecast's copy).
export function AlList({ form = true }) {
  const A = S.al || [], X = A.filter(a => a.src === 'extra');
  const row = a => {
    const xi = X.indexOf(a);
    return [<div key={a.id} className={'alr' + (ALE === a.id ? ' on' : '')}><i className="ald" style={{ background: alCol(a) }}></i><button type="button" className="alb" data-act="scEdit" data-id={a.id}><b>{tx(destName(a.to))}</b><small>{alDesc(a)} · {a.src === 'plan' ? 'set amount' : 'from left over'}</small></button><span className="alw">{alWhen(a)}</span><span className="xb">{a.src === 'extra' ? <><button className="x" data-act="scMove" data-id={a.id} data-v="-1" aria-label="Earlier" disabled={!xi}>↑</button><button className="x" data-act="scMove" data-id={a.id} data-v="1" aria-label="Later" disabled={!(xi < X.length - 1)}>↓</button></> : null}<button className="x" data-act="scDel" data-id={a.id} aria-label="Remove">×</button></span></div>,
      form && ALE === a.id ? <AlForm key={a.id + 'f'} a={a} /> : null];
  };
  return <><div className="all">{A.filter(a => a.src === 'plan').map(row)}{X.length ? <><div className="rgh" style={{ paddingTop: '8px' }}>From what’s left over, in order</div>{X.map(row)}</> : null}{A.length ? null : <p className="dim" style={{ fontSize: '14px', padding: '6px 0' }}>Nothing scheduled yet. Add a goal saving, a loan extra, a snowball, or a share of what’s left over.</p>}</div>{' '}
    {form ? <AlAdds /> : null}</>;
}
