// Settings tab (was renderSettings, bkCard, refreshCard, connCard, filingCard, rulesCard, healthCard, dataView in
// js/settings.js, csvCard in js/csv-import.js, ntCard in js/alerts.js). healthChecks, bkList and the CSV reader stay
// there. The rules search's input listener (settings.js) sets RQ and calls rulesFilter, which is rulesFilterR here:
// the rules card follows a tick and redraws its rows' hidden state and the "No rules match" line from RQ.
import { Fragment } from 'react';
import { tx, onAct, onChg, tick } from '../bridge.js';
const RT = tick();
export const rulesFilterR = RT.bump;
import { TxOpts, CatchSel, ActBtn, Rich, SkelCards } from '../ui.jsx';
import { NOTIFY } from '../lib/alerts.js';
import { BK, bankFrom, flexDefault, ruleFor, titleC } from '../lib/bank.js';
import { soFarOf } from '../lib/budget.js';
import { DEMO, S, TK, f0, f2, lab, labS, mon, plan } from '../lib/core.js';
import { CV, cvAccts, cvRows } from '../lib/csv-import.js';
import { dshort, txLabel, txTargets } from '../lib/linked-loans.js';
import { OPEN, balEnd, bankSrc, extraPaid, goalPlan, goalSaved, linkedSaved, loanGone, manualSaved, row, savedIn, savedL, totals, savedWork } from '../lib/math.js';
import { FS, SRV } from '../lib/server-sync.js';
import { BKP, RQ, SV, SYNC_OPTS, bkLabel, healthChecks, hhName, hhSub, syncWord, whenS, ABT, PAGE_BUILD } from '../lib/settings.js';
import { acctsOf, debtNow, sumBal } from '../lib/wealth.js';

const card16 = { marginBottom: '16px' }, note14 = { fontSize: '14px', margin: '4px 0 12px' };

// Daily copies on the server (Settings → General → Backups).
// About this server: what it runs, whether this page runs the same, where the data is, last save and sync.
const ago = t => { if (!t) return 'never'; const m = Math.round((Date.now() - Date.parse(t)) / 6e4); return m < 2 ? 'just now' : m < 60 ? m + ' min ago' : m < 48 * 60 ? Math.round(m / 60) + ' h ago' : Math.round(m / 1440) + ' days ago'; };
const when = t => t ? new Date(t).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—';
const kb = n => n == null ? '—' : n < 1024 * 1024 ? Math.max(1, Math.round(n / 1024)) + ' KB' : (n / 1048576).toFixed(1) + ' MB';
export function AboutCard() {
  if (!SRV) return null;
  const a = ABT, pb = PAGE_BUILD;
  if (!a) return <section className="card abt"><h2>This server</h2><p className="mut" style={note14}>Version {pb.version}{pb.rev ? ' · ' + pb.rev : ''}</p><div className="adds"><button className="btn g sm" data-act="abLoad" onClick={onAct('abLoad')}>Show details</button></div></section>;
  if (a.err) return <section className="card abt"><h2>This server</h2><p className="neg" style={note14}>Couldn’t ask the server: {tx(a.err)}</p><div className="adds"><button className="btn g sm" data-act="abLoad" onClick={onAct('abLoad')}>Try again</button></div></section>;
  const same = !a.rev || !pb.rev ? (a.built || '') === (pb.built || '') || !a.built : a.rev === pb.rev, stale = a.lastSync && Date.now() - Date.parse(a.lastSync) > 26 * 36e5, rf = BK.st && BK.st.refresh;
  const W = [];
  if (!a.writable) W.push('The server can’t write to its data folder, so nothing you change is being saved. Check the folder’s owner and permissions on the server.');
  if (a.connections && stale && !(rf && rf.hours === 0)) W.push(`No bank sync since ${when(a.lastSync)}. Settings → Connections shows any connection that needs attention.`);
  if (a.syncErrors) W.push(`${a.syncErrors} bank connection${a.syncErrors === 1 ? ' needs' : 's need'} attention (Settings → Connections).`);
  const row2 = (k, v, sub) => <div className="abr"><span className="mut">{k}</span><span>{v}{sub ? <small className="dim">{sub}</small> : null}</span></div>;
  return <section className="card abt"><div className="bh"><div><h2>This server</h2><p className="mut" style={note14}>What’s running and where your data is kept.</p></div><button className="btn g sm" data-act="abLoad" onClick={onAct('abLoad')}>Refresh</button></div>
    {W.map((w, i) => <p key={i} className="abw">{w}</p>)}
    {row2('Running', `Version ${a.version || '?'}${a.rev ? ' · ' + tx(a.rev) : ''}`, `built ${when(a.built)} · started ${when(a.started)}`)}
    {row2('This page', same ? 'Same build' : `Older copy${pb.rev ? ' (' + tx(pb.rev) + ')' : ''}`, same ? null : 'Reload to get the new one; on a phone, close the app and open it again.')}
    {same ? null : <div className="adds" style={{ margin: '4px 0 8px' }}><button className="btn sm" data-act="abReload" onClick={onAct('abReload')}>Reload now</button></div>}
    {row2('Budget saved', ago(a.savedAt), when(a.savedAt))}
    {row2('Bank synced', a.connections ? ago(a.lastSync) : 'No banks connected', a.connections ? when(a.lastSync) : null)}
    {row2('Data folder', a.docker ? (a.dataPath ? tx(a.dataPath) : 'data, next to docker-compose.yml') : tx(a.dataDir), a.docker ? `on the server (${tx(a.dataDir)} inside the container) · ${a.backups} daily cop${a.backups === 1 ? 'y' : 'ies'}` : `${a.backups} daily cop${a.backups === 1 ? 'y' : 'ies'}`)}
    <details className="more" data-key="abfiles" open={OPEN.has('abfiles')} style={{ marginTop: '10px' }}><summary>Files</summary>{(a.files || []).map(f => <div className="abr" key={f.name}><span className="mut">{tx(f.name)}</span><span>{f.missing ? 'not there yet' : `${kb(f.size)} · ${ago(f.at)}`}</span></div>)}</details>
  </section>;
}

