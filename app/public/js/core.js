'use strict';
// ?demo / ?selftest: a sample household kept apart from your real budget (see the sample household section).
const DEMO=/[?&](demo|selftest)(=|&|$)/.test(location.search),SELFTEST=/[?&]selftest(=|&|$)/.test(location.search);
const KEY='budgeteer_v2'+(DEMO?'_demo':'');
if(DEMO)try{Object.keys(localStorage).filter(k=>k.startsWith(KEY)).forEach(k=>localStorage.removeItem(k))}catch(_){}
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const uid=()=>Math.random().toString(36).slice(2,9);
const RM=matchMedia('(prefers-reduced-motion: reduce)').matches;
const keyOf=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
const NOW=new Date(),TK=keyOf(NOW);
const addM=(k,n)=>{const[y,m]=k.split('-').map(Number);return keyOf(new Date(y,m-1+n,1))};
const mdiff=(a,b)=>{const[ay,am]=a.split('-').map(Number),[by,bm]=b.split('-').map(Number);return (by-ay)*12+(bm-am)};
const lab=k=>{const[y,m]=k.split('-').map(Number);return new Date(y,m-1,1).toLocaleDateString('en-US',{month:'long',year:'numeric'})};
const labS=k=>{const[y,m]=k.split('-').map(Number);return new Date(y,m-1,1).toLocaleDateString('en-US',{month:'short',year:'numeric'})};
const mon=k=>{const[y,m]=k.split('-').map(Number);return new Date(y,m-1,1).toLocaleDateString('en-US',{month:'long'})};
const f0=n=>(n<0?'−':'')+'$'+Math.abs(Math.round(n)).toLocaleString('en-US');
const f2=n=>(n<0?'−':'')+'$'+Math.abs(n).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
const fk=n=>n>=1000?'$'+(+(n/1000).toFixed(1))+'k':'$'+Math.round(n);
const num=v=>{const x=parseFloat(String(v).replace(/[^0-9.]/g,''));return isFinite(x)?x:0};
const r2=v=>Math.round(v*100)/100;
const esc=s=>String(s??'').replace(/\uFFFD/g,'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ord=n=>{const x=['th','st','nd','rd'],v=n%100;return n+(x[(v-20)%10]||x[v]||x[0])};
const mo=n=>n+' month'+(n===1?'':'s');
const C={pink:'#ffb6d9',lime:'#d2f46b',butter:'#ffe08a',coral:'#ff8b6e',lilac:'#c6b2ff',aqua:'#82ead8',sky:'#8fc9ff'};
const PAL=[C.butter,C.aqua,C.lilac,C.lime,C.coral,C.sky,C.pink];
const clone=o=>JSON.parse(JSON.stringify(o));
// Rich text as data (health checks, alerts, the amount dialog's line): a string, or a list of strings and {b: bold text}.
const rtParts=d=>Array.isArray(d)?d:[d];
const rtText=d=>rtParts(d).map(p=>typeof p==='string'?p:p.b).join('');
const rtHtml=d=>rtParts(d).map(p=>typeof p==='string'?esc(p):`<b>${esc(p.b)}</b>`).join('');

/* ---------- data ---------- */
const it=(name,amt,due=0)=>({id:uid(),name,amt,due});
// Starting budget for a browser with nothing saved yet (the server copy replaces it): empty on purpose, so this file,
// which is in the GitHub repo, holds no budget data at all. The Build budget steps fill it in.
function seedPlan(){return{income:[],groups:[]}}
const seedLoans=()=>[],seedGoals=()=>[];


let S;
function load(){try{const v=JSON.parse(localStorage.getItem(KEY));if(v&&v.plans&&Object.keys(v.plans).length){v.cur=v.cur||TK;v.tab=v.tab||'budget';v.months=v.months||{};return v}}catch(e){}
 return{plans:{[TK]:seedPlan()},loans:seedLoans(),goals:seedGoals(),months:{},cur:TK,tab:'budget',flow:'plan'}}
S=load();
let saveT,AUTOSAVE=false;function save(){if(!AUTOSAVE){try{FS.autoOnly=false}catch(_){}}try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){toast('Could not save in this browser. Download a backup to keep your changes.')}fsQueue()}

const MO=k=>S.months[k]||{act:{},pay:{},dep:{}};
const MOW=k=>{const m=S.months[k]||(S.months[k]={});m.act||(m.act={});m.pay||(m.pay={});m.dep||(m.dep={});return m};
function basePlan(k=S.cur){const ks=Object.keys(S.plans).sort();const p=[...ks].reverse().find(x=>x<=k)||ks[0];return S.plans[p]}
function plan0(k=S.cur){const b=basePlan(k),x=(S.months[k]&&S.months[k].extra)||[];if(!x.length)return b;
 return{...b,income:[...b.income,...x.filter(e=>e.kind==='inc').map(e=>({...e,once:true}))],groups:b.groups.map(g=>({...g,items:[...g.items,...x.filter(e=>e.kind==='item'&&e.gid===g.id).map(e=>({...e,once:true}))]}))}}
// The month's plan as every total uses it. A bill due every 3/6/12 months (i.freq, due month i.dm) becomes a monthly
// set-aside (amt/freq; base keeps the bill amount), so the due month never spikes; its payment comes "from the
// set-aside" (billPaid).
const MN=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],FQ={3:'every 3 months',6:'twice a year',12:'yearly'};
const isDue=(i,k)=>!(+i.freq>1)||((+k.slice(5)-(+i.dm||1))%+i.freq+ +i.freq)%+i.freq===0;
const nextDue=(i,k)=>{let m=k;for(let n=0;n<12;n++,m=addM(m,1))if(isDue(i,m))return m;return k};
function plan(k=S.cur){const b=plan0(k);if(!b.groups.some(g=>g.items.some(i=>+i.freq>1)))return b;
 return{...b,groups:b.groups.map(g=>({...g,items:g.items.map(i=>{if(!g.flex&&+i.freq>1)return{...i,base:+i.amt||0,amt:r2((+i.amt||0)/+i.freq)};return i})}))}}
function editPlan(fn,k){if(k==null)k=INB?scopeStart():S.cur;if(!S.plans[k])S.plans[k]=clone(basePlan(k));Object.keys(S.plans).sort().forEach(x=>{if(x>=k)fn(S.plans[x])})}
const extras=(k=S.cur)=>{const m=MOW(k);return m.extra||(m.extra=[])};
