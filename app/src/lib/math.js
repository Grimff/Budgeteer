// math: moved from app/public/js/math.js unchanged except `export`. Its top-level let/var stay there (shared state the
// classic files reassign); everything else here reads the app's globals by name as before, and dist/math.js puts these
// exports on the global object (lib/math.global.js) so the classic files and the React screens still call them by name.
// globals: each function is on the global object before any code here runs, each const right after its line, as in a classic script.
Object.assign(globalThis, { path, anchOpen, lp, cutP, row, balEnd, loanGone, loanXo, verAt, verSet, loanUsual, setUsual, loanXtra, loanPlan, loanMin, savedL, sooner, stuck, extraPaid, withPay, payEffect, streak, manualSaved, acctAt, linkedSaved, fromHome, flowsIn, goalShare, linkedChange, invInfo, goalSaved, essentials, goalOv, goalPlan, goalProj, goalEta, goalNeed, alEnd, alSet, exShare, xsBuild, totals, cu, toast, bcSet, unplannedA });
/* ---------- loan math ---------- */

// Linked loans: l.real{month: balance} and l.rp{month: payment} come from the bank (see loanSync).
// A known month-end balance (or this month's balance once it drops) replaces the estimate; the payment is
// the one the lender reported, else the one from Bank review, else worked out from the balance change.
// l.anch{k,eob} resets the opening balance in the month a loan was linked to its account: eob is the balance
// with this month's payment added back, so the opening balance is eob before one month of interest.
export const bankSrc=l=>!l.acct||l.paySrc==='bank';globalThis.bankSrc=bankSrc;
export function path(l,mode,extra=0,from='',delta=0,cut=''){const r=l.apr/1200;let b=l.bal,k=l.start;const rows=[];const R=mode==='a'&&l.acct?l.real||{}:null,P=mode==='a'&&l.acct?l.rp||{}:{},an=l.anch,BS=bankSrc(l);
 for(let n=0;n<720&&b>0.005;n++){const pj=cut&&k>cut;if(mode==='a'&&l.done&&k>l.done&&!pj)break;let mo;if(an&&k===an.k){if(mode==='a'&&!pj){mo=b;b=anchOpen(l,k,r,R,P,BS)}else b=Math.max(0,b+delta)}
  const int=b*r,rb=R&&!pj?R[k]:undefined;
  const mp=mode==='a'&&!pj?S.months[k]?.pay?.[l.id]:undefined,useL=!pj&&P[k]!=null&&(!BS||mp==null);
  if(rb!=null&&(k<TK||rb<b-0.5)){const ex=useL?P[k]:mp,pay=ex!=null?ex:Math.max(0,b+int-rb);rows.push({k,open:b,int:Math.max(0,rb-b+pay),pay,close:rb,lg:true,auto:useL||ex==null,mo});b=rb;k=addM(k,1);continue}
  const lg=useL?P[k]:mp;let pay=lg!=null?lg:l.min+(extra&&k>=from?extra:0)+(mode==='a'&&!pj&&k>=TK&&(!cut||cut>TK)?loanXtra(l,k):0);pay=Math.max(0,Math.min(pay,b+int));const close=b+int-pay;rows.push({k,open:b,int,pay,close,lg:lg!=null,auto:useL,mo});b=close;k=addM(k,1)}
 return rows}
// Opening balance in the month a loan was linked. Once the lender's balance shows that month's payment (the
// month is over, the payment came from the lender, or the balance was read after the bank payment), back-solve
// it: open = (balance + payment) / (1 + rate). Until then: the balance at linking (payment added back) less one
// month of interest. (A lender's balance at linking can leave out accrued interest.)
export function anchOpen(l,k,r,R,P,BS){const an=l.anch,rb=R&&R[k],mp=S.months[k]?.pay?.[l.id],uL=P[k]!=null&&(!BS||mp==null),ex=uL?P[k]:mp;
 if(rb!=null&&ex!=null){const pd=Object.values(S.txd||{}).reduce((m,x)=>x.v==='l:'+l.id&&x.k===k&&(x.d||'')>m?x.d:m,''),at=(l.live&&l.live.at||'').slice(0,10);if(k<TK||uL||(pd&&at>pd))return (rb+ex)/(1+r)}
 return an.eob!=null?an.eob/(1+r):an.open}