export function BkCard() {
  if (!SRV) return null;
  if (BKP === 'wait') return <p className="mut" style={{ marginTop: '12px' }}>Loading the daily copies…</p>;
  if (!Array.isArray(BKP)) return null;
  return BKP.length ? <div className="bkl">{BKP.slice(0, 40).map(b => <div className="bkr" key={b.id}><span>{tx(bkLabel(b))}</span><button className="btn g sm" data-act="bkRestore" onClick={onAct('bkRestore')} data-id={tx(b.id)}>Restore</button></div>)}</div>
    : <p className="mut" style={{ marginTop: '12px' }}>No daily copies yet. The first one is made the next day you change something.</p>;
}

// How often the server asks the banks for new data.
function RefreshCard() {
  const rf = BK.st && BK.st.refresh;
  if (!rf) return null;
  const opts = SYNC_OPTS.some(o => o[0] === rf.hours) ? SYNC_OPTS : [[rf.hours, `Every ${rf.hours} hours (server setting)`], ...SYNC_OPTS];
  const pick = opts.find(([v]) => rf.hours === v);
  return <section className="card" style={card16}><h2>Refresh bank data</h2><p className="mut" style={note14}>How often the server checks your banks for new transactions and balances. Plaid charges per connection per month, not per check, so checking more often costs nothing extra. Banks themselves only update a few times a day, so new charges can still take a few hours to show.</p>{' '}
    <div className="fields"><label className="f" style={{ maxWidth: '280px' }}>Check automatically<select className="in" data-c="refresh" data-f="hours" defaultValue={pick ? `${pick[0]}` : undefined} ref={onChg}>{opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>{' '}
      <label className="chk" style={{ alignSelf: 'end', paddingBottom: '10px' }}><input type="checkbox" data-c="refresh" data-f="open" defaultChecked={!!rf.open} ref={onChg} /> Also check when someone opens the app <small className="dim">(if the last check was 10+ minutes ago)</small></label></div>{' '}
    <p className="dim" style={{ fontSize: '13px', marginTop: '10px' }}>{rf.last ? 'Last check ' + whenS(rf.last) : 'No check yet'}{rf.next ? ' · next automatic check around ' + whenS(rf.next) : rf.hours ? '' : ' · automatic checks are off'}.</p></section>;
}

function ConnCard({ items }) {
  const last = items.map(it => it.lastSync).filter(Boolean).sort().pop();
  return <><RefreshCard /><section className="card"><div className="bh"><div><h2>Connections</h2><p>Banks, cards, lenders and brokerages. {syncWord(BK.st && BK.st.refresh)}{last ? '; last synced ' + whenS(last) : ''}.</p></div><div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}><button className="btn g sm" data-act="bankSync" onClick={onAct('bankSync')} disabled={!!BK.busy}>{BK.busy ? 'Syncing…' : 'Sync now'}</button><button className="btn sm" data-act="bankConnect" onClick={onAct('bankConnect')}>Connect a bank</button></div></div>{' '}
    {items.length ? items.map(it => <div className={'bki' + (it.error ? ' err' : '')} key={it.item_id}><div className="nm"><b>{tx(it.institution.name)}</b><small>{it.accounts.map(a => tx(a.name) + (a.mask ? ' ••' + tx(a.mask) : '')).join(' · ') || 'Accounts loading…'}</small>{it.error ? <small className="serr">{tx(it.error.code === 'ITEM_LOGIN_REQUIRED' ? 'Your bank needs you to sign in again.' : it.error.message)}</small> : <small>{it.lastSync ? 'Last synced ' + new Date(it.lastSync).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'Waiting for first sync'} · {`${it.count}`} transactions</small>}</div>{it.kind === 'csv' ? <button className="btn g sm" data-act="cvGo" onClick={onAct('cvGo')}>Import more</button> : it.error ? <button className="btn sm" data-act="bankConnect" onClick={onAct('bankConnect')} data-id={tx(it.item_id)}>Reconnect</button> : <button className="btn g sm" data-act="bankConnect" onClick={onAct('bankConnect')} data-kind="accounts" data-id={tx(it.item_id)} title="Pick more accounts at this bank, like a savings account">Add accounts</button>}<button className="x" data-act="bankRemove" onClick={onAct('bankRemove')} data-id={tx(it.item_id)} aria-label={`Disconnect ${tx(it.institution.name)}`}>×</button></div>)
      : <p className="mut">No banks connected yet. Click <b>Connect a bank</b>, then pick your bank and sign in through Plaid. Do this from a computer.</p>}{' '}
    <label className="f" style={{ marginTop: '16px', maxWidth: '260px' }}>Review and file transactions from<input className="in" type="date" data-c="bankfrom" defaultValue={`${bankFrom()}`} ref={onChg} /></label></section></>;
}

