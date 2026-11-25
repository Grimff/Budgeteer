// events: the code of what was app/public/js/events.js (unchanged but for imports, `export`, the shared state's setters and
// startEvents(), which holds what used to run as the file loaded).
// Shared state (other files change it with the set… functions; it was js/events.js):
import { brandSet, drawTab, frameUI } from '../named.jsx';
import { autoFile, setTXI } from './bank.js';
import { INB, setINB } from './build.js';
import { $$, RM, S, save, $ } from './core.js';
import { K, SKD, setSKD, skClose, skOpen } from './flow.js';
import { setALC } from './goal-accounts.js';
import { loanSync } from './linked-loans.js';
import { OPEN, setGP, setLP, setXS } from './math.js';
import { SRV } from './server-sync.js';
import { hcSoon } from './settings.js';
export let inT; export function setinT(v){return inT=v}
export let RESTORING=false; export function setRESTORING(v){return RESTORING=v}
/* ---------- render all ---------- */
export function renderAll(enter){setLP({});setGP({});setXS(null);setTXI(null);setALC({});loanSync();frameUI();
 // Only the visible tab is drawn; the others are redrawn when switched to (every tab switch goes through commit → renderAll).
 // Shown before it's drawn, so charts that size themselves to the tab (History) measure its real width.
   drawTab();brandSet();
 if(enter){const t=$('#T-'+S.tab);void t.offsetWidth;t.classList.add('enter')}moveInd();fmtAll();hcSoon()}
export function moveInd(){const b=$(`.tabs [data-t="${S.tab}"]`),i=$('.ind');if(!b)return;i.style.width=b.offsetWidth+'px';i.style.transform=`translateX(${b.offsetLeft-i.offsetLeft}px)`;const T=b.parentElement;if(T.scrollWidth>T.clientWidth+2){const x=b.offsetLeft-(T.clientWidth-b.offsetWidth)/2;T.scrollTo({left:Math.max(0,x),behavior:RM?'auto':'smooth'})}}
export function commit(enter){if(INB&&SRV){setINB(false);if(autoFile()){setLP({})}}save();rerender(enter)}
export function rerender(enter){const a=document.activeElement,k=a&&a.dataset?a.dataset.key:null,raw=k?a.value:null,ss=k&&'selectionStart' in a?[a.selectionStart,a.selectionEnd]:null;
 renderAll(enter);
 if(k){const e=document.querySelector(`[data-key="${CSS.escape(k)}"]`);if(e){e.value=raw;RESTORING=true;try{e.focus({preventScroll:true})}finally{RESTORING=false}try{if(ss)e.setSelectionRange(ss[0],ss[1])}catch(_){}}}}
export function go(k){S.cur=k;commit(true)}

/* ---------- events ---------- */
// Clicking into an amount selects it so it's easy to replace. Not when a redraw puts the cursor back (RESTORING).

// Amounts get thousands separators as you type; num() ignores the commas when reading them.
export function fmtAmt(v){v=String(v).replace(/[^0-9.]/g,'');if(!v)return '';const i=v.indexOf('.');let a=i<0?v:v.slice(0,i);const b=i<0?'':'.'+v.slice(i+1).replace(/\./g,'');a=a.replace(/^0+(?=\d)/,'')||(b?'0':'');return a.replace(/\B(?=(\d{3})+(?!\d))/g,',')+b}
export const AMT='input.in[inputmode="decimal"]';
export function fmtAll(root=document){root.querySelectorAll(AMT).forEach(e=>{if(e.value)e.value=fmtAmt(e.value)})}
export function commitFocus(sel){commit();const e=$(sel);if(e){e.focus();e.select?.()}}