export const sumI=rows=>rows.reduce((a,r)=>a+r.int,0);globalThis.sumI=sumI;
export function lp(l){if(LP[l.id])return LP[l.id];const a=path(l,'a'),an=l.anch,ar=an&&a.find(x=>x.k===an.k),d=ar&&ar.mo!=null?ar.open-ar.mo:0;return LP[l.id]={a,b:path(l,'b',0,'',d),d,c:{}}}
// The path with payments as made/planned through month k and minimums after it (cached per month).
export function cutP(l,k){const P=lp(l);return P.c[k]||(P.c[k]=path(l,'a',0,'',P.d,k))}
export function row(l,k){const i=mdiff(l.start,k),a=lp(l).a;return i>=0&&i<a.length?a[i]:null}
export function balEnd(l,k){if(k<l.start)return l.bal;const r=row(l,k);return r?r.close:0}
// Paid off before month k: tracking had started and the balance path already ended. Such loans leave the
// Budget tab and move to the Loans page's Paid off section from the month after the last payment.
export function loanGone(l,k=S.cur){return k>=l.start&&!row(l,k)}
// Planned extra above the minimum: the month's own amount (Build budget) if set, else the loan's usual extra.
export function loanXo(l,k){const v=S.months[k]&&S.months[k].lxp&&S.months[k].lxp[l.id];return v==null?null:+v}
// Usual planned extra: versions l.xp{YYYY-MM: amount}, each in force from its month (like plan versions), so setting
// an extra never changes months before it. A month's own amount (Build → Just for <month>) wins: months[k].lxp.
// Amounts that change over time are kept as versions map{YYYY-MM: amount}, each in force from its month on.
// verSet(o,f,m,v) sets o[f] from month m on and drops later versions, so earlier months never change.
export function verAt(map,k){let v=0;Object.keys(map||{}).sort().forEach(m=>{if(m<=k)v=+map[m]||0});return v}
export function verSet(o,f,m,v){if(f==='mp'&&o.id&&S.goals.includes(o))return alSet('g:'+o.id,m,v);o[f]||(o[f]={});Object.keys(o[f]).forEach(x=>{if(x>=m)delete o[f][x]});if(Math.abs(verAt(o[f],m)-v)>0.004)o[f][m]=r2(v);if(!Object.keys(o[f]).length)delete o[f]}
export function loanUsual(l,k){return alPlan('l:'+l.id,k)}
export function setUsual(l,m,v){alSet('l:'+l.id,m,v)}
export const xStart=()=>S.cur>TK?S.cur:TK;globalThis.xStart=xStart;   // extras are set from the viewed month on, never before the current one
export function loanXtra(l,k){const o=loanXo(l,k);return Math.max(0,o||0)+exShare('l:'+l.id,k)}
// What the budget plans to pay: the minimum plus planned extra, never more than is owed.
export function loanPlan(l,k){if(k<l.start)return l.min+loanXtra(l,k);const r=row(l,k);if(!r)return 0;const due=r.open+r.int;return Math.min(Math.min(l.min,due)+loanXtra(l,k),due)}
export function loanMin(l,k){if(k<l.start)return l.min;const r=row(l,k);return r?Math.min(l.min,r.open+r.int):0}
// Interest saved by month k: lifetime interest on the minimum-only path minus lifetime interest when the extra paid
// (or planned, for future months) through k is made and only minimums after. Never below $0; never falls as k moves on.
export function savedL(l,k=S.cur){return Math.max(0,sumI(lp(l).b)-sumI(cutP(l,k)))}
export function sooner(l){const p=lp(l);return p.b.length-p.a.length}
export function stuck(l){return lp(l).b.length>=720}
export function extraPaid(l,k=S.cur){return cutP(l,k).reduce((a,r)=>a+(r.k<=k&&(r.lg||r.k>=TK)?Math.max(0,r.pay-Math.min(l.min,r.open+r.int)):0),0)}
export function withPay(l,k,amt){const m=MOW(k),old=m.pay[l.id];m.pay[l.id]=amt;const a=path(l,'a');if(old===undefined)delete m.pay[l.id];else m.pay[l.id]=old;return a}
export function payEffect(l,k,amt){const lo=withPay(l,k,Math.min(l.min,(row(l,k)||{open:l.bal,int:0}).open*(1+l.apr/1200))),hi=withPay(l,k,amt);return{saved:sumI(lo)-sumI(hi),months:lo.length-hi.length}}
export function streak(){const ext=k=>S.loans.some(l=>{const r=row(l,k);return r&&r.lg&&r.pay>Math.min(l.min,r.open+r.int)+0.005});let k=TK,n=0;if(!ext(k))k=addM(k,-1);for(let g=0;g<600&&ext(k);g++){n++;k=addM(k,-1)}return n}
export const lastK=rows=>rows.length?rows[rows.length-1].k:TK;globalThis.lastK=lastK;

