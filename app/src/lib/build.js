// build: the code of what was app/public/js/build.js (unchanged but for imports, `export`, the shared state's setters and
// startBuild(), which holds what used to run as the file loaded).
// Shared state (other files change it with the set… functions; it was js/build.js):
import { renderBuild } from '../named.jsx';
import { BK, acctType, addRule, autoFile, bankFrom, billPaid, flexAct, lnkSibsFor, merchKey, merchKeys, normT, ruleFor, setTXI, titleC } from './bank.js';
import { C, S, TK, addM, basePlan, clone, editPlan, f0, labS, plan, r2, uid } from './core.js';
import { commit } from './events.js';
import { histMonths } from './history.js';
import { txLabel, txTargets, txUndo } from './linked-loans.js';
import { hasPlan, setLP, toast } from './math.js';
import { SRV } from './server-sync.js';
export let BUDV='month',BSCOPE='all',INB=false; export function setBUDV(v){return BUDV=v} export function setBSCOPE(v){return BSCOPE=v} export function setINB(v){return INB=v}
export let ALE=null; export function setALE(v){return ALE=v}
export let DRG=null,ORDN=0; export function setDRG(v){return DRG=v} export function setORDN(v){return ORDN=v}
/* ---------- Build your budget: edit the budget for all months (or from this month on) ---------- */
// First month the budget covers: earliest of History's first month, the review-start month and the first plan version.
export function budStart(){let bf=S.bankFrom?S.bankFrom.slice(0,7):'';if(bf&&SRV&&BK.tx&&BK.tx.length){let m=BK.tx[0].date;for(const t of BK.tx)if(t.date<m)m=t.date;if(m.slice(0,7)>bf)bf=m.slice(0,7)}return bf}
export function firstMonth(){const bf=budStart();if(bf)return bf<TK?bf:TK;const c=[...Object.keys(S.plans),bankFrom().slice(0,7),histMonths()[0]].filter(Boolean).sort();return c[0]&&c[0]<TK?c[0]:TK}
// Month a Build-view edit starts from. Edits made outside Build keep starting at the viewed month.
export const scopeStart=()=>BSCOPE==='all'?firstMonth():S.cur;
// Items, groups and income in the newest plan version that some earlier month is missing.
export function pastGaps(){const ks=Object.keys(S.plans).sort(),last=ks[ks.length-1],L=S.plans[last],f0m=firstMonth(),vs=[...new Set([f0m,...ks])].filter(k=>k<last&&k>=f0m).sort(),miss=new Set();
 vs.forEach(k=>{const p=S.plans[k]||basePlan(k),ids=new Set([...p.income.map(i=>i.id),...p.groups.flatMap(g=>[g.id,...g.items.map(i=>i.id)])]);
  L.income.forEach(i=>{if(!ids.has(i.id))miss.add(i.id)});L.groups.forEach(g=>g.items.forEach(i=>{if(!ids.has(i.id))miss.add(i.id)}))});return {n:miss.size,vs,L}}
export function fillPast(){const {vs,L,n:items}=pastGaps();let n=0;
 vs.forEach(k=>{if(!S.plans[k])S.plans[k]=clone(basePlan(k));const p=S.plans[k],has=id=>p.income.some(i=>i.id===id)||p.groups.some(g=>g.id===id||g.items.some(i=>i.id===id));
  L.income.forEach(i=>{if(!has(i.id)){p.income.push(clone(i));n++}});
  L.groups.forEach(g=>{let pg=p.groups.find(x=>x.id===g.id);if(!pg){pg={...clone(g),items:[]};p.groups.push(pg)}g.items.forEach(i=>{if(!has(i.id)){pg.items.push(clone(i));n++}})})});
 setLP({});setTXI(null);const f=autoFile();toast(`Filled in ${items} item${items===1?'':'s'} back to ${labS(firstMonth())}${f?`. ${f} transaction${f===1?'':'s'} filed`:''}`);commit()}
