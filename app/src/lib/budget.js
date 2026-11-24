// budget: moved from app/public/js/budget.js unchanged except `export`. Its top-level let/var stay there (shared state the
// classic files reassign); everything else here reads the app's globals by name as before, and dist/budget.js puts these
// exports on the global object (lib/budget.global.js) so the classic files and the React screens still call them by name.
// globals: each function is on the global object before any code here runs, each const right after its line, as in a classic script.
Object.assign(globalThis, { soFarOf, fcRun });
/* ---------- render: budget ---------- */
// Money that has really moved in month k: paid bills, filed spending, logged loan payments, savings.
export function soFarOf(k,T=totals(k)){const p=plan(k);return p.groups.reduce((a,g)=>a+g.items.reduce((b,i)=>b+(g.flex?(flexAct(k,i.id)||0):((billPaid(k,i.id)||{}).amt||0)),0),0)+S.loans.reduce((a,l)=>{const r=k<l.start?null:row(l,k);return a+(r&&r.lg?r.pay:0)},0)+T.saveA}
// ---------- Forecast: where the plan takes you ----------
// Everything comes from the same functions as the other tabs (totals, balEnd, goalProj, goalEta, lp, the schedule
// simulation), so it uses your budget's future months, one-time items and schedule as entered. What-ifs (WFS) apply
// only while it's drawn (WF) and never save.

export function fcRun(wf){WF=wf;LP={};GP={};XS=null;try{const last=[...S.loans.filter(l=>!loanGone(l,TK)).map(l=>lastK(lp(l).a)),...S.goals.map(goalEta).filter(Boolean)].sort().pop()||addM(TK,23),N=FR==='all'?Math.min(360,Math.max(12,mdiff(TK,last)+4)):+FR,ks=Array.from({length:N},(_,i)=>addM(TK,i)),rows=ks.map(k=>{const T=totals(k);return{k,inc:T.inc,bills:T.fixed,spend:T.flexP,loans:T.loans,save:T.save,left:T.left,debt:S.loans.reduce((a,l)=>a+(k<l.start?l.bal:balEnd(l,k)),0),saved:S.goals.reduce((a,g)=>a+goalProj(g,k),0),
   L:S.loans.map(l=>[l,loanPlan(l,k)]).filter(([,v])=>v>0.5),G:S.goals.map(g=>[g,goalPlan(g,k)]).filter(([,v])=>v>0.5),once:plan(k).income.filter(i=>i.once).concat(plan(k).groups.flatMap(g=>g.items.filter(i=>i.once)))}});
  const M=[];S.goals.forEach(g=>{const t=target(g,TK),e=goalEta(g);if(t>0&&e&&goalSaved(g,TK)<t-0.5)M.push({k:e,t:`${g.name} reached`,c:g.color,d:f0(t),id:'g'+g.id,g})});
  S.loans.forEach(l=>{if(loanGone(l,TK))return;const e=lastK(lp(l).a);if(e&&e>=TK)M.push({k:e,t:`${l.name} paid off`,c:l.color,d:`frees ${f0(l.min)} a month`,id:'l'+l.id,l})});
  const df=S.loans.filter(l=>!loanGone(l,TK)).map(l=>lastK(lp(l).a)).sort().pop();if(df&&df>=TK)M.push({k:df,t:'Debt free',c:'var(--lime)',d:`${f0(S.loans.reduce((a,l)=>a+debtNow(l),0))} paid off from today`,id:'df'});
  return{rows,M:M.sort((a,b)=>a.k.localeCompare(b.k)),df}}finally{WF={inc:0,cost:0,extra:0};LP={};GP={};XS=null}}