/* ---------- budget math ---------- */
// A goal is what you add by hand (saved before tracking + logged deposits) plus the balances of any linked accounts.
export function manualSaved(g,k=S.cur){let s=+g.saved||0;Object.keys(S.months).forEach(x=>{if(x<=k)s+=+(S.months[x].dep?.[g.id]||0)});return s}
export const gAccts=g=>Object.keys(S.alloc||{}).filter(aid=>(S.alloc[aid].goals||[]).includes(g.id)).map(aid=>(BK.accts||[]).find(a=>a.id===aid)).filter(Boolean);globalThis.gAccts=gAccts;
export function acctAt(a,k){if(k>=TK)return +a.bal||0;let v=null;Object.keys(a.months||{}).sort().forEach(m=>{if(m<=k)v=a.months[m]});return v}
export function linkedSaved(g,k=S.cur){return allocAt(k).out[g.id]||0}
// Change in linked balances during month k. The month an account starts being tracked counts from its first balance, not from 0.
// Investment accounts (brokerage, IRA, 401(k)/403(b)): balances move with the market, so "saved this month" counts
// contributions, not the balance change. Contributions come from Plaid's investment transactions (a.flows, + = money in).
export const isInv=a=>!!a&&a.type==='investment';globalThis.isInv=isInv;
// A contribution "from home" matches a checking/savings payment of the same amount within 5 days (a Roth IRA transfer).
// One with no match came straight from a paycheck (401(k)/403(b)) and never was take-home pay.
export function fromHome(f){const day=d=>Date.parse(d)/864e5;return BK.tx.some(t=>acctType(t.account)==='depository'&&Math.abs(t.amount-f.amt)<0.01&&Math.abs(day(t.date)-day(f.date))<=5)}
export function flowsIn(a,k,home){return r2((a.flows||[]).filter(f=>f.date&&f.date.slice(0,7)===k&&(home==null||fromHome(f)===home)).reduce((x,f)=>x+(+f.amt||0),0))}
// This goal's share of an account in month k (0..1), from how the account's balance is divided.
export function goalShare(aid,gid,k){const a=(BK.accts||[]).find(x=>x.id===aid),B=a?acctAt(a,k):0,v=(allocAt(k).by[aid]||{})[gid]||0;return B>0?v/B:0}
// Change in this goal's linked accounts during month k that counts as saving (Budget totals, "saved this month"):
// savings accounts = change in its share; investment accounts = its share of contributions from take-home pay.
export function linkedChange(g,k=S.cur){let x=0;Object.entries(S.alloc||{}).forEach(([aid,e])=>{if(!(e.goals||[]).includes(g.id))return;const a=(BK.accts||[]).find(y=>y.id===aid);if(!a)return;
 if(isInv(a))x+=goalShare(aid,g.id,k)*flowsIn(a,k,true);else x+=((allocAt(k).by[aid]||{})[g.id]||0)-((allocPrev(k).by[aid]||{})[g.id]||0)});return r2(x)}
// For the goal card: this month's contributions (all, and the part from paychecks) and market change on investment accounts.
export function invInfo(g,k=S.cur){const o={has:false,contrib:0,payroll:0,market:0};Object.entries(S.alloc||{}).forEach(([aid,e])=>{if(!(e.goals||[]).includes(g.id))return;const a=(BK.accts||[]).find(y=>y.id===aid);if(!isInv(a))return;o.has=true;
 const sh=goalShare(aid,g.id,k),all=flowsIn(a,k),pay=flowsIn(a,k,false),chg=((allocAt(k).by[aid]||{})[g.id]||0)-((allocPrev(k).by[aid]||{})[g.id]||0);o.contrib+=sh*all;o.payroll+=sh*pay;o.market+=chg-sh*all});
 ['contrib','payroll','market'].forEach(f=>o[f]=r2(o[f]));return o}
