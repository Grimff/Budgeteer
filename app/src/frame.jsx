// The page frame (was the markup of index.html): header (brand, tabs, month), the tab sections, footer, the four
// dialogs' shells, toast. One root that stays mounted and re-renders when the store changes (useBudget, store.js), so
// its buttons keep focus; the tab
// contents and the dialogs' parts are drawn into their containers by their own roots (draw), which this root never
// touches: containers are rendered without children. Old code still writes some text and attributes straight into
// frame elements (dialog titles, #ddel.hidden, #lok.disabled, #mp.value, the header's scroll class): those elements
// get fixed contents and props here, which React sets once and never again.
// Replaces frameUI (renderAll's frame part), brandSet and bankBadge by name.
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { tx, onAct } from './bridge.js';
import { FRAME_ON } from './actions.js';
import { useBudget, useFrame, changed, frameChanged } from './store.js';
import { BK } from './lib/bank.js';
import { $$, S, TK, lab, $ } from './lib/core.js';
import { moveInd } from './lib/events.js';
import { inbox } from './lib/linked-loans.js';
import { SRV } from './lib/server-sync.js';
import { hhName, hhSub } from './lib/settings.js';

// The frame elements' own listeners (FRAME_ON), attached natively once per element.
const REFS = {};
const nat = id => REFS[id] || (REFS[id] = el => { if (el && !el._fon) { el._fon = true; for (const [ev, fn] of Object.entries(FRAME_ON[id])) el.addEventListener(ev, fn); } });

let BADGE = 0;   // the Bank tab's count, as bankBadge last set it (other tabs' redraws don't refresh it, as before)
const TABS = [['budget', 'Budget'], ['loans', 'Loans'], ['goals', 'Goals'], ['wealth', 'Wealth'], ['history', 'History']];
const GEAR = <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>;
const LOGO = <svg className="lgo" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><clipPath id="lgclip"><rect width="64" height="64" rx="18" /></clipPath></defs><g clipPath="url(#lgclip)"><path d="M32 32L13.459 -25.063A60 60 0 0 1 80.541 -3.267Z" fill="#ffb6d9" /><path d="M32 32L80.541 -3.267A60 60 0 0 1 80.541 67.267Z" fill="#ffe08a" /><path d="M32 32L80.541 67.267A60 60 0 0 1 13.459 89.063Z" fill="#d2f46b" /><path d="M32 32L13.459 89.063A60 60 0 0 1 -28 32Z" fill="#82ead8" /><path d="M32 32L-28 32A60 60 0 0 1 13.459 -25.063Z" fill="#c6b2ff" /></g><circle cx="32" cy="32" r="16.5" fill="#120b16" /><path d="M27.5 32H33a4.25 4.25 0 0 0 0-8.5H27.5V40.5H34a4.25 4.25 0 0 0 0-8.5H27.5" fill="none" stroke="#fff4fa" strokeWidth="4.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
const on = t => S.tab === t ? 'on' : undefined;

