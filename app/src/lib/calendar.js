/* ---------- bill calendar (Budget → This month) and the status of a bill or loan in a month ---------- */
import { PSET, billPaid, rulesFor } from './bank.js';
import { NOW, S, TK, f0, isDue, ord, plan } from './core.js';
import { bankSrc, loanGone, loanPlan, loanXtra, row } from './math.js';
import { SRV } from './server-sync.js';

// A bill's status pill in month k, {t, c} (c: ok/hot/bad/dim or ''), or null when there's nothing to say (no bank).
// Shared by the Budget lines and the calendar, so both always agree.
export function billState(i,k){const pd=SRV?billPaid(k,i.id):null,due=+i.due||0,sk=+i.freq>1,aside=sk&&!pd&&!isDue(i,k);
 if(aside)return{t:'Set aside',c:'ok'};if(!SRV)return null;
 if(pd)return pd.list.every(x=>PSET.has(x.id))?{t:'Pending',c:'hot'}:{t:'Paid',c:'ok'};
 if(!rulesFor('i:'+i.id).length)return{t:'Not linked',c:'dim'};if(k<TK)return{t:'Not seen',c:'bad'};
 if(k===TK&&due&&NOW.getDate()>due+3)return{t:'Not seen yet',c:'hot'};return{t:due?'Due '+ord(due):'Upcoming',c:''}}
// A loan payment's status in month k; unl = not linked to anything (the Budget card offers Log a payment for it).
export function loanState(l,k){const r=k<l.start?null:row(l,k),mn=loanPlan(l,k),xt=loanXtra(l,k),lk=l.acct&&l.link?l.link.inst:'',pd=r&&(r.auto||r.lg)?r.pay:null;
 const lr=bankSrc(l)&&SRV?rulesFor('l:'+l.id).length+(lk?1:0):0;
 if(pd!=null&&xt>0.5&&pd<mn-0.5)return k<TK?{t:'Paid '+f0(pd),c:''}:{t:f0(mn-pd)+' extra to go',c:''};
 if(pd!=null)return{t:'Paid',c:'ok'};if(mn<=0)return{t:'Paid off',c:'ok'};if(lk&&!lr&&k>=TK)return{t:k===TK?'Waiting':'Upcoming',c:''};
 if(lr)return k<TK?{t:'Not seen',c:'bad'}:k===TK&&l.due&&NOW.getDate()>l.due+3?{t:'Not seen yet',c:'hot'}:{t:l.due?'Due '+ord(l.due):'Upcoming',c:''};
 return{t:SRV&&!lk?'Not linked':'Not logged',c:k<TK?'bad':SRV&&!lk?'dim':'',unl:!lk}}
// What's due in month k: bills (not spending) due that month, set-aside bills only in their due month (at the bill's
// full amount), and loan payments still running. {day (0 = no due day), name, amt, v, st}, by day.
export function calBills(k){const L=[],p=plan(k);
 p.groups.filter(g=>!g.flex).forEach(g=>g.items.forEach(i=>{if(+i.freq>1&&!isDue(i,k))return;const amt=+(i.base??i.amt)||0;L.push({day:Math.min(+i.due||0,31),name:i.name,amt,v:'i:'+i.id,st:billState(i,k)})}));
 S.loans.filter(l=>!loanGone(l,k)).forEach(l=>{const mn=loanPlan(l,k);if(mn<=0)return;L.push({day:Math.min(+l.due||0,31),name:l.name,amt:mn,v:'l:'+l.id,st:loanState(l,k)})});
 return L.sort((a,b)=>a.day-b.day||b.amt-a.amt)}