export function goalSaved(g,k=S.cur){return manualSaved(g,k)+linkedSaved(g,k)}
export const savedIn=(g,k=S.cur)=>(+(MO(k).dep[g.id]||0))+(gLinked(g)?linkedChange(g,k):0);globalThis.savedIn=savedIn;
export function essentials(k=S.cur){const p=plan(k);let e=0;p.groups.forEach(g=>g.items.forEach(i=>{if(!i.once)e+=+i.amt||0}));S.loans.forEach(l=>e+=loanMin(l,k));return e}
export const target=(g,k=S.cur)=>g.kind==='emergency'&&g.auto?Math.round(6*essentials(k)):+g.target||0;globalThis.target=target;
export function goalOv(g,k){const v=S.months[k]&&S.months[k].gplan&&S.months[k].gplan[g.id];return v==null?null:+v}
// Usual monthly amount: versions g.mp (v4; the old single g.monthly became a version from the start).
export const goalMon=(g,k)=>alPlan('g:'+g.id,k);globalThis.goalMon=goalMon;
// Planned for month k: that month's own amount if set, else the usual amount plus any Extra money share. From this
// month on it never goes past the target (using the projection), so a goal stops taking money once it's reached.
// The schedule simulation (xsBuild) already caps a goal at what's left to its target, so this is its share.
export function goalPlan(g,k){const ov=goalOv(g,k);if(ov!=null)return ov;return exShare('g:'+g.id,k)}
// Projected balance at the end of month k: real up to last month; this month adds what's left of its plan; later
// months add their plan. Cached per render (GP, cleared with LP).

export function goalProj(g,k){if(k<TK)return goalSaved(g,k);const key=g.id+'|'+k;if(GP[key]!=null)return GP[key];
 return GP[key]=k===TK?goalSaved(g,TK)+Math.max(0,goalPlan(g,TK)-savedIn(g,TK)):goalProj(g,addM(k,-1))+goalPlan(g,k)}
// The month the projection reaches the target (TK when already there), or null if it never does at this pace.
export function goalEta(g){const t=target(g,TK);if(!(t>0))return null;if(goalSaved(g,TK)>=t-0.5)return TK;for(let k=TK,n=0;n<600;n++,k=addM(k,1)){if(goalProj(g,k)>=target(g,k)-0.5)return k}return null}
// With a target date: what it takes per month from now (this month included) to get there.
export function goalNeed(g){if(!g.by)return null;const t=target(g,TK),n=Math.max(1,mdiff(TK,g.by)+1);return Math.max(0,(t-goalSaved(g,TK)+savedIn(g,TK))/n)}
// ---------- Schedule: every planned amount to a goal or loan, with a start and an optional stop ----------
// S.al[] = {id, to:'g:<goal>'|'l:<loan>'|'snow'|'keep', src:'plan'|'extra', mode:'$'|'%', v, from:'YYYY-MM',
// until:'YYYY-MM'|'' , how:'rate'|'bal', loans:[ids] (snowball: only these; empty = all), roll (snowball: add the
// minimums of its loans once they're paid off)}.
//  src 'plan'  = a set amount every month that goes in the budget like a bill (goal savings, a loan extra, a snowball).
//  src 'extra' = a share of what the plan leaves over (fixed $ or %), applied top to bottom in list order.
// A loan's share stops when it's paid off and a goal's when it reaches its target; until stops it at a month.
// WF: Forecast what-ifs, set only while the Forecast is drawn, then cleared, so no other screen sees them.

export const alAt=k=>{const A=(S.al||[]).filter(a=>a.from<=k&&(!a.until||k<=a.until));return WF.extra&&k>=TK?[{id:'wf',to:'snow',src:'plan',mode:'$',v:WF.extra,how:'rate',roll:false,loans:[]},...A]:A};globalThis.alAt=alAt;
export const alPlan=(to,k)=>(S.al||[]).filter(a=>a.src==='plan'&&a.to===to&&a.from<=k&&(!a.until||k<=a.until)).reduce((x,a)=>x+(+a.v||0),0);globalThis.alPlan=alPlan;
export const xmAt=k=>alAt(k).filter(a=>a.src==='extra');globalThis.xmAt=xmAt;
export const snowR=()=>alAt(xStart()).find(a=>a.to==='snow'&&a.id!=='wf');globalThis.snowR=snowR;
// End an allocation before month m (removing it if it hadn't started yet).
export function alEnd(a,m){if(a.from>=m)S.al=S.al.filter(x=>x!==a);else if(!a.until||a.until>=m)a.until=addM(m,-1)}
// Set the planned monthly amount for one goal or loan from month m on (the boxes on cards and in Build budget).
export function alSet(to,m,v){S.al||(S.al=[]);S.al.filter(a=>a.src==='plan'&&a.to===to).forEach(a=>alEnd(a,m));if(v>0.004)S.al.push({id:uid(),to,src:'plan',mode:'$',v:r2(v),from:m,until:''});if(!S.al.length)delete S.al}

