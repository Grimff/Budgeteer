// wealth: moved from app/public/js/wealth.js unchanged except `export`. Its top-level let/var stay there (shared state the
// classic files reassign); everything else here reads the app's globals by name as before, and dist/wealth.js puts these
// exports on the global object (lib/wealth.global.js) so the classic files and the React screens still call them by name.
// globals: each function is on the global object before any code here runs, each const right after its line, as in a classic script.
Object.assign(globalThis, { debtNow, valueOn, perf, invSeries, rangeFrom });
/* ---------- wealth: bank balances, investments, net worth ---------- */

export const ymd=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');globalThis.ymd=ymd;
export const sg=n=>(n>=0?'+':'')+f0(n);globalThis.sg=sg;
export const RANGES=[['1m','1M'],['3m','3M'],['ytd','YTD'],['1y','1Y'],['all','All']];globalThis.RANGES=RANGES;
export const ISUB={'401k':'401(k)','roth 401k':'Roth 401(k)','403B':'403(b)',ira:'IRA',roth:'Roth IRA','sep ira':'SEP IRA','simple ira':'SIMPLE IRA',brokerage:'Brokerage','non-taxable brokerage account':'Brokerage (non-taxable)','529':'529 plan',hsa:'HSA',pension:'Pension','cash management':'Cash management',checking:'Checking',savings:'Savings','money market':'Money market',cd:'CD','credit card':'Credit card'};globalThis.ISUB=ISUB;
export const subI=s=>ISUB[s]||(s?s.replace(/^\w/,c=>c.toUpperCase()):'Account');globalThis.subI=subI;
export const acctsOf=t=>(BK.accts||[]).filter(a=>a.type===t);globalThis.acctsOf=acctsOf;
export const sumBal=L=>L.reduce((x,a)=>x+(+a.bal||0),0);globalThis.sumBal=sumBal;
export const monthEnd0=()=>ymd(new Date(NOW.getFullYear(),NOW.getMonth(),0));globalThis.monthEnd0=monthEnd0;
// What is owed on a loan today: the bank balance when linked, else this month's opening balance.
export function debtNow(l){if(l.acct&&l.live)return l.live.bal;if(TK<l.start)return l.bal;const r=row(l,TK);return r?r.open:0}
export function valueOn(a,d){let v=null;for(const k of Object.keys(a.days||{}).sort()){if(k>d)break;v=a.days[k]}return v}
// Market gain between two dates with deposits and withdrawals taken out (modified Dietz return).
export function perf(A,from,to){let v0=0,v1=0,fl=0,n=0;A.forEach(a=>{const d0=Object.keys(a.days||{}).sort()[0];if(!d0){const b=+a.bal||0;v0+=b;v1+=b;return}const f=d0>from?d0:from,st=valueOn(a,f);if(st==null)return;if(f<to)n++;v0+=st;v1+=+(valueOn(a,to)??a.bal)||0;(a.flows||[]).forEach(x=>{if(x.date>f&&x.date<=to)fl+=x.amt})});const g=v1-v0-fl,base=v0+fl/2;return{v0,v1,fl,g,pct:base>0?g/base:0,ok:n>0&&v0>0}}
export function invSeries(A,from){const ds=[...new Set(A.flatMap(a=>Object.keys(a.days||{})))].sort(),last={};A.forEach(a=>{const d0=Object.keys(a.days||{}).sort()[0];last[a.id]=d0?a.days[d0]:(+a.bal||0)});const out=[];ds.forEach(d=>{A.forEach(a=>{if(a.days&&a.days[d]!=null)last[a.id]=a.days[d]});if(d>=from)out.push({d,v:Object.values(last).reduce((x,y)=>x+y,0)})});return out}
export function rangeFrom(k,first){const d=new Date(NOW);if(k==='1m')d.setDate(d.getDate()-30);else if(k==='3m')d.setMonth(d.getMonth()-3);else if(k==='ytd')d.setMonth(0,0);else if(k==='1y')d.setFullYear(d.getFullYear()-1);else return first||ymd(NOW);const x=ymd(d);return first&&x<first?first:x}
