// core: the code of what was app/public/js/core.js (unchanged but for imports, `export`, the shared state's setters and
// startCore(), which holds what used to run as the file loaded).
// ?demo / ?selftest: a sample household kept apart from your real budget (see the sample household section).
// Shared state (other files change it with the set… functions; it was js/core.js):
import { INB, scopeStart } from './build.js';
import { toast } from './math.js';
import { FS, fsQueue } from './server-sync.js';
export let S; export function setS(v){return S=v}
export let saveT,AUTOSAVE=false; export function setsaveT(v){return saveT=v} export function setAUTOSAVE(v){return AUTOSAVE=v}
export const DEMO=/[?&](demo|selftest)(=|&|$)/.test(location.search),SELFTEST=/[?&]selftest(=|&|$)/.test(location.search);
export const KEY='budgeteer_v2'+(DEMO?'_demo':'');
export const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
export const uid=()=>Math.random().toString(36).slice(2,9);
export const RM=matchMedia('(prefers-reduced-motion: reduce)').matches;
export const keyOf=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
export const NOW=new Date(),TK=keyOf(NOW);
export const addM=(k,n)=>{const[y,m]=k.split('-').map(Number);return keyOf(new Date(y,m-1+n,1))};
export const mdiff=(a,b)=>{const[ay,am]=a.split('-').map(Number),[by,bm]=b.split('-').map(Number);return (by-ay)*12+(bm-am)};
export const lab=k=>{const[y,m]=k.split('-').map(Number);return new Date(y,m-1,1).toLocaleDateString('en-US',{month:'long',year:'numeric'})};
export const labS=k=>{const[y,m]=k.split('-').map(Number);return new Date(y,m-1,1).toLocaleDateString('en-US',{month:'short',year:'numeric'})};
export const mon=k=>{const[y,m]=k.split('-').map(Number);return new Date(y,m-1,1).toLocaleDateString('en-US',{month:'long'})};
export const f0=n=>(n<0?'−':'')+'$'+Math.abs(Math.round(n)).toLocaleString('en-US');
export const f2=n=>(n<0?'−':'')+'$'+Math.abs(n).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
export const fk=n=>n>=1000?'$'+(+(n/1000).toFixed(1))+'k':'$'+Math.round(n);
export const num=v=>{const x=parseFloat(String(v).replace(/[^0-9.]/g,''));return isFinite(x)?x:0};
export const r2=v=>Math.round(v*100)/100;
export const esc=s=>String(s??'').replace(/\uFFFD/g,'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const ord=n=>{const x=['th','st','nd','rd'],v=n%100;return n+(x[(v-20)%10]||x[v]||x[0])};
export const mo=n=>n+' month'+(n===1?'':'s');
export const C={pink:'#ffb6d9',lime:'#d2f46b',butter:'#ffe08a',coral:'#ff8b6e',lilac:'#c6b2ff',aqua:'#82ead8',sky:'#8fc9ff'};
export const PAL=[C.butter,C.aqua,C.lilac,C.lime,C.coral,C.sky,C.pink];
export const clone=o=>JSON.parse(JSON.stringify(o));
// Rich text as data (health checks, alerts, the amount dialog's line): a string, or a list of strings and {b: bold text}.
export const rtParts=d=>Array.isArray(d)?d:[d];
export const rtText=d=>rtParts(d).map(p=>typeof p==='string'?p:p.b).join('');

/* ---------- data ---------- */
export const it=(name,amt,due=0)=>({id:uid(),name,amt,due});
// Starting budget for a browser with nothing saved yet (the server copy replaces it): empty on purpose, so this file,
// which is in the GitHub repo, holds no budget data at all. The Build budget steps fill it in.
export function seedPlan(){return{income:[],groups:[]}}
export const seedLoans=()=>[],seedGoals=()=>[];

// HADL: this browser had its own copy of the budget at start (if not, the tabs show placeholders until the server's arrives)
export let HADL=false; export function setHADL(v){return HADL=v}
export function load(){try{const v=JSON.parse(localStorage.getItem(KEY));if(v&&v.plans&&Object.keys(v.plans).length){v.cur=v.cur||TK;v.tab=v.tab||'budget';v.months=v.months||{};HADL=true;return v}}catch(e){}
 return{plans:{[TK]:seedPlan()},loans:seedLoans(),goals:seedGoals(),months:{},cur:TK,tab:'budget',flow:'plan'}}
export function save(){if(!AUTOSAVE){try{FS.autoOnly=false}catch(_){}}try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){toast('Could not save in this browser. Download a backup to keep your changes.')}fsQueue()}

export const MO=k=>S.months[k]||{act:{},pay:{},dep:{}};
export const MOW=k=>{const m=S.months[k]||(S.months[k]={});m.act||(m.act={});m.pay||(m.pay={});m.dep||(m.dep={});return m};
export function basePlan(k=S.cur){const ks=Object.keys(S.plans).sort();const p=[...ks].reverse().find(x=>x<=k)||ks[0];return S.plans[p]}
export function plan0(k=S.cur){const b=basePlan(k),x=(S.months[k]&&S.months[k].extra)||[];if(!x.length)return b;
 return{...b,income:[...b.income,...x.filter(e=>e.kind==='inc').map(e=>({...e,once:true}))],groups:b.groups.map(g=>({...g,items:[...g.items,...x.filter(e=>e.kind==='item'&&e.gid===g.id).map(e=>({...e,once:true}))]}))}}
// The month's plan as every total uses it. A bill due every 3/6/12 months (i.freq, due month i.dm) becomes a monthly
// set-aside (amt/freq; base keeps the bill amount), so the due month never spikes; its payment comes "from the
// set-aside" (billPaid).
export const MN=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],FQ={3:'every 3 months',6:'twice a year',12:'yearly'};
export const isDue=(i,k)=>!(+i.freq>1)||((+k.slice(5)-(+i.dm||1))%+i.freq+ +i.freq)%+i.freq===0;
export const nextDue=(i,k)=>{let m=k;for(let n=0;n<12;n++,m=addM(m,1))if(isDue(i,m))return m;return k};
export function plan(k=S.cur){const b=plan0(k);if(!b.groups.some(g=>g.items.some(i=>+i.freq>1)))return b;
 return{...b,groups:b.groups.map(g=>({...g,items:g.items.map(i=>{if(!g.flex&&+i.freq>1)return{...i,base:+i.amt||0,amt:r2((+i.amt||0)/+i.freq)};return i})}))}}
export function editPlan(fn,k){if(k==null)k=INB?scopeStart():S.cur;if(!S.plans[k])S.plans[k]=clone(basePlan(k));Object.keys(S.plans).sort().forEach(x=>{if(x>=k)fn(S.plans[x])})}
export const extras=(k=S.cur)=>{const m=MOW(k);return m.extra||(m.extra=[])};

// What this file did as it loaded (listeners, settings read from localStorage, …): main.jsx runs it in the old
// load order, after every module is defined.
export function startCore() {
if(DEMO)try{Object.keys(localStorage).filter(k=>k.startsWith(KEY)).forEach(k=>localStorage.removeItem(k))}catch(_){}
S=load();
}
