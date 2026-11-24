// csv-import: moved from app/public/js/csv-import.js unchanged except `export`. Its top-level let/var stay there (shared state the
// classic files reassign); everything else here reads the app's globals by name as before, and dist/csv-import.js puts these
// exports on the global object (lib/csv-import.global.js) so the classic files and the React screens still call them by name.
// globals: each function is on the global object before any code here runs, each const right after its line, as in a classic script.
Object.assign(globalThis, { cvSplit, cvNum, cvDate, cvLoadText, cvFile, cvRows, cvImport, cvDel });
/* ---------- import transactions from a CSV file ---------- */
// For accounts Plaid can't reach (or that you'd rather not connect). Settings → Connections → Import from a CSV file:
// pick a file, check the columns and how money going out is shown, pick an account (or name a new one), Import.
// The file is read here; the server (POST api/bank/import) stores the rows with the bank data and skips rows it
// already has, so importing an overlapping file is fine. Imported accounts then file, budget and show like any other.
// CV holds the screen's state (not saved): the parsed file, the column choices and the account fields.

// CSV text → rows of trimmed cells. Handles quotes ("a, b"), doubled quotes, CRLF, a byte-order mark, and ; or tab files.
export function cvSplit(t){t=String(t).replace(/^﻿/,'');const first=t.split(/\r?\n/,1)[0],d=[',',';','\t'].map(c=>[c,first.split(c).length]).sort((a,b)=>b[1]-a[1])[0][0],R=[];let row=[],f='',q=false;
 for(let i=0;i<t.length;i++){const c=t[i];if(q){if(c==='"'){if(t[i+1]==='"'){f+='"';i++}else q=false}else f+=c}else if(c==='"')q=true;else if(c===d){row.push(f);f=''}else if(c==='\n'||c==='\r'){if(c==='\r'&&t[i+1]==='\n')i++;row.push(f);f='';if(row.some(x=>x.trim()))R.push(row);row=[]}else f+=c}
 row.push(f);if(row.some(x=>x.trim()))R.push(row);return R.map(r=>r.map(x=>x.trim()))}
// "1,234.56", "(12.00)", "-$5", "12,50" (decimal comma), "1.234,56" → numbers.
export function cvNum(s){s=String(s??'').trim();if(!s)return null;let neg=/\(.*\)/.test(s),x=s.replace(/[^\d.,-]/g,'');if(x.includes('-'))neg=true;x=x.replace(/-/g,'');if(!/\d/.test(x))return null;
 if(x.includes(',')&&x.includes('.'))x=x.lastIndexOf(',')>x.lastIndexOf('.')?x.replace(/\./g,'').replace(',','.'):x.replace(/,/g,'');else if(x.includes(','))x=/^\d{1,3},\d{2}$/.test(x)?x.replace(',','.'):x.replace(/,/g,'');
 const v=parseFloat(x);return isFinite(v)?(neg?-v:v):null}
