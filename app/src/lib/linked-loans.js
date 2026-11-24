// linked-loans: moved from app/public/js/linked-loans.js unchanged except `export`. Its top-level let/var stay there (shared state the
// classic files reassign); everything else here reads the app's globals by name as before, and dist/linked-loans.js puts these
// exports on the global object (lib/linked-loans.global.js) so the classic files and the React screens still call them by name.
// globals: each function is on the global object before any code here runs, each const right after its line, as in a classic script.
Object.assign(globalThis, { openBal, loanSync, linkLoan, inbox, loadPlaid, bankConnect, bankSync, openSync, bankRemove, txTargets, suggestTx, txLabel, txAssign, spLeft, spSave, txUndo, fileKind, allItems });
/* ---------- loans linked to bank accounts ---------- */
export const SUB={student:'Student loan',auto:'Auto loan',mortgage:'Mortgage',personal:'Personal loan','home equity':'Home equity loan','line of credit':'Line of credit',consumer:'Consumer loan',commercial:'Commercial loan',construction:'Construction loan'};globalThis.SUB=SUB;
export const subLab=s=>SUB[s]||'Loan';globalThis.subLab=subLab;
export const acctOf=l=>l.acct&&BK.loans?BK.loans.find(a=>a.id===l.acct):null;globalThis.acctOf=acctOf;
// Balance at the start of this month: today's balance plus any payment already made this month.
export function openBal(a){const y=a.liab,p=a.pays[TK]!=null?a.pays[TK]:y&&y.lastDate&&y.lastDate.slice(0,7)===TK&&+y.lastAmt>0?+y.lastAmt:0;return r2((+a.bal||0)+p)}
// Copies bank data onto linked loans in memory. The bank parts (real, rp, live, link, auto) are never saved
// to the server: they come from bank data on each load, so two browsers never fight over them.
export function loanSync(){if(!BK.loans)return;S.loans.forEach(l=>{if(!l.acct)return;const a=acctOf(l);if(!a)return;
 l.real={...a.months};const rp={...a.pays},y=a.liab;(a.payList||[]).filter(x=>/disburs|proceeds|funding|advance/i.test(x.name||'')).forEach(x=>{const k=x.date.slice(0,7);if(rp[k]!=null){rp[k]=r2(rp[k]-x.amt);if(rp[k]<0.005)delete rp[k]}});if(y&&y.lastDate&&+y.lastAmt>0){const k=y.lastDate.slice(0,7);if(rp[k]==null)rp[k]=+y.lastAmt}l.rp=rp;
 l.live=a.bal!=null?{bal:a.bal,at:a.balAt}:null;if(a.bal!=null&&a.bal<=0.5){if(!l.done)l.done=TK}else if(a.bal!=null)delete l.done;l.link={inst:a.institution,name:a.official||a.name,mask:a.mask};
 const au={};if(y){if(+y.apr>0){l.apr=+y.apr;au.apr=1}if(+y.min>0){l.min=r2(+y.min);au.min=1}if(y.next){l.due=+y.next.slice(8,10);au.due=1}if(+y.orig>0){l.orig=r2(+y.orig);au.orig=1}if(y.origDate){l.origStart=y.origDate.slice(0,7);au.origStart=1}}l.auto=au})}
export function linkLoan(id){const a=(BK.loans||[]).find(x=>x.id===id);if(!a)return;const sel=document.querySelector(`select[data-lsel="${CSS.escape(id)}"]`),to=sel&&sel.value,op=openBal(a);let l;
 if(to){l=S.loans.find(x=>x.id===to);if(!l)return;l.acct=a.id;if(l.start>TK)l.start=TK;l.anch={k:TK,eob:op}}
 else{const last=a.pays[addM(TK,-1)]||a.pays[TK]||0;l={id:uid(),name:(a.liab&&a.liab.name)||a.official||a.name||'Loan',apr:5,bal:op,min:r2(last||Math.max(25,op*0.02)),due:0,start:TK,color:PAL[S.loans.length%PAL.length],acct:a.id,anch:{k:TK,eob:op}};S.loans.push(l)}
 LP={};loanSync();const miss=[!(l.auto&&l.auto.apr)&&'APR',!(l.auto&&l.auto.min)&&'minimum payment'].filter(Boolean);
 if(miss.length){OPEN.add('l-'+l.id);toast(`Tracking ${l.name}. Check the ${miss.join(' and ')} in its details.`)}else toast(`Tracking ${l.name} from ${a.institution}`);commit()}
