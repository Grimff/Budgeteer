'use strict';
/* ---------- Savings accounts shared between goals ---------- */
// alloc{acctId:{mode:'order'|'split',goals:[goalId],pct:{goalId:n},rest:'last'|'none'}}.
const gLinked=g=>Object.values(S.alloc||{}).some(e=>(e.goals||[]).includes(g.id));
let ALC={};
// How each linked account's balance divides between its goals in month k. bal(a) gives the balance to divide;
// mk is the month whose manual savings count toward "already has" when filling in order.
function allocWith(bal,mk){const out={},by={},un={},A=S.alloc||{};
 Object.keys(A).sort().forEach(aid=>{const a=(BK.accts||[]).find(x=>x.id===aid);if(!a)return;const B=bal(a);if(B==null)return;const e=A[aid],G=(e.goals||[]).filter(id=>S.goals.some(g=>g.id===id));let rem=B;by[aid]={};
  if(e.mode==='split')G.forEach(id=>{const v=r2(B*(+(e.pct||{})[id]||0)/100);out[id]=(out[id]||0)+v;by[aid][id]=v;rem-=v});
  else G.forEach((id,i)=>{const g=S.goals.find(x=>x.id===id),t=target(g,mk),last=i===G.length-1&&e.rest!=='none';let take=last?rem:Math.min(rem,t>0?Math.max(0,t-manualSaved(g,mk)-(out[id]||0)):rem);take=Math.max(0,r2(take));out[id]=(out[id]||0)+take;by[aid][id]=take;rem-=take});
  un[aid]=r2(rem)});return{out,by,un}}
function allocAt(k){return ALC['a'+k]||(ALC['a'+k]=allocWith(a=>acctAt(a,k),k))}
// Balances at the end of the month before k; an account tracked only since month k starts from its first balance in k.
function allocPrev(k){return ALC['p'+k]||(ALC['p'+k]=allocWith(a=>{let pv=acctAt(a,addM(k,-1));if(pv==null){const d=Object.keys(a.days||{}).sort().find(y=>y.slice(0,7)===k);pv=d?a.days[d]:acctAt(a,k)}return pv},addM(k,-1)))}