// Steady deposits into checking that aren't tied to an income source yet.
export function recurringIn(){if(!SRV||!BK.tx.length)return[];const MK=merchKeys(),G={},no=S.notInc||{},k6=addM(TK,-6);
 BK.tx.forEach(t=>{if(t.amount>=0||t.date.slice(0,7)<k6||acctType(t.account)!=='depository'||((t.pfc||[])[0]||'')!=='INCOME')return;const r=S.txd&&S.txd[t.id];if(r&&(r.v.startsWith('inc:')||r.v==='xfer'))return;
  const rr=ruleFor(t);if(rr&&txTargets(t.date.slice(0,7)).ok(rr.v))return;const p=merchKey(t,MK);if(no[p])return;(G[p]||(G[p]=[])).push(t)});
 return Object.entries(G).map(([p,L])=>{const bym={};L.forEach(t=>{const k=t.date.slice(0,7);bym[k]=(bym[k]||0)-t.amount});const v=Object.values(bym).sort((a,b)=>a-b),top=L.find(t=>t.merchant&&normT(t.merchant)===p);
  return{p,label:top?top.merchant:titleC(p),months:v.length,amt:r2(v[Math.floor(v.length/2)]),last:L.map(t=>t.date).sort().pop()}}).filter(x=>x.months>=2&&x.last>=addM(TK,-1)).sort((a,b)=>b.amt-a.amt)}
export function recInAdd(p){const x=recurringIn().find(y=>y.p===p);if(!x)return;const id=uid();editPlan(pl=>pl.income.push({id,name:x.label,amt:x.amt}));addRule(p,'in','inc:'+id);
 BK.tx.forEach(t=>{const r=S.txd&&S.txd[t.id];if(r&&!r.v.startsWith('inc:')&&r.auto!=='pair'&&ruleFor(t)&&ruleFor(t).v==='inc:'+id)txUndo(t.id)});const f=autoFile();toast(`Added ${x.label} as income${f?`; ${f} deposit${f===1?'':'s'} filed`:''}`);commit()}
// Biggest stores of the last 3 months that are still rolling into Flex with no store link.
export function topStores(){const k3=addM(TK,-2),MK=merchKeys(),G={};BK.tx.forEach(t=>{const r=S.txd&&S.txd[t.id];if(!r||r.auto!=='rest'||r.k<k3)return;const p=merchKey(t,MK);const g=G[p]||(G[p]={p,n:0,tot:0,label:''});g.n++;g.tot+=t.amount;if(t.merchant&&normT(t.merchant)===p)g.label=t.merchant});
 return Object.values(G).filter(g=>g.tot>0).map(g=>({...g,label:g.label||titleC(g.p)})).sort((a,b)=>b.tot-a.tot).slice(0,10)}
export function topFile(p){const sel=document.querySelector(`select[data-tops="${CSS.escape(p)}"]`);if(!sel||!sel.value)return;const v=sel.value;addRule(p,'out',v,null,null,lnkSibsFor(p));
 BK.tx.forEach(t=>{const r=S.txd&&S.txd[t.id];if(r&&r.auto==='rest'&&ruleFor(t)&&ruleFor(t).v===v)txUndo(t.id)});const f=autoFile();toast(`${titleC(p)} now files to ${txLabel({v,k:TK})}${f?` (${f} moved)`:''}`);commit()}
// Schedule editor, shared by Build step 6 and the Forecast. ALE = the allocation open for editing.

