'use strict';
/* ---------- bank (Plaid) ---------- */
let FLQ='';
const BK={st:null,tx:[],loans:null,accts:null,err:'',show:40,busy:false};
const bankFrom=()=>S.bankFrom||(TK+'-01');
async function bankLoad(){if(!SRV)return;try{const[a,b,c,e]=await Promise.all([fetch('api/bank/status',{cache:'no-store'}),fetch('api/bank/transactions?from='+bankFrom(),{cache:'no-store'}),fetch('api/bank/loans',{cache:'no-store'}),fetch('api/bank/accounts',{cache:'no-store'})]);BK.st=await a.json();if(b.ok){BK.tx=(await b.json()).tx||[];PSET=new Set(BK.tx.filter(t=>t.pending).map(t=>t.id))}if(c.ok)BK.loans=(await c.json()).accounts||[];if(e.ok)BK.accts=(await e.json()).accounts||[];BK.err=''}catch(e){BK.err='Couldn’t reach the bank service on the server.'}
 autoSave();
 rerender();bankBadge();notifyAlerts()}
// Files what it can and saves that as an auto-only change (see fsFlush).
function autoSave(){if(!autoFile())return false;if(!FS.dirty)FS.autoOnly=true;AUTOSAVE=true;save();AUTOSAVE=false;return true}
/* ---------- filing rules: tie a payment once, the rest file themselves ---------- */
// Names carry changing reference numbers, so matching uses words only: digits and punctuation are dropped.
const normT=s=>String(s||'').toUpperCase().replace(/[^A-Z&' ]+/g,' ').split(/\s+/).filter(w=>w.length>1).join(' ');
const normName=t=>(normT(t.merchant)+' '+normT(t.name)).trim();
const STOPW=new Set(['POS','ACH','DEBIT','CREDIT','PURCHASE','RECURRING','ONLINE','CHECKCARD','WEB','PMT','TST','SQ','SP','PP','INST','THE','AUTH']);
// Words that make a different kind of purchase at the same store (Costco vs Costco Gas).
const QUAL=new Set(['GAS','FUEL','PHARMACY','PHARM','RX','CAR','WASH','OPTICAL','PHOTO','TIRE','TIRES','BAKERY','LIQUOR','WINE','MKTPLACE','MARKETPLACE','PRIME','MUSIC','KINDLE','DIGITAL','EXPRESS','TRAVEL','AUTO','STATION','SERVICE','INSURANCE']);
function patternOf(t){const w=normT(t.merchant||t.name).split(' ').filter(Boolean);while(w.length>1&&STOPW.has(w[0]))w.shift();let n=Math.min(3,w.length);if(w.slice(0,n).join(' ').length<8)n=Math.min(4,w.length);if(/^(TRANSFER|XFER|ZELLE|VENMO|PAYPAL)$/.test(w[0]))n=Math.min(5,w.length);let p=w.slice(0,n).join(' ');
 if(t.merchant){const nm=normT(t.name);if(nm.startsWith(p+' ')){const nx=nm.slice(p.length+1).split(' ')[0];if(QUAL.has(nx))p+=' '+nx}}return p}
const tdir=t=>t.amount<0?'in':'out';
// Names that cover many unrelated payments (payment apps, plain transfers). Links to these default to "around this amount".
const GENERICP=/^(VENMO|ZELLE|PAYPAL|CASH APP|SQUARE CASH|APPLE CASH|ONLINE TRANSFER|TRANSFER|CHECK|ATM|MOBILE DEPOSIT|DEPOSIT|WITHDRAWAL)\b/;
const acctType=id=>{const a=(BK.accts||[]).find(x=>x.id===id);return a?a.type:''};
// Month a payment counts in under rule r: the month paid, unless the rule moves payments made in the last 5 days of a
// month to the next month (shift 'next', rent paid early) or the first 5 days back a month (shift 'prev', paid late).
function ruleMonth(t,r){const k=t.date.slice(0,7),d=+t.date.slice(8,10),[y,m]=k.split('-').map(Number),last=new Date(y,m,0).getDate();
 if(r&&r.shift==='next'&&d>last-5)return addM(k,1);if(r&&r.shift==='prev'&&d<=5)return addM(k,-1);return k}
function ruleFor(t){let best=null;const nm=normName(t),a=Math.abs(t.amount);(S.rules||[]).forEach(r=>{if(r.dir!==tdir(t)||!r.p||!nm.includes(r.p))return;if(r.x&&r.x.some(x=>nm.includes(x)))return;if(r.min!=null&&a<r.min-0.005)return;if(r.max!=null&&a>r.max+0.005)return;if(!best||r.p.length>best.p.length)best=r});return best}
function addRule(p,dir,v,min,max,x){S.rules||(S.rules=[]);p=normT(p);let r=S.rules.find(y=>y.p===p&&y.dir===dir);if(!r){r={id:uid(),p,dir};S.rules.push(r)}r.v=v;if(x&&x.length)r.x=x;else delete r.x;if(min!=null){r.min=min;r.max=max}else{delete r.min;delete r.max}return r}
const rulesFor=v=>(S.rules||[]).filter(r=>r.v===v);
function defAlways(v,k){if(!v||v==='skip'||v==='once')return false;if(v.startsWith('i:')){const x=allItems(k).find(x=>x.i.id===v.slice(2));return !!x&&!x.g.flex}return true}
// A checking or savings payment and the same amount arriving on another connected card, loan or account within 5 days
// is one transfer. Both sides are filed as a transfer, so a card or loan payment never counts as spending.
const isXferish=t=>/^(TRANSFER_|LOAN_PAYMENTS)/.test((t.pfc&&t.pfc[0])||'');
// What rolls into Flex when nothing else claims it: purchases from checking or a card, payment apps (Venmo,
// PayPal, Zelle), and money back on a card (refunds lower Flex). Left for review: deposits into checking,
// loan and card payments, and transfers between your own accounts.
function flexable(t){const P=(t.pfc&&t.pfc[0])||'',D=(t.pfc&&t.pfc[1])||'',ty=acctType(t.account);if(ty!=='depository'&&ty!=='credit')return false;
 if(P==='LOAN_PAYMENTS')return false;
 if(t.amount>0)return P!=='TRANSFER_OUT'||/FROM_APPS/.test(D);
 return ty==='credit'}
// The item unfiled purchases roll into: the flex item called "Flex", else the first item of a group named Flex…, else the first flex item.
// The automatic choice: the flex item called Flex…, else the first item of a group named Flex…, else the first flex item.
function flexDefaultAuto(k){const p=plan(k),F=p.groups.filter(g=>g.flex),all=F.flatMap(g=>g.items);const a=all.find(i=>/^flex/i.test(i.name))||(F.find(g=>/flex/i.test(g.name))||{items:[]}).items[0]||all[0];return a?a.id:null}
function flexDefault(k){if(S.catchAll==='review')return null;if(S.catchAll&&allItems(k).some(x=>x.i.id===S.catchAll))return S.catchAll;const p=plan(k),F=p.groups.filter(g=>g.flex),all=F.flatMap(g=>g.items);const a=all.find(i=>/^flex/i.test(i.name))||(F.find(g=>/flex/i.test(g.name))||{items:[]}).items[0]||all[0];return a?a.id:null}
// Pending charges (not posted yet). Shown with a Pending tag; they file like any other transaction.
let PSET=new Set();const PND=id=>PSET.has(id)?' <span class="pnd">Pending</span>':'';
function txPairs(){const ins=BK.tx.filter(t=>t.amount<0&&!t.pending),used=new Set(),out=new Map(),day=d=>Date.parse(d)/864e5;
 BK.tx.filter(t=>t.amount>0&&!t.pending&&acctType(t.account)==='depository').sort((a,b)=>a.date.localeCompare(b.date)).forEach(o=>{
  const m=ins.find(i=>!used.has(i.id)&&i.account!==o.account&&Math.abs(i.amount+o.amount)<0.005&&Math.abs(day(i.date)-day(o.date))<=5&&(['credit','loan'].includes(acctType(i.account))||(isXferish(o)&&isXferish(i))));
  if(m){used.add(m.id);out.set(o.id,m.id);out.set(m.id,o.id)}});return out}
let TXI=null;
// Filed transactions by month and target, built from S.txd. Bill payments and income received come from here.
function txIdx(){if(TXI)return TXI;TXI={};Object.entries(S.txd||{}).forEach(([id,r])=>{if(!r||!r.v||!r.k)return;const a=TXI[r.k]||(TXI[r.k]={}),e=a[r.v]||(a[r.v]={amt:0,list:[]});e.amt=r2(e.amt+(+r.amt||0));e.list.push({id,d:r.d,n:r.n,amt:r.amt,auto:r.auto})});return TXI}
function billPaid(k,id){const e=txIdx()[k]?.['i:'+id];if(!e||!e.list.length)return null;const it=sinkIt(k,id);return it?{...e,amt:r2((+it.amt||0)/+it.freq),real:e.amt,sink:true}:e}
const sinkIt=(k,id)=>{for(const g of basePlan(k).groups)if(!g.flex)for(const i of g.items)if(i.id===id&&+i.freq>1)return i;return null};
// A set-aside bill's fund at the end of month k: set-asides since the budget start less what was paid from it.
function sinkFund(id,k){let f=0;for(let m=budStart()||k,n=0;m<=k&&n<600;m=addM(m,1),n++){const it=sinkIt(m,id);if(!it)continue;f+=(+it.amt||0)/+it.freq;const e=txIdx()[m]?.['i:'+id];if(e)f-=e.amt}return r2(f)}
// Income that counts for month k: what arrived for past months; for this month paychecks are still coming, so never less than planned.
// "Actual" flow chart: what really happened so far. A row tied to the bank shows what was paid or received
// (nothing yet = $0); a row with no bank link keeps its planned amount.
// Groceries/flex actual for an item. With bank sync it's what is filed there (bank + entries added by hand), worked
// out fresh from S.txd every time so it can't drift. A month with nothing filed falls back to an amount typed by hand.
function flexAct(k,id){const m=MO(k),typed=m.act?m.act[id]:undefined;if(!SRV)return typed!=null?typed:null;const e=txIdx()[k]?.['i:'+id],man=(m.rc||[]).filter(r=>!r.bank&&r.item===id).reduce((a,r)=>a+(+r.amt||0),0);
 if(e&&e.list.length)return r2(e.amt+man);if(man)return r2(man);return typed!=null?typed:null}
function chartItem(g,i,k){const lk=rulesFor('i:'+i.id).length>0;if(g.flex){const a=flexAct(k,i.id);return a!=null?a:(lk?0:+i.amt||0)}const pd=billPaid(k,i.id);return pd?pd.amt:(lk?0:+i.amt||0)}
function chartInc(k,i){if(i.once)return +i.amt||0;const g=incGot(k,i.id);return g?g.amt:(rulesFor('inc:'+i.id).length?0:+i.amt||0)}
function incActual(k,i){const g=i.once?null:incGot(k,i.id),pl=+i.amt||0;return g?(k>=TK?Math.max(g.amt,pl):g.amt):pl}
function incGot(k,id){const e=txIdx()[k]?.['inc:'+id];return e&&e.list.length?{amt:-e.amt,list:e.list}:null}
// Files every unreviewed transaction since the review start date that pairs up or matches a rule. Returns how many.
// A pending charge that posted: Plaid drops the pending id and sends the posted one with ppid = the old id.
// A filing you made by hand moves to the posted transaction (same category and month, posted amount);
// an automatic one is just redone by autoFile. A pending charge that vanished without posting (a released
// hold) is unfiled. If the bank kept the same id, the filing is refreshed with the posted amount.
function pendCarry(){const byId=new Map(BK.tx.map(t=>[t.id,t]));let n=0;
 BK.tx.forEach(t=>{if(!t.ppid||t.pending)return;if(S.noAuto&&S.noAuto[t.ppid]){S.noAuto[t.id]=1;delete S.noAuto[t.ppid]}const o=S.txd[t.ppid];if(!o)return;txUndo(t.ppid);if(!o.auto&&!S.txd[t.id])txAssign(t,o.v,undefined,o.k);n++});
 Object.entries(S.txd).forEach(([id,r])=>{if(!r.pend)return;const t=byId.get(id);if(!t){if(r.d>=bankFrom()){txUndo(id);n++}return}if(t.pending)return;const o={...r};txUndo(id);txAssign(t,o.v,o.auto,o.k);n++});
 if(n){TXI=null;LP={}}return n}
function autoFile(){if(!SRV||!BK.tx.length||!BK.accts)return 0;S.txd||(S.txd={});let n=pendCarry();const f=bankFrom(),P=txPairs(),no=S.noAuto||{};
 const gone=S.txGone||{};BK.tx.forEach(t=>{if(t.date<f||S.txd[t.id]||no[t.id]||gone[t.id])return;
  if(P.has(t.id)){const o=P.get(t.id);if(S.txd[o]&&!['xfer','skip'].includes(S.txd[o].v)&&S.txd[o].auto!=='pair')return;
   const ot=t.amount>0&&BK.tx.find(x=>x.id===o),ln=ot&&S.loans.find(l=>l.acct&&l.paySrc==='bank'&&l.acct===ot.account);if(ln){txAssign(t,'l:'+ln.id,'pair');S.txd[t.id].pair=o;n++;return}S.txd[t.id]={v:'xfer',k:t.date.slice(0,7),amt:r2(t.amount),d:t.date,n:t.merchant||t.name,auto:'pair',pair:o};n++;return}
  const r=ruleFor(t),km=r?ruleMonth(t,r):null;if(r&&txTargets(km).ok(r.v)&&!((r.v.startsWith('inc:')||r.v==='once')&&acctType(t.account)!=='depository')){txAssign(t,r.v,r.id,km);n++;return}
  // Anything else that's a plain purchase rolls into Flex spending. Transfers, loan and card payments and
  // payment apps (Plaid's TRANSFER_* / LOAN_PAYMENTS) stay in review, since they're often rent or money between accounts.
  if(!r&&flexable(t)){const fx=flexDefault(t.date.slice(0,7));if(fx){txAssign(t,'i:'+fx,'rest');n++}}});
 if(n){TXI=null;LP={}}return n}
// Budget rows: what's been paid or received this month, and the link to tie payments to the row.
// Status under a bill. Everything about its link (payments, matching names) lives in the pop-up the status opens.
function billLine(i,g){const fq=g?`<select class="in fq" data-k="item" data-g="${g.id}" data-id="${i.id}" data-f="freq" aria-label="How often ${esc(i.name)} is due">${[[1,'Monthly'],[3,'Every 3 months'],[6,'Twice a year'],[12,'Yearly']].map(([v,l])=>`<option value="${v}"${(+i.freq||1)===v?' selected':''}>${l}</option>`).join('')}</select>${+i.freq>1?`<select class="in fq" data-k="item" data-g="${g.id}" data-id="${i.id}" data-f="dm" aria-label="Month ${esc(i.name)} is due">${MN.map((m,x)=>`<option value="${x+1}"${(+i.dm||1)===x+1?' selected':''}>${+i.freq===12?'Due ':'Next due '}${m}</option>`).join('')}</select><span class="dim" style="font-size:12.5px">sets aside ${f0(i.amt)}/mo</span>`:''}`:'';if(!SRV)return fq?`<div class="bst">${fq}</div>`:'';const k=S.cur,pd=billPaid(k,i.id),rl=rulesFor('i:'+i.id),due=+i.due||0;
 if(+i.freq>1&&!pd&&!isDue(i,k))return `<div class="bst">${fq}<button type="button" class="pill ok" data-act="catTx" data-v="i:${i.id}">Set aside · ${f0(sinkFund(i.id,k))} so far</button></div>`;
 if(pd)return `<div class="bst">${fq}<button type="button" class="pill ok" data-act="catTx" data-v="i:${i.id}" title="See payments and links">Paid ${f2(pd.amt)} · ${pd.list.length>1?pd.list.length+' payments':dshort(pd.list[0].d)}</button></div>`;
 if(!rl.length)return `<div class="bst">${fq}<button type="button" class="pill" data-act="catTx" data-v="i:${i.id}" title="See payments">See payments</button><button class="lnk" data-act="lnkPay" data-kind="bill" data-id="${i.id}">Link payment</button></div>`;
 let st='Linked',cls='pill';if(k<TK){st='Not seen';cls='pill bad'}else if(k===TK){if(due&&NOW.getDate()>due+3){st='Not seen yet';cls='pill hot'}else st=due?'Due the '+ord(due):'Waiting'}
 return `<div class="bst">${fq}<button type="button" class="${cls}" data-act="catTx" data-v="i:${i.id}" title="See payments and links">${st}</button></div>`}
function incLine(i){if(!SRV)return '';const k=S.cur,g=incGot(k,i.id),rl=rulesFor('inc:'+i.id);
 if(g)return `<div class="bst inc"><button type="button" class="pill${g.amt>=(+i.amt||0)-0.5||k<TK?' ok':''}" data-act="catTx" data-v="inc:${i.id}" title="See deposits and links">Received ${f2(g.amt)}${k===TK&&g.amt<(+i.amt||0)-0.5?' of '+f0(+i.amt||0):''} · ${g.list.length>1?g.list.length+' deposits':dshort(g.list[0].d)}</button></div>`;
 if(!rl.length)return `<div class="bst inc"><button type="button" class="pill" data-act="catTx" data-v="inc:${i.id}" title="See deposits">See deposits</button><button class="lnk" data-act="lnkPay" data-kind="inc" data-id="${i.id}">Flag a deposit</button></div>`;
 return `<div class="bst inc"><button type="button" class="pill" data-act="catTx" data-v="inc:${i.id}" title="See deposits and links">${k<=TK?'Expected':'Linked'}</button></div>`}
// Link dialog: pick one payment (grouped by name), confirm the matching text, file all of them.
let LK=null;
const titleC=s=>s.split(' ').map(w=>w[0]+w.slice(1).toLowerCase()).join(' ');
// One row per merchant. A name without Plaid's merchant field joins the merchant it starts with
// ("KROGER #123 ANYTOWN ST" → Kroger), longest first so Costco Gas stays apart from Costco.
function merchKeys(){const M=new Set();BK.tx.forEach(t=>{if(t.merchant)M.add(patternOf(t))});return [...M].sort((a,b)=>b.length-a.length)}
function merchKey(t,MK){if(t.merchant)return patternOf(t);const nm=normT(t.name),m=MK.find(x=>nm===x||nm.startsWith(x+' '));return m||patternOf(t)}
function lnkOpen(kind,id){if(!SRV||!BK.tx.length){toast('Connect your bank in the Bank tab first');return}
 const k=S.cur,it=kind==='loan'?S.loans.find(x=>x.id===id):kind==='goal'?S.goals.find(x=>x.id===id):kind==='inc'?plan(k).income.find(x=>x.id===id):(allItems(k).find(x=>x.i.id===id)||{}).i;if(!it)return;
 LK={kind,id,v:(kind==='loan'?'l:':kind==='goal'?'g:':kind==='inc'?'inc:':'i:')+id,name:it.name,amt:kind==='goal'?0:kind==='loan'?+it.min||0:+it.amt||0,dir:kind==='inc'?'in':'out',sels:[],pat:'',ref:0,refs:{},wide:{},q:'',amtOn:false,move:false,sibOn:false,MK:merchKeys()};
 const R=rulesFor(LK.v);LK.sels=R.map(r=>r.p);LK.shift=R.some(r=>r.shift==='next');if(R.length===1){LK.pat=R[0].p;LK.amtOn=R[0].min!=null;LK.ref=R[0].min!=null?r2((R[0].min+R[0].max)/2):0;if(R[0].min!=null)LK.refs[R[0].p]=LK.ref}
 const since=dshort(bankFrom());
 $('#lt').textContent=kind==='goal'?`Which transfers go to ${it.name}?`:kind==='inc'?`Which deposits are ${it.name}?`:kind==='flex'?`Which stores go to ${it.name}?`:`Find the payment for ${it.name}`;
 $('#ls').textContent=kind==='goal'?`Tick the transfers into the account this goal lives in. Each one counts as a deposit to ${it.name}. Transfers between accounts the app can see already pair up and aren't listed.`:kind==='flex'?`Tick every store that belongs here. Purchases there since ${since} are filed to ${it.name}, and new ones file themselves.`:kind==='inc'?`Tick the deposit (or each one, if it arrives from more than one place). Every one like it since ${since} is filed here, and new ones file themselves.`:kind==='loan'?`Tick the payment to your lender (or each one, if you pay it more than one way). Every one like it since ${since} counts as a payment on ${it.name}, extra payments included, and new ones file themselves.`:`Tick the payment (or each one, if it's paid more than one way). Every one like it since ${since} is filed here, and new ones file themselves.`;
 $('#lq').value='';$('#ldel').hidden=!R.length;$('#ldel').textContent=R.length>1?'Remove all links':'Remove link';lnkList();$('#ldlg').showModal()}
// Candidate rows grouped by merchant. With a search, only matching rows show; ticked rows always stay listed.
function lnkCands(){const L=LK,words=normT(L.name).split(' ').filter(w=>w.length>=3&&!GENERIC.has(w.toLowerCase())),q=normT(L.q),G=new Map();
 BK.tx.forEach(t=>{if(tdir(t)!==L.dir)return;if(L.dir==='in'&&acctType(t.account)!=='depository')return;if(L.kind==='goal'&&!goalTx(t))return;const r=S.txd&&S.txd[t.id];if(r&&r.auto==='pair')return;
  const nm=normName(t),p=merchKey(t,L.MK),a=Math.abs(t.amount);
  let g=G.get(p);if(!g){g={p,n:0,lo:1e12,hi:0,last:'',t,acct:'',filed:{},sc:0,near:a,mn:{},hit:false};G.set(p,g)}
  g.n++;if(!q||nm.includes(q))g.hit=true;if(t.merchant)g.mn[t.merchant]=(g.mn[t.merchant]||0)+1;
  if(L.amt>0&&Math.abs(a-L.amt)<Math.abs(g.near-L.amt))g.near=a;g.lo=Math.min(g.lo,a);g.hi=Math.max(g.hi,a);
  if(t.date>g.last){g.last=t.date;g.t=t;const ac=(BK.accts||[]).find(x=>x.id===t.account);g.acct=ac?ac.institution+(ac.mask?' ••'+ac.mask:''):''}
  if(r)g.filed[r.v]=(g.filed[r.v]||0)+1;
  let sc=0;if(L.amt>0&&L.kind!=='flex')sc+=Math.max(0,1-Math.abs(a-L.amt)/L.amt)*3;words.forEach(w=>{if(nm.includes(w))sc+=4});if(r&&r.v===L.v)sc+=6;g.sc=Math.max(g.sc,sc)});
 const all=[...G.values()].map(g=>{const top=Object.entries(g.mn).sort((a,b)=>b[1]-a[1])[0];return{...g,label:top&&normT(top[0])===g.p?top[0]:titleC(g.p),sc:g.sc+Math.min(3,g.n/3)}});
 all.forEach(g=>{L.refs[g.p]??=r2(L.amt>0?g.near:Math.abs(g.t.amount));L.wide[g.p]=GENERICP.test(g.p)&&g.hi>g.lo*1.5});
 const on=all.filter(g=>L.sels.includes(g.p)),off=all.filter(g=>!L.sels.includes(g.p)&&g.hit).sort((a,b)=>b.sc-a.sc||b.last.localeCompare(a.last));
 return [...on,...off.slice(0,60)]}
function lnkList(){const C=lnkCands();$('#lpick').innerHTML=C.length?C.map(g=>{const other=Object.keys(g.filed).filter(v=>v!==LK.v)[0];return `<label><input type="checkbox" name="lp" value="${esc(g.p)}" ${LK.sels.includes(g.p)?'checked':''}><span style="min-width:0"><b>${esc(g.label)}</b><small>Last ${dshort(g.last)}${g.n>1?' · '+g.n+' times':''} · ${esc(g.acct)}${g.filed[LK.v]?' · already filed here':other?' · filed as '+esc(txLabel({v:other,k:g.last.slice(0,7)})):''}</small></span><b class="n">${g.lo===g.hi?f2(g.lo):f0(g.lo)+'–'+f0(g.hi)}</b></label>`}).join(''):'<p class="dim" style="padding:12px 2px">No matching transactions since '+dshort(bankFrom())+'.</p>';lnkRule()}
const lnkSingle=()=>LK.sels.length===1;
// The text each rule matches: the edited text when one row is ticked, otherwise each ticked merchant.
function lnkPats(){if(lnkSingle()){const p=normT(LK.pat);return p?[p]:[]}return LK.sels.slice()}
// More specific names that start with p (Costco → Costco Gas) and aren't ticked themselves.
function lnkSibs(p){const c={};if(!p)return[];BK.tx.forEach(t=>{if(tdir(t)!==LK.dir)return;const q=merchKey(t,LK.MK);if(q!==p&&q.startsWith(p+' ')&&!LK.sels.includes(q)&&normName(t).includes(p))c[q]=(c[q]||0)+1});return Object.entries(c)}
function lnkExclFor(p){return lnkSingle()&&LK.sibOn?[]:lnkSibs(p).map(([q])=>q)}
// Goal transfer flags only list money moved out of checking or savings (Plaid's TRANSFER_OUT).
const goalTx=t=>acctType(t.account)==='depository'&&/^TRANSFER_OUT/.test((t.pfc&&t.pfc[0])||'');
function lnkMatches(){const P=lnkPats().map(p=>({p,x:lnkExclFor(p)})),one=lnkSingle(),ref=LK.ref;if(!P.length)return[];
 return BK.tx.filter(t=>{if(tdir(t)!==LK.dir)return false;if(LK.kind==='goal'&&!goalTx(t))return false;if(LK.dir==='in'&&acctType(t.account)!=='depository')return false;if(S.txd&&S.txd[t.id]&&S.txd[t.id].auto==='pair')return false;
  const nm=normName(t);if(!P.some(({p,x})=>nm.includes(p)&&!x.some(y=>nm.includes(y))))return false;return !(one&&LK.amtOn&&ref)||Math.abs(Math.abs(t.amount)-ref)<=ref*.25})}
function lnkRule(){const el=$('#lrule');if(!LK.sels.length){el.innerHTML='';$('#lok').disabled=true;return}
 const one=lnkSingle();
 el.innerHTML=(one?`<label class="f">Match transactions whose name contains<input class="in" id="lpat" value="${esc(LK.pat)}" autocomplete="off"></label>${LK.ref?`<label class="chk"><input type="checkbox" id="lamt" ${LK.amtOn?'checked':''}>Only amounts around ${f0(LK.ref)} (±25%)</label>`:''}<label class="chk" id="lsibl"><input type="checkbox" id="lsib" ${LK.sibOn?'checked':''}><span id="lsibt"></span></label>`
  :`<p class="mut" style="font-size:14px">${LK.sels.length} ticked: ${esc(LK.sels.map(titleC).join(', '))}</p>`)+`${LK.kind!=='flex'?`<label class="chk"><input type="checkbox" id="lshift" ${LK.shift?'checked':''}>Count ${LK.kind==='inc'?'deposits':'payments'} made in the last 5 days of a month toward the next month</label>`:''}<label class="chk" id="lmovel"><input type="checkbox" id="lmove" ${LK.move?'checked':''}><span id="lmovet"></span></label><p class="dim" id="lcount" style="font-size:13.5px;margin-top:8px"></p>`;
 if(one){$('#lpat').addEventListener('input',e=>{LK.pat=e.target.value;lnkCount()});$('#lamt')?.addEventListener('change',e=>{LK.amtOn=e.target.checked;lnkCount()});$('#lsib').addEventListener('change',e=>{LK.sibOn=e.target.checked;lnkCount()})}
 $('#lmove').addEventListener('change',e=>{LK.move=e.target.checked});$('#lshift')?.addEventListener('change',e=>{LK.shift=e.target.checked});lnkCount()}
function lnkCount(){const M=lnkMatches(),d=S.txd||{},here=M.filter(t=>d[t.id]&&d[t.id].v===LK.v).length,other=M.filter(t=>d[t.id]&&d[t.id].v!==LK.v).length,un=M.length-here-other;
 $('#lcount').innerHTML=M.length?`Matches <b>${M.length}</b> since ${dshort(bankFrom())}: ${un} not filed yet${here?`, ${here} already here`:''}${other?`, ${other} filed somewhere else`:''}.`:'Nothing matches that text.';
 if($('#lsibl')){const sb=lnkSibs(normT(LK.pat));$('#lsibl').hidden=!sb.length;$('#lsibt').textContent=`Also include ${sb.map(([q,n])=>titleC(q)+' ('+n+')').join(', ')}`}
 $('#lmovel').hidden=!other;$('#lmovet').textContent=`Also move the ${other} filed somewhere else to ${LK.name}`;$('#lok').disabled=!M.length}
// Payments between your own accounts that were filed as spending or income before pairing existed.
// Loan filings are left alone: a linked loan's balance wins, so they never double count.
function pairIssues(){if(!BK.accts)return[];const P=txPairs(),out=[];P.forEach((o,id)=>{const r=S.txd&&S.txd[id];if(r&&(r.v.startsWith('i:')||r.v.startsWith('inc:')||r.v==='once'))out.push({id,o,r})});return out}
function pairCard(){const I=pairIssues();if(!I.length)return '';return `<section class="card" style="margin-top:16px"><div class="bh"><div><h2>Possible double counts (${I.length})</h2><p>These are payments between your own accounts, like checking to a card or loan, but they’re filed as spending or income. The purchases on the card already count.</p></div><button class="btn sm" data-act="fixPairs">Make ${I.length===1?'it a transfer':'them transfers'}</button></div>${I.slice(0,30).map(({r})=>`<div class="txr dn"><span class="txd">${dshort(r.d)}</span><div class="nm"><b>${esc(r.n)}</b><small>${esc(txLabel(r))}</small></div><b class="txa">${f2(Math.abs(r.amt))}</b></div>`).join('')}</section>`}
// Details: every transaction filed to one category this month, with a picker to move any of them.
let CT=null;
function catOpen(v){CT=v;CR='month';$('#tdq').value='';catRender();$('#tdlg').showModal()}
// Hides rows that don't match the search and shows the matching count and total.
function catFilter(){const q=($('#tdq').value||'').trim().toLowerCase(),rows=[...document.querySelectorAll('#tdl .trow')];let n=0,t=0;
 rows.forEach(r=>{const ok=!q||(r.dataset.txt||'').includes(q);r.hidden=!ok;if(ok){n++;t+=+r.dataset.amt||0}});const f=$('#tdf');f.hidden=!q;f.textContent=q?`${n} of ${rows.length} match · ${f2(t)}`:''}
let CR='month';
// Does rule r match transaction t (same test as ruleFor, for one rule)?
function ruleHit(r,t){if(r.dir!==tdir(t)||!r.p)return false;const nm=normName(t),a=Math.abs(t.amount);if(!nm.includes(r.p))return false;if(r.x&&r.x.some(x=>nm.includes(x)))return false;if(r.min!=null&&a<r.min-0.005)return false;if(r.max!=null&&a>r.max+0.005)return false;return true}
// One transaction row in the pop-up, with Move (category + month).
// Which rule filed a transaction, for the pop-up and Filed lists.
const ruleTag=id=>{const x=(S.rules||[]).find(y=>y.id===id);return x?`rule “${esc(titleC(x.p))}”`:'auto'};
function catRow(x,v,sgn){const r=S.txd[x.id]||{},t=BK.tx.find(y=>y.id===x.id),ac=t&&(BK.accts||[]).find(a=>a.id===t.account),moved=x.d&&r.k&&x.d.slice(0,7)!==r.k,tag=[r.auto==='rest'?'catch-all':r.auto==='pair'?'paired transfer':r.auto?ruleTag(r.auto):'',moved?`paid in ${mon(x.d.slice(0,7))}, counts in ${mon(r.k)}`:''].filter(Boolean).join(' · ');
 return `<div class="trow" data-txt="${esc((x.n+' '+(ac?ac.institution+' '+(ac.mask||''):'')+' '+tag).toLowerCase())}" data-amt="${sgn(+x.amt||0)}"><span class="txd">${dshort(x.d)}</span><div class="nm"><b>${esc(x.n)}${PND(x.id)}</b><small>${ac?esc(ac.institution)+(ac.mask?' ••'+esc(ac.mask):''):''}${tag?` · ${tag}`:''}</small></div><b class="n">${f2(sgn(+x.amt||0))}</b><button type="button" class="lnk" data-act="mvShow" data-id="${esc(x.id)}" style="font-size:13px;padding:0">Move</button><div class="mvp" data-mvp="${esc(x.id)}" hidden><label>Category<select class="in" data-mv="${esc(x.id)}" aria-label="Category for ${esc(x.n)}">${txOptions(r.k||S.cur,v,x.amt<0?'in':'out')}</select></label><label>Counts in<select class="in" data-mm="${esc(x.id)}" aria-label="Month ${esc(x.n)} counts in">${[...new Set([addM(x.d.slice(0,7),-1),x.d.slice(0,7),addM(x.d.slice(0,7),1),r.k].filter(Boolean))].sort().map(m=>`<option value="${m}"${m===r.k?' selected':''}>${lab(m)}${m===x.d.slice(0,7)?' (when paid)':''}</option>`).join('')}</select></label></div></div>`}
// Payments from the same payee that are filed somewhere else (or not at all): by this category's rules, or, with no
// rules, the same merchants it already has at a similar amount.
function samePayee(v,inc,from){const R=rulesFor(v),mine=Object.keys(S.txd||{}).filter(id=>S.txd[id].v===v),MK=merchKeys(),dir=inc?'in':'out',keys=new Set(),amts=[];
 mine.forEach(id=>{const t=BK.tx.find(y=>y.id===id);if(t){keys.add(merchKey(t,MK));amts.push(Math.abs(t.amount))}});amts.sort((a,b)=>a-b);const med=amts[Math.floor(amts.length/2)]||0;
 return BK.tx.filter(t=>{if(t.date.slice(0,7)<from||tdir(t)!==dir)return false;const r=S.txd&&S.txd[t.id];if(r&&(r.v===v||r.auto==='pair'))return false;if((S.txGone||{})[t.id])return false;
  if(R.length)return R.some(x=>ruleHit(x,t));return keys.has(merchKey(t,MK))&&(!med||Math.abs(Math.abs(t.amount)-med)<=med*.25)}).sort((a,b)=>b.date.localeCompare(a.date))}
function catRender(){if(!CT)return;const k=S.cur,v=CT,inc=v.startsWith('inc:'),isL=v.startsWith('l:'),id=v.slice(inc?4:2),all=CR==='all';
 const isG=v.startsWith('g:'),goal=isG?S.goals.find(g=>g.id===id):null,loan=isL?S.loans.find(l=>l.id===id):null,x0=inc||isL||isG?null:allItems(k).find(x=>x.i.id===id),nm=isG?(goal||{}).name:isL?(loan||{}).name:inc?(plan(k).income.find(i=>i.id===id)||{}).name:(x0?x0.i.name:''),kind=isG?'goal':isL?'loan':inc?'inc':x0&&x0.g.flex?'flex':'bill';
 const L=Object.entries(S.txd||{}).filter(([,r])=>r.v===v&&(all||r.k===k)).map(([tid,r])=>({id:tid,d:r.d,n:r.n,amt:r.amt,k:r.k})).sort((a,b)=>(b.k+(b.d||'')).localeCompare(a.k+(a.d||'')));
 const note=isL&&loan?loanNote(loan,k):'';
 const man=inc||isL||isG?[]:Object.keys(S.months).filter(m=>all||m===k).flatMap(m=>(S.months[m].rc||[]).filter(r=>!r.bank&&r.item===id).map(r=>({...r,k:m})));
 const sgn=a=>inc?-a:a,tot=L.reduce((a,x)=>a+sgn(+x.amt||0),0)+man.reduce((a,r)=>a+(+r.amt||0),0),n=L.length+man.length,R=rulesFor(v),what=inc?'deposit':isG?'transfer':kind==='flex'?'purchase':'payment';
 const months=new Set(L.map(x=>x.k)).size||1;
 $('#tdt').textContent=nm||'Category';$('#tds').innerHTML=`${all?'All months':lab(k)} · <b style="color:var(--text)">${f2(tot)}</b> · ${n} ${what}${n===1?'':'s'}${all&&n?` · about ${f0(tot/months)} a month`:''}`;
 $('#tdr').innerHTML=`<small class="mut">${kind==='flex'?'Stores that file here on their own':inc?'Deposits that file here on their own':isG?'Transfers that count as deposits here':'Payments that file here on their own'}</small><div class="chips">${R.map(r=>`<span class="pill">${esc(titleC(r.p))}<button type="button" class="x" data-act="catRuleDel" data-id="${r.id}" aria-label="Stop filing ${esc(titleC(r.p))} here">×</button></span>`).join('')||'<span class="dim" style="font-size:13.5px">None yet</span>'}${isL&&(!loan||!bankSrc(loan))?'':`<button type="button" class="btn g sm" data-act="catLink" data-kind="${kind}" data-id="${id}">${kind==='flex'?(R.length?'Add stores':'Link stores'):R.length?'Change':inc?'Flag a deposit':isG?'Flag transfers':'Link payment'}</button>`}</div>${note}${isG&&goal?`<p class="dim" style="font-size:13.5px;margin-top:10px">Saved toward ${esc(goal.name)}: <b style="color:var(--text)">${f0(goalSaved(goal,k))}</b>${gLinked(goal)?` (${f0(linkedSaved(goal,k))} from accounts)`:''}. Deposits you log by hand are on the Goals tab.</p>`:''}`;
 $('#tdrg').innerHTML=`<button type="button" class="${CR==='month'?'on':''}" data-act="crng" data-v="month">${mon(k)}</button><button type="button" class="${all?'on':''}" data-act="crng" data-v="all">All months</button><button type="button" class="${CR==='trend'?'on':''}" data-act="crng" data-v="trend">Trends</button>`;
 // Trends reuses the flow-details renderer, then moves its body into this pop-up.
 $('#tdq').hidden=CR==='trend';if(CR==='trend'){$('#tdf').hidden=true;FD=CT;flowRender();FD=null;const fb=$('#fdb');fb.querySelector('.dact')?.remove();$('#tds').innerHTML=$('#fds').innerHTML;$('#tdl').innerHTML=fb.innerHTML;fb.innerHTML='';return}
 // rows, with a month heading when showing all months
 let h='',last='';L.forEach(x=>{if(all&&x.k!==last){last=x.k;const mt=L.filter(y=>y.k===x.k).reduce((a,y)=>a+sgn(+y.amt||0),0);h+=`<div class="tmon"><b>${lab(x.k)}</b><span>${f2(mt)}</span></div>`}h+=catRow(x,v,sgn)});
 h+=man.map(r=>`<div class="trow" data-txt="${esc(((r.store||'')+' added by hand').toLowerCase())}" data-amt="${+r.amt||0}"><span class="txd">${r.date?dshort(r.date):''}</span><div class="nm"><b>${esc(r.store||'Entry')}</b><small>Added by hand${all?' · '+mon(r.k):''}</small></div><b class="n">${f2(+r.amt||0)}</b><span></span></div>`).join('');
 const SP=samePayee(v,inc,all?'0000':k);
 if(SP.length)h+=`<div class="tmon other"><b>Same payee, filed somewhere else</b><span>${SP.length}</span></div>`+SP.slice(0,40).map(t=>{const r=S.txd&&S.txd[t.id];return `<div class="trow" data-txt="${esc(((t.merchant||t.name)+' '+(r?txLabel(r):'not filed')).toLowerCase())}" data-amt="0"><span class="txd">${dshort(t.date)}</span><div class="nm"><b>${esc(t.merchant||t.name)}${PND(t.id)}</b><small>${r?'Filed as '+esc(txLabel(r))+(r.k!==t.date.slice(0,7)?' in '+mon(r.k):''):'Not filed yet'}</small></div><b class="n">${f2(sgn(+t.amount||0))}</b><button type="button" class="lnk" data-act="mvHere" data-id="${esc(t.id)}" style="font-size:13px;padding:0">Move here</button></div>`}).join('');
 $('#tdl').innerHTML=h||`<p class="dim" style="padding:14px 2px">Nothing filed here ${all?'yet':'in '+mon(k)}.</p>`;catFilter()}
const txOf=(id,r)=>BK.tx.find(x=>x.id===id)||{id,date:r.d,amount:r.amt,name:r.n,merchant:'',account:''};
// Counts a filed transaction in another month, keeping its category. Chosen by hand, so it's no longer "auto".
function monthMove(id,k){const r=S.txd&&S.txd[id];if(!r||r.k===k)return;const v=r.v;txUndo(id);txAssign(txOf(id,r),v,undefined,k);
 toast(`${r.n} now counts in ${lab(k)}`);commit();catRender()}
function mvPanel(id,r,dir){const base=(r.d||'').slice(0,7)||r.k,ms=[...new Set([addM(base,-1),base,addM(base,1),r.k].filter(Boolean))].sort();
 return `<div class="mvp" data-mvp="${esc(id)}" hidden>${r.v!=='split'&&!r.sp&&Math.abs(+r.amt||0)>0.02?`<button class="lnk" data-act="spOpen" data-id="${esc(id)}" style="grid-column:1/-1;justify-self:start">Split between categories…</button><div class="spf" data-spf="${esc(id)}" hidden></div>`:''}<label>Category<select class="in" data-mv="${esc(id)}" aria-label="Category for ${esc(r.n)}">${txOptions(r.k,r.v,dir)}</select></label><label>Counts in<select class="in" data-mm="${esc(id)}" aria-label="Month ${esc(r.n)} counts in">${ms.map(m=>`<option value="${m}"${m===r.k?' selected':''}>${lab(m)}${m===base?' (when paid)':''}</option>`).join('')}</select></label></div>`}
// What a loan counts as paid this month and where that number comes from, for its pop-up.
function loanNote(l,k){const r=k<l.start?null:row(l,k);if(!r)return '';const mn=Math.min(l.min,r.open+r.int),ex=r.pay-mn>0.5?` · ${f0(r.pay-mn)} above the minimum`:'';
 if(r.auto)return `<p class="dim" style="font-size:13.5px;margin-top:10px">${esc(l.link?l.link.inst:'Your lender')} shows <b style="color:var(--text)">${f2(r.pay)}</b> paid in ${mon(k)}${ex}. Linked loans use the lender's numbers, so an extra payment is counted however it's filed below.</p>`;
 if(r.lg)return `<p class="dim" style="font-size:13.5px;margin-top:10px">Counted as paid: <b style="color:var(--text)">${f2(r.pay)}</b>${ex}. That's the total of payments filed here plus any you logged by hand.</p>`;
 return `<p class="dim" style="font-size:13.5px;margin-top:10px">Nothing paid yet in ${mon(k)}. Move a payment here from the Bank tab, or log one in Loans.</p>`}
function catMove(id,v){const r=S.txd&&S.txd[id];if(!r||r.v===v)return;const t=txOf(id,r),sp=r.sp;
 txUndo(id);txAssign(t,v,undefined,r.k);if(sp&&S.txd[id])S.txd[id].sp=sp;toast(`Moved ${r.n} to ${txLabel({v,k:r.k})}`);commit();catRender()}
// Recurring charges sitting in Flex (or unfiled) with no rule: same merchant in 3+ different months at a steady amount.
// Everyday spending (food, gas, shopping, travel) only looks like a subscription when the amount barely changes.
const SPEND_CAT=/^(FOOD_AND_DRINK|TRANSPORTATION|GENERAL_MERCHANDISE|TRAVEL)/;
function recurring(){if(!SRV||!BK.tx.length)return[];const MK=merchKeys(),G={},no=S.notBill||{},k6=addM(TK,-6);
 BK.tx.forEach(t=>{if(t.amount<=0||t.date.slice(0,7)<k6||isXferish(t))return;const rr=ruleFor(t);if(rr&&txTargets(t.date.slice(0,7)).ok(rr.v))return;const r=S.txd&&S.txd[t.id];if(r){if(!r.v.startsWith('i:'))return;const x=allItems(r.k).find(y=>y.i.id===r.v.slice(2));if(x&&!x.g.flex)return}
  const p=merchKey(t,MK);if(no[p])return;(G[p]||(G[p]=[])).push(t)});
 return Object.entries(G).map(([p,L])=>{const ms=new Set(L.map(t=>t.date.slice(0,7))),A=L.map(t=>t.amount).sort((a,b)=>a-b),med=A[Math.floor(A.length/2)],D=L.map(t=>+t.date.slice(8)).sort((a,b)=>a-b);
  const top=L.find(t=>t.merchant&&normT(t.merchant)===p),pc={};L.forEach(t=>{const c=(t.pfc||[])[0]||'';pc[c]=(pc[c]||0)+1});const cat=Object.entries(pc).sort((a,b)=>b[1]-a[1])[0][0];return{p,cat,label:top?top.merchant:titleC(p),n:L.length,months:ms.size,amt:r2(med),lo:A[0],hi:A[A.length-1],day:D[Math.floor(D.length/2)],last:L.map(t=>t.date).sort().pop(),first:L.map(t=>t.date).sort()[0].slice(0,7)}})
  .filter(x=>x.months>=3&&x.n<=x.months*1.5&&x.last>=addM(TK,-1)&&(SPEND_CAT.test(x.cat)?x.hi<=x.lo*1.05+0.5:x.hi<=x.lo*1.35+1)).sort((a,b)=>b.amt-a.amt)}
function recCard(){const R=recurring(),IG=Object.keys(S.notBill||{});if(!R.length&&!IG.length)return '';const G=plan().groups.filter(g=>!g.flex),def=(G.find(g=>/subscr/i.test(g.name))||G[0]||{}).id;if(!G.length)return '';
 const ign=IG.length?`<details class="more" data-key="recign"${OPEN.has('recign')?' open':''} style="margin-top:8px"><summary>Ignored suggestions (${IG.length})</summary>${IG.map(p=>`<div class="bki"><div class="nm"><b>${esc(titleC(p))}</b></div><button class="btn g sm" data-act="recBack" data-id="${esc(p)}">Show again</button></div>`).join('')}</details>`:'';
 if(!R.length)return `<div class="rec" style="padding:8px 16px">${ign}</div>`;
 return `<div class="rec"><div class="bh" style="margin-bottom:4px"><div><h3 style="font-size:18px">Looks like a bill or subscription</h3><p class="mut" style="font-size:14px">These charge you about the same amount every month but aren’t tied to a bill, so they’re rolling into Flex spending.</p></div></div>${R.slice(0,8).map(x=>`<div class="bki"><div class="nm"><b>${esc(x.label)}</b><small>About ${f2(x.amt)} a month · usually the ${ord(x.day)} · seen ${x.months} months</small></div><select class="in" data-recg="${esc(x.p)}" aria-label="Add ${esc(x.label)} to group">${G.map(g=>`<option value="${g.id}"${g.id===def?' selected':''}>${esc(g.name)}</option>`).join('')}</select><button class="btn sm" data-act="recAdd" data-id="${esc(x.p)}">Add as bill</button><button class="btn g sm" data-act="recNo" data-id="${esc(x.p)}" title="Stop suggesting this one">Ignore</button></div>`).join('')}${ign}</div>`}
// Adds the charge as a bill in the chosen group from this month on, links it, and moves its past charges out of Flex.
function recAdd(p){const x=recurring().find(y=>y.p===p);if(!x)return;const sel=document.querySelector(`select[data-recg="${CSS.escape(p)}"]`),gid=sel&&sel.value;const id=uid();
 const k0=INB?scopeStart():(x.first<S.cur?x.first:S.cur);editPlan(pl=>{const g=pl.groups.find(y=>y.id===gid)||pl.groups.find(y=>!y.flex);if(g)g.items.push({id,name:x.label,amt:x.amt,due:x.day})},k0);
 addRule(p,'out','i:'+id,null,null,lnkSibsFor(p));
 BK.tx.forEach(t=>{const r=S.txd&&S.txd[t.id];if(!r||!r.v.startsWith('i:')||!(ruleFor(t)&&ruleFor(t).v==='i:'+id))return;const it=allItems(r.k).find(y=>y.i.id===r.v.slice(2));if(r.auto==='rest'||(it&&it.g.flex))txUndo(t.id)});
 autoFile();toast(`Added ${x.label} as a bill from ${labS(k0)} on`);commit()}
// More specific merchant names under p that a new rule for p should leave out (Costco → not Costco Gas).
function lnkSibsFor(p){const MK=merchKeys(),c=new Set();BK.tx.forEach(t=>{const q=merchKey(t,MK);if(q!==p&&q.startsWith(p+' '))c.add(q)});return [...c]}
// When items are deleted (from this month on), their rules go and this month's and later filings are re-filed:
// purchases fall back to Flex, and a deleted bill's merchant shows up as a suggestion again.
function itemGone(ids,from=S.cur){if(!SRV)return 0;if(S.catchAll&&ids.includes(S.catchAll))delete S.catchAll;const V=new Set(ids.map(x=>'i:'+x));S.rules=(S.rules||[]).filter(r=>!V.has(r.v));let n=0;
 Object.entries(S.txd||{}).forEach(([tid,r])=>{if(V.has(r.v)&&r.k>=from){txUndo(tid);n++}});if(n)autoFile();return n}
// First month whose plan still has any of these items. Deleting can reach back that far if the person wants.
function itemsFrom(ids){return Object.keys(S.plans).sort().find(k=>S.plans[k].groups.some(g=>g.items.some(i=>ids.includes(i.id))))||S.cur}
function delFrom(ids,name){const f=itemsFrom(ids);if(f>=S.cur)return S.cur;return confirm(`Also remove ${name} from earlier months, back to ${labS(f)}?

OK removes it everywhere and sends its transactions back to Flex spending.
Cancel keeps it in months before ${mon(S.cur)}.`)?f:S.cur}
// Re-files what a rule filed on its own, after the rule's text, target or amounts change.
function ruleReapply(r){Object.entries(S.txd||{}).forEach(([tid,x])=>{if(x.auto===r.id)txUndo(tid)});autoFile()}