// How the viewed month's transactions were filed, in the order filing runs.
function FilingCard() {
  const k = S.cur, F = Object.values(S.txd || {}).filter(r => r.k === k), n = f => F.filter(f).length, fd = flexDefault(TK), off = S.catchAll === 'review';
  return <section className="card" style={card16}><h2>How {mon(k)} was filed</h2><p className="mut" style={note14}>Each bank transaction goes through these steps in order. Something in the wrong place? Find its rule below and open <b>filed by this rule</b>, or open the category on the Budget tab and Move it. Your own choices always win.</p>{' '}
    <div className="fsteps"><div><b>{n(r => r.auto === 'pair')}</b><span>Paired transfers</span><small>Checking to a connected card or loan, same amount within 5 days, counted once</small></div><div><b>{n(r => r.auto && r.auto !== 'pair' && r.auto !== 'rest')}</b><span>Filed by rules</span><small>The {(S.rules || []).length} rules below</small></div><div><b>{n(r => r.auto === 'rest')}</b><span>Catch-all</span><small>{off ? 'Off: unlinked purchases wait in To review' : 'Unlinked purchases go to ' + tx(txLabel({ v: 'i:' + (fd || ''), k: TK }))}{fd && !off ? <> · <button className="lnk" data-act="catTx" onClick={onAct('catTx')} data-v={'i:' + fd} style={{ padding: 0, fontSize: 'inherit' }}>see them</button></> : null}</small></div><div><b>{n(r => !r.auto)}</b><span>Filed by you</span><small>Added in To review or moved by hand</small></div></div></section>;
}

// All rules, grouped by the category they file to. Each lists what it filed, with Undo (back to To review).
// The search (RQ) hides rows and groups as the old rulesFilter() did after drawing and while typing.
function RulesCard() {
  RT.use();
  const R = (S.rules || []).slice().sort((a, b) => a.dir.localeCompare(b.dir) || txLabel({ v: a.v, k: TK }).localeCompare(txLabel({ v: b.v, k: TK })) || a.p.localeCompare(b.p));
  if (!R.length) return null;
  const cnt = r => BK.tx.filter(t => ruleFor(t) === r).length, TXD = Object.entries(S.txd || {}), by = {};
  R.forEach(r => { const l = txTargets(TK).ok(r.v) ? txLabel({ v: r.v, k: TK }) : 'Removed category'; (by[l] || (by[l] = [])).push(r); });
  const q = RQ.trim().toLowerCase(); let any = 0;
  const one = (r, shown) => {
    const n = cnt(r), ok = txTargets(TK).ok(r.v), fl = TXD.filter(([, x]) => x.auto === r.id).sort((a, b) => (b[1].d || '').localeCompare(a[1].d || ''));
    return <div className="rrow" key={r.id} data-txt={tx((r.p + ' ' + (r.x || []).join(' ')).toLowerCase())} hidden={!shown}><input className="in" data-rule={r.id} defaultValue={tx(r.p)} aria-label="Rule text" ref={onChg} /><select className="in" data-rulev={r.id} aria-label="Files to" defaultValue={ok ? r.v : ''} ref={onChg}>{ok ? null : <option value="">Removed item</option>}<TxOpts k={TK} dir={r.dir} /></select><select className="in" data-ruleshift={r.id} aria-label="Month it counts in" defaultValue={r.shift || ''} ref={onChg}><option value="">Month paid</option><option value="next">Last 5 days → next month</option><option value="prev">First 5 days → month before</option></select><input className="in a" data-rulemin={r.id} inputMode="decimal" defaultValue={r.min != null ? r.min : ''} placeholder="any" aria-label="Lowest amount" ref={onChg} /><input className="in a" data-rulemax={r.id} inputMode="decimal" defaultValue={r.max != null ? r.max : ''} placeholder="any" aria-label="Highest amount" ref={onChg} /><button className="x" data-act="ruleDel" onClick={onAct('ruleDel')} data-id={r.id} aria-label="Delete rule">×</button><small>{r.dir === 'in' ? 'Money in' : 'Money out'} · {n} match{n === 1 ? '' : 'es'} since {dshort(bankFrom())}{r.x ? ' · leaves out ' + tx(r.x.map(titleC).join(', ')) : ''}{ok ? '' : <> · <b style={{ color: '#ff9aa8' }}>its category was removed; pick a new one</b></>}</small>{' '}
      {fl.length ? <details className="more rmx" data-key={'rm-' + r.id} open={OPEN.has('rm-' + r.id)}><summary>{fl.length} transaction{fl.length === 1 ? '' : 's'} filed by this rule</summary>{fl.slice(0, 60).map(([id, x]) => <div className="rmr" key={id}><span className="txd">{dshort(x.d)}</span><span className="nm">{tx(x.n)}{x.d && x.d.slice(0, 7) !== x.k ? <> <small>counts in {mon(x.k)}</small></> : null}</span><b className="n">{x.amt < 0 ? '+' : ''}{f2(Math.abs(+x.amt || 0))}</b><button className="lnk" data-act="txUndo" onClick={onAct('txUndo')} data-id={tx(id)} title="Send back to Bank → To review">Undo</button></div>)}{fl.length > 60 ? <p className="dim" style={{ fontSize: '13px', paddingTop: '6px' }}>and {fl.length - 60} older</p> : null}</details> : null}</div>;
  };
  const groups = Object.entries(by).map(([l, rs]) => {
    const gm = !q || tx(l.toLowerCase()).includes(q), shown = rs.map(r => gm || tx((r.p + ' ' + (r.x || []).join(' ')).toLowerCase()).includes(q)), n = shown.filter(Boolean).length;
    any += n;
    return <div className="rgrp" key={l} data-txt={tx(l.toLowerCase())} hidden={!n}><div className="rgh">{tx(l)} <span className="bn">{rs.length}</span></div>{rs.map((r, i) => one(r, shown[i]))}</div>;
  });
  return <section className="card" id="sec-rules"><div className="bh"><div><h2>Rules ({R.length})</h2><p>Transactions whose name contains the text are filed to the category. Change the text, category or amount range and what the rule filed is re-filed. Leave amounts blank for any amount. <b>Undo</b> on a filed transaction sends it back to Bank → To review and the rule leaves it alone after that.</p></div><input className="in" id="rulesq" data-key="rulesq" defaultValue={tx(RQ)} placeholder="Search rules or categories" autoComplete="off" style={{ maxWidth: '240px' }} aria-label="Search rules" /></div>{' '}
    <div className="rrow rhd"><span>Name contains</span><span>Files to</span><span>Counts in</span><span>From $</span><span>To $</span><span></span></div>{' '}
    {groups}<p className="dim" id="rulesnone" hidden={!!any} style={{ padding: '12px 0' }}>{`No rules match “${RQ}”.`}</p></section>;
}