// One forward simulation, month by month: loan balances, goal balances, set amounts, then the left-over pool and the
// left-over rules. Shares feed loanXtra and goalPlan; paid-off loans free their minimums for snowballs. While it runs
// (NOX) shares count as 0, so nothing goes in circles. Keys: dest = total share, 'p|'+dest = set part,
// 'x|'+dest = left-over part, pool (after set amounts), keep, snow.

export function exShare(dest,k){if(NOX||(!(S.al&&S.al.length)&&!WF.extra))return 0;const x=xsBuild()[k];return x?(x[dest]||0):0}
export function xsBuild(){if(XS)return XS;XS={};const A=S.al||[];if(!A.length&&!WF.extra)return XS;NOX=true;try{
 const L=S.loans.map(l=>({l,P:path(l,'a'),rt:l.apr/1200,b:0,on:false,done:false,doneAt:''})),G=S.goals.map(g=>({g,b:0})),rowAt=(o,k)=>{const i=mdiff(o.l.start,k);return i>=0&&i<o.P.length?o.P[i]:null};
 let k=[...A.map(a=>a.from),...(WF.extra?[TK]:[])].sort()[0];const bs=budStart();if(bs&&k<bs)k=bs;if(k>TK)k=TK;const end=addM(TK,360);
 for(;k<=end;k=addM(k,1)){const fut=k>=TK,p=plan(k),out={pool:0,keep:0,snow:0},R=alAt(k);
  if(k===TK){L.forEach(o=>{const r=rowAt(o,k);o.on=true;o.b=k<o.l.start?o.l.bal:r?r.open:0;o.paidNow=!!(r&&r.lg);o.close=r?r.close:0;if(!r&&k>=o.l.start){o.done=true;o.doneAt=k}});G.forEach(o=>{o.b=goalSaved(o.g,TK)-savedIn(o.g,TK)})}
  let inc=fut?WF.inc:0,bills=fut?WF.cost:0;p.income.forEach(i=>inc+=+i.amt||0);p.groups.forEach(g=>g.items.forEach(i=>bills+=+i.amt||0));
  const LB=L.map(o=>{const ov=loanXo(o.l,k);if(!fut){const r=rowAt(o,k);return{o,ov,base:r?Math.min(o.l.min,r.open+r.int)+(ov||0):k<o.l.start?o.l.min:0,room:r||k<o.l.start?Infinity:0}}
   if(o.done||o.b<=0.005)return{o,ov,base:0,room:0};const int=o.b*o.rt,due=o.b+int,mn=Math.min(o.l.min,due),base=Math.min(due,mn+(ov||0));return{o,ov,int,base,room:o.paidNow&&k===TK?0:Math.max(0,due-base)}});
  const GB=G.map(o=>{const g=o.g,t=target(g,k),ov=goalOv(g,k),base=ov!=null?ov:0;return{o,ov,base,room:ov!=null?0:t>0?(fut?Math.max(0,t-o.b-base):(goalSaved(g,addM(k,-1))>=t?0:Infinity)):Infinity}});
  const give=(a,key,amt)=>{if(amt<=0.004)return;out[key]=r2((out[key]||0)+amt);const pk=(a.src==='plan'?'p|':'x|')+key;out[pk]=r2((out[pk]||0)+amt)};
  const freed=a=>a.roll===false?0:L.filter(o=>o.done&&o.doneAt&&o.doneAt<k&&o.doneAt>=a.from&&(!(a.loans&&a.loans.length)||a.loans.includes(o.l.id))).reduce((x,o)=>x+o.l.min,0);
  const apply=(a,want)=>{let used=0;if(want<=0.004)return 0;
   if(a.to==='keep'){give(a,'keep',want);return want}
   if(a.to.startsWith('g:')){const x=GB.find(y=>'g:'+y.o.g.id===a.to);if(x){used=Math.min(want,x.room);x.room-=used;give(a,a.to,used)}return used}
   if(a.to.startsWith('l:')){const x=LB.find(y=>'l:'+y.o.l.id===a.to);if(x&&!(a.src==='plan'&&x.ov!=null)){used=Math.min(want,x.room);x.room-=used;give(a,a.to,used)}return used}
   const sel=LB.filter(x=>x.room>0.005&&(!(a.loans&&a.loans.length)||a.loans.includes(x.o.l.id))).sort(a.how==='bal'?(p,q)=>p.o.b-q.o.b:(p,q)=>q.o.l.apr-p.o.l.apr||p.o.b-q.o.b);
   for(const x of sel){if(want-used<=0.005)break;const v=Math.min(want-used,x.room);x.room-=v;used+=v;give(a,'l:'+x.o.l.id,v);out['s|l:'+x.o.l.id]=r2((out['s|l:'+x.o.l.id]||0)+v)}out.snow=r2(out.snow+used);return used};
  let set=0;R.filter(a=>a.src==='plan').forEach(a=>{set+=apply(a,(+a.v||0)+(a.to==='snow'?freed(a):0))});
  let rem=Math.max(0,inc-bills-LB.reduce((a,x)=>a+x.base,0)-GB.reduce((a,x)=>a+x.base,0)-set);out.pool=r2(rem);
  R.filter(a=>a.src==='extra').forEach(a=>{if(rem<=0.005)return;const want=Math.min(rem,a.mode==='%'?rem*(+a.v||0)/100:(+a.v||0)+(a.to==='snow'?freed(a):0));rem-=apply(a,want)});
  out.keep=r2((out.keep||0)+rem);XS[k]=out;
  if(fut){LB.forEach(x=>{const o=x.o;if(o.done)return;if(k===TK&&o.paidNow){o.b=o.close}else if(o.b>0.005){o.b=Math.max(0,o.b+x.int-x.base-(out['l:'+o.l.id]||0))}if(o.b<=0.005){o.done=true;o.doneAt=k}});
   GB.forEach(x=>{x.o.b+=x.base+(out['g:'+x.o.g.id]||0)})}}
 }finally{NOX=false;LP={};GP={}}return XS}   // paths/projections cached while shares were 0 are dropped
