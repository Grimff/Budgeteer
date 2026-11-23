'use strict';
/* ---------- sample household (?demo) and self-test (?selftest) ---------- */
// ?demo opens a made-up household that lives only in this tab: demoFetch answers every api/ call in the page (budget,
// bank status, transactions, loans, accounts), and the browser copy uses its own keys (KEY ends in _demo), so your real
// budget and bank data are never read or written. ?selftest loads the same household and checks the math and screens.
const REALFETCH=window.fetch.bind(window);let DEMOD=null;
if(DEMO)window.fetch=(u,o)=>demoFetch(u,o);
// Small seeded random numbers, so the sample household (and the self-test's expected numbers) are the same every run.
function demoRand(seed){let a=seed>>>0;return()=>{a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296}}
function sampleData(){const R=demoRand(20261122),amt=(a,b)=>r2(a+R()*(b-a)),start=addM(TK,-6),today=new Date().toISOString().slice(0,10),tx=[];let n=0;
 const day=(k,d)=>{const[y,m]=k.split('-').map(Number),last=new Date(y,m,0).getDate();return k+'-'+String(Math.min(d,last)).padStart(2,'0')};
 const add=(account,date,name,amount,merchant='',pfc=null)=>{if(date<=today)tx.push({id:'s'+(n++),item:account==='sloan'?'it-loan':'it-bank',account,date,name,merchant,amount:r2(amount),pending:false,ppid:'',pfc})};
 const insM=+start.slice(5)%12+1;   // car insurance is paid every 6 months, starting the month after the sample starts
 for(let k=start;k<=TK;k=addM(k,1)){
  add('chk',day(k,1),'ACME CORP PAYROLL',-2600,'',['INCOME','INCOME_WAGES']);add('chk',day(k,15),'ACME CORP PAYROLL',-2600,'',['INCOME','INCOME_WAGES']);
  add('chk',day(k,1),'OAKWOOD APARTMENTS RENT',1850,'',['RENT_AND_UTILITIES','RENT_AND_UTILITIES_RENT']);
  add('chk',day(k,12),'CITY POWER & LIGHT',amt(85,140),'City Power',['RENT_AND_UTILITIES','RENT_AND_UTILITIES_GAS_AND_ELECTRICITY']);
  add('chk',day(k,18),'FASTNET INTERNET',70,'Fastnet',['RENT_AND_UTILITIES','RENT_AND_UTILITIES_INTERNET_AND_CABLE']);
  add('card',day(k,20),'MOBILE PHONE CO',85,'Mobile Phone Co',['RENT_AND_UTILITIES','RENT_AND_UTILITIES_TELEPHONE']);
  add('card',day(k,8),'STREAMFLIX',15.99,'Streamflix',['ENTERTAINMENT','ENTERTAINMENT_TV_AND_MOVIES']);
  if(+k.slice(5)===insM||+k.slice(5)===(insM+5)%12+1)add('chk',day(k,22),'SAFEDRIVE INSURANCE',600,'SafeDrive',['GENERAL_SERVICES','GENERAL_SERVICES_INSURANCE']);
  add('chk',day(k,10),'AUTOLEND PAYMENT',380,'',['LOAN_PAYMENTS','LOAN_PAYMENTS_CAR_PAYMENT']);
  add('chk',day(k,5),'SAMPLE LOAN SERVICER PAYMENT',320,'',['LOAN_PAYMENTS','LOAN_PAYMENTS_STUDENT_LOAN_PAYMENT']);add('sloan',day(k,5),'PAYMENT RECEIVED',-320,'',['LOAN_PAYMENTS','LOAN_PAYMENTS_STUDENT_LOAN_PAYMENT']);
  add('chk',day(k,16),'TRANSFER TO SAVINGS',400,'',['TRANSFER_OUT','TRANSFER_OUT_SAVINGS']);add('sav',day(k,16),'TRANSFER FROM CHECKING',-400,'',['TRANSFER_IN','TRANSFER_IN_ACCOUNT_TRANSFER']);
  for(const d of[3,7,11,14,19,23,27])add('card',day(k,d),d===14?'GREEN GROCER':'FRESH MARKET #204',amt(45,160),d===14?'Green Grocer':'Fresh Market',['FOOD_AND_DRINK','FOOD_AND_DRINK_GROCERIES']);
  for(const d of[2,9,16,24])add('card',day(k,d),'QUICKFUEL GAS #88',amt(32,55),'QuickFuel',['TRANSPORTATION','TRANSPORTATION_GAS']);
  [[4,'CORNER BISTRO'],[13,'TACO TRUCK'],[21,'PIZZA PLACE'],[26,'CORNER BISTRO']].forEach(([d,s])=>add('card',day(k,d),s,amt(14,65),s.replace(/\b\w+/g,w=>w[0]+w.slice(1).toLowerCase()),['FOOD_AND_DRINK','FOOD_AND_DRINK_RESTAURANT']));
  [[6,'BIG BOX STORE'],[17,'ONLINE SHOP'],[25,'HARDWARE CO']].forEach(([d,s])=>add('card',day(k,d),s,amt(20,120),s.replace(/\b\w+/g,w=>w[0]+w.slice(1).toLowerCase()),['GENERAL_MERCHANDISE','GENERAL_MERCHANDISE_OTHER_GENERAL_MERCHANDISE']))}
 // Pay the card in full on the 28th for everything charged in the month (checking out, card in: filed as one transfer).
 for(let k=start;k<=TK;k=addM(k,1)){const due=tx.filter(t=>t.account==='card'&&t.date.startsWith(k)&&t.amount>0).reduce((a,t)=>a+t.amount,0);if(due>0){add('chk',day(k,28),'RWD CARD AUTOPAY',due,'',['LOAN_PAYMENTS','LOAN_PAYMENTS_CREDIT_CARD_PAYMENT']);add('card',day(k,28),'AUTOPAY PAYMENT THANK YOU',-due,'',['LOAN_PAYMENTS','LOAN_PAYMENTS_CREDIT_CARD_PAYMENT'])}}
 tx.sort((a,b)=>b.date.localeCompare(a.date));
 // Daily balances from each account's opening balance (Plaid: + = money out; on cards and loans + = more owed).
 const A={chk:{name:'Everyday Checking',mask:'1234',type:'depository',subtype:'checking',open:3200,item:'it-bank'},sav:{name:'High-Yield Savings',mask:'5678',type:'depository',subtype:'savings',open:6000,item:'it-bank'},
  card:{name:'Rewards Card',mask:'4321',type:'credit',subtype:'credit card',open:0,item:'it-bank'},sloan:{name:'Student Loan',official:'Graduate Student Loan',mask:'9001',type:'loan',subtype:'student',open:21500,item:'it-loan'},
  brok:{name:'Retirement Account',mask:'7777',type:'investment',subtype:'401k',open:42000,item:'it-inv'}};
 const days={},bal={};Object.keys(A).forEach(id=>{days[id]={};bal[id]=A[id].open});
 for(let d=new Date(start+'-01T12:00:00');d.toISOString().slice(0,10)<=today;d.setDate(d.getDate()+1)){const ds=d.toISOString().slice(0,10);
  if(ds.endsWith('-01'))bal.sloan=r2(bal.sloan*(1+4.5/1200));bal.brok=r2(bal.brok*(1+0.0002)+(ds.endsWith('-15')?500:0));
  tx.filter(t=>t.date===ds).forEach(t=>{const a=A[t.account];bal[t.account]=r2(a.type==='depository'?bal[t.account]-t.amount:bal[t.account]+t.amount)});
  Object.keys(A).forEach(id=>days[id][ds]=bal[id])}
 const months=id=>{const m={};Object.keys(days[id]).sort().forEach(d=>m[d.slice(0,7)]=days[id][d]);return m},at=new Date().toISOString();
 const inst={'it-bank':'Sample Bank','it-loan':'Sample Loan Servicer','it-inv':'Sample Brokerage'};
 const flows=Object.keys(days.brok).filter(d=>d.endsWith('-15')).map(date=>({date,amt:500,name:'Payroll contribution'}));
 const accts=Object.entries(A).map(([id,a])=>({id,item:a.item,institution:inst[a.item],name:a.name,official:a.official||'',mask:a.mask,type:a.type,subtype:a.subtype,bal:bal[id],avail:a.type==='depository'?bal[id]:null,balAt:at,months:months(id),days:days[id],
  ...(a.type==='investment'?{holdings:[{name:'Total Market Index Fund',ticker:'TMIF',type:'mutual fund',cash:false,qty:r2(bal.brok*0.8/120),price:120,value:r2(bal.brok*0.8),cost:r2(bal.brok*0.7)},{name:'Bond Index Fund',ticker:'BIF',type:'mutual fund',cash:false,qty:r2(bal.brok*0.18/50),price:50,value:r2(bal.brok*0.18),cost:r2(bal.brok*0.18)},{name:'Cash',ticker:'',type:'cash',cash:true,qty:r2(bal.brok*0.02),price:1,value:r2(bal.brok*0.02),cost:null}],holdAt:at,flows,invState:'ok'}:{})}));
 const pays=id=>{const p={},list=[];tx.filter(t=>t.account===id&&t.amount<0).forEach(t=>{const k=t.date.slice(0,7);p[k]=r2((p[k]||0)-t.amount);list.push({id:t.id,date:t.date,amt:-t.amount,name:t.name})});return{p,list}};
 const loans=['card','sloan'].map(id=>{const a=accts.find(x=>x.id===id),P=pays(id);return{id,item:a.item,institution:a.institution,name:a.name,official:a.official,mask:a.mask,type:a.type,subtype:a.subtype,bal:a.bal,balAt:at,first:Object.keys(days[id]).sort()[0],months:a.months,pays:P.p,payList:P.list.slice(0,36),
  liab:id==='sloan'?{kind:'student',apr:4.5,min:320,next:day(addM(TK,1),5),lastAmt:320,lastDate:(P.list[0]||{}).date,name:'Graduate Student Loan',at}:{kind:'credit',apr:22.9,min:35,at},liabState:'ok'}});
 const items=Object.keys(inst).map(item_id=>({kind:item_id==='it-inv'?'invest':'',item_id,institution:{name:inst[item_id]},accounts:accts.filter(a=>a.item===item_id).map(({id,name,official,mask,type,subtype,bal,avail})=>({id,name,official,mask,type,subtype,bal,avail,balAt:at})),lastSync:at,error:null,count:tx.filter(t=>t.item===item_id).length,liab:'ok',inv:item_id==='it-inv'?'ok':'none'}));
 tx.forEach(t=>{const a=A[t.account];t.accountName=`${inst[a.item]} ${a.name} ••${a.mask}`});
 // The budget: income, bills, spending, a hand-added car loan, two goals, and rules that file every sample payment.
 const I=(id,name,amt,due=0,x={})=>({id,name,amt,due,...x});
 const budget={hh:{name:'Sample household',sub:'Sample data · nothing is saved'},bankFrom:start+'-01',months:{},
  plans:{[start]:{income:[I('pay','Paychecks',5200)],groups:[
   {id:'home',name:'Home',color:C.butter,flex:false,items:[I('rent','Rent',1850,1),I('power','Electric',120,12),I('net','Internet',70,18)]},
   {id:'bills',name:'Bills and subscriptions',color:C.aqua,flex:false,items:[I('phone','Phone',85,20),I('stream','Streaming',15.99,8),I('ins','Car insurance',600,22,{freq:6,dm:insM})]},
   {id:'food',name:'Groceries',color:C.lime,flex:true,items:[I('groc','Groceries',650)]},
   {id:'flex',name:'Flex spending',color:C.lilac,flex:true,items:[I('gas','Gas',180),I('dining','Dining out',200),I('flex','Flex',350)]}]}},
  loans:[{id:'car',name:'Car loan',apr:6.9,bal:14800,min:380,due:10,start,color:C.coral}],
  goals:[{id:'emerg',name:'Emergency fund',kind:'emergency',target:15000,saved:0,color:C.aqua},{id:'trip',name:'Summer trip',target:3000,saved:600,by:addM(TK,8),color:C.sky}],
  alloc:{sav:{mode:'order',goals:['emerg'],pct:{},rest:'last'}},
  al:[{id:'al1',to:'g:trip',src:'plan',mode:'$',v:250,from:start,until:''}],
  rules:[['ACME CORP PAYROLL','in','inc:pay'],['OAKWOOD APARTMENTS','out','i:rent'],['CITY POWER','out','i:power'],['FASTNET INTERNET','out','i:net'],['MOBILE PHONE','out','i:phone'],['STREAMFLIX','out','i:stream'],['SAFEDRIVE INSURANCE','out','i:ins'],
   ['FRESH MARKET','out','i:groc'],['GREEN GROCER','out','i:groc'],['QUICKFUEL','out','i:gas'],['CORNER BISTRO','out','i:dining'],['TACO TRUCK','out','i:dining'],['PIZZA PLACE','out','i:dining'],['AUTOLEND','out','l:car']].map(([p,dir,v],i)=>({id:'r'+i,p:normT(p),dir,v}))};
 return{rev:1,budget,tx,accts,loans,items,refresh:{hours:1,open:true}}}