export const alDesc=a=>a.to==='snow'?`${a.src==='plan'?f0(a.v)+' a month':a.mode==='%'?a.v+'% of what’s left':f0(a.v)+' a month of what’s left'} · ${a.how==='bal'?'smallest balance':'highest rate'} first · ${a.loans&&a.loans.length?a.loans.map(id=>(S.loans.find(l=>l.id===id)||{}).name).filter(Boolean).join(', '):'all loans'}${a.roll!==false?' + freed payments':''}`:a.src==='plan'?`${f0(a.v)} a month`:a.mode==='%'?`${a.v}% of what’s left`:`${f0(a.v)} a month of what’s left`;
export const alWhen=a=>`${labS(a.from)} → ${a.until?labS(a.until):a.to==='keep'?'no end':a.to.startsWith('g:')?'until reached':'until paid off'}`;
export const alCol=a=>a.to.startsWith('g:')?(S.goals.find(g=>'g:'+g.id===a.to)||{}).color||'var(--lilac)':a.to.startsWith('l:')?(S.loans.find(l=>'l:'+l.id===a.to)||{}).color||'var(--sky)':a.to==='snow'?'var(--sky)':'var(--lime)';
// ---------- order of items and groups, items outside groups ----------
// The loose group holds a kind's items that aren't in a group: one for bills, one for spending, made when first needed
// (ensureLoose) and listed first. It's an ordinary group to everything else (totals, filing, pop-ups); the Budget page
// shows it as "Not in a group" and the money flow shows each of its items on its own.
export const LOOSE={fixed:'loose-b',flex:'loose-f'},isLoose=id=>id===LOOSE.fixed||id===LOOSE.flex;
export function ensureLoose(p,fx){let L=p.groups.find(g=>g.loose&&!!g.flex===!!fx);if(!L){L={id:fx?LOOSE.flex:LOOSE.fixed,name:fx?'Spending':'Bills',color:fx?C.lilac:C.butter,flex:!!fx,loose:true,items:[]};p.groups.unshift(L)}return L}
// What an item usually takes: the average of its last 3 months with spending (or payments), from bank data or
// amounts typed by hand. Set-aside bills are left out. Spending rounds up to $5, bills to the dollar.
export function usualAmt(i,fx){if(+i.freq>1)return null;const v=[];for(let m=addM(TK,-1);m>=budStart()&&m>=addM(TK,-12)&&v.length<3;m=addM(m,-1)){const a=fx?flexAct(m,i.id):((billPaid(m,i.id)||{}).real??(billPaid(m,i.id)||{}).amt);if(a!=null&&a>0.5)v.push(a)}
 if(!v.length)return null;const av=v.reduce((a,b)=>a+b,0)/v.length;return fx?Math.ceil(av/5)*5:Math.round(av)}
export function fillAvg(fx){const V={};plan(S.cur).groups.filter(g=>!!g.flex===!!fx).forEach(g=>g.items.forEach(i=>{if(!i.once&&!hasPlan(i)){const u=usualAmt(i,fx);if(u!=null)V[i.id]=u}}));const n=Object.keys(V).length;if(!n)return;
 editPlan(p=>p.groups.forEach(g=>g.items.forEach(i=>{if(V[i.id]!=null&&!hasPlan(i))i.amt=V[i.id]})));toast(`Filled in ${n} amount${n===1?'':'s'} from what you usually spend. Change any of them here.`);commit()}
// Apply an order read from Build: gO = group ids of one kind, iO = {groupId: [item ids]}. Items keep their data; an
// item listed under another group moves there. Months whose plan lacks a group keep the item where it was.
export function orderApply(fx,gO,iO){INB=true;editPlan(p=>{const mine=p.groups.filter(g=>!!g.flex===!!fx),byId={};mine.forEach(g=>g.items.forEach(i=>byId[i.id]=i));
  if((iO[LOOSE[fx?'flex':'fixed']]||[]).length)ensureLoose(p,fx);
  const gs=p.groups.filter(g=>!!g.flex===!!fx),placed=new Set();
  gs.forEach(g=>{const ids=iO[g.id];if(!ids)return;g._n=ids.filter(id=>byId[id]&&!placed.has(id)).map(id=>{placed.add(id);return byId[id]})});
  gs.forEach(g=>{g.items=[...(g._n||[]),...g.items.filter(i=>!placed.has(i.id))];delete g._n});
  const pos=g=>g.loose?-1:(gO.indexOf(g.id)<0?1e6:gO.indexOf(g.id));p.groups=[...p.groups.filter(g=>!!g.flex!==!!fx),...gs.sort((a,b)=>pos(a)-pos(b))]});commit()}
// Read the order from the page after a drag.
export function orderRead(kind){const gO=[...document.querySelectorAll(`.bgrps[data-kind="${kind}"]>.bgrp`)].map(e=>e.dataset.gid),iO={};
 document.querySelectorAll(`.bitems[data-kind="${kind}"]`).forEach(c=>{iO[c.dataset.g]=[...c.querySelectorAll(':scope>.brow[data-iid]')].map(r=>r.dataset.iid)});return{gO,iO}}