function HealthCard() {
  const H = healthChecks(), n = { ok: 0, warn: 0, bad: 0 }; H.forEach(h => n[h.lv]++);
  const ic = { ok: '✓', warn: '!', bad: '×' }, rank = { bad: 0, warn: 1, ok: 2 };
  return <section className="card hc" style={card16}><div className="bh"><div><h2>Health check</h2><p>{n.bad + n.warn ? `${n.bad + n.warn} thing${n.bad + n.warn === 1 ? '' : 's'} to look at · ${n.ok} passed` : `All ${n.ok} checks passed`}. These run every time you open this page.</p></div>{DEMO ? null : <div className="phact"><a className="btn g sm" href="?demo" target="_blank" rel="noopener">Try sample data</a><a className="btn g sm" href="?selftest" target="_blank" rel="noopener">Run self-test</a></div>}</div>{' '}
    <div className="hcl">{H.sort((a, b) => rank[a.lv] - rank[b.lv]).map((h, i) => <div className={'hci ' + h.lv} key={i}><i>{ic[h.lv]}</i><div><b>{tx(h.t)}</b><p><Rich d={h.d} /></p>{h.a ? <div className="hca">{h.a.map((b, j) => <Fragment key={j}>{j ? ' ' : null}<ActBtn b={b} /></Fragment>)}</div> : null}</div></div>)}</div></section>;
}

