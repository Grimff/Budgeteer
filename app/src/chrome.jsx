// The page frame's live bits: the count on the Bank tab (#tbank, was bankBadge) and the save status (was fsUI): the
// banner under the header (#sync), the header pill (#spill) and the footer line (#saved). demo: the sample household's
// wording (DEMO, a parameter so the parity check can compare both).
import { draw, tx, onAct } from './bridge.js';

export function bankBadgeR() {
  const b = $('#tbank'); if (!b) return; const n = SRV && BK.st && BK.st.configured ? inbox().length : 0;
  draw(b, <>Bank{n ? <span className="tbn">{n > 99 ? '99+' : n}</span> : null}</>); moveInd();
}

function Sync({ demo }) {
  return <>{demo ? <div className="sync warn"><i></i><div><b>Sample household</b><p>Made-up numbers to try things out. Nothing you change here is saved, and your real budget isn’t touched.</p></div><div className="sacts"><a className="btn g sm" href="./">Back to my budget</a></div></div> : null}
    {FS.state === 'err' ? <div className="sync bad"><i></i><div><b>Not saved to the server</b><p>{tx(FS.err)} Your changes are safe in this browser. The app keeps retrying every 10 seconds.{FS.detail ? <><br /><span className="dim" style={{ fontSize: '13px' }}>Details: {tx(FS.detail)}</span></> : null}</p></div><div className="sacts"><button className="btn sm" data-act="fsRetry" onClick={onAct('fsRetry')}>Try again</button></div></div> : null}</>;
}
export function fsUIR(demo = DEMO) {
  const b = $('#sync'), pill = $('#spill'), sv = $('#saved');
  draw(b, <Sync demo={demo} />);
  const st = FS.state === 'wait' ? ['', 'Connecting…'] : FS.state === 'ok' ? ['ok', FS.dirty || FS.busy ? 'Saving to the server…' : `Saved to the server${FS.last ? ' at ' + FS.last.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : ''}`] : ['bad', 'Not saved to the server. Saved in this browser only'];
  draw(sv, <><span className="dim">Version 1</span> · <i className={'sdot ' + st[0]}></i>{demo ? 'Sample data · nothing is saved' : st[1]}</>);
  pill.hidden = FS.state === 'wait'; pill.className = 'sp ' + st[0]; draw(pill, <><i className={'sdot ' + st[0]}></i>{FS.state === 'ok' ? (FS.dirty || FS.busy ? 'Saving…' : 'Synced') : 'Not synced'}</>);
}
