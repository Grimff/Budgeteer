'use strict';
/* ---------- Compare view and flow details ---------- */
// Every budget line this month: planned vs what really happened so far. pend = not paid yet (not a saving).
function cmpRows(k=S.cur){const p=plan(k),rows=[];
 p.groups.forEach(g=>g.items.forEach(i=>{const pl=+i.amt||0;if(g.flex){const a=flexAct(k,i.id);rows.push({key:'i:'+i.id,name:i.name,grp:g.name,c:g.color,pl,a:a||0,none:a==null})}
  else{const pd=billPaid(k,i.id);rows.push({key:'i:'+i.id,name:i.name,grp:g.name,c:g.color,pl,a:pd?pd.amt:0,pend:!pd})}}));
 S.loans.forEach(l=>{const r=k<l.start?null:row(l,k);if(!r)return;rows.push({key:'l:'+l.id,name:l.name,grp:'Loans',c:C.sky,pl:loanPlan(l,k),a:r.lg?r.pay:0,pend:!r.lg,good:true})});
 S.goals.forEach(g=>{const pl=goalPlan(g,k),a=savedIn(g,k);rows.push({key:'g:'+g.id,name:g.name,grp:'Savings',c:C.lilac,pl,a,good:true})});
 return rows.filter(r=>r.pl>0.5||Math.abs(r.a)>0.5)}
function compareView(el){const k=S.cur,R=cmpRows(k),M=Math.max(1,...R.map(r=>Math.max(r.pl,r.a)));
 // "good" lines (loans, savings) are fine above plan; spending lines are not.
 const st=r=>{const d=r.a-r.pl;if(r.pend||r.none)return{cls:'pend',t:r.pend?(k<TK?'Not seen':'Not paid yet'):'Nothing yet',bad:0};if(Math.abs(d)<0.5)return{cls:'ok',t:'On plan',bad:0};if(r.good)return d>0?{cls:'ok',t:`${f0(d)} extra`,bad:0}:{cls:'bad',t:`${f0(-d)} short`,bad:-d};return d>0?{cls:'bad',t:`${f0(d)} over`,bad:d}:{cls:'ok',t:`${f0(-d)} under`,bad:0}};
 const S2=R.map(r=>({...r,s:st(r)})).sort((a,b)=>b.s.bad-a.s.bad||(b.pl-b.a)-(a.pl-a.a));
 const over=S2.filter(r=>r.s.cls==='bad'),overT=over.reduce((x,r)=>x+r.s.bad,0),under=S2.filter(r=>r.s.cls==='ok'&&!r.good&&r.a<r.pl-0.5).reduce((x,r)=>x+(r.pl-r.a),0),pend=S2.filter(r=>r.pend).reduce((x,r)=>x+r.pl,0);
 el.innerHTML=`<div class="cmp"><div class="cmph"><div><small>Over plan</small><b class="neg">${f0(overT)}</b><span>${over.length} line${over.length===1?'':'s'}</span></div><div><small>Under plan</small><b class="pos">${f0(under)}</b></div><div><small>Not paid yet</small><b>${f0(pend)}</b></div></div>
 ${S2.map(r=>{const aw=Math.min(100,r.a/M*100),pw=r.pl/M*100;return `<button type="button" class="cmr" data-act="catTx" data-v="${r.key}"><span class="nm"><b>${esc(r.name)}</b><small>${esc(r.grp)}</small></span><span class="bar"><i class="a ${r.s.cls}" style="width:${Math.max(0,aw)}%;--c:${r.c}"></i>${r.pl>0.5?`<i class="p" style="left:${pw}%" title="Planned ${f0(r.pl)}"></i>`:''}</span><span class="nums"><b>${f0(r.a)}</b><small>of ${f0(r.pl)}</small></span><span class="df ${r.s.cls}">${r.s.t}</span></button>`}).join('')}
 <p class="dim" style="font-size:13px;margin-top:10px">The bar is what’s happened so far; the white mark is the plan. Click a line for its transactions and trends.</p></div>`}
