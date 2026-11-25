// bank: the code of what was app/public/js/bank.js (unchanged but for imports, `export`, the shared state's setters and
// startBank(), which holds what used to run as the file loaded).
// Shared state (other files change it with the set… functions; it was js/bank.js):
import { bankBadge, catRender, lnkList } from '../named.jsx';
import { notifyAlerts } from './alerts.js';
import { INB, budStart, scopeStart } from './build.js';
import { MO, S, TK, addM, basePlan, editPlan, esc, f2, lab, labS, mon, plan, r2, save, setAUTOSAVE, uid, $ } from './core.js';
import { commit, rerender } from './events.js';
import { GENERIC, allItems, dshort, txAssign, txLabel, txTargets, txUndo } from './linked-loans.js';
import { setLP, toast } from './math.js';
import { FS, SRV } from './server-sync.js';
export let FLQ=''; export function setFLQ(v){return FLQ=v}
export let PSET=new Set(); export function setPSET(v){return PSET=v}
export let TXI=null; export function setTXI(v){return TXI=v}
export let LK=null; export function setLK(v){return LK=v}
export let CT=null; export function setCT(v){return CT=v}
export let CR='month'; export function setCR(v){return CR=v}
/* ---------- bank (Plaid) ---------- */

export const BK={st:null,tx:[],loans:null,accts:null,err:'',show:40,busy:false};
export const bankFrom=()=>S.bankFrom||(TK+'-01');
export async function bankLoad(){if(!SRV)return;try{const[a,b,c,e]=await Promise.all([fetch('api/bank/status',{cache:'no-store'}),fetch('api/bank/transactions?from='+bankFrom(),{cache:'no-store'}),fetch('api/bank/loans',{cache:'no-store'}),fetch('api/bank/accounts',{cache:'no-store'})]);BK.st=await a.json();if(b.ok){BK.tx=(await b.json()).tx||[];PSET=new Set(BK.tx.filter(t=>t.pending).map(t=>t.id))}if(c.ok)BK.loans=(await c.json()).accounts||[];if(e.ok)BK.accts=(await e.json()).accounts||[];BK.err=''}catch(e){BK.err='Couldn’t reach the bank service on the server.'}
 autoSave();
 rerender();bankBadge();notifyAlerts()}