export function inbox(){const f=bankFrom(),d=S.txd||{},gone=S.txGone||{},la=new Set(S.loans.map(l=>l.acct).filter(Boolean));return BK.tx.filter(t=>t.date>=f&&!d[t.id]&&!gone[t.id]&&!la.has(t.account))}
setInterval(()=>{if(SRV&&!document.hidden)bankLoad()},10*60*1000);
export function loadPlaid(){return new Promise((res,rej)=>{if(window.Plaid)return res();const s=document.createElement('script');s.src='https://cdn.plaid.com/link/v2/stable/link-initialize.js';s.onload=()=>res();s.onerror=()=>rej(new Error('Couldn’t open Plaid’s connect window. Is this computer online?'));document.head.appendChild(s)})}
export const jpost=(u,b)=>fetch(u,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b||{})}).then(async r=>{const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error||('HTTP '+r.status));return j});globalThis.jpost=jpost;
// opt: 'liabilities' or 'investments' asks an existing connection to allow that add-on; 'invest' connects a brokerage.
export async function bankConnect(itemId,opt){try{await loadPlaid();const j=await jpost('api/bank/link-token',itemId?{item_id:itemId,liabilities:opt==='liabilities',investments:opt==='investments',accounts:opt==='accounts'}:{kind:opt||''});
 const h=Plaid.create({token:j.link_token,onSuccess:async(pt,meta)=>{try{if(itemId)await jpost('api/bank/reconnected',{item_id:itemId});else await jpost('api/bank/exchange',{public_token:pt,institution:meta&&meta.institution,kind:opt||''});
   toast(itemId?'Reconnected':'Connected '+((meta&&meta.institution&&meta.institution.name)||'your bank')+'. Pulling transactions…');bankLoad();[15,60,180].forEach(s=>setTimeout(()=>bankSync(true),s*1000))}catch(e){toast(e.message)}},
  onExit:err=>{if(err)toast(err.display_message||err.error_message||'Connection didn’t finish')}});h.open()}catch(e){toast(e.message)}}