// Details for one budget line, a whole group, or an income source: totals, a 6-month history, and stores.
let FD=null;
function flowOpen(key){FD=key;flowRender();$('#fdlg').showModal()}
function flowRender(){if(!FD)return;const k=S.cur,key=FD,p=plan(k);let V=[],name='',pl=0,inc=false,isL=false;
 if(key.startsWith('grp:')){const g=p.groups.find(x=>x.id===key.slice(4));if(!g)return;name=g.name;V=g.items.map(i=>'i:'+i.id);pl=g.items.reduce((x,i)=>x+(+i.amt||0),0)}
 else if(key.startsWith('inc:')){const i=p.income.find(x=>x.id===key.slice(4));name=i?i.name:'Income';V=[key];pl=i?+i.amt||0:0;inc=true}
 else if(key.startsWith('l:')){const l=S.loans.find(x=>x.id===key.slice(2));name=l?l.name:'Loan';V=[key];pl=l?loanPlan(l,k):0;isL=true}
 else if(key.startsWith('g:')){const g=S.goals.find(x=>x.id===key.slice(2));name=g?g.name:'Goal';V=[key];pl=g?goalPlan(g,k):0}
 else{const x=allItems(k).find(y=>y.i.id===key.slice(2));name=x?x.i.name:'Item';V=[key];pl=x?+x.i.amt||0:0}
 const sg=a=>inc?-a:a,ks=[];for(let i=5;i>=0;i--)ks.push(addM(k,-i));const first=firstMonth(),span=ks.filter(m=>m>=first),MK=merchKeys(),VS=new Set(V);
 const per={},mer={};Object.entries(S.txd||{}).forEach(([id,r])=>{if(!VS.has(r.v)||!ks.includes(r.k))return;const a=sg(+r.amt||0);per[r.k]=(per[r.k]||0)+a;
  const t=BK.tx.find(x=>x.id===id),mk=t?merchKey(t,MK):normT(r.n),e=mer[mk]||(mer[mk]={label:'',now:0,nowN:0,tot:0,n:0,ms:new Set()});if(!e.label)e.label=t&&t.merchant&&normT(t.merchant)===mk?t.merchant:titleC(mk);e.tot+=a;e.n++;e.ms.add(r.k);if(r.k===k){e.now+=a;e.nowN++}});
 // Months before bank filing (or groceries typed by hand) still count in the history bars.
 ks.forEach(m=>{if(per[m]==null&&V.length&&V.every(v=>v.startsWith('i:'))){const x=V.reduce((s2,v)=>{const a=flexAct(m,v.slice(2));return a==null?s2:(s2||0)+a},null);if(x!=null)per[m]=x}});
 const now=per[k]||0,months=Math.max(1,span.length),avg=span.reduce((x,m)=>x+(per[m]||0),0)/months,mx=Math.max(1,pl,...ks.map(m=>per[m]||0));
 const ML=Object.values(mer).sort((a,b)=>b.tot-a.tot);
 $('#fdt').textContent=name;$('#fds').innerHTML=`${lab(k)} · <b style="color:var(--text)">${f2(now)}</b> of ${f2(pl)} planned${pl>0.5?` · <span class="${(isL||key.startsWith('g:')||inc)?(now>=pl-0.5?'pos':'neg'):(now>pl+0.5?'neg':'pos')}">${now>pl?f0(now-pl)+' over':f0(pl-now)+' under'}</span>`:''}`;
 $('#fdb').innerHTML=`<div class="fhist">${ks.map(m=>{const v=per[m]||0,h=v/mx*100;return `<div class="fcol${m===k?' cur':''}" title="${lab(m)}: ${f2(v)}"><span class="fv">${v?fk(v):''}</span><span class="fbar"><i style="height:${Math.max(v?3:0,h)}%"></i>${pl>0.5?`<em style="bottom:${pl/mx*100}%"></em>`:''}</span><small>${mon(m).slice(0,3)}</small></div>`}).join('')}</div>
  <div class="fkpi"><div><small>Average a month</small><b>${f0(avg)}</b><span>last ${months} month${months===1?'':'s'}</span></div><div><small>This month</small><b>${f0(now)}</b><span>${ML.reduce((x,e)=>x+e.nowN,0)} ${inc?'deposit':'transaction'}${ML.reduce((x,e)=>x+e.nowN,0)===1?'':'s'}</span></div><div><small>Planned</small><b>${f0(pl)}</b><span>a month</span></div></div>
  ${ML.length?`<table class="ftab"><thead><tr><th>${inc?'From':'Store'}</th><th>${mon(k).slice(0,3)}</th><th>Visits</th><th>Avg / month</th></tr></thead><tbody>${ML.map(e=>`<tr><td>${esc(e.label)}</td><td>${e.now?f2(e.now):'—'}<small>${e.nowN>1?' ×'+e.nowN:''}</small></td><td>${(e.n/months).toFixed(e.n/months<10?1:0)}<small>/mo</small></td><td>${f0(e.tot/months)}</td></tr>`).join('')}</tbody></table>`:'<p class="dim" style="padding:10px 0">No bank transactions filed here in the last 6 months.</p>'}
  <div class="dact" style="margin-top:14px">${V.length===1?`<button type="button" class="btn g sm" data-act="flowTx" data-v="${V[0]}">See ${mon(k)} transactions</button>`:''}<button type="button" class="btn g" data-act="fclose">Close</button></div>`}
