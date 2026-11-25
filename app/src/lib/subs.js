/* ---------- recurring charges and price changes (Bank → Recurring) ---------- */
import { BK, PSET, merchKeys, merchKey, isXferish, normT, SPEND_CAT, titleC } from './bank.js';
import { S, TK, addM, r2 } from './core.js';
import { allItems } from './linked-loans.js';
import { SRV } from './server-sync.js';

// Month number of 'YYYY-MM' (so gaps between months are a subtraction).
const mIdx=k=>+k.slice(0,4)*12+ +k.slice(5,7)-1;
const same=(a,b)=>Math.abs(a-b)<=Math.max(0.5,Math.max(a,b)*0.02);
// subsList(): every charge that repeats on a steady schedule (every 1, 2, 3, 6 or 12 months, at most one charge a
// month, about the same day) at a steady price, from the last 14 months of posted bank charges. Transfers, loan
// payments and charges filed as anything but a budget line are left out. A price that stepped once (and stayed) is a
// price change {prev, since, up}. Monthly needs 3 charges in a row, longer cadences 2; two identical monthly charges
// first seen in the last ~70 days (not everyday spending) show as new.
export function subsList(){if(!SRV||!BK.tx||!BK.tx.length)return[];
 const MK=merchKeys(),G={},from=addM(TK,-14)+'-01',today=new Date().toISOString().slice(0,10),now=Date.parse(today);
 BK.tx.forEach(t=>{if(t.amount<=0||t.pending||PSET.has(t.id)||t.date<from||isXferish(t))return;const r=S.txd&&S.txd[t.id];if(r&&!(r.v||'').startsWith('i:'))return;(G[merchKey(t,MK)]||(G[merchKey(t,MK)]=[])).push(t)});
 const L=[];
 Object.entries(G).forEach(([p,T])=>{T.sort((a,b)=>a.date.localeCompare(b.date));const M=T.map(t=>mIdx(t.date.slice(0,7)));if(new Set(M).size!==M.length)return;   // two in one month: not a subscription
  // the trailing run of charges with the same gap
  const n=T.length;if(n<2)return;const g=M[n-1]-M[n-2];if(![1,2,3,6,12].includes(g))return;let s=n-2;while(s>0&&M[s]-M[s-1]===g)s--;const R=T.slice(s);
  const cat=((R[R.length-1].pfc||[])[0])||'',fresh=g===1&&R.length===2&&SPEND_CAT.test(cat)===false&&now-Date.parse(R[0].date)<=70*864e5;
  if(R.length<(g===1?3:2)&&!fresh)return;
  const D=R.map(t=>+t.date.slice(8)).sort((a,b)=>a-b),day=D[Math.floor(D.length/2)];if(D.some(d=>Math.abs(d-day)>7))return;
  // prices: steady, or one step that stayed
  const A=R.map(t=>t.amount);let st=-1;for(let i=1;i<A.length;i++)if(!same(A[i],A[i-1])){if(st>=0)return;st=i}
  if(st>=0&&(!A.slice(0,st).every(a=>same(a,A[0]))||!A.slice(st).every(a=>same(a,A[st]))))return;
  if(fresh&&st>=0)return;
  const last=R[R.length-1],amt=r2(last.amount),lk=last.date.slice(0,7),nk=addM(lk,g),nd=nk+'-'+String(Math.min(+last.date.slice(8),new Date(+nk.slice(0,4),+nk.slice(5,7),0).getDate())).padStart(2,'0');
  const active=now<=Date.parse(nd)+(g===1?10:20)*864e5,r=S.txd&&S.txd[last.id],v=r&&(r.v||'').startsWith('i:')?r.v:null,it=v?allItems(S.cur).find(x=>x.i.id===v.slice(2)):null;
  const top=T.find(t=>t.merchant&&normT(t.merchant)===p)||T.find(t=>t.merchant);
  L.push({p,label:top?top.merchant:titleC(p),every:g,amt,day,n:R.length,first:R[0].date,last:last.date,next:active?nd:null,active,yearly:r2(amt*12/g),cat,fresh,
   change:st>=0?{prev:r2(A[st-1]),since:R[st].date.slice(0,7),up:A[st]>A[st-1]}:null,v,item:it?it.i.name:null,open:!!it})});
 L.sort((a,b)=>(b.active-a.active)||(b.yearly-a.yearly));return L}
// Price increases from last month on (shown in Needs a look and sent as phone alerts once).
export function priceUps(){const k1=addM(TK,-1);return subsList().filter(x=>x.active&&x.change&&x.change.up&&x.change.since>=k1)}
export const everyWord=g=>g===1?'Monthly':g===12?'Yearly':g===6?'Twice a year':g===3?'Every 3 months':'Every 2 months';
