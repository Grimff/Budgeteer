// alerts: moved from app/public/js/alerts.js unchanged except `export`. Its top-level let/var stay there (shared state the
// classic files reassign); everything else here reads the app's globals by name as before, and dist/alerts.js puts these
// exports on the global object (lib/alerts.global.js) so the classic files and the React screens still call them by name.
// globals: each function is on the global object before any code here runs, each const right after its line, as in a classic script.
Object.assign(globalThis, { alertsNow, ntHide, notifyAlerts, ntTest });
/* ---------- alerts: what needs a look this month ---------- */
// alertsNow() lists, for the current month: bank connections that need signing in again, linked bills not seen in the
// bank by their due day (or due within 3 days), spending categories over plan, and transactions waiting to be sorted.
// Each alert has a key (with the month in it) used to hide it in this browser (NTH) and to send it to a phone once
// (notifyAlerts → server /api/notify, which skips keys it already sent). Bills only alert once linked to a payment,
// since an unlinked bill never shows as paid.
try{NTH=JSON.parse(localStorage.getItem('pfb_alerts_hidden')||'{}')||{}}catch(_){}
// a: the alert's button, {act, label, ...data-* values} like a health check's (hcBtns draws it).
export const ntOpen=i=>({act:'catTx',v:'i:'+i.id,label:'Open'});globalThis.ntOpen=ntOpen;
export function alertsNow(){if(!SRV||!BK.st||!BK.st.configured)return[];const k=TK,A=[],day=new Date().getDate(),p=plan(k);
 (BK.st.items||[]).filter(it=>it.error).forEach(it=>A.push({key:`conn:${it.item_id}:${it.error.code||''}`,lv:'bad',t:`${it.institution.name} needs you to sign in again`,d:it.error.message||'Its bank sync stopped.',a:{act:'sview',v:'connections',label:'Open Connections'}}));
 p.groups.filter(g=>!g.flex).forEach(g=>g.items.forEach(i=>{const due=+i.due,amt=i.base??i.amt;if(!due||i.once||!rulesFor('i:'+i.id).length||!isDue(i,k)||billPaid(k,i.id))return;
  if(due<day)A.push({key:`late:${k}:${i.id}`,lv:'warn',t:`${i.name} hasn’t shown up yet`,d:`It was due on the ${ord(due)} (${f0(amt)} planned). If it was paid another way, open it to file the payment.`,a:ntOpen(i)});
  else if(due-day<=3)A.push({key:`due:${k}:${i.id}`,lv:'info',t:`${i.name} is due ${due===day?'today':due-day===1?'tomorrow':'on the '+ord(due)}`,d:`${f0(amt)} planned`,a:ntOpen(i)})}));
 p.groups.filter(g=>g.flex).forEach(g=>g.items.forEach(i=>{const a=flexAct(k,i.id)||0,pl=+i.amt||0;if(pl>0.5&&a>pl+0.5)A.push({key:`over:${k}:${i.id}`,lv:'warn',t:`${i.name} is ${f0(a-pl)} over plan`,d:`${f0(a)} spent of ${f0(pl)} planned this month`,a:ntOpen(i)})}));
 const n=inbox().length;if(n)A.push({key:`review:${k}`,lv:'info',t:`${n} transaction${n===1?'':'s'} to sort`,d:'They aren’t in the budget until they’re filed.',a:{act:'bview',v:'review',label:'Open Bank'}});
 return A}
export function ntHide(key){NTH[key]=1;const m=TK;Object.keys(NTH).forEach(x=>{const k=x.split(':')[1];if(/^\d{4}-\d\d$/.test(k)&&k<addM(m,-2))delete NTH[x]});try{localStorage.setItem('pfb_alerts_hidden',JSON.stringify(NTH))}catch(_){}renderBudget()}
// Phone alerts (optional, NOTIFY_URL on the server): sent after each bank refresh while the app is open somewhere.
// The server sends each key once, so the same alert never repeats; connection problems it also sends on its own.
   // {configured} from GET api/notify
export async function notifyAlerts(){if(!SRV||DEMO)return;try{if(!NOTIFY){const r=await fetch('api/notify',{cache:'no-store'});NOTIFY=r.ok?await r.json():{configured:false}}if(!NOTIFY.configured)return;
 const A=alertsNow().map(a=>({key:a.key,title:a.t,message:a.d}));if(A.length)await fetch('api/notify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({alerts:A})})}catch(_){}}
export async function ntTest(){try{const r=await fetch('api/notify/test',{method:'POST'}),j=await r.json().catch(()=>({}));toast(r.ok?'Test alert sent. Check your phone.':'Couldn’t send: '+(j.error||'HTTP '+r.status))}catch(e){toast('Couldn’t send: '+e.message)}}
