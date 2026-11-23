// Bank tab (was renderBank in js/linked-loans.js, pairCard and mvPanel in js/bank.js). Filing logic (inbox,
// suggestTx, pairIssues, …) stays in bank.js. The Move panel's buttons and selects keep their data-* hooks.
import { tx, onAct } from '../bridge.js';
import { Gear, TxOpts } from '../ui.jsx';

// The "Pending" tag after a name (was PND).
export const Pnd = ({ id }) => PSET.has(id) ? <> <span className="pnd">Pending</span></> : null;
// Which rule filed a transaction, as text (was ruleTag, which returned escaped HTML).
export const ruleTagT = id => { const x = (S.rules || []).find(y => y.id === id); return x ? `rule “${tx(titleC(x.p))}”` : 'auto'; };

// Move a filed transaction to another category or month (hidden until Move; was mvPanel).
export function MvPanel({ id, r, dir }) {
  const base = (r.d || '').slice(0, 7) || r.k, ms = [...new Set([addM(base, -1), base, addM(base, 1), r.k].filter(Boolean))].sort(), eid = tx(id);
  return <div className="mvp" data-mvp={eid} hidden>{r.v !== 'split' && !r.sp && Math.abs(+r.amt || 0) > 0.02 ? <><button className="lnk" data-act="spOpen" onClick={onAct('spOpen')} data-id={eid} style={{ gridColumn: '1/-1', justifySelf: 'start' }}>Split between categories…</button><div className="spf" data-spf={eid} hidden></div></> : null}<label>Category<select className="in" data-mv={eid} aria-label={`Category for ${tx(r.n)}`} defaultValue={r.v}><TxOpts k={r.k} dir={dir} /></select></label><label>Counts in<select className="in" data-mm={eid} aria-label={`Month ${tx(r.n)} counts in`} defaultValue={r.k}>{ms.map(m => <option key={m} value={m}>{lab(m) + (m === base ? ' (when paid)' : '')}</option>)}</select></label></div>;
}

// Payments between your own accounts filed as spending or income (was pairCard).
function PairCard() {
  const I = pairIssues();
  if (!I.length) return null;
  return <section className="card" style={{ marginBottom: '16px' }}><div className="bh"><div><h2>Possible double counts ({I.length})</h2><p>These are payments between your own accounts, like checking to a card or loan, but they’re filed as spending or income. The purchases on the card already count.</p></div><button className="btn sm" data-act="fixPairs" onClick={onAct('fixPairs')}>Make {I.length === 1 ? 'it a transfer' : 'them transfers'}</button></div>{I.slice(0, 30).map(({ r }, i) => <div className="txr dn" key={i}><span className="txd">{dshort(r.d)}</span><div className="nm"><b>{tx(r.n)}</b><small>{tx(txLabel(r))}</small></div><b className="txa">{f2(Math.abs(r.amt))}</b></div>)}</section>;
}

const Head = ({ right = null, line = null }) => <div className="phead"><div><h1>Bank</h1><p className="mut">{line || 'Transactions from your banks and cards, and the rules that file them.'}</p></div>{right}</div>;

