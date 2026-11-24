'use strict';
/* ---------- render: loans ---------- */
const GEAR=`<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`;
// Extra payment plan: X extra a month toward loans, one loan at a time (highest rate or smallest balance first).
// When a loan is paid off, its minimum rolls into the next one. Starts at xStart(); a loan already paid this month
// gets nothing more that month. Returns each loan's extra by month, total interest and the debt-free month.
let PX=null,PS=null;const pxHow=()=>PS||(snowR()&&snowR().how)||'rate';
function pxSim(X,how,nr){const m0=xStart(),L=S.loans.filter(l=>m0>=l.start&&row(l,m0)).map(l=>{const r=row(l,m0);return{l,b:r.lg?r.close:r.open,b0:r.lg?r.close:r.open,paid:!!r.lg,rt:l.apr/1200,x:{},end:null}}).filter(o=>o.b>0.005);
 const ord=[...L].sort(how==='bal'?(a,b)=>a.b-b.b:(a,b)=>b.l.apr-a.l.apr||a.b-b.b);let k=m0,int=0,free=0;
 for(let n=0;n<720&&L.some(o=>o.b>0.005);n++){let pool=X+free;const skip=o=>n===0&&o.paid;
  L.forEach(o=>{if(o.b<=0.005||skip(o))return;const i=o.b*o.rt;int+=i;o.b+=i;o.b-=Math.min(o.l.min,o.b)});
  ord.forEach(o=>{if(o.b<=0.005||pool<=0.005||skip(o))return;const e=Math.min(pool,o.b);o.b-=e;pool-=e;o.x[k]=r2(e)});
  L.forEach(o=>{if(o.b<=0.005&&!o.end){o.end=k;if(!nr)free+=o.l.min}});k=addM(k,1)}
 return{L,int,m0,end:L.reduce((m,o)=>o.end&&o.end>m?o.end:m,'')}}
// The plan last chosen (S.pxPlan{x,how,at}) is shown until changed; otherwise the extras set on the loans now.
const pxNow=()=>snowR()?+snowR().v:S.loans.reduce((a,l)=>a+(loanGone(l,xStart())?0:loanUsual(l,xStart())),0);
function wiCap(){const T=totals();return Math.max(0,T.left+T.save)}
// Debt chart range: 1M/3M/YTD/1Y look back from the viewed month (like Wealth); All = whole history plus the projection.
let LR=(()=>{try{return localStorage.getItem('pfb_lr')||'all'}catch(_){return 'all'}})();