// Settings → Data & math: each total the app shows, broken into the numbers it adds up, plus what's stored.
// Table cells get data-l = the last header row's label (so phones can stack them), as the old tr() did.
function DataView() {
  const k = S.cur, T = totals(k), live = k >= TK, lm = mon(k), spentA = T.fixedA + T.flexA + T.loansA + T.saveA, planOut = T.fixed + T.flexP + T.loans + T.save, so = soFarOf(k, T);
  let HL = [];
  const tr = (c, cls) => { if (cls === 'th') HL = c; const L = HL; return <tr className={cls || undefined}>{c.map((x, i) => cls === 'th' ? <th key={i}>{x}</th> : <td key={i} data-l={tx(String(L[i] || '').replace(/^[−+=] /, ''))}>{x}</td>)}</tr>; };
  const tb = (rows, cls) => <div className="dmw"><table className={'dmt' + (cls ? ' ' + cls : '')}><tbody>{rows.map((r, i) => <Fragment key={i}>{r}</Fragment>)}</tbody></table></div>, how = t => <small>{t}</small>;
  const out = [<HealthCard key="hc" />];
  out.push(<section key="bm" className="card" style={card16}><h2>Budget math · {tx(lab(k))}</h2><p className="mut" style={note14}>The Budget tab’s numbers for {lm}, line by line (change months with the arrows at the top). Actual uses what the bank shows; anything with nothing filed yet counts at its planned amount.</p>{' '}
    {tb([tr(['', 'Planned', 'Actual'], 'th'),
      tr([<>Income{how(`Deposits linked to each income line (${T.incN} of ${plan(k).income.filter(i => !i.once).length} arrived)${live ? '; this month a line counts at least its planned amount' : ''}; the planned amount until one arrives`)}</>, f2(T.inc), f2(T.incA)]),
      tr([<>− Fixed bills{how(`Paid amount for ${T.fixedN} bill${T.fixedN === 1 ? '' : 's'} found in the bank; planned amount for the rest`)}</>, f2(T.fixed), f2(T.fixedA)]),
      tr([<>− Groceries &amp; flex{how(`Spending filed to ${T.flexN} of ${T.flexItems} categories; planned amount for categories with nothing filed`)}</>, f2(T.flexP), f2(T.flexA)]),
      tr([<>− Loan payments{how('Plan: each loan’s minimum plus any planned extra. Actual: the payment on its balance path (from the lender or the bank; otherwise the plan)')}</>, f2(T.loans), f2(T.loansA)]),
      tr([<>− Savings goals{how('Plan: each goal’s monthly amount. Actual: set aside by hand plus the change in linked accounts')}</>, f2(T.save), f2(T.saveA)]),
      tr(['= Total out', f2(planOut), f2(spentA)], 'sub'),
      tr([<>{live ? 'Left over (projected)' : 'Left over'}{how('Income minus total out')}</>, f2(T.left), f2(T.incA - spentA)], 'tot')], 'bm')}{' '}
    {live ? <p className="dim" style={{ fontSize: '13.5px', marginTop: '10px' }}><b style={{ color: 'var(--text)' }}>Gone out so far {f2(so)}</b> = bills paid + spending filed + loan payments logged + savings. {f2(Math.max(0, spentA - so))} is still planned this month.</p> : null}</section>);

  const L = S.loans, oweAt = l => k === TK ? debtNow(l) : balEnd(l, k);
  if (L.length) {
    const LH = ['Loan', 'Opening', '+ Interest', '− Payment', '= Closing', k === TK ? 'Owed today' : 'Owed after ' + lm]; HL = LH;
    const head = tr(LH, 'th');
    const rs = L.map(l => {
      const r = k < l.start ? null : row(l, k), src = l.acct && l.live ? 'Lender balance' + (l.live.at ? ' (' + dshort(l.live.at) + ')' : '') : 'Worked out from the starting balance, interest and payments';
      return tr([<><b>{tx(l.name)}</b><small>{(+l.apr || 0).toFixed(2)}% · min {f0(l.min)} · payments from {bankSrc(l) ? 'the bank' : 'the lender'}{loanGone(l, k) ? ' · paid off' : ''}</small></>, r ? f2(r.open) : '—', r ? f2(r.int) : '—', r ? f2(r.pay) : '—', r ? f2(r.close) : '—', <>{f2(oweAt(l))}{k === TK ? <small>{src}</small> : null}</>]);
    });
    const sum = f => L.reduce((a, l) => { const r = k < l.start ? null : row(l, k); return a + (r ? r[f] : 0); }, 0);
    out.push(<section key="lm" className="card" style={card16}><h2>Loan math · {tx(lab(k))}</h2><p className="mut" style={note14}>Each month: opening balance + interest (balance × rate ÷ 12) − payment = closing balance. When a lender is linked, its reported balance replaces the worked-out one, and the payment is what it takes to get there.</p>{' '}
      {tb([head, ...rs, tr(['Total', f2(sum('open')), f2(sum('int')), f2(sum('pay')), f2(sum('close')), f2(L.reduce((a, l) => a + oweAt(l), 0))], 'tot')], 'num')}{' '}
      <p className="dim" style={{ fontSize: '13px', marginTop: '10px' }}>Interest saved by {lm}: {f2(L.reduce((a, l) => a + savedL(l, k), 0))} = lifetime interest on the minimum-only path − lifetime interest if the extra paid (or planned) through {lm} is made and only minimums after. Extra paid above minimums through {lm}: {f2(L.reduce((a, l) => a + extraPaid(l, k), 0))}.</p></section>);
  }

  if (S.goals.length) {
    const G = S.goals;
    out.push(<section key="gm" className="card" style={card16}><h2>Goal math · {tx(lab(k))}</h2><p className="mut" style={note14}>Saved = set aside by hand (starting amount + monthly deposits) + your share of linked accounts.</p>{' '}
      {tb([tr(['Goal', 'By hand', '+ Linked accounts', '= Saved', 'Target', 'In ' + lm.slice(0, 3) + ' (plan / actual)'], 'th'), ...G.map(g => tr([<b>{tx(g.name)}</b>, f2(manualSaved(g, k)), f2(linkedSaved(g, k)), f2(goalSaved(g, k)), g.target ? f2(+g.target) : '—', `${f0(goalPlan(g, k))} / ${f0(savedIn(g, k))}`])),
        tr(['Total', f2(G.reduce((a, g) => a + manualSaved(g, k), 0)), f2(G.reduce((a, g) => a + linkedSaved(g, k), 0)), f2(G.reduce((a, g) => a + goalSaved(g, k), 0)), '', `${f0(T.save)} / ${f0(T.saveA)}`], 'tot')], 'num')}{' '}
      <h3 style={{ margin: '18px 0 4px' }}>Saved in {tx(lm)}, line by line</h3><p className="mut" style={note14}>Where each goal's “actual” above comes from. This is the saving the Budget counts this month.</p>
      {G.map(g => { const W = savedWork(g, k); return W.length ? <div className="gwk" key={g.id}><div className="gwh"><b>{tx(g.name)}</b><b>{f2(savedIn(g, k))}</b></div>
        {W.map((w, i) => <div className="gwr" key={i}><div className="gwl"><span>{tx(w.t)}</span><b>{f2(w.amt)}</b></div>{w.note ? <small className="dim">{tx(w.note)}</small> : null}
          {(w.sub || []).map((x, j) => <div className={'gws' + (x.on ? ' on' : '')} key={j}><span>{x.d}</span><span>{f2(x.amt)}</span><span>{tx(x.why)}</span></div>)}</div>)}</div> : null; })}</section>);
  }

  if (SRV && BK.accts) {
    const cash = acctsOf('depository'), inv = acctsOf('investment'), cards = acctsOf('credit'), loanT = L.reduce((x, l) => x + debtNow(l), 0), cT = sumBal(cash), iT = sumBal(inv), kT = sumBal(cards);
    out.push(<section key="nw" className="card" style={card16}><h2>Net worth math · today</h2><p className="mut" style={note14}>The Wealth tab’s total, from the latest balances your banks reported.</p>{' '}
      {tb([tr(['Cash', `${cash.length} account${cash.length === 1 ? '' : 's'}`, f2(cT)]), tr(['+ Investments', `${inv.length} account${inv.length === 1 ? '' : 's'}`, f2(iT)]), tr(['− Credit cards', `${cards.length} card${cards.length === 1 ? '' : 's'}`, f2(kT)]), tr(['− Loans', `${L.length} loan${L.length === 1 ? '' : 's'}: lender balance when linked, otherwise this month’s opening balance`, f2(loanT)]), tr(['= Net worth', '', f2(cT + iT - kT - loanT)], 'tot')], 'nw')}</section>);
  }

  const T2 = BK.tx || [], pend = T2.filter(t => t.pending).length, txd = S.txd || {}, TV = Object.values(txd), pv = Object.keys(S.plans || {}).sort(), ms = Object.keys(S.months || {}).sort(), items = (BK.st && BK.st.items) || [], dr = T2.length ? `${dshort(T2[T2.length - 1].date)} – ${dshort(T2[0].date)}` : 'none';
  out.push(<section key="yd" className="card"><h2>Your data</h2><p className="mut" style={note14}>{SRV ? 'The budget is one file on your server that everyone in the household shares. Bank data is kept beside it and only goes between the server and Plaid.' : 'The budget is saved in this browser.'}</p>{' '}
    {tb([tr(['Budget versions', `${pv.length}`, how(pv.map(x => 'from ' + labS(x)).join(' · '))]), tr(['Months with activity', `${ms.length}`, how(ms.length ? labS(ms[0]) + ' – ' + labS(ms[ms.length - 1]) : '')]), tr(['Rules', `${(S.rules || []).length}`, '']), tr(['Filed transactions', `${TV.length}`, how(`${TV.filter(r => r.auto).length} automatically (rules and matched transfers),${TV.filter(r => !r.auto).length} by hand`)]), tr(['Loans · goals', `${L.length} · ${S.goals.length}`, '']),
      ...(SRV ? [tr(['Bank transactions', `${T2.length}`, how(`since ${dshort(bankFrom())} · ${dr}${pend ? ' · ' + pend + ' pending' : ''}`)]), tr(['Bank connections', `${items.length}`, how(items.map(it => tx(it.institution.name) + (it.lastSync ? ' (' + whenS(it.lastSync) + ')' : '')).join(' · '))])] : []),
      ...(FS.last ? [tr(['Last saved', whenS(FS.last), ''])] : [])], 'kv')}{' '}
    <div className="adds" style={{ marginTop: '14px' }}><button className="btn g sm" data-act="export" onClick={onAct('export')}>Download budget (JSON)</button>{SRV ? <button className="btn g sm" data-act="abCopy" onClick={onAct('abCopy')} title="Everything in one file, bank tokens taken out">Download a copy for troubleshooting</button> : null}{SRV && T2.length ? <button className="btn g sm" data-act="csvTx" onClick={onAct('csvTx')}>Download transactions (CSV)</button> : null}</div>{' '}
    <details className="more" id="rawd" style={{ marginTop: '14px' }}><summary>Show raw budget data</summary><pre className="raw" id="rawpre"></pre></details></section>);
  return out;
}

