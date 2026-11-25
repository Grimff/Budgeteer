// server-sync: the code of what was app/public/js/server-sync.js (unchanged but for imports, `export`, the shared state's setters and
// startServerSync(), which holds what used to run as the file loaded).
// Shared state (other files change it with the set… functions; it was js/server-sync.js):
import { fsUI } from '../named.jsx';
import { autoSave, bankLoad } from './bank.js';
import { KEY, S, setS, HADL } from './core.js';
import { renderAll, rerender } from './events.js';
import { openSync } from './linked-loans.js';
import { setLP, toast } from './math.js';
export let SRV=false; export function setSRV(v){return SRV=v}
/* ---------- budget on the server ---------- */
// The budget lives on the server (server.js, GET/PUT api/data). This browser keeps a copy in localStorage (KEY), so
// edits made while the server can't be reached aren't lost: PEND marks unsaved edits, REVK the server revision that
// copy matches. On load, unsaved edits are pushed only if the server is still at REVK; otherwise its copy wins.
export const FS={state:'wait',h:null,mod:0,dirty:false,t:null,busy:false,last:null,err:'',detail:'',loaded:false,initing:false};

export async function srvGet(){const r=await fetch('api/data',{cache:'no-store'});if(r.status===404){FS.mod=0;return null}if(!r.ok)throw new Error('HTTP '+r.status);const j=await r.json();FS.mod=j.rev||0;const d=j.data;if(!d||!d.plans||!d.loans)throw new Error('notbudget');return d}
export async function srvRev(){const r=await fetch('api/rev',{cache:'no-store'});if(!r.ok)throw new Error('HTTP '+r.status);return (await r.json()).rev||0}
// FS.sent = the shared data as the server has it: a save that changed only this browser's things (the tab, the month)
// sends nothing, rather than the whole budget and a new revision every other browser then downloads.
export async function srvPut(){const sd=JSON.stringify(sharedData());if(sd===FS.sent){FS.dirty=false;try{localStorage.removeItem(PEND)}catch(_){}return}const body='{"baseRev":'+JSON.stringify(FS.mod||null)+',"data":'+sd+'}';const r=await fetch('api/data',{method:'PUT',headers:{'Content-Type':'application/json'},body});if(r.status===409){const e=new Error('changed');e.name='Conflict';throw e}if(!r.ok)throw new Error('HTTP '+r.status);const j=await r.json();FS.mod=j.rev;FS.dirty=false;FS.sent=sd;FS.last=new Date();try{localStorage.removeItem(PEND);localStorage.setItem(REVK,String(j.rev))}catch(_){}}
export let PEND,REVK;   // set by startServerSync (they use core's KEY)
export const sharedData=()=>{const{cur,tab,flow,storeMap,...d}=S;d.loans=(d.loans||[]).map(({real,rp,live,link,auto,...l})=>l);return d};
export function adopt(d){setS({...d,months:d.months||{},cur:S.cur,tab:S.tab,flow:S.flow});setLP({});FS.sent=JSON.stringify(sharedData());try{localStorage.setItem(KEY,JSON.stringify(S));if(SRV)localStorage.setItem(REVK,String(FS.mod||0))}catch(_){}}
export function setFS(st,err){const w=FS.state==='wait';FS.state=st;if(err!==undefined)FS.err=err;if(st==='ok')FS.detail='';fsUI();if(w&&st!=='wait'&&!HADL)rerender()}   // the placeholders give way
export function fsErrMsg(e){FS.detail=e?`${e.name||'Error'}: ${e.message||e}`:'';try{console.error('[Budgeteer sync]',e)}catch(_){}return e&&e.message==='notbudget'?'The server sent something that isn’t budget data.':'Couldn’t reach the budget server.'}
export async function fsLoad(){let pend=false,base=0;try{pend=localStorage.getItem(PEND)==='1';base=+localStorage.getItem(REVK)||0}catch(_){}
 const d=await srvGet();FS.loaded=true;if(!d){await srvPut();setFS('ok','');return}
 if(pend){if(base&&base===FS.mod){setFS('ok','');FS.dirty=true;return fsFlush()}try{localStorage.removeItem(PEND)}catch(_){}}
 adopt(d);rerender();setFS('ok','')}
// A save while the server copy is still loading ('wait') doesn't mark PEND; while the server is unreachable it does.
export function fsQueue(){if(FS.state!=='ok'){if(FS.state!=='wait')try{localStorage.setItem(PEND,'1')}catch(_){}fsUI();return}FS.dirty=true;fsUI();clearTimeout(FS.t);FS.t=setTimeout(()=>fsFlush(),700)}
export async function fsFlush(force){if(!SRV||!FS.loaded||FS.busy)return;if(force&&FS.state==='err'){FS.state='ok';FS.dirty=true}if(FS.state!=='ok'||!FS.dirty)return fsUI();FS.busy=true;
 try{await srvPut();FS.err='';FS.busy=false;fsUI()}
 catch(e){if(e&&e.name==='Conflict'){const quiet=FS.autoOnly;FS.autoOnly=false;try{const d=await srvGet();if(d){adopt(d);FS.dirty=false;FS.busy=false;try{localStorage.removeItem(PEND)}catch(_){}autoSave();rerender();if(!quiet)toast('Someone else saved a change at the same moment. Their version is showing; redo your last edit if it’s missing.')}}catch(_){}FS.busy=false;fsUI();return}
  try{localStorage.setItem(PEND,'1')}catch(_){}setFS('err',fsErrMsg(e))}FS.busy=false}
// Every 10 seconds (and when the page comes back into view): reconnect if needed, retry a failed save, or pick up
// changes saved from another browser.
export async function fsPoll(){if(document.hidden||FS.busy)return;if(!SRV||!FS.loaded)return fsInit();if(FS.state==='err')return fsFlush(true);if(FS.state!=='ok')return;
 try{const rev=await srvRev();if(rev>FS.mod+1){if(FS.dirty)return fsFlush();FS.busy=true;const d=await srvGet();FS.busy=false;if(d){adopt(d);autoSave();rerender();toast('Updated with the latest changes from the server')}}FS.pf=0;if(FS.err){FS.err='';fsUI()}}
 catch(e){FS.busy=false;FS.pf=(FS.pf||0)+1;if(FS.pf>=3)setFS('err',fsErrMsg(e))}}
// Bank data loads after the budget, because which transactions to fetch depends on the budget's start date.
export async function fsInit(){if(FS.initing)return;FS.initing=true;let first=false;
 try{const r=await fetch('api/health',{cache:'no-store'});if(!r.ok||(await r.json()).app!=='budgeteer')throw new Error('HTTP '+r.status);
  if(!SRV){SRV=true;FS.h={name:'the server'};first=true;rerender()}
  await fsLoad()}
 catch(e){setFS('err',fsErrMsg(e))}finally{FS.initing=false}
 if(first){bankLoad();openSync()}}

// What this file did as it loaded (listeners, settings read from localStorage, …): main.jsx runs it in the old
// load order, after every module is defined.
export function startServerSync() {
PEND=KEY+'_unsynced';REVK=KEY+'_rev';
setInterval(fsPoll,10000);
addEventListener('focus',fsPoll);
document.addEventListener('visibilitychange',()=>{if(!document.hidden){fsPoll();openSync()}});
addEventListener('beforeunload',e=>{if(FS.dirty&&FS.state==='ok'){fsFlush();e.preventDefault();e.returnValue=''}});
setLP({});
renderAll(true);
try{localStorage.setItem(KEY,JSON.stringify(S))}catch(_){}
fsUI();
fsInit();
}