export function Frame() {
  useBudget(); useFrame();
  return <>
    <header className="bar" id="bar">
      <div className="brand" data-act="sview" data-v="general" title="Change the name in Settings" onClick={onAct('sview')}><span className="mark" aria-hidden="true">{LOGO}</span><span><b id="hhN">{tx(hhName())}</b><small id="hhS">{tx(hhSub())}</small></span></div>
      <nav className="tabs" aria-label="Sections"><span className="ind" aria-hidden="true"></span>{TABS.map(([t, l]) => <button key={t} data-act="tab" data-t={t} className={on(t)} onClick={onAct('tab')}>{l}</button>)}<button data-act="tab" data-t="bank" id="tbank" className={on('bank')} onClick={onAct('tab')}>Bank{BADGE ? <span className="tbn">{BADGE > 99 ? '99+' : BADGE}</span> : null}</button><button data-act="tab" data-t="settings" className={'tset' + (S.tab === 'settings' ? ' on' : '')} aria-label="Settings" title="Settings" onClick={onAct('tab')}>{GEAR}</button></nav>
      <div className="month"><button className="sp" id="spill" data-act="syncInfo" hidden onClick={onAct('syncInfo')}></button><button className="today" data-act="mtoday" id="tbtn" hidden={S.cur === TK} onClick={onAct('mtoday')}>This month</button><button data-act="mprev" aria-label="Previous month" onClick={onAct('mprev')}>‹</button><button className="ml" data-act="pick" id="mlab" aria-label="Choose month" onClick={onAct('pick')}>{lab(S.cur)}</button><button data-act="mnext" aria-label="Next month" onClick={onAct('mnext')}>›</button><input type="month" id="mp" tabIndex="-1" aria-hidden="true" ref={nat('mp')} /></div>
    </header>
    <main>
      <div id="sync" aria-live="polite"></div>
      {[...TABS.map(([t]) => t), 'bank', 'settings'].map(t => <section key={t} className="tab" data-tab={t} id={'T-' + t} hidden={S.tab !== t}></section>)}
    </main>
    <footer><span id="saved"></span><span><button className="lnk" data-act="export" onClick={onAct('export')}>Download backup</button>{' · '}<button className="lnk" data-act="import" onClick={onAct('import')}>Restore backup</button><input type="file" id="file" accept="application/json" hidden ref={nat('file')} /></span></footer>
    <dialog id="dlg"><form method="dialog" id="dform" ref={nat('dform')}><h3 id="dt"></h3><p className="sub" id="ds"></p><div id="dsel" ref={nat('dsel')}></div><div className="amt"><span>$</span><input className="in" id="da" inputMode="decimal" autoComplete="off" aria-label="Amount" ref={nat('da')} /></div><div className="chips" id="dc" ref={nat('dc')}></div><div className="prev" id="dp"></div><div className="dact"><button type="button" className="lnk" id="ddel" hidden ref={nat('ddel')}>Remove</button><button type="button" className="btn g" data-act="dclose" onClick={onAct('dclose')}>Cancel</button><button type="submit" className="btn" id="dok">Save</button></div></form></dialog>
    <dialog id="ldlg" ref={nat('ldlg')}><form method="dialog" id="lform" ref={nat('lform')}><h3 id="lt"></h3><p className="sub" id="ls"></p><input className="in" id="lq" placeholder="Search transactions" autoComplete="off" aria-label="Search transactions" ref={nat('lq')} /><div className="lpick" id="lpick" ref={nat('lpick')}></div><div id="lrule"></div><div className="dact" style={{ marginTop: '16px' }}><button type="button" className="lnk" id="ldel" hidden ref={nat('ldel')}>Remove link</button><button type="button" className="btn g" data-act="lclose" onClick={onAct('lclose')}>Cancel</button><button type="submit" className="btn" id="lok" disabled>Save</button></div></form></dialog>
    <dialog id="tdlg"><form method="dialog"><h3 id="tdt"></h3><p className="sub" id="tds"></p><div className="clinks" id="tdr"></div><div className="seg" id="tdrg" style={{ marginBottom: '8px' }}></div><input className="in" id="tdq" placeholder="Search store, name or account" autoComplete="off" aria-label="Search these transactions" style={{ marginBottom: '8px' }} ref={nat('tdq')} /><p className="dim" id="tdf" hidden style={{ fontSize: '13px', margin: '0 0 8px' }}></p><div className="tlist" id="tdl"></div><div className="dact"><button type="button" className="btn g" data-act="tclose" onClick={onAct('tclose')}>Close</button></div></form></dialog>
    <dialog id="fdlg"><form method="dialog"><h3 id="fdt"></h3><p className="sub" id="fds"></p><div id="fdb"></div></form></dialog>
    <div id="toast" role="status" aria-live="polite"></div>
  </>;
}

// Mounted once, when the bundle loads (main.jsx); after that it follows the store.
export function frameMount() { flushSync(() => createRoot($('#app')).render(<Frame />)); }
// renderAll's frame part: sets what React doesn't own (the month picker's value, the body's tab class, the tabs' entry
// animation class), then tells the store the page changed: the frame re-renders, then the visible tab (tabs.jsx), in
// that order, as frameUI ran before the tab was drawn.
export function frameUIR() { $('#mp').value = S.cur; document.body.className = 'tab-' + S.tab; $$('.tab').forEach(t => t.classList.remove('enter')); changed(); }
// The header alone (frameChanged): Bank calls bankBadge after drawing, so these must not redraw the tab.
export function brandSetR() { frameChanged(); document.title = (hhName() + ' ' + hhSub()).trim(); }
export function bankBadgeR() { BADGE = SRV && BK.st && BK.st.configured ? inbox().length : 0; frameChanged(); moveInd(); }