// Dates as year-month-day ('ymd'), month/day/year ('mdy') or day/month/year ('dmy'); time after the date is ignored.
export function cvDate(s,fmt){s=String(s||'').trim();let y,m,d,x;if(fmt==='ymd'){x=s.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})/);if(!x)return null;[y,m,d]=[+x[1],+x[2],+x[3]]}
 else{x=s.match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{2,4})/);if(!x)return null;[m,d]=fmt==='dmy'?[+x[2],+x[1]]:[+x[1],+x[2]];y=+x[3];if(y<100)y+=2000}
 if(m<1||m>12||d<1||d>31||y<1990||y>2100)return null;return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`}
// Reads a file's text and guesses the columns: header names when there's a header row, else what the values look like.
export function cvLoadText(text,name){const R=cvSplit(text);if(!R.length){toast('That file is empty.');return}
 const fmtOf=v=>/^\d{4}[-\/.]\d{1,2}[-\/.]\d{1,2}/.test(v)?'ymd':/^\d{1,2}[-\/.]\d{1,2}[-\/.]\d{2,4}/.test(v)?'mdy':'';
 const head=R[0].every(c=>!fmtOf(c)&&cvNum(c)==null||/[a-z]/i.test(c)&&!fmtOf(c))&&R[0].some(c=>/[a-z]/i.test(c)),body=head?R.slice(1):R,n=Math.max(...R.map(r=>r.length));
 const H=Array.from({length:n},(_,i)=>head&&R[0][i]?R[0][i]:'Column '+(i+1)),find=re=>H.findIndex(h=>re.test(h)),col=i=>body.slice(0,50).map(r=>r[i]||'');
 let dc=head?find(/date|posted/i):-1;if(dc<0)dc=H.findIndex((_,i)=>col(i).filter(Boolean).every(fmtOf));
 const nums=H.map((_,i)=>i).filter(i=>i!==dc&&col(i).filter(Boolean).length&&col(i).filter(Boolean).every(v=>cvNum(v)!=null));
 let ac=head?find(/^amount|amount/i):-1,oc=head?find(/debit|withdraw|money out|paid out/i):-1,ic=head?find(/credit|deposit|money in|paid in/i):-1;if(ac<0&&oc<0)ac=nums[0]??-1;
 let nc=head?find(/desc|payee|name|memo|merchant|details|narrative|reference/i):-1;if(nc<0)nc=H.map((_,i)=>i).filter(i=>i!==dc&&!nums.includes(i)).sort((a,b)=>col(b).join('').length-col(a).join('').length)[0]??-1;
 const ds=col(Math.max(0,dc)).filter(Boolean).map(v=>v.split(/[-\/.]/));let df=fmtOf(col(Math.max(0,dc)).find(Boolean)||'')||'mdy';if(df!=='ymd')df=ds.some(p=>+p[0]>12)?'dmy':'mdy';
 const acts=((BK.st&&BK.st.items)||[]).find(it=>it.kind==='csv');
 CV={open:true,name,head:H,body,dc:String(dc),df,nc:String(nc),two:ac<0&&oc>=0&&ic>=0?'1':'',ac:String(ac),oc:String(oc),ic:String(ic),sign:'neg',acct:acts&&acts.accounts.length?acts.accounts[0].id:'new',nname:'',ntype:'checking',bal:''}}
export async function cvFile(f){if(f.size>15e6){toast('That file is too large (15 MB at most).');return}cvLoadText(await f.text(),f.name);renderSettings();const c=$('#cvcard');if(c)c.scrollIntoView({behavior:RM?'auto':'smooth',block:'start'})}
// The file's rows with the current choices: {rows:[{date,name,amount}], bad, zero}. Amounts use Plaid's sign (+ = money out).
export function cvRows(){const R=[];let bad=0,zero=0;(CV.body||[]).forEach(r=>{const date=cvDate(r[+CV.dc],CV.df),name=(r[+CV.nc]||'').trim();let amount;
  if(CV.two){const o=cvNum(r[+CV.oc]),i=cvNum(r[+CV.ic]);amount=o==null&&i==null?null:Math.abs(o||0)-Math.abs(i||0)}else{const v=cvNum(r[+CV.ac]);amount=v==null?null:CV.sign==='neg'?-v:v}
  if(!date||amount==null||!name){bad++;return}if(Math.abs(amount)<0.005){zero++;return}R.push({date,name,amount:r2(amount)})});return{rows:R,bad,zero}}
export async function cvImport(){const{rows}=cvRows();if(!rows.length){toast('No rows can be read with these choices.');return}
 const body={rows,account:CV.acct==='new'?null:CV.acct,newAccount:CV.acct==='new'?{name:CV.nname,type:CV.ntype}:null,balance:CV.bal===''?null:cvNum(CV.bal)};
 try{const r=await fetch('api/bank/import',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}),j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error||'HTTP '+r.status);
  CV={};toast(`Imported ${j.added} transaction${j.added===1?'':'s'}${j.skipped?`; ${j.skipped} were already there`:''}`);await bankLoad()}catch(e){toast('Couldn’t import: '+e.message)}}
export async function cvDel(id){const a=cvAccts().find(x=>x.id===id);if(!a||!confirm(`Remove ${a.name} and its imported transactions?\n\nAnything already filed in the budget from it goes back to unfiled.`))return;
 try{const r=await fetch('api/bank/import/'+encodeURIComponent(id),{method:'DELETE'});if(!r.ok)throw new Error('HTTP '+r.status);toast(a.name+' removed');await bankLoad()}catch(e){toast('Couldn’t remove: '+e.message)}}
export const cvAccts=()=>(((BK.st&&BK.st.items)||[]).find(it=>it.kind==='csv')||{accounts:[]}).accounts;globalThis.cvAccts=cvAccts;
// The file picker and the column choices redraw the card; typing only updates CV (and the Import button).
document.addEventListener('change',e=>{const t=e.target;if(t.id==='cvFile'&&t.files&&t.files[0]){cvFile(t.files[0]);t.value='';return}if(t.dataset&&t.dataset.cv){CV[t.dataset.cv]=t.value;renderSettings()}});
document.addEventListener('input',e=>{const t=e.target;if(t.dataset&&t.dataset.cvt){CV[t.dataset.cvt]=t.value;const b=document.querySelector('[data-act="cvImport"]');if(b)b.disabled=!(cvRows().rows.length&&(CV.acct!=='new'||(CV.nname||'').trim()))}});
