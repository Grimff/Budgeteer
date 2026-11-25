// settings: the code of what was app/public/js/settings.js (unchanged but for imports, `export`, the shared state's setters and
// startSettings(), which holds what used to run as the file loaded).
// Shared state (other files change it with the set… functions; it was js/settings.js):
import { brandSet, renderSettings, rulesFilter } from '../named.jsx';
import { BK, autoSave, bankFrom, billPaid, incGot, pairIssues, titleC } from './bank.js';
import { budStart } from './build.js';
import { S, TK, addM, f0, f2, isDue, labS, mon, plan, $, APP_VERSION } from './core.js';
import { rerender } from './events.js';
import { histMonths, monthSum } from './history.js';
import { dshort, inbox } from './linked-loans.js';
import { row, toast, totals, xsBuild } from './math.js';
import { FS, PEND, SRV, adopt, sharedData, srvGet } from './server-sync.js';
import { debtNow } from './wealth.js';
export let SV='general',RQ=''; export function setSV(v){return SV=v} export function setRQ(v){return RQ=v}
export let BKP=null; export function setBKP(v){return BKP=v}
/* ---------- settings: household name, budget options, filing rules, bank connections ---------- */
// Household name in the top left and the browser tab (S.hh{name,sub}, shared by both people).
export const hhName=()=>((S.hh||{}).name||'').trim()||'Budgeteer',hhSub=()=>(S.hh||{}).sub??'Household budget';
export const SYNC_OPTS=[[1,'Every hour'],[2,'Every 2 hours'],[3,'Every 3 hours'],[6,'Every 6 hours'],[12,'Twice a day'],[24,'Once a day'],[0,'Only when we tap Sync now']];
// Daily copies on the server (Settings → General → Backups). BKP: null = not loaded yet, 'wait' = loading, or the list.

export const bkLabel=b=>b.kind==='daily'?new Date(b.at+'T12:00:00').toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric',year:'numeric'})+' (as the day began)':'Before the restore on '+new Date(b.at).toLocaleString('en-US',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});
export async function bkList(){BKP='wait';renderSettings();try{const r=await fetch('api/backups',{cache:'no-store'});if(!r.ok)throw new Error('HTTP '+r.status);BKP=(await r.json()).backups||[]}catch(e){BKP=null;toast('Couldn’t load the daily copies: '+e.message)}renderSettings()}
// Restoring replaces the budget on the server (the server keeps what was there as a copy), then loads it here.
export async function bkRestore(id){const b=(Array.isArray(BKP)?BKP:[]).find(x=>x.id===id);if(!b||!confirm(`Replace the budget with the copy from ${bkLabel(b)}?\n\nThe budget as it is now is kept as a copy, so you can switch back.`))return;
 try{const r=await fetch('api/backups/restore',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id})}),j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error||'HTTP '+r.status);
  clearTimeout(FS.t);const d=await srvGet();if(d){adopt(d);FS.dirty=false;try{localStorage.removeItem(PEND)}catch(_){}autoSave();rerender()}toast('Budget restored from '+bkLabel(b));bkList()}
 catch(e){toast('Couldn’t restore: '+e.message)}}
export const whenS=d=>new Date(d).toLocaleString('en-US',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});
// About this server (Settings → General): the build it has and the one this page runs, where its data is, when it last
// saved and synced. Loaded when Settings opens (abLoad, from the tab/sview actions), so drawing stays pure.
export let ABT=null; export function setABT(v){return ABT=v}
export const PAGE_BUILD=(typeof __BUILD__!=='undefined'?__BUILD__:null)||{version:APP_VERSION,rev:'',built:''};
export async function abLoad(){if(!SRV)return;try{const r=await fetch('api/about',{cache:'no-store'});if(!r.ok)throw new Error('HTTP '+r.status);ABT=await r.json()}catch(e){ABT={err:e.message}}renderSettings()}
// The troubleshooting copy: every data file in one download, bank tokens taken out by the server.
export async function abCopy(){try{const r=await fetch('api/support-copy',{cache:'no-store'});if(!r.ok)throw new Error('HTTP '+r.status);const b=await r.blob(),a=document.createElement('a');
 a.href=URL.createObjectURL(b);a.download=`budgeteer-copy-${new Date().toISOString().slice(0,10)}.json`;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},4000);
 toast('Downloaded. Bank tokens are taken out; it still has your transactions and balances, so share it only with someone helping you.')}catch(e){toast('Couldn’t make the copy: '+e.message)}}