export function Bank() {
  if (!SRV) return <><Head /><section className="card"><p>Bank sync runs on the server, which can’t be reached right now. It reconnects on its own.</p></section></>;
  const st = BK.st;
  if (!st) return <><Head /><section className="card"><p className="mut">{BK.err || 'Loading…'}</p></section></>;
  if (!st.configured) return <><Head /><section className="card"><h2>Add your Plaid keys</h2><p className="mut" style={{ margin: '8px 0 14px' }}>The server needs your Plaid keys before it can connect to your bank. Add these lines under <b>environment</b> in your Docker compose file, then redeploy the stack:</p><pre className="code">{'- PLAID_CLIENT_ID=your-client-id\n- PLAID_SECRET=your-secret\n- PLAID_ENV=production'}</pre><p className="dim" style={{ fontSize: '14px', marginTop: '10px' }}>Use PLAID_ENV=sandbox with sandbox keys to try it with Plaid’s test bank first.</p></section></>;
  const items = st.items || [], ib = inbox(), show = ib.slice(0, BK.show || 40), done = Object.entries(S.txd || {}).filter(([, r]) => r.k === S.cur && !r.sp).sort((a, b) => (b[1].d || '').localeCompare(a[1].d || '')), pi = pairIssues(), R = S.rules || [];
  const bad = items.filter(it => it.error).length, last = items.map(it => it.lastSync).filter(Boolean).sort().pop();
  const line = <>{st.env === 'sandbox' ? 'Plaid test mode · ' : ''}{BK.busy || st.syncing ? 'Syncing now…' : last ? 'Last synced ' + new Date(last).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'Not synced yet'} · {items.length} connection{items.length === 1 ? '' : 's'}{bad ? <> · <b style={{ color: '#ff9aa8' }}>{bad} need{bad === 1 ? 's' : ''} attention</b></> : ''}</>;
  const right = <div className="phact"><button className="btn g sm" data-act="sview" onClick={onAct('sview')} data-v="rules">Rules{R.length ? ' (' + R.length + ')' : ''}</button><button className="btn g sm ib" data-act="sview" onClick={onAct('sview')} data-v="connections"><Gear />Connections{bad ? ' (' + bad + ' to fix)' : ''}</button><button className="btn g sm" data-act="bankSync" onClick={onAct('bankSync')} disabled={!!BK.busy}>{BK.busy ? 'Syncing…' : 'Sync now'}</button></div>;
  let v = BV; if (!['review', 'filed'].includes(v)) v = ib.length || pi.length ? 'review' : 'filed';
  const nb = (k, l, n, hot) => <button className={v === k ? 'on' : ''} data-act="bview" onClick={onAct('bview')} data-v={k}>{l}{n != null ? <> <span className={hot ? 'bn hot' : 'bn'}>{n}</span></> : null}</button>;
  const top = <><Head right={right} line={line} /><div className="seg bnav" role="tablist" aria-label="Bank sections">{nb('review', 'To review', ib.length + pi.length, ib.length + pi.length > 0)}{nb('filed', 'Filed in ' + mon(S.cur).slice(0, 3), done.length)}</div></>;
  if (!items.length) return <>{top}<section className="card"><h2>No banks connected yet</h2><p className="mut" style={{ margin: '6px 0 14px' }}>Click <b>Connect a bank</b>, then pick your bank and sign in through Plaid. Do this from a computer. Connections and rules live in Settings.</p><button className="btn sm" data-act="bankConnect" onClick={onAct('bankConnect')}>Connect a bank</button></section></>;
  if (v === 'review') return <>{top}<PairCard /><section className="card"><div className="bh"><div><h2>To review{ib.length ? ' (' + ib.length + ')' : ''}</h2><p>Pick a category and Add. Tick <b>Always</b> and the next ones like it file themselves.</p></div>{ib.length ? <button className="btn lime" data-act="txAll" onClick={onAct('txAll')}>Add all {show.length < ib.length ? show.length + ' shown' : ib.length}</button> : null}</div>{' '}
    {ib.length ? <>{show.map(t => { const sg = suggestTx(t), et = tx(t.id), mk = t.date.slice(0, 7); return <div className="txr" key={t.id}><span className="txd">{dshort(t.date)}</span><div className="nm"><b>{tx(t.merchant || t.name)}<Pnd id={t.id} /></b><small>{tx(t.accountName || '')}{pfcName(t) ? ' · ' + tx(pfcName(t)) : ''}</small></div><b className={'txa' + (t.amount < 0 ? ' inflow' : '')}>{t.amount < 0 ? '+' : ''}{f2(Math.abs(t.amount))}</b><select className="in txs" data-tx={et} aria-label={`Category for ${tx(t.merchant || t.name)}`} defaultValue={sg}><TxOpts k={mk} dir={tdir(t)} /></select><label className="alw" title="File future transactions like this one the same way"><input type="checkbox" data-alw={et} defaultChecked={defAlways(sg, mk)} />Always</label><button className="btn sm" data-act="txAdd" onClick={onAct('txAdd')} data-id={et}>Add</button></div>; })}{ib.length > show.length ? <button className="add" data-act="txMore" onClick={onAct('txMore')} style={{ marginTop: '10px' }}>Show more</button> : null}</>
      : <p className="mut">All caught up. New transactions that need you show up here after each sync.</p>}{' '}
    <details className="more" data-key="bhow" open={OPEN.has('bhow')} style={{ marginTop: '14px' }}><summary>How filing works</summary><div className="mut" style={{ fontSize: '14px', lineHeight: 1.55, marginTop: '8px' }}>{' '}
      <p><b>Transfers pair up.</b> A payment from checking and the same amount arriving on a connected card or loan within 5 days is one transfer, so it never counts twice.</p>{' '}
      <p style={{ marginTop: '6px' }}><b>Rules file the rest.</b> Links you make in Build budget (Link payment, Flag a deposit, Link stores) and Always here become rules. See them all in <button className="lnk" data-act="sview" onClick={onAct('sview')} data-v="rules" style={{ padding: 0, fontSize: 'inherit' }}>Settings → Rules</button>.</p>{' '}
      <p style={{ marginTop: '6px' }}><b>Everything else goes to {S.catchAll === 'review' ? 'To review' : tx(txLabel({ v: 'i:' + (flexDefault(TK) || ''), k: TK }))}</b> (you choose this in Settings or Build budget → Spending): purchases, payment apps and card refunds.</p>{' '}
      <p style={{ marginTop: '6px' }}><b>What's left lands here</b>: money coming into checking, loan payments and transfers between your own accounts.</p>{' '}
      <p style={{ marginTop: '6px' }}><b>Your choices win.</b> Rules never change a transaction you filed or moved yourself.</p></div></details></section></>;
  // filed
  const q = FLQ.trim().toLowerCase(), cnt = {}; done.forEach(([, r]) => { const k = fileKind(r); cnt[k] = (cnt[k] || 0) + 1; });
  const rows = done.filter(([, r]) => FLF === 'all' || fileKind(r) === FLF).filter(([, r]) => !q || (r.n + ' ' + txLabel(r)).toLowerCase().includes(q)), vis = rows.slice(0, FLN);
  return <>{top}<section className="card"><div className="bh"><div><h2>Filed in {mon(S.cur)}</h2><p><b>Move</b> changes a transaction’s category or month; Undo sends it back to review. Your choice always wins over rules.</p></div><input className="in" data-filt="1" data-key="flq" defaultValue={tx(FLQ)} placeholder="Search" autoComplete="off" style={{ maxWidth: '220px' }} aria-label="Search filed transactions" /></div>{' '}
    <div className="chipr">{FLKIND.filter(([k]) => k === 'all' || cnt[k]).map(([k, l]) => <button key={k} className={FLF === k ? 'on' : ''} data-act="bfilt" onClick={onAct('bfilt')} data-v={k}>{l} <span className="bn">{k === 'all' ? done.length : cnt[k]}</span></button>)}</div>{' '}
    {vis.length ? vis.map(([id, r]) => { const moved = r.d && r.d.slice(0, 7) !== r.k, eid = tx(id); return <div className="txr dn" key={id}><span className="txd">{dshort(r.d)}</span><div className="nm"><b>{tx(r.n)}<Pnd id={id} /></b><small>{tx(txLabel(r))}{r.auto ? <> <span className="fl">{r.auto === 'pair' ? 'paired transfer' : r.auto === 'rest' ? 'catch-all' : ruleTagT(r.auto)}</span></> : null}{moved ? <> <span className="fl">paid in {mon(r.d.slice(0, 7))}</span></> : null}</small></div><b className={'txa' + (r.amt < 0 ? ' inflow' : '')}>{r.amt < 0 ? '+' : ''}{f2(Math.abs(r.amt))}</b><span style={{ display: 'flex', gap: '12px' }}><button className="lnk" data-act="mvShow" onClick={onAct('mvShow')} data-id={eid}>Move</button><button className="lnk" data-act="txUndo" onClick={onAct('txUndo')} data-id={eid}>Undo</button></span><MvPanel id={id} r={r} dir={r.amt < 0 ? 'in' : 'out'} /></div>; })
      : <p className="mut" style={{ padding: '10px 0' }}>Nothing here{q ? ' matches “' + tx(FLQ) + '”' : ''}.</p>}{' '}
    {rows.length > vis.length ? <button className="add" data-act="bmore" onClick={onAct('bmore')} style={{ marginTop: '10px' }}>Show all {rows.length}</button> : null}</section></>;
}