// auto: from opening the app; the server skips it if it synced in the last few minutes.
export async function bankSync(quiet,auto){if(BK.busy)return;BK.busy=true;renderBank();if(S.tab==='loans')renderLoans();if(S.tab==='wealth')renderWealth();let skip=false;try{const j=await jpost('api/bank/sync',auto?{auto:true}:{});skip=!!j.skipped;if(!quiet)toast(j.added?`Synced ${j.added} new or updated transactions`:'Up to date')}catch(e){if(!quiet)toast(e.message)}BK.busy=false;if(skip){renderBank();if(S.tab==='loans')renderLoans();if(S.tab==='wealth')renderWealth();return}bankLoad()}
export function openSync(){if(!SRV||document.hidden||Date.now()-LASTOPEN<5*60000||(BK.st&&BK.st.refresh&&!BK.st.refresh.open))return;LASTOPEN=Date.now();bankSync(true,true)}
export async function bankRemove(id){const it=BK.st.items.find(x=>x.item_id===id);if(!it||!confirm(`Disconnect ${it.institution.name}? Its downloaded transactions are deleted from the server. Anything you already added to the budget stays.`))return;await fetch('api/bank/items/'+encodeURIComponent(id),{method:'DELETE'}).catch(()=>{});toast('Disconnected '+it.institution.name);bankLoad()}
export const GENERIC=new Set(['food','other','flex','power','internet','rent','loan','student','federal','private','personal','vehicle','maintenance','motorcycle','auto','new','bill','income','wages','gym','pet']);globalThis.GENERIC=GENERIC;
export function txTargets(k){const A=allItems(k),I=plan(k).income;return{A,ok:v=>v==='skip'||v==='xfer'||v==='once'||(v.startsWith('g:')&&S.goals.some(g=>g.id===v.slice(2)))||(v.startsWith('i:')&&A.some(x=>x.i.id===v.slice(2)))||(v.startsWith('l:')&&S.loans.some(l=>l.id===v.slice(2)))||(v.startsWith('inc:')&&I.some(i=>i.id===v.slice(4)))}}
export function suggestTx(t){const k=t.date.slice(0,7),{A,ok}=txTargets(k),nm=(t.merchant||t.name||'').toLowerCase(),full=(t.merchant+' '+t.name).toLowerCase(),P=(t.pfc&&t.pfc[0])||'',D=(t.pfc&&t.pfc[1])||'';
 const MM=S.merchantMap||{},mm=MM[patternOf(t)]||MM[skey(t.merchant||t.name)];if(mm&&ok(mm))return mm;
 if(t.amount<0){if(P==='INCOME'){const I=plan(k).income.filter(i=>!i.once);let b=null,bd=1e9;I.forEach(i=>{const dd=Math.abs((+i.amt||0)+t.amount);if(dd<bd){bd=dd;b=i}});return b&&bd<(+b.amt||0)*.35?'inc:'+b.id:'once'}return /^TRANSFER_/.test(P)?'xfer':'skip'}
 if(/^TRANSFER_/.test(P)||/CREDIT_CARD_PAYMENT/.test(D))return 'xfer';
 const loanBy=(strict)=>{let best=null,bd=1e9;S.loans.forEach(l=>{const dd=Math.abs(t.amount-l.min)/Math.max(1,l.min);if(dd<bd){bd=dd;best=l}});return best&&(bd<.3||!strict)?'l:'+best.id:null};
 if(P==='LOAN_PAYMENTS'){const v=loanBy(false);if(v)return v}
 if(/loan|lending|navient|nelnet|sallie|mohela|aidvantage|sofi|earnest|upstart|lendingclub|edfinancial|great lakes/.test(full)){const v=loanBy(true);if(v)return v}
 const byWord=A.find(x=>{const w=x.i.name.toLowerCase().replace(/\(.*?\)/g,'').trim().split(/\s+/)[0]||'';return w.length>=4&&!GENERIC.has(w)&&full.includes(w)});if(byWord)return 'i:'+byWord.i.id;
 const pick=(gre,ire)=>{const x=A.find(x=>(!gre||gre.test(x.g.name))&&(!ire||ire.test(x.i.name)));return x?'i:'+x.i.id:null};
 const closest=list=>{let b=null,bd=1e9;list.forEach(x=>{const d=Math.abs((+x.i.amt||0)-t.amount);if(d<bd){bd=d;b=x}});return b?'i:'+b.i.id:null};
 let v=null;
 if(/GROCERIES/.test(D))v=pick(/grocer/i,/food|grocer/i)||pick(/grocer/i);
 else if(/PET/.test(D))v=pick(null,/\bpet/i);
 else if(/TRANSPORTATION_GAS|AUTOMOTIVE|PARKING|TOLLS/.test(D))v=pick(null,/vehicle|gas|fuel|car\b/i);
 else if(/RENT_AND_UTILITIES_RENT/.test(D))v=pick(null,/^rent$/i);
 else if(/GAS_AND_ELECTRICITY/.test(D))v=pick(null,/power|electric/i);
 else if(/INTERNET_AND_CABLE/.test(D))v=pick(null,/internet|cable/i);
 else if(/TELEPHONE/.test(D))v=pick(null,/phone|mobile|cell/i);
 else if(/GYMS_AND_FITNESS/.test(D))v=pick(null,/gym/i);
 else if(/INSURANCE/.test(D))v=closest(A.filter(x=>/insur/i.test(x.g.name)));
 if(v)return v;
 const exact=A.find(x=>!x.g.flex&&Math.abs((+x.i.amt||0)-t.amount)<0.01);if(exact)return 'i:'+exact.i.id;
 return pick(/flex/i,/^flex$/i)||pick(/flex/i)||(A[0]?'i:'+A[0].i.id:'skip')}