export const xmOn=k=>xmAt(k).some(a=>a.id!=='wf');globalThis.xmOn=xmOn;
export const destName=to=>to==='keep'?'Kept in checking':to==='snow'?'Snowball':to.startsWith('g:')?((S.goals.find(g=>'g:'+g.id===to)||{}).name||'Removed goal'):((S.loans.find(l=>'l:'+l.id===to)||{}).name||'Removed loan');globalThis.destName=destName;
export function totals(k=S.cur){const p=plan(k),m=MO(k);let inc=0,incA=0,incN=0,fixed=0,fixedA=0,fixedN=0,flexP=0,flexA=0,flexN=0,flexItems=0;
 p.income.forEach(i=>{inc+=+i.amt||0;incA+=incActual(k,i);if(!i.once&&incGot(k,i.id))incN++});
 p.groups.forEach(g=>g.items.forEach(i=>{if(g.flex){flexItems++;flexP+=+i.amt||0;const fa=flexAct(k,i.id);if(fa!=null){flexA+=fa;flexN++}else flexA+=seenNone(k,i)?0:+i.amt||0}else{fixed+=+i.amt||0;const pd=billPaid(k,i.id);fixedA+=pd?pd.amt:seenNone(k,i)?0:+i.amt||0;if(pd)fixedN++}}));
 let loans=0,loansA=0;S.loans.forEach(l=>{loans+=loanPlan(l,k);const r=k<l.start?null:row(l,k);loansA+=r?r.pay:(k<l.start?l.min:0)});
 let save=0,saveA=0;S.goals.forEach(g=>{save+=goalPlan(g,k);saveA+=savedIn(g,k)});
 if(k>=TK&&(WF.inc||WF.cost)){inc+=WF.inc;incA+=WF.inc;fixed+=WF.cost;fixedA+=WF.cost}
 return{inc,incA,incN,fixed,fixedA,fixedN,flexP,flexA,flexN,flexItems,loans,loansA,save,saveA,left:inc-fixed-flexP-loans-save}}