async function demoFetch(u,o={}){const url=new URL(String(u),location.href);if(!url.pathname.includes('/api/'))return REALFETCH(u,o);
 const p=url.pathname.slice(url.pathname.indexOf('/api/')),m=(o.method||'GET').toUpperCase(),D=DEMOD||(DEMOD=sampleData()),J=(code,b)=>new Response(JSON.stringify(b),{status:code,headers:{'Content-Type':'application/json'}}),body=()=>{try{return JSON.parse(o.body||'{}')}catch(_){return{}}};
 if(p==='/api/health')return J(200,{ok:true,app:'budgeteer',demo:true});
 if(p==='/api/rev')return J(200,{rev:D.rev});
 if(p==='/api/data'&&m==='PUT'){const b=body();if(b.baseRev!=null&&b.baseRev!==D.rev)return J(409,{error:'changed',rev:D.rev});D.rev+=2;D.budget=b.data;D.saves=(D.saves||0)+1;return J(200,{rev:D.rev,savedAt:new Date().toISOString()})}
 if(p==='/api/data')return J(200,{app:'budgeteer',rev:D.rev,data:clone(D.budget)});
 if(p==='/api/bank/status')return J(200,{configured:true,env:'sample',syncing:false,refresh:{...D.refresh,last:D.items[0].lastSync,next:null},items:D.items});
 if(p==='/api/bank/transactions'){const f=url.searchParams.get('from')||'0000';return J(200,{tx:D.tx.filter(t=>t.date>=f)})}
 if(p==='/api/bank/loans')return J(200,{accounts:D.loans});
 if(p==='/api/bank/accounts')return J(200,{accounts:D.accts});
 if(p==='/api/bank/sync')return J(200,{ok:true,added:0,items:D.items});
 if(p==='/api/bank/settings'&&m==='PUT'){Object.assign(D.refresh,body());return J(200,{ok:true,refresh:{...D.refresh}})}
 // CSV import, kept in memory like the server does it (same rules: new account or existing one, repeated rows skipped).
 if(p==='/api/bank/import'&&m==='POST'){const b=body(),T={checking:['depository','checking'],savings:['depository','savings'],credit:['credit','credit card'],loan:['loan','loan']};let it=D.items.find(x=>x.kind==='csv');
  if(!it){it={kind:'csv',item_id:'csv',institution:{name:'Imported from CSV files'},accounts:[],lastSync:null,error:null,count:0,liab:'none',inv:'none'};D.items.push(it)}
  let a=it.accounts.find(x=>x.id===b.account);if(!a){const t=T[b.newAccount&&b.newAccount.type];if(!t||!b.newAccount.name)return J(400,{error:'Pick an account, or name a new one and choose its type.'});a={id:'csv-'+uid(),name:b.newAccount.name,official:'',mask:'',type:t[0],subtype:t[1],bal:null,avail:null,balAt:null};it.accounts.push(a);D.accts.push({...a,item:'csv',institution:it.institution.name,months:{},days:{}});if(t[0]!=='depository')D.loans.push({...a,item:'csv',institution:it.institution.name,months:{},pays:{},payList:[],liab:null,liabState:'none'})}
  const seen={};let added=0,skipped=0;(b.rows||[]).forEach(r=>{const k=[a.id,r.date,r.amount,r.name].join('|');seen[k]=(seen[k]||0)+1;const id='csv-'+k+'|'+seen[k];if(D.tx.some(t=>t.id===id)){skipped++;return}D.tx.push({id,item:'csv',account:a.id,date:r.date,name:r.name,merchant:'',amount:r.amount,pending:false,ppid:'',pfc:null,accountName:'Imported '+a.name});added++});
  if(b.balance!=null){a.bal=b.balance;D.accts.filter(x=>x.id===a.id).forEach(x=>x.bal=b.balance)}it.count=D.tx.filter(t=>t.item==='csv').length;it.lastSync=new Date().toISOString();D.tx.sort((x,y)=>y.date.localeCompare(x.date));return J(200,{ok:true,added,skipped,account:a.id})}
 if(p.startsWith('/api/bank/import/')&&m==='DELETE'){const id=decodeURIComponent(p.split('/').pop()),it=D.items.find(x=>x.kind==='csv');if(!it)return J(404,{error:'unknown account'});it.accounts=it.accounts.filter(x=>x.id!==id);D.tx=D.tx.filter(t=>t.account!==id);D.accts=D.accts.filter(x=>x.id!==id);D.loans=D.loans.filter(x=>x.id!==id);if(!it.accounts.length)D.items=D.items.filter(x=>x!==it);return J(200,{ok:true})}
 if(p.startsWith('/api/notify'))return J(200,{configured:false,sent:0});   // no phone alerts from sample data
 if(p==='/api/backups')return J(200,{backups:[1,2,3].map(n=>{const at=new Date(Date.now()-n*864e5).toISOString().slice(0,10);return{id:`budgeteer-${at}.json`,kind:'daily',at,size:20000}})});
 if(p==='/api/backups/restore'&&m==='POST'){D.rev+=2;D.restored=(D.restored||0)+1;return J(200,{ok:true,rev:D.rev})}   // sample: keeps the same budget
 return J(400,{error:'Not available with sample data.'})}