export function txLabel(r){const v=r.v;if(v==='split')return 'Split: '+(r.parts||[]).map(c=>S.txd[c]).filter(Boolean).map(x=>txLabel(x)+' '+f0(Math.abs(x.amt))).join(' · ');if(v.startsWith('g:')){const g=S.goals.find(x=>x.id===v.slice(2));return (g?g.name:'Goal')+' (savings)'}if(v==='skip')return 'Ignored';if(v==='xfer')return 'Transfer';if(v==='once')return 'One-time income';if(v.startsWith('inc:')){const i=plan(r.k).income.find(x=>x.id===v.slice(4));return (i?i.name:'Income')+' (income)'}if(v.startsWith('l:')){const l=S.loans.find(x=>x.id===v.slice(2));return l?l.name+' payment':'Loan payment'}const x=allItems(r.k).find(x=>x.i.id===v.slice(2));return x?x.i.name:'Removed item'}
// km: the month it counts in, when that isn't the month it was paid (rent paid on the 30th for next month).
export function txAssign(t,v,auto,km){S.txd||(S.txd={});S.merchantMap||(S.merchantMap={});const k=km||t.date.slice(0,7),m=MOW(k),amt=r2(t.amount),rec={v,k,amt,d:t.date,n:t.merchant||t.name};if(t.pending)rec.pend=1;if(auto)rec.auto=auto;TXI=null;
 if(v.startsWith('i:')){const id=v.slice(2),x=allItems(k).find(x=>x.i.id===id);if(x&&x.g.flex){m.act[id]=r2((m.act[id]!=null?m.act[id]:0)+amt);m.rc||(m.rc=[]);m.rc.push({id:'tx-'+t.id,txid:t.id,store:rec.n,amt,item:id,date:t.date,bank:true});rec.flex=true}}
 else if(v.startsWith('l:')){const id=v.slice(2),filed=Object.values(S.txd).some(x=>x.v===v&&x.k===k);if(m.pay[id]!=null&&!filed){rec.hand=m.pay[id];m.pay[id]=amt}else m.pay[id]=r2((m.pay[id]!=null?m.pay[id]:0)+amt)}
 else if(v==='once'){const id=uid();(m.extra||(m.extra=[])).push({id,kind:'inc',name:rec.n,amt:r2(-amt)});rec.extra=id}
 else if(v.startsWith('g:')){const id=v.slice(2);m.dep||(m.dep={});m.dep[id]=r2((+m.dep[id]||0)+amt)}
 S.txd[t.id]=rec;if(!auto)S.merchantMap[patternOf(t)]=v}
