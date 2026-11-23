'use strict';
/* ---------- alerts: what needs a look this month ---------- */
// alertsNow() lists, for the current month: bank connections that need signing in again, linked bills not seen in the
// bank by their due day (or due within 3 days), spending categories over plan, and transactions waiting to be sorted.
// Each alert has a key (with the month in it) used to hide it in this browser (NTH) and to send it to a phone once
// (notifyAlerts → server /api/notify, which skips keys it already sent). Bills only alert once linked to a payment,
// since an unlinked bill never shows as paid.
let NTH={};try{NTH=JSON.parse(localStorage.getItem('pfb_alerts_hidden')||'{}')||{}}catch(_){}
const ntOpen=i=>`<button class="btn g sm" data-act="catTx" data-v="i:${i.id}">Open</button>`;
function alertsNow(){if(!SRV||!BK.st||!BK.st.configured)return[];const k=TK,A=[],day=new Date().getDate(),p=plan(k);
 (BK.st.items||[]).filter(it=>it.error).forEach(it=>A.push({key:`conn:${it.item_id}:${it.error.code||''}`,lv:'bad',t:`${it.institution.name} needs you to sign in again`,d:it.error.message||'Its bank sync stopped.',a:'<button class="btn g sm" data-act="sview" data-v="connections">Open Connections</button>'}));
 p.groups.filter(g=>!g.flex).forEach(g=>g.items.forEach(i=>{const due=+i.due,amt=i.base??i.amt;if(!due||i.once||!rulesFor('i:'+i.id).length||!isDue(i,k)||billPaid(k,i.id))return;
  if(due<day)A.push({key:`late:${k}:${i.id}`,lv:'warn',t:`${i.name} hasn’t shown up yet`,d:`It was due on the ${ord(due)} (${f0(amt)} planned). If it was paid another way, open it to file the payment.`,a:ntOpen(i)});
  else if(due-day<=3)A.push({key:`due:${k}:${i.id}`,lv:'info',t:`${i.name} is due ${due===day?'today':due-day===1?'tomorrow':'on the '+ord(due)}`,d:`${f0(amt)} planned`,a:ntOpen(i)})}));
 p.groups.filter(g=>g.flex).forEach(g=>g.items.forEach(i=>{const a=flexAct(k,i.id)||0,pl=+i.amt||0;if(a>pl+0.5)A.push({key:`over:${k}:${i.id}`,lv:'warn',t:`${i.name} is ${f0(a-pl)} over plan`,d:`${f0(a)} spent of ${f0(pl)} planned this month`,a:ntOpen(i)})}));
 const n=inbox().length;if(n)A.push({key:`review:${k}`,lv:'info',t:`${n} transaction${n===1?'':'s'} to sort`,d:'They aren’t in the budget until they’re filed.',a:'<button class="btn g sm" data-act="bview" data-v="review">Open Bank</button>'});
 return A}
// Budget → This month, current month only. Pure: reads alertsNow() and NTH.
function alertsCard(){if(S.cur!==TK)return '';const A=alertsNow().filter(a=>!NTH[a.key]);if(!A.length)return '';const ic={bad:'×',warn:'!',info:'i'};
 return `<section class="card nt" style="--i:1"><h2>Needs a look</h2><div class="hcl">${A.map(a=>`<div class="hci ${a.lv}"><i>${ic[a.lv]}</i><div><b>${esc(a.t)}</b><p>${esc(a.d)}</p><div class="hca">${a.a||''}<button class="lnk" data-act="ntHide" data-id="${esc(a.key)}">Hide</button></div></div></div>`).join('')}</div></section>`}
function ntHide(key){NTH[key]=1;const m=TK;Object.keys(NTH).forEach(x=>{const k=x.split(':')[1];if(/^\d{4}-\d\d$/.test(k)&&k<addM(m,-2))delete NTH[x]});try{localStorage.setItem('pfb_alerts_hidden',JSON.stringify(NTH))}catch(_){}renderBudget()}
// Phone alerts (optional, NOTIFY_URL on the server): sent after each bank refresh while the app is open somewhere.
// The server sends each key once, so the same alert never repeats; connection problems it also sends on its own.
let NOTIFY=null;   // {configured} from GET api/notify
async function notifyAlerts(){if(!SRV||DEMO)return;try{if(!NOTIFY){const r=await fetch('api/notify',{cache:'no-store'});NOTIFY=r.ok?await r.json():{configured:false}}if(!NOTIFY.configured)return;
 const A=alertsNow().map(a=>({key:a.key,title:a.t,message:a.d}));if(A.length)await fetch('api/notify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({alerts:A})})}catch(_){}}
async function ntTest(){try{const r=await fetch('api/notify/test',{method:'POST'}),j=await r.json().catch(()=>({}));toast(r.ok?'Test alert sent. Check your phone.':'Couldn’t send: '+(j.error||'HTTP '+r.status))}catch(e){toast('Couldn’t send: '+e.message)}}
// Settings → Connections: whether phone alerts are set up, and a test button.
const ntCard=()=>!SRV||DEMO?'':`<section class="card" style="margin-top:16px"><h2>Phone alerts</h2><p class="mut" style="font-size:14px;margin:4px 0 12px">${!NOTIFY?'Checking…':NOTIFY.configured?`On: alerts go to ${esc(NOTIFY.target||'your notification service')}. Bills due or missing, spending over plan, transactions to sort and bank connections that need you, each sent once.`:'Off. To get alerts on your phone, set <b>NOTIFY_URL</b> in the server’s .env to an ntfy topic or a Home Assistant webhook, then restart it.'}</p>${NOTIFY&&NOTIFY.configured?'<button class="btn g sm" data-act="ntTest">Send a test alert</button>':''}</section>`;