// Dragging ⋮⋮: the row (or group) moves live among its siblings, then the new order is saved. Mouse and touch.
// ORDN counts rows moved by hand (drag or arrow keys); Build's .bgrps lists use it as their key, so the redraw that
// follows a move (save or cancel) gets new lists instead of React reconciling over nodes it didn't place.

export function dragEnd(save){const D=DRG;if(!D)return;DRG=null;D.el.classList.remove('drg');document.body.classList.remove('dragging');if(!D.moved)return;if(!save)return renderBuild();const o=orderRead(D.kind);orderApply(D.kind==='flex',o.gO,o.iO)}

// What this file did as it loaded (listeners, settings read from localStorage, …): main.jsx runs it in the old
// load order, after every module is defined.
export function startBuild() {
try{BUDV=localStorage.getItem('pfb_budv')||'month';BSCOPE=localStorage.getItem('pfb_bscope')||'all'}catch(_){}
document.addEventListener('pointerdown',e=>{const h=e.target.closest('.grip');if(!h||e.button>0)return;const el=h.dataset.drag==='i'?h.closest('.brow'):h.closest('.bgrp'),box=h.dataset.drag==='i'?el.closest('.bitems'):el.closest('.bgrps');if(!el||!box)return;
 e.preventDefault();DRG={t:h.dataset.drag,el,kind:box.dataset.kind,y0:e.clientY,moved:false,h};h.setPointerCapture(e.pointerId)});
document.addEventListener('pointermove',e=>{if(!DRG)return;const D=DRG;if(!D.moved){if(Math.abs(e.clientY-D.y0)<4)return;D.moved=true;D.el.classList.add('drg');document.body.classList.add('dragging')}
 if(e.clientY<70)scrollBy(0,-14);else if(e.clientY>innerHeight-70)scrollBy(0,14);
 D.el.style.pointerEvents='none';const u=document.elementFromPoint(e.clientX,e.clientY);D.el.style.pointerEvents='';if(!u)return;
 if(D.t==='i'){const box=u.closest(`.bitems[data-kind="${D.kind}"]`)||(u.closest('.bgrp')&&u.closest('.bgrp').querySelector(`:scope>.bitems[data-kind="${D.kind}"]`));if(!box)return;const r=u.closest('.brow[data-iid]');
  if(r&&r!==D.el&&box.contains(r)){const m=r.getBoundingClientRect();ORDN++;box.insertBefore(D.el,e.clientY<m.top+m.height/2?r:r.nextSibling)}else if(!r&&D.el.parentNode!==box){ORDN++;box.appendChild(D.el)}}
 else{const g=u.closest('.bgrps>.bgrp');if(g&&g!==D.el&&g.parentNode===D.el.parentNode){const m=g.getBoundingClientRect();ORDN++;D.el.parentNode.insertBefore(D.el,e.clientY<m.top+m.height/2?g:g.nextSibling)}}});
document.addEventListener('pointerup',()=>dragEnd(true));
document.addEventListener('pointercancel',()=>dragEnd(false));
// Keyboard: ↑/↓ on a focused ⋮⋮ moves it one place (an item stays in its group).
document.addEventListener('keydown',e=>{const h=e.target.closest&&e.target.closest('.grip');if(!h||(e.key!=='ArrowUp'&&e.key!=='ArrowDown'))return;e.preventDefault();const up=e.key==='ArrowUp',el=h.dataset.drag==='i'?h.closest('.brow'):h.closest('.bgrp'),sib=up?el.previousElementSibling:el.nextElementSibling;
 if(!sib||!sib.matches(h.dataset.drag==='i'?'.brow[data-iid]':'.bgrp'))return;ORDN++;el.parentNode.insertBefore(el,up?sib:sib.nextSibling);const kind=(el.closest('.bitems')||el.closest('.bgrps')).dataset.kind,o=orderRead(kind),id=h.dataset.id;orderApply(kind==='flex',o.gO,o.iO);const g=document.querySelector(`.grip[data-id="${id}"]`);if(g)g.focus()});
}