// What this file did as it loaded (listeners, settings read from localStorage, …): main.jsx runs it in the old
// load order, after every module is defined.
export function startEvents() {
// Clicks, typing and changes are handled by each element's own React handler (app/src/actions.js); what's left here is
// page-wide: folds, keyboard, amount formatting, and the money-flow chart's nodes and card.
   // the typing debounce (INP.k in actions.js)
// Phones: pop-ups are bottom sheets (app.css); pulling one down from the top of its content closes it. It closes through
// its own close button (tclose/lclose/fclose/dclose clear the pop-up's state too), or plain close() if it has none.
sheetSwipe();
document.addEventListener('toggle',e=>{const d=e.target;if(d.matches&&d.matches('details[data-key]')){d.open?OPEN.add(d.dataset.key):OPEN.delete(d.dataset.key)}},true);
document.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches('.clh')){e.preventDefault();e.target.click();return}if(e.key==='Enter'&&e.target.matches('.in')&&!e.target.closest('dialog')){e.preventDefault();const all=$$('.tab:not([hidden]) .in:not([disabled])'),i=all.indexOf(e.target);(all[i+1]||e.target).focus();all[i+1]?.select?.()}});
document.addEventListener('focusin',e=>{if(RESTORING)return;const el=e.target;if(el.matches('.in.a')&&!el.closest('dialog')){el._sel=true;setTimeout(()=>{if(el._sel)el.select?.();el._sel=false},0)}});
document.addEventListener('input',e=>{const t=e.target;t._sel=false;if(!t.matches||!t.matches(AMT))return;const v=t.value,pos=t.selectionStart??v.length;
 const keep=v.slice(0,pos).replace(/[^0-9.]/g,'').length,f=fmtAmt(v);if(f===v)return;t.value=f;
 let c=0,i=0;while(i<f.length&&c<keep){if(/[0-9.]/.test(f[i]))c++;i++}try{t.setSelectionRange(i,i)}catch(_){}},true);
document.addEventListener('click',e=>{const nd=e.target.closest('#sk .nd'),lk=nd?null:e.target.closest('#sk .lk');if((nd||lk)&&K){if(SKD){setSKD(false);return}const n=nd?K.all[+nd.dataset.n]:K.L[+lk.dataset.l].t;return skOpen(n,{l:e.clientX,r:e.clientX,y:e.clientY})}
 if(!e.skDone&&!e.target.closest('#skc')&&!e.target.closest('dialog')&&$('#skc:not([hidden])'))skClose();   // skDone: the React handler did this first
});
addEventListener('scroll',()=>$('#bar').classList.toggle('sc',scrollY>6),{passive:true});
addEventListener('resize',moveInd);
document.fonts&&document.fonts.ready.then(moveInd);
}
let SW=null;
export function sheetSwipe(){
 const end=()=>{if(!SW)return;const{d,dy,t}=SW;SW=null;const v=dy/Math.max(1,Date.now()-t);d.style.transition='transform .2s ease-out';
  if(dy>110||(dy>40&&v>.6)){d.style.transform='translateY(100%)';setTimeout(()=>{d.style.transition=d.style.transform='';const c=d.querySelector('[data-act$="close"]');if(d.open)c?c.click():d.close()},190)}
  else{d.style.transform='';setTimeout(()=>{d.style.transition=''},210)}};
 document.addEventListener('touchstart',e=>{const d=e.target.closest&&e.target.closest('dialog[open]');if(!d||innerWidth>760||e.touches.length>1||d.scrollTop>0||e.target.closest('input,select,textarea,.skw,[data-drag]'))return;SW={d,y0:e.touches[0].clientY,dy:0,t:Date.now(),on:false}},{passive:true});
 document.addEventListener('touchmove',e=>{if(!SW)return;const dy=e.touches[0].clientY-SW.y0;if(!SW.on){if(dy<-4||SW.d.scrollTop>0){SW=null;return}if(dy<8)return;SW.on=true;SW.y0+=8;SW.t=Date.now()}
  e.preventDefault();SW.dy=Math.max(0,dy-8);SW.d.style.transition='none';SW.d.style.transform=`translateY(${SW.dy}px)`},{passive:false});
 document.addEventListener('touchend',end,{passive:true});document.addEventListener('touchcancel',end,{passive:true});
}