/* ---------- small helpers ---------- */
export const PV={};globalThis.PV=PV;
// el._cu: a newer cu on the same element (a React re-render keeps it) stops the older animation, as a redraw did.
export function cu(el,k,to,fmt=f0){if(!el)return;const from=PV[k],id=el._cu=(el._cu||0)+1;PV[k]=to;if(from===undefined||from===to||RM){el.textContent=fmt(to);return}const t0=performance.now();const step=t=>{if(el._cu!==id)return;const p=Math.min(1,(t-t0)/800),e=1-Math.pow(1-p,4);el.textContent=fmt(from+(to-from)*e);if(p<1)requestAnimationFrame(step)};el.textContent=fmt(from);requestAnimationFrame(step)}
export function toast(t){const e=$('#toast');e.textContent=t;e.classList.add('on');clearTimeout(toastT);toastT=setTimeout(()=>e.classList.remove('on'),2600)}
export const OPEN=new Set(),WI={};globalThis.OPEN=OPEN;globalThis.WI=WI;
// Collapsible setup areas (Build steps, Loans setup, Accounts for goals). BCL holds 'k' (closed) or '!k' (open on
// purpose); areas without either use their default. Saved per browser.
try{BCL=new Set(JSON.parse(localStorage.getItem('pfb_bcl')||'[]'))}catch(_){}
export const isShut=(k,def=false)=>BCL.has(k)?true:BCL.has('!'+k)?false:def;globalThis.isShut=isShut;
export function bcSet(k,shut){BCL.delete(k);BCL.delete('!'+k);BCL.add(shut?k:'!'+k);try{localStorage.setItem('pfb_bcl',JSON.stringify([...BCL]))}catch(_){}}
// Header of a collapsible card: title, a one-line summary shown while closed, and a chevron.
export const clh=(k,shut,title,sum,tag='h2')=>`<${tag} class="clh" data-act="bcol" data-v="${k}" role="button" tabindex="0" aria-expanded="${!shut}">${title}<small class="bsm">${sum||''}</small><i class="chev" aria-hidden="true"></i></${tag}>`;globalThis.clh=clh;
export const ring=(pct,c,sz=118)=>{const R=sz/2-10,L=2*Math.PI*R,p=Math.max(0,Math.min(1,pct));return `<svg class="ring" viewBox="0 0 ${sz} ${sz}" aria-hidden="true"><circle cx="${sz/2}" cy="${sz/2}" r="${R}" fill="none" stroke="var(--s3)" stroke-width="12"/><circle cx="${sz/2}" cy="${sz/2}" r="${R}" fill="none" stroke="${c}" stroke-width="12" stroke-linecap="round" stroke-dasharray="${p*L} ${L}" transform="rotate(-90 ${sz/2} ${sz/2})" opacity="${p>0.004?1:0}"/><text x="50%" y="53%" text-anchor="middle" dominant-baseline="middle" fill="var(--text)" font-family="Inter Display,Inter" font-weight="800" font-size="24" letter-spacing="-.5">${Math.round(p*100)}%</text></svg>`};globalThis.ring=ring;
// An item with no planned amount ($0 or blank) is tracked only: what it spends (or a bill it pays) counts in Spent and
// Left over like anything else, but it's never "over plan". unplannedA(k) = what those items spent in month k, which
// every over/under comparison leaves out (Budget summary, ledger, Compare, review, History, alerts).
export const hasPlan=i=>(+i.amt||0)>0.5;globalThis.hasPlan=hasPlan;
export function unplannedA(k){let u=0;plan(k).groups.forEach(g=>g.items.forEach(i=>{if(hasPlan(i))return;if(g.flex)u+=flexAct(k,i.id)||0;else{const pd=billPaid(k,i.id);if(pd)u+=pd.amt}}));return u}
// A finished month: a line linked to the bank (it has a rule) that saw nothing spent or paid spent $0, not its plan.
// Lines tracked by hand, set-aside bills (their monthly set-aside is real) and this or later months still count the plan.
export const seenNone=(k,i)=>SRV&&k<TK&&!(+i.freq>1)&&rulesFor('i:'+i.id).length>0;globalThis.seenNone=seenNone;