// Import from a CSV file (was csvCard). CV is the import in progress; data-cv / data-cvt have their own listeners.
export function CsvCard() {
  if (!SRV) return null;
  const A = cvAccts(), O = ({ v, l }) => <option value={tx(v)}>{tx(l)}</option>, cols = () => (CV.head || []).map((h, i) => <O key={i} v={i} l={h} />);
  const head = <><h2>Import from a CSV file</h2><p className="mut" style={note14}>For accounts you can’t or don’t want to connect: download transactions as a CSV file from the bank’s website and import it here. Import again any time; rows already imported are skipped.</p>{A.length ? <div className="bkl" style={{ margin: '0 0 12px' }}>{A.map(a => <div className="bkr" key={a.id}><span><b>{tx(a.name)}</b> <span className="dim">· {tx(a.subtype)}{a.bal != null ? ' · balance ' + f2(a.bal) : ''}</span></span><button className="x" data-act="cvDel" onClick={onAct('cvDel')} data-id={tx(a.id)} aria-label={`Remove ${tx(a.name)}`}>×</button></div>)}</div> : null}</>;
  if (!CV.open) return <section className="card cvc" id="cvcard" style={{ marginTop: '16px' }}>{head}<label className="btn sm cvpick">Choose a CSV file…<input type="file" id="cvFile" accept=".csv,.txt,text/csv" hidden /></label></section>;
  const { rows, bad, zero } = cvRows(), Sel = ({ k, label, cur, children }) => <label className="f"><span>{label}</span><select className="in" data-cv={k} defaultValue={String(cur)}>{children}</select></label>;
  return <section className="card cvc" id="cvcard" style={{ marginTop: '16px' }}>{head}<p style={{ fontSize: '14px', marginBottom: '10px' }}><b>{tx(CV.name)}</b> · {(CV.body || []).length} rows</p><div className="cvg">
    <Sel k="dc" label="Date column" cur={CV.dc}>{cols()}</Sel><Sel k="df" label="Date format" cur={CV.df}><O v="mdy" l="Month/day/year" /><O v="dmy" l="Day/month/year" /><O v="ymd" l="Year-month-day" /></Sel><Sel k="nc" label="Description column" cur={CV.nc}>{cols()}</Sel>
    <Sel k="two" label="Amounts are in" cur={CV.two}><O v="" l="One column" /><O v="1" l="Two columns (out and in)" /></Sel>
    {CV.two ? <><Sel k="oc" label="Money out column" cur={CV.oc}>{cols()}</Sel><Sel k="ic" label="Money in column" cur={CV.ic}>{cols()}</Sel></> : <><Sel k="ac" label="Amount column" cur={CV.ac}>{cols()}</Sel><Sel k="sign" label="Money going out is" cur={CV.sign}><O v="neg" l="Negative (−12.50)" /><O v="pos" l="Positive (12.50)" /></Sel></>}
    <Sel k="acct" label="Into account" cur={CV.acct}>{A.map(a => <O key={a.id} v={a.id} l={a.name} />)}<O v="new" l="New account…" /></Sel>
    {CV.acct === 'new' ? <><label className="f"><span>New account name</span><input className="in" data-cvt="nname" data-key="cv-nname" defaultValue={tx(CV.nname)} placeholder="e.g. Credit union checking" autoComplete="off" /></label><Sel k="ntype" label="Type" cur={CV.ntype}><O v="checking" l="Checking" /><O v="savings" l="Savings" /><O v="credit" l="Credit card" /><O v="loan" l="Loan" /></Sel></> : null}
    <label className="f"><span>Balance now (optional)</span><input className="in" inputMode="decimal" data-cvt="bal" data-key="cv-bal" defaultValue={tx(CV.bal)} placeholder={CV.ntype === 'credit' || CV.ntype === 'loan' ? 'amount owed' : '$0.00'} autoComplete="off" /></label></div>
    <div className="dmw" style={{ marginTop: '12px' }}><table className="dmt cvt"><tbody><tr><th>Date</th><th>Description</th><th>Out</th><th>In</th></tr>{rows.slice(0, 8).map((r, i) => <tr key={i}><td>{tx(r.date)}</td><td>{tx(r.name)}</td><td>{r.amount > 0 ? f2(r.amount) : ''}</td><td>{r.amount < 0 ? f2(-r.amount) : ''}</td></tr>)}</tbody></table></div>{' '}
    <p className="mut" style={{ fontSize: '13.5px', marginTop: '8px' }}>{rows.length} row{rows.length === 1 ? '' : 's'} ready{bad ? <> · <span style={{ color: 'var(--red)' }}>{bad} can’t be read with these choices</span></> : ''}{zero ? ` · ${zero} for $0 skipped` : ''}. Check the preview: purchases should be under <b>Out</b>. Only transactions from {tx(bankFrom())} on are filed into the budget.</p>{' '}
    <div className="adds" style={{ marginTop: '12px' }}><button className="btn sm" data-act="cvImport" onClick={onAct('cvImport')} disabled={!(rows.length && (CV.acct !== 'new' || CV.nname.trim()))}>Import {rows.length} transaction{rows.length === 1 ? '' : 's'}</button><button className="btn g sm" data-act="cvCancel" onClick={onAct('cvCancel')}>Cancel</button></div></section>;
}