// Files what it can and saves that as an auto-only change (see fsFlush).
export function autoSave(){if(!autoFile())return false;if(!FS.dirty)FS.autoOnly=true;setAUTOSAVE(true);save();setAUTOSAVE(false);return true}
/* ---------- filing rules: tie a payment once, the rest file themselves ---------- */
// Names carry changing reference numbers, so matching uses words only: digits and punctuation are dropped.
export const normT=s=>String(s||'').toUpperCase().replace(/[^A-Z&' ]+/g,' ').split(/\s+/).filter(w=>w.length>1).join(' ');
// normName/patternOf/merchKey are asked for the same transaction many times per draw (rules, suggestions, recurring
// charges); a transaction's name never changes, so each is remembered per transaction object.
const NNM=new WeakMap(),POM=new WeakMap(),MKM=new WeakMap();
export const normName=t=>{let v=NNM.get(t);if(v===undefined){v=(normT(t.merchant)+' '+normT(t.name)).trim();NNM.set(t,v)}return v};
export const STOPW=new Set(['POS','ACH','DEBIT','CREDIT','PURCHASE','RECURRING','ONLINE','CHECKCARD','WEB','PMT','TST','SQ','SP','PP','INST','THE','AUTH']);
// Words that make a different kind of purchase at the same store (Costco vs Costco Gas).
export const QUAL=new Set(['GAS','FUEL','PHARMACY','PHARM','RX','CAR','WASH','OPTICAL','PHOTO','TIRE','TIRES','BAKERY','LIQUOR','WINE','MKTPLACE','MARKETPLACE','PRIME','MUSIC','KINDLE','DIGITAL','EXPRESS','TRAVEL','AUTO','STATION','SERVICE','INSURANCE']);
export function patternOf(t){let v=POM.get(t);if(v===undefined){v=patternOf0(t);POM.set(t,v)}return v}
function patternOf0(t){const w=normT(t.merchant||t.name).split(' ').filter(Boolean);while(w.length>1&&STOPW.has(w[0]))w.shift();let n=Math.min(3,w.length);if(w.slice(0,n).join(' ').length<8)n=Math.min(4,w.length);if(/^(TRANSFER|XFER|ZELLE|VENMO|PAYPAL)$/.test(w[0]))n=Math.min(5,w.length);let p=w.slice(0,n).join(' ');
 if(t.merchant){const nm=normT(t.name);if(nm.startsWith(p+' ')){const nx=nm.slice(p.length+1).split(' ')[0];if(QUAL.has(nx))p+=' '+nx}}return p}
export const tdir=t=>t.amount<0?'in':'out';
// Names that cover many unrelated payments (payment apps, plain transfers). Links to these default to "around this amount".
export const GENERICP=/^(VENMO|ZELLE|PAYPAL|CASH APP|SQUARE CASH|APPLE CASH|ONLINE TRANSFER|TRANSFER|CHECK|ATM|MOBILE DEPOSIT|DEPOSIT|WITHDRAWAL)\b/;
let ATA=null,ATM=null;export const acctType=id=>{if(ATA!==BK.accts){ATA=BK.accts;ATM=new Map((ATA||[]).map(a=>[a.id,a.type]))}return ATM.get(id)||''};
// Month a payment counts in under rule r: the month paid, unless the rule moves payments made in the last 5 days of a
// month to the next month (shift 'next', rent paid early) or the first 5 days back a month (shift 'prev', paid late).
export function ruleMonth(t,r){const k=t.date.slice(0,7),d=+t.date.slice(8,10),[y,m]=k.split('-').map(Number),last=new Date(y,m,0).getDate();
 if(r&&r.shift==='next'&&d>last-5)return addM(k,1);if(r&&r.shift==='prev'&&d<=5)return addM(k,-1);return k}
// A bill payment late in a month whose bill is already paid is next month's paid early (rent for the 1st paid on the
// 25th): it counts in the next month if that one has no payment yet. Monthly bills only, a payment about the bill's
// size, and only filings made by rules (by hand always wins). Without this the month showed the bill paid twice.
export function earlyMonth(v,k,d,amt,self){if(!v||!v.startsWith('i:')||!d)return k;const id=v.slice(2),x=allItems(k).find(x=>x.i.id===id);if(!x||x.g.flex||+x.i.freq>1)return k;
 const pl=+(x.i.base??x.i.amt)||0,day=+d.slice(8,10),last=new Date(+k.slice(0,4),+k.slice(5,7),0).getDate(),due=+x.i.due||0;
 if(pl<=0||Math.abs(amt-pl)>pl*.25||day<(due?Math.max(due+14,last-12):last-9))return k;
 const k1=addM(k,1),R=Object.entries(S.txd||{}).filter(([i2,r])=>i2!==self&&r&&r.v===v);
 const here=R.filter(([,r])=>r.k===k&&r.d<d).reduce((a,[,r])=>a+(+r.amt||0),0);
 return here>=pl*.9&&!R.some(([,r])=>r.k===k1)?k1:k}
// The same for filings already made (they were filed before this existed): rule filings of a bill in their own month.
export function earlyFix(){let n=0;Object.entries(S.txd||{}).sort((a,b)=>(a[1].d||'').localeCompare(b[1].d||'')).forEach(([id,r])=>{if(!r||!r.auto||r.auto==='pair'||r.auto==='rest'||!r.v||!r.v.startsWith('i:')||r.flex||!r.d||r.k!==r.d.slice(0,7))return;
 const k2=earlyMonth(r.v,r.k,r.d,+r.amt||0,id);if(k2!==r.k){r.k=k2;n++}});if(n){TXI=null;setLP({})}return n}
export function ruleFor(t){let best=null;const nm=normName(t),a=Math.abs(t.amount);(S.rules||[]).forEach(r=>{if(r.dir!==tdir(t)||!r.p||!nm.includes(r.p))return;if(r.x&&r.x.some(x=>nm.includes(x)))return;if(r.min!=null&&a<r.min-0.005)return;if(r.max!=null&&a>r.max+0.005)return;if(!best||r.p.length>best.p.length)best=r});return best}
export function addRule(p,dir,v,min,max,x){S.rules||(S.rules=[]);p=normT(p);let r=S.rules.find(y=>y.p===p&&y.dir===dir);if(!r){r={id:uid(),p,dir};S.rules.push(r)}r.v=v;if(x&&x.length)r.x=x;else delete r.x;if(min!=null){r.min=min;r.max=max}else{delete r.min;delete r.max}return r}
export const rulesFor=v=>(S.rules||[]).filter(r=>r.v===v);
export function defAlways(v,k){if(!v||v==='skip'||v==='once')return false;if(v.startsWith('i:')){const x=allItems(k).find(x=>x.i.id===v.slice(2));return !!x&&!x.g.flex}return true}
// A checking or savings payment and the same amount arriving on another connected card, loan or account within 5 days
// is one transfer. Both sides are filed as a transfer, so a card or loan payment never counts as spending.
export const isXferish=t=>/^(TRANSFER_|LOAN_PAYMENTS)/.test((t.pfc&&t.pfc[0])||'');
// What rolls into Flex when nothing else claims it: purchases from checking or a card, payment apps (Venmo,
// PayPal, Zelle), and money back on a card (refunds lower Flex). Left for review: deposits into checking,
// loan and card payments, and transfers between your own accounts.
export function flexable(t){const P=(t.pfc&&t.pfc[0])||'',D=(t.pfc&&t.pfc[1])||'',ty=acctType(t.account);if(ty!=='depository'&&ty!=='credit')return false;
 if(P==='LOAN_PAYMENTS')return false;
 if(t.amount>0)return P!=='TRANSFER_OUT'||/FROM_APPS/.test(D);
 return ty==='credit'}
// The item unfiled purchases roll into: the flex item called "Flex", else the first item of a group named Flex…, else the first flex item.
// The automatic choice: the flex item called Flex…, else the first item of a group named Flex…, else the first flex item.
export function flexDefaultAuto(k){const p=plan(k),F=p.groups.filter(g=>g.flex),all=F.flatMap(g=>g.items);const a=all.find(i=>/^flex/i.test(i.name))||(F.find(g=>/flex/i.test(g.name))||{items:[]}).items[0]||all[0];return a?a.id:null}
export function flexDefault(k){if(S.catchAll==='review')return null;if(S.catchAll&&allItems(k).some(x=>x.i.id===S.catchAll))return S.catchAll;const p=plan(k),F=p.groups.filter(g=>g.flex),all=F.flatMap(g=>g.items);const a=all.find(i=>/^flex/i.test(i.name))||(F.find(g=>/flex/i.test(g.name))||{items:[]}).items[0]||all[0];return a?a.id:null}
// Pending charges (not posted yet). Shown with a Pending tag; they file like any other transaction.
export function txPairs(){const ins=BK.tx.filter(t=>t.amount<0&&!t.pending),used=new Set(),out=new Map(),day=d=>Date.parse(d)/864e5;
 BK.tx.filter(t=>t.amount>0&&!t.pending&&acctType(t.account)==='depository').sort((a,b)=>a.date.localeCompare(b.date)).forEach(o=>{
  const m=ins.find(i=>!used.has(i.id)&&i.account!==o.account&&Math.abs(i.amount+o.amount)<0.005&&Math.abs(day(i.date)-day(o.date))<=5&&(['credit','loan'].includes(acctType(i.account))||(isXferish(o)&&isXferish(i))));
  if(m){used.add(m.id);out.set(o.id,m.id);out.set(m.id,o.id)}});return out}

// Filed transactions by month and target, built from S.txd. Bill payments and income received come from here.
export function txIdx(){if(TXI)return TXI;TXI={};Object.entries(S.txd||{}).forEach(([id,r])=>{if(!r||!r.v||!r.k)return;const a=TXI[r.k]||(TXI[r.k]={}),e=a[r.v]||(a[r.v]={amt:0,list:[]});e.amt=r2(e.amt+(+r.amt||0));e.list.push({id,d:r.d,n:r.n,amt:r.amt,auto:r.auto})});return TXI}
export function billPaid(k,id){const e=txIdx()[k]?.['i:'+id];if(!e||!e.list.length)return null;const it=sinkIt(k,id);return it?{...e,amt:r2((+it.amt||0)/+it.freq),real:e.amt,sink:true}:e}
export const sinkIt=(k,id)=>{for(const g of basePlan(k).groups)if(!g.flex)for(const i of g.items)if(i.id===id&&+i.freq>1)return i;return null};
// A set-aside bill's fund at the end of month k: set-asides since the budget start less what was paid from it.
export function sinkFund(id,k){let f=0;for(let m=budStart()||k,n=0;m<=k&&n<600;m=addM(m,1),n++){const it=sinkIt(m,id);if(!it)continue;f+=(+it.amt||0)/+it.freq;const e=txIdx()[m]?.['i:'+id];if(e)f-=e.amt}return r2(f)}
// Income that counts for month k: what arrived for past months; for this month paychecks are still coming, so never less than planned.
// "Actual" flow chart: what really happened so far. A row tied to the bank shows what was paid or received
// (nothing yet = $0); a row with no bank link keeps its planned amount.
// Groceries/flex actual for an item. With bank sync it's what is filed there (bank + entries added by hand), worked
// out fresh from S.txd every time so it can't drift. A month with nothing filed falls back to an amount typed by hand.
export function flexAct(k,id){const m=MO(k),typed=m.act?m.act[id]:undefined;if(!SRV)return typed!=null?typed:null;const e=txIdx()[k]?.['i:'+id],man=(m.rc||[]).filter(r=>!r.bank&&r.item===id).reduce((a,r)=>a+(+r.amt||0),0);
 if(e&&e.list.length)return r2(e.amt+man);if(man)return r2(man);return typed!=null?typed:null}
export function chartItem(g,i,k){const lk=rulesFor('i:'+i.id).length>0;if(g.flex){const a=flexAct(k,i.id);return a!=null?a:(lk?0:+i.amt||0)}const pd=billPaid(k,i.id);return pd?pd.amt:(lk?0:+i.amt||0)}
export function chartInc(k,i){if(i.once)return +i.amt||0;const g=incGot(k,i.id);return g?g.amt:(rulesFor('inc:'+i.id).length?0:+i.amt||0)}
export function incActual(k,i){const g=i.once?null:incGot(k,i.id),pl=+i.amt||0;return g?(k>=TK?Math.max(g.amt,pl):g.amt):pl}
export function incGot(k,id){const e=txIdx()[k]?.['inc:'+id];return e&&e.list.length?{amt:-e.amt,list:e.list}:null}
// Files every unreviewed transaction since the review start date that pairs up or matches a rule. Returns how many.
// A pending charge that posted: Plaid drops the pending id and sends the posted one with ppid = the old id.
// A filing you made by hand moves to the posted transaction (same category and month, posted amount);
// an automatic one is just redone by autoFile. A pending charge that vanished without posting (a released
// hold) is unfiled. If the bank kept the same id, the filing is refreshed with the posted amount.
export function pendCarry(){const byId=new Map(BK.tx.map(t=>[t.id,t]));let n=0;
 // A posted charge takes over its pending one's filing. A rule filing is redone by the rules, unless no rule matches the
 // posted description (banks often word the two differently): then it keeps the pending one's filing.
 BK.tx.forEach(t=>{if(!t.ppid||t.pending)return;if(S.noAuto&&S.noAuto[t.ppid]){S.noAuto[t.id]=1;delete S.noAuto[t.ppid]}const o=S.txd[t.ppid];if(!o)return;txUndo(t.ppid);if(!S.txd[t.id]&&(!o.auto||!ruleFor(t)))txAssign(t,o.v,o.auto,o.k);n++});
 // A pending charge that's gone: if a posted one of the same amount came in on or after its date (within 10 days) and
 // isn't filed, it's that charge posted without a link back (common for ACH payments like rent), so it takes the filing.
 // Otherwise it was a released hold and is unfiled.
 const day=d=>Date.parse(d)/864e5,taken=new Set(BK.tx.filter(x=>x.ppid).map(x=>x.ppid));
 Object.entries(S.txd).forEach(([id,r])=>{if(!r.pend)return;const t=byId.get(id);
  if(!t){if(r.d<bankFrom())return;const p=BK.tx.find(x=>!x.pending&&!S.txd[x.id]&&!(S.noAuto||{})[x.id]&&!(x.ppid&&x.ppid!==id)&&Math.abs(r2(x.amount)-(+r.amt||0))<0.005&&day(x.date)-day(r.d)>=-1&&day(x.date)-day(r.d)<=10);
   const o={...r};txUndo(id);if(p&&!taken.has(id)&&(!o.auto||!ruleFor(p)))txAssign(p,o.v,o.auto,o.k);n++;return}
  if(t.pending)return;const o={...r};txUndo(id);txAssign(t,o.v,o.auto,o.k);n++});
 if(n){TXI=null;setLP({})}return n}
export function autoFile(){if(!SRV||!BK.tx.length||!BK.accts)return 0;S.txd||(S.txd={});let n=pendCarry()+earlyFix();const f=bankFrom(),P=txPairs(),no=S.noAuto||{};
 const gone=S.txGone||{};BK.tx.forEach(t=>{if(t.date<f||S.txd[t.id]||no[t.id]||gone[t.id])return;
  if(P.has(t.id)){const o=P.get(t.id);if(S.txd[o]&&!['xfer','skip'].includes(S.txd[o].v)&&S.txd[o].auto!=='pair')return;
   const ot=t.amount>0&&BK.tx.find(x=>x.id===o),ln=ot&&S.loans.find(l=>l.acct&&l.paySrc==='bank'&&l.acct===ot.account);if(ln){txAssign(t,'l:'+ln.id,'pair');S.txd[t.id].pair=o;n++;return}S.txd[t.id]={v:'xfer',k:t.date.slice(0,7),amt:r2(t.amount),d:t.date,n:t.merchant||t.name,auto:'pair',pair:o};n++;return}
  const r=ruleFor(t);let km=r?ruleMonth(t,r):null;if(r&&km===t.date.slice(0,7))km=earlyMonth(r.v,km,t.date,r2(t.amount),t.id);if(r&&txTargets(km).ok(r.v)&&!((r.v.startsWith('inc:')||r.v==='once')&&acctType(t.account)!=='depository')){txAssign(t,r.v,r.id,km);n++;return}
  // Anything else that's a plain purchase rolls into Flex spending. Transfers, loan and card payments and
  // payment apps (Plaid's TRANSFER_* / LOAN_PAYMENTS) stay in review, since they're often rent or money between accounts.
  if(!r&&flexable(t)){const fx=flexDefault(t.date.slice(0,7));if(fx){txAssign(t,'i:'+fx,'rest');n++}}});
 if(n){TXI=null;setLP({})}return n}
// Link dialog: pick one payment (grouped by name), confirm the matching text, file all of them.

export const titleC=s=>s.split(' ').map(w=>w[0]+w.slice(1).toLowerCase()).join(' ');
// One row per merchant. A name without Plaid's merchant field joins the merchant it starts with
// ("KROGER #123 ANYTOWN ST" → Kroger), longest first so Costco Gas stays apart from Costco.
let MKS=null;export function merchKeys(){if(MKS&&MKS[0]===BK.tx&&MKS[1]===BK.tx.length)return MKS[2];const M=new Set();BK.tx.forEach(t=>{if(t.merchant)M.add(patternOf(t))});MKS=[BK.tx,BK.tx.length,[...M].sort((a,b)=>b.length-a.length)];return MKS[2]}
export function merchKey(t,MK){if(t.merchant)return patternOf(t);const c=MKM.get(t);if(c&&c[0]===MK)return c[1];const nm=normT(t.name),m=MK.find(x=>nm===x||nm.startsWith(x+' ')),v=m||patternOf(t);MKM.set(t,[MK,v]);return v}
export function lnkOpen(kind,id){if(!SRV||!BK.tx.length){toast('Connect your bank in the Bank tab first');return}
 const k=S.cur,it=kind==='loan'?S.loans.find(x=>x.id===id):kind==='goal'?S.goals.find(x=>x.id===id):kind==='inc'?plan(k).income.find(x=>x.id===id):(allItems(k).find(x=>x.i.id===id)||{}).i;if(!it)return;
 LK={kind,id,v:(kind==='loan'?'l:':kind==='goal'?'g:':kind==='inc'?'inc:':'i:')+id,name:it.name,amt:kind==='goal'?0:kind==='loan'?+it.min||0:+it.amt||0,dir:kind==='inc'?'in':'out',sels:[],pat:'',ref:0,refs:{},wide:{},q:'',amtOn:false,move:false,sibOn:false,MK:merchKeys()};
 const R=rulesFor(LK.v);LK.sels=R.map(r=>r.p);LK.shift=R.some(r=>r.shift==='next');if(R.length===1){LK.pat=R[0].p;LK.amtOn=R[0].min!=null;LK.ref=R[0].min!=null?r2((R[0].min+R[0].max)/2):0;if(R[0].min!=null)LK.refs[R[0].p]=LK.ref}
 const since=dshort(bankFrom());
 $('#lt').textContent=kind==='goal'?`Which transfers go to ${it.name}?`:kind==='inc'?`Which deposits are ${it.name}?`:kind==='flex'?`Which stores go to ${it.name}?`:`Find the payment for ${it.name}`;
 $('#ls').textContent=kind==='goal'?`Tick the transfers into the account this goal lives in. Each one counts as a deposit to ${it.name}. Transfers between accounts the app can see already pair up and aren't listed.`:kind==='flex'?`Tick every store that belongs here. Purchases there since ${since} are filed to ${it.name}, and new ones file themselves.`:kind==='inc'?`Tick the deposit (or each one, if it arrives from more than one place). Every one like it since ${since} is filed here, and new ones file themselves.`:kind==='loan'?`Tick the payment to your lender (or each one, if you pay it more than one way). Every one like it since ${since} counts as a payment on ${it.name}, extra payments included, and new ones file themselves.`:`Tick the payment (or each one, if it's paid more than one way). Every one like it since ${since} is filed here, and new ones file themselves.`;
 $('#lq').value='';$('#ldel').hidden=!R.length;$('#ldel').textContent=R.length>1?'Remove all links':'Remove link';lnkList();$('#ldlg').showModal()}
// Candidate rows grouped by merchant. With a search, only matching rows show; ticked rows always stay listed.
export function lnkCands(){const L=LK,words=normT(L.name).split(' ').filter(w=>w.length>=3&&!GENERIC.has(w.toLowerCase())),q=normT(L.q),G=new Map();
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
export const lnkSingle=()=>LK.sels.length===1;
// The text each rule matches: the edited text when one row is ticked, otherwise each ticked merchant.
export function lnkPats(){if(lnkSingle()){const p=normT(LK.pat);return p?[p]:[]}return LK.sels.slice()}
// More specific names that start with p (Costco → Costco Gas) and aren't ticked themselves.
export function lnkSibs(p){const c={};if(!p)return[];BK.tx.forEach(t=>{if(tdir(t)!==LK.dir)return;const q=merchKey(t,LK.MK);if(q!==p&&q.startsWith(p+' ')&&!LK.sels.includes(q)&&normName(t).includes(p))c[q]=(c[q]||0)+1});return Object.entries(c)}
export function lnkExclFor(p){return lnkSingle()&&LK.sibOn?[]:lnkSibs(p).map(([q])=>q)}
// Goal transfer flags only list money moved out of checking or savings (Plaid's TRANSFER_OUT).
export const goalTx=t=>acctType(t.account)==='depository'&&/^TRANSFER_OUT/.test((t.pfc&&t.pfc[0])||'');
export function lnkMatches(){const P=lnkPats().map(p=>({p,x:lnkExclFor(p)})),one=lnkSingle(),ref=LK.ref;if(!P.length)return[];
 return BK.tx.filter(t=>{if(tdir(t)!==LK.dir)return false;if(LK.kind==='goal'&&!goalTx(t))return false;if(LK.dir==='in'&&acctType(t.account)!=='depository')return false;if(S.txd&&S.txd[t.id]&&S.txd[t.id].auto==='pair')return false;
  const nm=normName(t);if(!P.some(({p,x})=>nm.includes(p)&&!x.some(y=>nm.includes(y))))return false;return !(one&&LK.amtOn&&ref)||Math.abs(Math.abs(t.amount)-ref)<=ref*.25})}
// Payments between your own accounts that were filed as spending or income before pairing existed.
// Loan filings are left alone: a linked loan's balance wins, so they never double count. `pok` on a filing = the person
// said it isn't a double count (e.g. paying yourself back for a bill paid from an account outside the budget).
export function pairIssues(){if(!BK.accts)return[];const P=txPairs(),out=[];P.forEach((o,id)=>{const r=S.txd&&S.txd[id];if(r&&!r.pok&&(r.v.startsWith('i:')||r.v.startsWith('inc:')||r.v==='once'))out.push({id,o,r})});return out}
// Details: every transaction filed to one category this month, with a picker to move any of them.

export function catOpen(v){CT=v;CR='month';$('#tdq').value='';catRender();$('#tdlg').showModal()}
// Hides rows that don't match the search and shows the matching count and total.
export function catFilter(){const q=($('#tdq').value||'').trim().toLowerCase(),rows=[...document.querySelectorAll('#tdl .trow')];let n=0,t=0;
 rows.forEach(r=>{const ok=!q||(r.dataset.txt||'').includes(q);r.hidden=!ok;if(ok){n++;t+=+r.dataset.amt||0}});const f=$('#tdf');f.hidden=!q;f.textContent=q?`${n} of ${rows.length} match · ${f2(t)}`:''}

// Does rule r match transaction t (same test as ruleFor, for one rule)?
export function ruleHit(r,t){if(r.dir!==tdir(t)||!r.p)return false;const nm=normName(t),a=Math.abs(t.amount);if(!nm.includes(r.p))return false;if(r.x&&r.x.some(x=>nm.includes(x)))return false;if(r.min!=null&&a<r.min-0.005)return false;if(r.max!=null&&a>r.max+0.005)return false;return true}
// One transaction row in the pop-up, with Move (category + month).
// Which rule filed a transaction, for the pop-up and Filed lists.
export const ruleTag=id=>{const x=(S.rules||[]).find(y=>y.id===id);return x?`rule “${esc(titleC(x.p))}”`:'auto'};
// Payments from the same payee that are filed somewhere else (or not at all): by this category's rules, or, with no
// rules, the same merchants it already has at a similar amount.
export function samePayee(v,inc,from){const R=rulesFor(v),mine=Object.keys(S.txd||{}).filter(id=>S.txd[id].v===v),MK=merchKeys(),dir=inc?'in':'out',keys=new Set(),amts=[];
 mine.forEach(id=>{const t=BK.tx.find(y=>y.id===id);if(t){keys.add(merchKey(t,MK));amts.push(Math.abs(t.amount))}});amts.sort((a,b)=>a-b);const med=amts[Math.floor(amts.length/2)]||0;
 return BK.tx.filter(t=>{if(t.date.slice(0,7)<from||tdir(t)!==dir)return false;const r=S.txd&&S.txd[t.id];if(r&&(r.v===v||r.auto==='pair'))return false;if((S.txGone||{})[t.id])return false;
  if(R.length)return R.some(x=>ruleHit(x,t));return keys.has(merchKey(t,MK))&&(!med||Math.abs(Math.abs(t.amount)-med)<=med*.25)}).sort((a,b)=>b.date.localeCompare(a.date))}
export const txOf=(id,r)=>BK.tx.find(x=>x.id===id)||{id,date:r.d,amount:r.amt,name:r.n,merchant:'',account:''};
// Counts a filed transaction in another month, keeping its category. Chosen by hand, so it's no longer "auto".
export function monthMove(id,k){const r=S.txd&&S.txd[id];if(!r||r.k===k)return;const v=r.v;txUndo(id);txAssign(txOf(id,r),v,undefined,k);
 toast(`${r.n} now counts in ${lab(k)}`);commit();catRender()}
export function catMove(id,v){const r=S.txd&&S.txd[id];if(!r||r.v===v)return;const t=txOf(id,r),sp=r.sp;
 txUndo(id);txAssign(t,v,undefined,r.k);if(sp&&S.txd[id])S.txd[id].sp=sp;toast(`Moved ${r.n} to ${txLabel({v,k:r.k})}`);commit();catRender()}
// Recurring charges sitting in Flex (or unfiled) with no rule: same merchant in 3+ different months at a steady amount.
// Everyday spending (food, gas, shopping, travel) only looks like a subscription when the amount barely changes.
export const SPEND_CAT=/^(FOOD_AND_DRINK|TRANSPORTATION|GENERAL_MERCHANDISE|TRAVEL)/;
// RECF: the parity check's stand-in for recurring() (a case that shows made-up bill suggestions); null otherwise.
export let RECF=null;export function setRECF(f){return RECF=f}
export function recurring(){if(RECF)return RECF();if(!SRV||!BK.tx.length)return[];const MK=merchKeys(),G={},no=S.notBill||{},k6=addM(TK,-6),TT={},AI={};
 BK.tx.forEach(t=>{if(t.amount<=0||t.date.slice(0,7)<k6||isXferish(t))return;const rr=ruleFor(t),tm=t.date.slice(0,7);if(rr&&(TT[tm]||(TT[tm]=txTargets(tm))).ok(rr.v))return;const r=S.txd&&S.txd[t.id];if(r){if(!r.v.startsWith('i:'))return;const x=(AI[r.k]||(AI[r.k]=allItems(r.k))).find(y=>y.i.id===r.v.slice(2));if(x&&!x.g.flex)return}
  const p=merchKey(t,MK);if(no[p])return;(G[p]||(G[p]=[])).push(t)});
 return Object.entries(G).map(([p,L])=>{const ms=new Set(L.map(t=>t.date.slice(0,7))),A=L.map(t=>t.amount).sort((a,b)=>a-b),med=A[Math.floor(A.length/2)],D=L.map(t=>+t.date.slice(8)).sort((a,b)=>a-b);
  const top=L.find(t=>t.merchant&&normT(t.merchant)===p),pc={};L.forEach(t=>{const c=(t.pfc||[])[0]||'';pc[c]=(pc[c]||0)+1});const cat=Object.entries(pc).sort((a,b)=>b[1]-a[1])[0][0];return{p,cat,label:top?top.merchant:titleC(p),n:L.length,months:ms.size,amt:r2(med),lo:A[0],hi:A[A.length-1],day:D[Math.floor(D.length/2)],last:L.map(t=>t.date).sort().pop(),first:L.map(t=>t.date).sort()[0].slice(0,7)}})
  .filter(x=>x.months>=3&&x.n<=x.months*1.5&&x.last>=addM(TK,-1)&&(SPEND_CAT.test(x.cat)?x.hi<=x.lo*1.05+0.5:x.hi<=x.lo*1.35+1)).sort((a,b)=>b.amt-a.amt)}
// Adds the charge as a bill in the chosen group from this month on, links it, and moves its past charges out of Flex.
export function recAdd(p){const x=recurring().find(y=>y.p===p);if(!x)return;const sel=document.querySelector(`select[data-recg="${CSS.escape(p)}"]`),gid=sel&&sel.value;const id=uid();
 const k0=INB?scopeStart():(x.first<S.cur?x.first:S.cur);editPlan(pl=>{const g=pl.groups.find(y=>y.id===gid)||pl.groups.find(y=>!y.flex);if(g)g.items.push({id,name:x.label,amt:x.amt,due:x.day})},k0);
 addRule(p,'out','i:'+id,null,null,lnkSibsFor(p));
 BK.tx.forEach(t=>{const r=S.txd&&S.txd[t.id];if(!r||!r.v.startsWith('i:')||!(ruleFor(t)&&ruleFor(t).v==='i:'+id))return;const it=allItems(r.k).find(y=>y.i.id===r.v.slice(2));if(r.auto==='rest'||(it&&it.g.flex))txUndo(t.id)});
 autoFile();toast(`Added ${x.label} as a bill from ${labS(k0)} on`);commit()}
// More specific merchant names under p that a new rule for p should leave out (Costco → not Costco Gas).
export function lnkSibsFor(p){const MK=merchKeys(),c=new Set();BK.tx.forEach(t=>{const q=merchKey(t,MK);if(q!==p&&q.startsWith(p+' '))c.add(q)});return [...c]}
// When items are deleted (from this month on), their rules go and this month's and later filings are re-filed:
// purchases fall back to Flex, and a deleted bill's merchant shows up as a suggestion again.
export function itemGone(ids,from=S.cur){if(!SRV)return 0;if(S.catchAll&&ids.includes(S.catchAll))delete S.catchAll;const V=new Set(ids.map(x=>'i:'+x));S.rules=(S.rules||[]).filter(r=>!V.has(r.v));let n=0;
 Object.entries(S.txd||{}).forEach(([tid,r])=>{if(V.has(r.v)&&r.k>=from){txUndo(tid);n++}});if(n)autoFile();return n}
// First month whose plan still has any of these items. Deleting can reach back that far if the person wants.
export function itemsFrom(ids){return Object.keys(S.plans).sort().find(k=>S.plans[k].groups.some(g=>g.items.some(i=>ids.includes(i.id))))||S.cur}
export function delFrom(ids,name){const f=itemsFrom(ids);if(f>=S.cur)return S.cur;return confirm(`Also remove ${name} from earlier months, back to ${labS(f)}?

OK removes it everywhere and sends its transactions back to Flex spending.
Cancel keeps it in months before ${mon(S.cur)}.`)?f:S.cur}
// Re-files what a rule filed on its own, after the rule's text, target or amounts change.
export function ruleReapply(r){Object.entries(S.txd||{}).forEach(([tid,x])=>{if(x.auto===r.id)txUndo(tid)});autoFile()}

export function startBank() { }   // nothing ran at load