// Self-test: runs once the sample household has loaded and filed. Each check compares the app's own numbers with
// figures worked out here straight from the sample transactions, then every tab and view is drawn.
async function selfTest(){const T=[],ok=(c,name,detail='')=>T.push({ok:!!c,name,detail:String(detail)}),errs=[],onErr=e=>errs.push(String(e.message||e.reason||e));
 addEventListener('error',onErr);addEventListener('unhandledrejection',onErr);
 const D=DEMOD,past=addM(TK,-1),near=(a,b)=>Math.abs(a-b)<0.01,sumTx=(k,re,acct)=>r2(D.tx.filter(t=>t.date.startsWith(k)&&re.test(t.name)&&(!acct||t.account===acct)).reduce((a,t)=>a+t.amount,0));
 try{
  ok(BK.tx.length===D.tx.length&&BK.accts.length===5,'Sample bank data loaded',`${BK.tx.length} transactions, ${BK.accts.length} accounts`);
  ok(inbox().length===0,'Every sample transaction is filed',`${inbox().length} left to review`);
  // Income, a fixed bill, groceries and dining for last month, straight from the transactions.
  const inc=incGot(past,'pay'),rent=billPaid(past,'rent'),groc=flexAct(past,'groc'),din=flexAct(past,'dining');
  ok(inc&&near(inc.amt,-sumTx(past,/PAYROLL/)),'Paychecks counted once',`${inc&&f2(inc.amt)} vs ${f2(-sumTx(past,/PAYROLL/))}`);
  ok(rent&&near(rent.amt,1850),'Rent paid',rent&&f2(rent.amt));
  ok(near(groc,sumTx(past,/FRESH MARKET|GREEN GROCER/)),'Groceries match the store charges',`${f2(groc)} vs ${f2(sumTx(past,/FRESH MARKET|GREEN GROCER/))}`);
  ok(near(din,sumTx(past,/BISTRO|TACO|PIZZA/)),'Dining matches the restaurant charges',f2(din));
  // Card payments, savings transfers and loan payments are transfers, never spending.
  const T0=totals(past),spentCard=sumTx(past,/./,'card')-sumTx(past,/AUTOPAY PAYMENT/,'card'),fixedChk=sumTx(past,/RENT|POWER|FASTNET/,'chk')+100;   // + the car insurance set-aside (600 every 6 months)
  ok(near(T0.fixedA+T0.flexA,r2(spentCard+fixedChk)),'Spending = purchases and bills (card payments and transfers left out)',`${f2(T0.fixedA+T0.flexA)} vs ${f2(spentCard+fixedChk)}`);
  ok(near(T0.loansA,380),'Car loan payment filed to the loan',f2(T0.loansA));
  // Set-aside bill: car insurance paid every 6 months counts as 100 a month.
  ok(near(plan(past).groups.find(g=>g.id==='bills').items.find(i=>i.id==='ins').amt,100),'Twice-a-year bill is set aside monthly');
  // Loans: the balance path pays off, and an extra 200/month pays off sooner with less interest.
  const car=S.loans.find(l=>l.id==='car'),base=path(car,'b'),more=path(car,'b',200);
  ok(base.length>1&&base[base.length-1].close<0.01,'Car loan pays off on schedule',`${base.length} months`);
  ok(more.length<base.length,'Extra payments pay it off sooner',`${base.length} → ${more.length} months`);
  // Goals: the emergency fund is the savings account's balance; the trip goal has a date and a monthly amount.
  const sav=BK.accts.find(a=>a.id==='sav'),em=S.goals.find(g=>g.id==='emerg'),trip=S.goals.find(g=>g.id==='trip');
  ok(near(goalSaved(em,TK),sav.bal),'Emergency fund follows the savings balance',`${f2(goalSaved(em,TK))} vs ${f2(sav.bal)}`);
  ok(goalMon(trip,TK)===250&&goalEta(trip),'Trip goal has its monthly amount and a finish month',`${f0(goalMon(trip,TK))}/month, done ${goalEta(trip)&&labS(goalEta(trip))}`);
  // Tracking the student loan from the bank: the app's balance follows the lender's.
  linkLoan('sloan');const sl=S.loans.find(l=>l.acct==='sloan'),lender=BK.loans.find(a=>a.id==='sloan').bal;
  ok(sl&&Math.abs(debtNow(sl)-lender)<1,'Tracked student loan matches the lender',sl&&`${f2(debtNow(sl))} vs ${f2(lender)}`);
  // Adding a goal gives it the usual 200 a month.
  const n0=S.goals.length;document.querySelector('.tabs button[data-t="goals"]').click();document.querySelector('[data-act="addGoal"]').click();const ng=S.goals[n0];
  ok(ng&&goalMon(ng,TK)===200,'A new goal starts at 200 a month',ng&&f0(goalMon(ng,TK)));
  // The app's own health checks.
  healthChecks().forEach(h=>ok(h.lv==='ok','Health check: '+h.t.replace(/<[^>]+>/g,''),h.lv==='ok'?'':h.d.replace(/<[^>]+>/g,'')));
  // Alerts: paid bills never show as missing; a bank that needs signing in and a category over plan do, and Hide works.
  ok(!alertsNow().some(a=>a.key.startsWith('late:')),'Paid bills don’t show as missing',alertsNow().map(a=>a.key).join(', '));
  BK.st.items[0].error={code:'ITEM_LOGIN_REQUIRED',message:'Sign in again to keep syncing.'};
  const fi=allItems(TK).find(x=>x.g.flex&&(flexAct(TK,x.i.id)||0)>1);if(fi)editPlan(p=>{const it=p.groups.find(g=>g.id===fi.g.id).items.find(i=>i.id===fi.i.id);it._was=it.amt;it.amt=1},TK);
  S.cur=TK;document.querySelector('.tabs button[data-t="budget"]').click();renderBudget();
  const keys=alertsNow().map(a=>a.key),card=document.querySelector('#T-budget .nt');
  ok(keys.includes('conn:it-bank:ITEM_LOGIN_REQUIRED')&&card&&/sign in again/.test(card.textContent),'A bank that needs signing in shows on the Budget page');
  ok(!fi||keys.includes(`over:${TK}:${fi.i.id}`),'A category over plan shows',fi?fi.i.name:'(nothing spent yet this month)');
  ntHide('conn:it-bank:ITEM_LOGIN_REQUIRED');ok(!/sign in again/.test((document.querySelector('#T-budget .nt')||{}).textContent||''),'Hide removes an alert');
  BK.st.items[0].error=null;delete NTH['conn:it-bank:ITEM_LOGIN_REQUIRED'];if(fi)editPlan(p=>{const it=p.groups.find(g=>g.id===fi.g.id).items.find(i=>i.id===fi.i.id);it.amt=it._was;delete it._was},TK);
  // CSV import: quotes, both signs and a date format are read; a purchase is filed by an existing rule; the same file
  // again adds nothing; removing the account takes its transactions away.
  const csv=`Date,Description,Amount\n${TK}-02,CORNER BISTRO,-23.50\n${TK}-02,"MYSTERY SHOP, INC","(10.00)"\n${TK}-03,REFUND FROM STORE,5.00\n${TK}-03,,1.00\n`;
  cvLoadText(csv,'test.csv');Object.assign(CV,{acct:'new',nname:'Imported Checking',ntype:'checking',bal:'1,250.00'});const c1=cvRows();
  ok(c1.rows.length===3&&c1.bad===1&&c1.rows[0].amount===23.5&&c1.rows[1].amount===10&&c1.rows[1].name==='MYSTERY SHOP, INC'&&c1.rows[2].amount===-5,'A CSV file is read correctly',JSON.stringify(c1.rows.map(r=>r.amount))+` · ${c1.bad} unreadable`);
  ok(cvDate('22/11/2026','dmy')==='2026-11-22'&&cvDate('11/22/26','mdy')==='2026-11-22'&&cvNum('1.234,56')===1234.56&&cvNum('-$5')===-5,'CSV dates and amounts in other formats');
  await cvImport();const imp=BK.tx.filter(t=>t.item==='csv'),bis=imp.find(t=>t.name==='CORNER BISTRO'),ia=BK.accts.find(a=>a.item==='csv');
  ok(imp.length===3&&ia&&ia.bal===1250,'Imported transactions and balance show up',`${imp.length} transactions, balance ${ia&&f2(ia.bal)}`);
  ok(bis&&S.txd[bis.id]&&S.txd[bis.id].v==='i:dining','An imported purchase is filed by an existing rule',bis&&S.txd[bis.id]&&S.txd[bis.id].v);
  cvLoadText(csv,'test.csv');CV.acct=ia.id;await cvImport();ok(BK.tx.filter(t=>t.item==='csv').length===3,'Importing the same file again adds nothing');
  {const cf=window.confirm;window.confirm=()=>true;try{await cvDel(ia.id)}finally{window.confirm=cf}}ok(!BK.tx.some(t=>t.item==='csv')&&!BK.accts.some(a=>a.item==='csv'),'Removing an imported account removes its transactions');
  // No plan: an item with no planned amount is tracked (counted in Spent) but never over plan — row, summary, alerts.
  const first=Object.keys(S.plans).sort()[0],setAmt=(id,v)=>editPlan(p=>p.groups.forEach(g=>g.items.forEach(i=>{if(i.id===id)i.amt=v})),first);
  setAmt('dining',0);S.cur=past;document.querySelector('.tabs button[data-t="budget"]').click();renderBudget();
  const T1=totals(past),u1=unplannedA(past),dRow=[...document.querySelectorAll('#T-budget .lr')].find(r=>r.textContent.includes('Dining out'));
  ok(near(u1,flexAct(past,'dining'))&&near(T1.flexA,T0.flexA),'Spending with no plan still counts as spent',`${f2(u1)} with no plan, ${f2(T1.flexA)} spent`);
  ok(dRow&&/No plan/.test(dRow.textContent)&&!/over/.test(dRow.textContent),'A line with no plan says No plan, not over',dRow&&dRow.textContent.replace(/\s+/g,' '));
  // (an unpaid bill counts at its plan, so it adds nothing either way; a set-aside bill in a month it isn't due is set aside)
  const planned=cmpRows(past).filter(r=>!r.good&&r.pl>0.5&&!r.pend).reduce((a,r)=>a+(r.pl-r.a),0);
  ok(!cmpRows(past).some(r=>r.key==='i:ins'&&r.pend),'A set-aside bill isn’t “not paid” in a month it isn’t due');
  ok(near((T1.fixed+T1.flexP)-(T1.fixedA+T1.flexA-u1),planned),'Over/under plan leaves out lines with no plan',f2((T1.fixed+T1.flexP)-(T1.fixedA+T1.flexA-u1)));
  S.cur=TK;ok(!alertsNow().some(a=>a.key===`over:${TK}:dining`),'No over-plan alert for a line with no plan');
  // Fill in from what you usually spend: the average of the last 3 months, rounded up to $5.
  const want=Math.ceil([1,2,3].map(n=>flexAct(addM(TK,-n),'dining')||0).reduce((a,b)=>a+b,0)/3/5)*5;
  BSCOPE='all';fillAvg(true);ok(plan(TK).groups.flatMap(g=>g.items).find(i=>i.id==='dining').amt===want,'Fill in uses the 3-month average',f0(want));
  // Order: move Gas out of its group, put Flex spending first, reorder its items; spending totals don't change.
  orderApply(true,['flex','food'],{[LOOSE.flex]:['gas'],flex:['flex','dining'],food:['groc']});
  const fg=plan(TK).groups.filter(g=>g.flex),fp=plan(past).groups.filter(g=>g.flex),desc=G=>G.map(g=>(g.loose?'*':'')+g.id+':'+g.items.map(i=>i.id).join('/')).join(' ');
  ok(desc(fg)==='*loose-f:gas flex:flex/dining food:groc'&&desc(fp)===desc(fg),'Items and groups reorder and move out of a group (all months)',desc(fg));
  ok(near(totals(past).flexA,T0.flexA),'Moving items keeps what was spent');
  ok(nodeKey({id:'g'+LOOSE.flex+'~gas',solo:true})==='i:gas','An item not in a group opens its own pop-up from the money flow');
  BUDV='build';renderBudget();const ug=document.querySelector('[data-act="grpUngroup"][data-g="food"]');if(ug)ug.click();BUDV='month';
  ok(plan(TK).groups.find(g=>g.loose&&g.flex).items.some(i=>i.id==='groc')&&!plan(TK).groups.some(g=>g.id==='food'),'Ungroup moves a group’s items out of it');
  renderBudget();ok([...document.querySelectorAll('#T-budget .lsec small')].some(s=>s.textContent==='Not in a group'),'The Budget page shows items not in a group');
  // Daily copies: the list loads, and restoring one reloads the budget from the server.
  await bkList();ok(Array.isArray(BKP)&&BKP.length===3&&document.querySelectorAll('.bkr').length>=0,'Daily copies are listed',Array.isArray(BKP)?BKP.length+' copies':'not loaded');
  {const cf=window.confirm;window.confirm=()=>true;try{await bkRestore(BKP[0].id)}finally{window.confirm=cf}}ok(D.restored===1&&FS.state==='ok'&&S.goals.some(g=>g.id==='trip'),'Restoring a daily copy reloads the budget');
  // Saving reaches the (sample) server.
  await new Promise(r=>setTimeout(r,1200));ok((D.saves||0)>0&&FS.state==='ok','Changes save to the server',`${D.saves||0} save(s)`);
  // Draw every tab and every view; nothing may throw.
  const clickAll=sel=>[...document.querySelectorAll(sel)].filter(b=>b.offsetParent).forEach(b=>b.click());
  for(const t of['budget','loans','goals','wealth','history','bank','settings']){document.querySelector(`.tabs button[data-t="${t}"]`).click();const el=document.querySelector('#T-'+t);ok(!el.hidden&&el.innerHTML.length>200,`${t[0].toUpperCase()+t.slice(1)} tab draws`,`${el.innerHTML.length} characters`);
   ['budv','sview','bview','hrng','bfilt'].forEach(a=>clickAll(`#T-${t} [data-act="${a}"]`))}
  ok(!errs.length,'No errors while drawing',errs.slice(0,3).join(' · '))}
 catch(e){ok(false,'Self-test crashed',e.stack||e.message)}
 removeEventListener('error',onErr);removeEventListener('unhandledrejection',onErr);
 const bad=T.filter(t=>!t.ok);document.title=bad.length?`SELFTEST FAIL ${bad.length}`:'SELFTEST PASS';
 const box=document.createElement('section');box.className='card selftest';box.innerHTML=`<h2>${bad.length?`Self-test: ${bad.length} of ${T.length} checks failed`:`Self-test passed: ${T.length} checks`}</h2><ul>${T.map(t=>`<li class="${t.ok?'ok':'bad'}">${t.ok?'✓':'×'} ${esc(t.name)}${t.detail?` <span class="dim">· ${esc(t.detail)}</span>`:''}</li>`).join('')}</ul><pre id="selftest-result" hidden>${esc(JSON.stringify({pass:!bad.length,total:T.length,failed:bad}))}</pre>`;
 document.body.prepend(box);window.SELFTEST={pass:!bad.length,results:T};return window.SELFTEST}
// Start the self-test once the sample household has loaded (server copy adopted, bank data in, filing done).
if(SELFTEST){const t0=Date.now(),wait=()=>{if(FS.state==='ok'&&BK.accts&&BK.tx.length&&DEMOD)return setTimeout(selfTest,300);if(Date.now()-t0<15000)setTimeout(wait,100);else{document.title='SELFTEST FAIL load';document.body.insertAdjacentHTML('afterbegin','<pre id="selftest-result">{"pass":false,"failed":[{"name":"Sample household never loaded"}]}</pre>')}};setTimeout(wait,0)}   // after the rest of the script has run
