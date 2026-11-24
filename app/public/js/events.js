'use strict';
/* ---------- render all ---------- */
const TABR={budget:()=>renderBudget(),loans:()=>renderLoans(),goals:()=>renderGoals(),wealth:()=>renderWealth(),history:()=>renderHistory(),bank:()=>renderBank(),settings:()=>renderSettings()};
// The page frame for the viewed month and tab: month label and picker, This month button, the active tab, which section shows.
function frameUI(){$('#mlab').textContent=lab(S.cur);$('#mp').value=S.cur;$('#tbtn').hidden=S.cur===TK;
 $$('.tabs button').forEach(b=>b.classList.toggle('on',b.dataset.t===S.tab));document.body.className='tab-'+S.tab;$$('.tab').forEach(t=>{t.hidden=t.dataset.tab!==S.tab;t.classList.remove('enter')})}
function renderAll(enter){LP={};GP={};XS=null;TXI=null;ALC={};loanSync();frameUI();
 // Only the visible tab is drawn; the others are redrawn when switched to (every tab switch goes through commit → renderAll).
 // Shown before it's drawn, so charts that size themselves to the tab (History) measure its real width.
   (TABR[S.tab]||renderBudget)();brandSet();
 if(enter){const t=$('#T-'+S.tab);void t.offsetWidth;t.classList.add('enter')}moveInd();fmtAll()}
function moveInd(){const b=$(`.tabs [data-t="${S.tab}"]`),i=$('.ind');if(!b)return;i.style.width=b.offsetWidth+'px';i.style.transform=`translateX(${b.offsetLeft-i.offsetLeft}px)`;const T=b.parentElement;if(T.scrollWidth>T.clientWidth+2){const x=b.offsetLeft-(T.clientWidth-b.offsetWidth)/2;T.scrollTo({left:Math.max(0,x),behavior:RM?'auto':'smooth'})}}
function commit(enter){if(INB&&SRV){INB=false;if(autoFile()){LP={}}}save();rerender(enter)}
function rerender(enter){const a=document.activeElement,k=a&&a.dataset?a.dataset.key:null,raw=k?a.value:null,ss=k&&'selectionStart' in a?[a.selectionStart,a.selectionEnd]:null;
 renderAll(enter);
 if(k){const e=document.querySelector(`[data-key="${CSS.escape(k)}"]`);if(e){e.value=raw;RESTORING=true;try{e.focus({preventScroll:true})}finally{RESTORING=false}try{if(ss)e.setSelectionRange(ss[0],ss[1])}catch(_){}}}}
function go(k){S.cur=k;commit(true)}

/* ---------- events ---------- */
// Clicks, typing and changes are handled by each element's own React handler (app/src/actions.js); what's left here is
// page-wide: folds, keyboard, amount formatting, and the money-flow chart's nodes and card.
let inT;   // the typing debounce (INP.k in actions.js)
document.addEventListener('toggle',e=>{const d=e.target;if(d.matches&&d.matches('details[data-key]')){d.open?OPEN.add(d.dataset.key):OPEN.delete(d.dataset.key)}},true);
document.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches('.clh')){e.preventDefault();e.target.click();return}if(e.key==='Enter'&&e.target.matches('.in')&&!e.target.closest('dialog')){e.preventDefault();const all=$$('.tab:not([hidden]) .in:not([disabled])'),i=all.indexOf(e.target);(all[i+1]||e.target).focus();all[i+1]?.select?.()}});
// Clicking into an amount selects it so it's easy to replace. Not when a redraw puts the cursor back (RESTORING).
let RESTORING=false;
document.addEventListener('focusin',e=>{if(RESTORING)return;const el=e.target;if(el.matches('.in.a')&&!el.closest('dialog')){el._sel=true;setTimeout(()=>{if(el._sel)el.select?.();el._sel=false},0)}});
// Amounts get thousands separators as you type; num() ignores the commas when reading them.
function fmtAmt(v){v=String(v).replace(/[^0-9.]/g,'');if(!v)return '';const i=v.indexOf('.');let a=i<0?v:v.slice(0,i);const b=i<0?'':'.'+v.slice(i+1).replace(/\./g,'');a=a.replace(/^0+(?=\d)/,'')||(b?'0':'');return a.replace(/\B(?=(\d{3})+(?!\d))/g,',')+b}
const AMT='input.in[inputmode="decimal"]';
function fmtAll(root=document){root.querySelectorAll(AMT).forEach(e=>{if(e.value)e.value=fmtAmt(e.value)})}
document.addEventListener('input',e=>{const t=e.target;t._sel=false;if(!t.matches||!t.matches(AMT))return;const v=t.value,pos=t.selectionStart??v.length;
 const keep=v.slice(0,pos).replace(/[^0-9.]/g,'').length,f=fmtAmt(v);if(f===v)return;t.value=f;
 let c=0,i=0;while(i<f.length&&c<keep){if(/[0-9.]/.test(f[i]))c++;i++}try{t.setSelectionRange(i,i)}catch(_){}},true);
document.addEventListener('click',e=>{const nd=e.target.closest('#sk .nd'),lk=nd?null:e.target.closest('#sk .lk');if((nd||lk)&&K){if(SKD){SKD=false;return}const n=nd?K.all[+nd.dataset.n]:K.L[+lk.dataset.l].t;return skOpen(n,{l:e.clientX,r:e.clientX,y:e.clientY})}
 if(!e.skDone&&!e.target.closest('#skc')&&!e.target.closest('dialog')&&$('#skc:not([hidden])'))skClose();   // skDone: the React handler did this first
});
function commitFocus(sel){commit();const e=$(sel);if(e){e.focus();e.select?.()}}
addEventListener('scroll',()=>$('#bar').classList.toggle('sc',scrollY>6),{passive:true});
addEventListener('resize',moveInd);
document.fonts&&document.fonts.ready.then(moveInd);