export function syncWord(rf){if(!rf)return 'Transactions sync every few hours';const o=SYNC_OPTS.find(x=>x[0]===rf.hours);return rf.hours?`Checks ${o?o[1].toLowerCase():'every '+rf.hours+' hours'}${rf.open?' and when the app is opened':''}`:(rf.open?'Checks when the app is opened or you tap Sync now':'Checks only when you tap Sync now')}
// Health check (Settings → Data & math): proves the tabs agree and points at data that would make the budget wrong.
// Each check: {lv:'ok'|'warn'|'bad', t:title, d:detail, a:optional button}.
// Each check: {lv: ok|warn|bad, t: title, d: message, a?: buttons}. d is text or a list of text and {b: bold text}; a
// is a list of {act, label, ...data-* values} (rtHtml/rtText turn them into markup or plain text).
// The dot on the Settings gear: how many health checks have something to look at, and the worst level ('bad' or
// 'warn'), leaving out transactions to sort (the Bank tab's count shows those). Nothing until the budget and the
// bank's accounts have loaded, so checks that need bank data don't light it while it's on its way.
// The gear draws HCD, not hcDot(): the checks take a few hundred ms on a phone with real data, so they run after a
// draw, once things are quiet (hcSoon after each renderAll), and redraw only the header when the result changes.
export let HCD={n:0};export function setHCD(v){return HCD=v}
let HCT=0;export function hcSoon(){clearTimeout(HCT);HCT=setTimeout(()=>{const ric=window.requestIdleCallback||(f=>f());ric(hcNow,{timeout:3000})},1200)}
export function hcNow(){clearTimeout(HCT);const d=hcDot();if(d.n!==HCD.n||d.lv!==HCD.lv){setHCD(d);brandSet()}}
export function hcDot(){if(FS.state!=='ok'||!BK.st||(BK.st.configured&&!BK.accts))return{n:0};const H=healthChecks().filter(h=>h.lv!=='ok'&&!h.inbox);return{n:H.length,lv:H.some(h=>h.lv==='bad')?'bad':'warn'}}
export function healthChecks(){const H=[],add=(lv,t,d,a)=>H.push(a&&a.length?{lv,t,d,a}:{lv,t,d}),near=(a,b)=>Math.abs(a-b)<0.51,MS=histMonths().filter(k=>k<=TK).slice(-7);
 // 1. Budget, History and the money flow use the same totals
 const bad1=MS.filter(k=>{const T=totals(k),M=monthSum(k);return !near(M.ac,T.fixedA+T.flexA+T.loansA+T.saveA)||!near(M.pl,T.fixed+T.flexP+T.loans+T.save)||!near(M.inc,T.incA)});
 add(bad1.length?'bad':'ok','Budget and History agree',bad1.length?'Totals differ in '+bad1.map(labS).join(', '):`Planned, actual and income match for ${MS.length} months (${labS(MS[0]||TK)} – ${labS(TK)})`);
 // 2. Loan balances follow the lenders
 const LL=S.loans.filter(l=>l.acct&&l.live&&row(l,TK)),drift=LL.map(l=>{const r=row(l,TK);return[l,l.live.bal-(r.lg?r.close:r.open)]}).filter(([,d])=>Math.abs(d)>Math.max(5,0.002*Math.abs(d)));
 if(LL.length)add(drift.length?'warn':'ok','Loan balances match your lenders',drift.length?drift.map(([l,d])=>`${l.name}: lender ${d>0?'higher':'lower'} by ${f2(Math.abs(d))}`).join(' · ')+'. Check its rate and minimum.':`${LL.length} linked loan${LL.length===1?'':'s'} within a few dollars of the lender’s balance`);
 // 3. Debt totals agree across Loans, Wealth and Data & math
 const owe=S.loans.reduce((a,l)=>a+debtNow(l),0);add('ok','Total owed is the same everywhere',`${f0(owe)} on Loans, Wealth and here (lender balance when linked, otherwise this month’s opening balance)`);
 // 3b. Extra money: every month's pool = shares + kept, and the budget's left over is what's kept
 if((S.al||[]).length){const bx=[];for(let i=0;i<24;i++){const k=addM(TK,i),x=xsBuild()[k];if(!x)continue;const al=Object.entries(x).filter(([d])=>/^x\|[gl]:/.test(d)).reduce((a,[,v])=>a+v,0);if(Math.abs(al+x.keep-x.pool)>0.02||(x.pool>0.5&&Math.abs(totals(k).left-x.keep)>0.6))bx.push(k)}add(bx.length?'bad':'ok','Extra money adds up',bx.length?'Shares don’t match the budget in '+bx.map(labS).join(', '):'For the next 24 months every dollar left over goes to a rule or is kept, and the budget agrees')}
 if(!SRV)return H;
 // 4. Bank connections working
 const items=(BK.st&&BK.st.items)||[],err=items.filter(it=>it.error);if(items.length)add(err.length?'bad':'ok','Bank connections',err.length?err.map(it=>it.institution.name).join(', ')+' need you to sign in again':`${items.length} connected, all syncing`,err.length?[{act:'sview',v:'connections',label:'Open Connections'}]:null);
 // 5. Nothing counted twice: a transfer between your own accounts filed as spending or income
 const pi=pairIssues();add(pi.length?'warn':'ok','No transfers counted as spending',pi.length?`${pi.length} transfer${pi.length===1?'':'s'} between your own accounts ${pi.length===1?'is':'are'} filed as spending or income`:'Money moved between your own accounts is left out of spending',pi.length?[{act:'bview',v:'review',label:'Review'}]:null);
 // 6. Card spending: a payment from checking to a card is ignored because the card's own purchases are counted.
 // That only works while the card's transactions exist: for a card that isn't connected, or months before its
 // transactions begin, the purchases are missing. Offer to count those payments as spending instead.
 const dep=new Set((BK.accts||[]).filter(a=>a.type==='depository').map(a=>a.id)),CR=(BK.accts||[]).filter(a=>a.type==='credit'),first={},bs=budStart();
 (BK.tx||[]).forEach(t=>{if(!first[t.account]||t.date<first[t.account])first[t.account]=t.date});
 const txt=t=>((t.name||'')+' '+(t.merchant||'')).toLowerCase(),cardy=t=>/visa|mastercard|amex|card|crd|e-?payment|autopay|epay/.test(txt(t))&&!/loan|mortgage|pl pymt|atm|withdraw|zelle|venmo|cash app|paypal/.test(txt(t)),
  ign=t=>{const r=(S.txd||{})[t.id];return r&&dep.has(t.account)&&t.amount>0&&r.auto!=='pair'&&(r.v==='skip'||r.v==='xfer')&&cardy(t)},
  cardOf=t=>{const x=txt(t);return CR.find(a=>a.mask&&new RegExp('(^|\\D)'+a.mask+'(\\D|$)').test(x))||CR.find(a=>x.includes(String(a.institution||'').toLowerCase().split(' ')[0]))};
 const cmiss={};(BK.tx||[]).forEach(t=>{if(!ign(t)||t.date.slice(0,7)<bs)return;const a=cardOf(t),f=a&&first[a.id];if(a&&f&&t.date>=f)return;const key=a?a.id:'?'+txt(t).replace(/[0-9#*].*$/,'').trim().slice(0,24);(cmiss[key]||(cmiss[key]={a,f,ids:[],amt:0,nm:a?`${a.institution} ••${a.mask}`:titleC(key.slice(1).replace(/^amz\b/,'amazon').replace(/storecrd/,'store').replace(/_/g,' ').replace(/ ?(pmt|payment|e-?payment|autopay)/g,'').trim())+' card'})).ids.push(t.id);cmiss[key].amt+=t.amount});
 const MI=Object.values(cmiss);
 add(MI.length?'warn':'ok','Card purchases are all in the budget',MI.length?[...MI.flatMap((o,i)=>[i?' ':'',{b:o.nm},`: ${o.a?(o.f?`its transactions only start ${dshort(o.f)}, so`:'connected, but none of its transactions come through, so'):'not connected, so'} ${o.ids.length} payment${o.ids.length===1?'':'s'} to it (${f0(o.amt)}) ${o.a&&o.f?'before then ':''}${o.ids.length===1?'is':'are'} ignored and what you bought on it is missing.`]),' Count those payments as spending (your catch-all category) to fill the gap.']:'Every card you pay from checking has its purchases counted',MI.length?MI.map(o=>({act:'hcCard',ids:o.ids.join(','),label:`Count ${o.nm} payments as spending`})):null);
 // 7. To review
 const ib=inbox().length;add(ib?'warn':'ok','Transactions sorted',ib?`${ib} transaction${ib===1?'':'s'} waiting in Bank → To review aren’t in the budget yet`:'Everything since '+dshort(bankFrom())+' is filed',ib?[{act:'tab',t:'bank',label:'Open Bank'}]:null);H[H.length-1].inbox=1;
 // 8. Paychecks and bills seen last month
 const lm=addM(TK,-1),pl=plan(lm),miss=pl.income.filter(i=>!i.once&&+i.amt>0&&!incGot(lm,i.id)).map(i=>i.name),bill=pl.groups.filter(g=>!g.flex).flatMap(g=>g.items).filter(i=>+i.amt>0&&isDue(i,lm)&&!billPaid(lm,i.id)).map(i=>i.name);
 add(miss.length?'warn':'ok',`Paychecks in ${mon(lm)}`,miss.length?`No deposit linked for ${miss.join(', ')}, so ${mon(lm)} counts the planned amount`:'Every planned paycheck arrived and is linked');
 add(bill.length?'warn':'ok',`Bills in ${mon(lm)}`,bill.length?`Not found in the bank: ${bill.join(', ')}. ${mon(lm)} counts them at their planned amount; link their payments in Build budget.`:'Every planned bill was found in the bank');
 // 9. Goal accounts split sensibly
 const over=Object.entries(S.alloc||{}).filter(([,e])=>e.mode==='split'&&Object.values(e.pct||{}).reduce((a,b)=>a+(+b||0),0)>100.01);if(Object.keys(S.alloc||{}).length)add(over.length?'bad':'ok','Savings accounts shared between goals',over.length?`${over.length} account${over.length===1?' splits':'s split'} more than 100% between goals`:'Every account’s split adds up to 100% or less');
 return H}

// What this file did as it loaded (listeners, settings read from localStorage, …): main.jsx runs it in the old
// load order, after every module is defined.
export function startSettings() {
try{SV=localStorage.getItem('pfb_sview')||'general'}catch(_){}
document.addEventListener('input',e=>{if(e.target.id==='rulesq'){RQ=e.target.value;rulesFilter()}});
document.addEventListener('toggle',e=>{if(e.target.id==='rawd'&&e.target.open)$('#rawpre').textContent=JSON.stringify(sharedData(),null,1)},true);
}