// Phone alerts (was ntCard; hidden in sample mode). demo is a prop so the parity check can draw it.
export function NtCard({ demo = DEMO }) {
  if (!SRV || demo) return null;
  return <section className="card" style={{ marginTop: '16px' }}><h2>Phone alerts</h2><p className="mut" style={note14}>{!NOTIFY ? 'Checking…' : NOTIFY.configured ? `On: alerts go to ${tx(NOTIFY.target || 'your notification service')}. Bills due or missing, spending over plan, transactions to sort and bank connections that need you, each sent once.` : <>Off. To get alerts on your phone, set <b>NOTIFY_URL</b> in the server’s .env to an ntfy topic or a Home Assistant webhook, then restart it.</>}</p>{NOTIFY && NOTIFY.configured ? <button className="btn g sm" data-act="ntTest" onClick={onAct('ntTest')}>Send a test alert</button> : null}</section>;
}

export function Settings() {
  const v = ['general', 'rules', 'connections', 'data'].includes(SV) ? SV : 'general', R = S.rules || [], st = BK.st, items = (st && st.items) || [], bad = items.filter(it => it.error).length;
  const nb = (k, l, n, hot) => <button key={k} className={v === k ? 'on' : ''} data-act="sview" onClick={onAct('sview')} data-v={k}>{l}{n != null ? <> <span className={hot ? 'bn hot' : 'bn'}>{n}</span></> : null}</button>;
  let body;
  if (v === 'general') body = <>
    <section className="card" style={card16}><h2>Household</h2><p className="mut" style={note14}>Shown at the top left and in the browser tab, for both of you.</p><div className="fields"><label className="f">Name<input className="in" data-c="hh" data-f="name" data-key="hh-name" defaultValue={tx(hhName())} placeholder="Budgeteer" autoComplete="off" ref={onChg} /></label><label className="f">Subtitle<input className="in" data-c="hh" data-f="sub" data-key="hh-sub" defaultValue={tx(hhSub())} placeholder="Household budget" autoComplete="off" ref={onChg} /></label></div></section>
    <section className="card" style={card16}><h2>Budget</h2><p className="mut" style={note14}>Income, bills and spending categories are set up in <button className="lnk" data-act="budv" onClick={onAct('budv')} data-v="build" style={{ padding: 0, fontSize: 'inherit' }}>Build budget</button>.</p>{SRV ? <><label className="f" style={{ maxWidth: '260px' }}>Budget and bank filing start<input className="in" type="date" data-c="bankfrom" defaultValue={`${bankFrom()}`} ref={onChg} /></label><div style={{ marginTop: '14px' }}><CatchSel /></div></> : null}</section>
    <section className="card"><h2>Backups</h2><p className="mut" style={note14}>{SRV ? 'The server saves a copy every day. You can also download one to keep yourself.' : 'Download a copy of your budget to keep it safe.'}</p><div className="adds"><button className="btn g sm" data-act="export" onClick={onAct('export')}>Download backup</button><button className="btn g sm" data-act="import" onClick={onAct('import')}>Restore from a file</button>{SRV ? <button className="btn g sm" data-act="bkList" onClick={onAct('bkList')}>{Array.isArray(BKP) ? 'Refresh the list' : 'Restore a daily copy'}</button> : null}</div><BkCard /></section><AboutCard /></>;
  else if (v === 'data') body = <DataView />;
  else if (!SRV) body = <section className="card"><p>Bank sync runs on the server, which can’t be reached right now. It reconnects on its own.</p></section>;
  else if (v === 'rules') body = <><FilingCard />{R.length ? <RulesCard /> : <section className="card"><h2>Rules</h2><p className="mut" style={{ marginTop: '6px' }}>No rules yet. Make one with <b>Link payment</b>, <b>Flag a deposit</b> or <b>Link stores</b> in Build budget, or tick <b>Always</b> when you add a transaction in Bank → To review.</p></section>}</>;
  else if (!st && !BK.err) body = <SkelCards n={2} hero={false} />;   // still loading
  else if (!st || !st.configured) body = <><section className="card"><p className="mut">{BK.err || 'To connect banks, add your Plaid keys to the server’s .env and restart it. Or import a CSV file below.'}</p></section><CsvCard /></>;
  else body = <><ConnCard items={items} /><CsvCard /><NtCard /></>;
  return <>
    <div className="phead" style={{ '--i': 0 }}><div><h1>Settings</h1><p className="mut">Your household, how bank transactions are filed, your bank connections, and how every number is worked out.</p></div></div><div className="seg bnav" role="tablist" aria-label="Settings sections">{nb('general', 'General')}{nb('rules', 'Rules', SRV ? R.length : null)}{nb('connections', 'Connections', bad || null, bad > 0)}{nb('data', 'Data & math', null)}</div>
    {body}
  </>;
}