export function spLeft(box){const id=box.dataset.spf,r=S.txd[id],tot=Math.abs(+r.amt||0),used=[...box.querySelectorAll('.spr input')].reduce((a,i)=>a+num(i.value||0),0);const o=box.querySelector('.spl');if(o)o.textContent=Math.abs(tot-used)<0.005?'Adds up':(tot-used>0?f2(tot-used)+' left to assign':f2(used-tot)+' too much');return tot-used}
export function spSave(box){const id=box.dataset.spf,r=S.txd[id];if(!r)return;const parts=[...box.querySelectorAll('.spr')].map(x=>({v:x.querySelector('select').value,a:r2(num(x.querySelector('input').value||0))})).filter(x=>x.v&&x.a>0.004);
 const tot=r2(Math.abs(+r.amt||0));if(parts.length<2)return toast('Pick at least two categories');if(Math.abs(parts.reduce((a,x)=>a+x.a,0)-tot)>0.005)return toast('The parts need to add up to '+f2(tot));
 const t=txOf(id,r),k=r.k,sg=Math.sign(+r.amt||1),ids=[];txUndo(id);parts.forEach((x,n)=>{const cid=id+'~'+(n+1);txAssign({...t,id:cid,amount:sg*x.a,pending:false},x.v,undefined,k);if(S.txd[cid]){S.txd[cid].sp=id;ids.push(cid)}});
 S.txd[id]={v:'split',k,amt:0,d:t.date,n:t.merchant||t.name,parts:ids};TXI=null;toast(`Split into ${ids.length} parts`);commit()}
export function txUndo(txid,byUser){const r=S.txd&&S.txd[txid];if(!r)return;if(r.sp&&byUser&&S.txd[r.sp])return txUndo(r.sp,true);if(r.v==='split'){(r.parts||[]).forEach(c=>txUndo(c));delete S.txd[txid];TXI=null;return}const m=MOW(r.k);TXI=null;
 if(byUser&&r.auto){S.noAuto||(S.noAuto={});S.noAuto[txid]=1;if(r.pair&&S.txd[r.pair]){S.noAuto[r.pair]=1;delete S.txd[r.pair]}}
 if(r.v==='once'&&r.extra)m.extra=(m.extra||[]).filter(x=>x.id!==r.extra);
 if(r.v.startsWith('g:')){const id=r.v.slice(2);if(m.dep&&m.dep[id]!=null){const nv=r2(m.dep[id]-r.amt);if(Math.abs(nv)>0.004)m.dep[id]=nv;else delete m.dep[id]}}
 if(r.v.startsWith('i:')&&r.flex){const id=r.v.slice(2);if(m.act[id]!=null){const v=r2(m.act[id]-r.amt);if(Math.abs(v)>0.004)m.act[id]=v;else delete m.act[id]}m.rc=(m.rc||[]).filter(x=>x.txid!==txid)}
 else if(r.v.startsWith('l:')){const id=r.v.slice(2);if(m.pay[id]!=null){const v=r2(m.pay[id]-r.amt+(+r.hand||0));if(v>0.004)m.pay[id]=v;else delete m.pay[id]}}
 delete S.txd[txid]}
export const pfcName=t=>t.pfc&&t.pfc[0]?t.pfc[0].toLowerCase().replace(/_/g,' ').replace(/^\w/,c=>c.toUpperCase()):'';globalThis.pfcName=pfcName;
export const dshort=d=>new Date(d+'T12:00').toLocaleDateString('en-US',{month:'short',day:'numeric'});globalThis.dshort=dshort;
// Bank tab: a header with sync status, then one section at a time (To review, Filed, Rules, Connections).
try{BV=localStorage.getItem('pfb_bview')}catch(_){}
export const FLKIND=[['all','All'],['spend','Spending'],['bill','Bills'],['inc','Income'],['loan','Loans'],['xfer','Transfers'],['skip','Ignored']];globalThis.FLKIND=FLKIND;
export function fileKind(r){const v=r.v||'';if(v==='xfer')return 'xfer';if(v==='skip')return 'skip';if(v.startsWith('l:'))return 'loan';if(v.startsWith('inc:')||v==='once')return 'inc';if(v.startsWith('i:')){const x=allItems(r.k).find(y=>y.i.id===v.slice(2));return x&&!x.g.flex?'bill':'spend'}return 'spend'}
export const skey=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();globalThis.skey=skey;
export function allItems(k){const out=[];plan(k).groups.forEach(g=>g.items.forEach(i=>out.push({g,i})));return out}
