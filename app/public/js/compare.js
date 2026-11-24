'use strict';
/* ---------- Compare view and flow details ---------- */
// Every budget line this month: planned vs what really happened so far. pend = not paid yet (not a saving).
function cmpRows(k=S.cur){const p=plan(k),rows=[];
 p.groups.forEach(g=>g.items.forEach(i=>{const pl=+i.amt||0;if(g.flex){const a=flexAct(k,i.id);rows.push({key:'i:'+i.id,name:i.name,grp:g.name,c:g.color,pl,a:a||0,none:a==null})}
  else{const pd=billPaid(k,i.id),aside=+i.freq>1&&!pd&&!isDue(i,k);rows.push({key:'i:'+i.id,name:i.name,grp:g.name,c:g.color,pl,a:pd?pd.amt:aside?pl:0,pend:!pd&&!aside})}}));   // a set-aside bill in a month it isn't due is set aside, not unpaid
 S.loans.forEach(l=>{const r=k<l.start?null:row(l,k);if(!r)return;rows.push({key:'l:'+l.id,name:l.name,grp:'Loans',c:C.sky,pl:loanPlan(l,k),a:r.lg?r.pay:0,pend:!r.lg,good:true})});
 S.goals.forEach(g=>{const pl=goalPlan(g,k),a=savedIn(g,k);rows.push({key:'g:'+g.id,name:g.name,grp:'Savings',c:C.lilac,pl,a,good:true})});
 return rows.filter(r=>r.pl>0.5||Math.abs(r.a)>0.5)}
// Details for one budget line, a whole group, or an income source: totals, a 6-month history, and stores.
let FD=null;
function flowOpen(key){FD=key;flowRender();$('#fdlg').showModal()}
