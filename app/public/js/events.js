'use strict';
/* ---------- render all ---------- */
const TABR={budget:()=>renderBudget(),loans:()=>renderLoans(),goals:()=>renderGoals(),wealth:()=>renderWealth(),history:()=>renderHistory(),bank:()=>renderBank(),settings:()=>renderSettings()};
// The page frame for the viewed month and tab: month label and picker, This month button, the active tab, which section shows.
function frameUI(){$('#mlab').textContent=lab(S.cur);$('#mp').value=S.cur;$('#tbtn').hidden=S.cur===TK;
 $$('.tabs button').forEach(b=>b.classList.toggle('on',b.dataset.t===S.tab));document.body.className='tab-'+S.tab;$$('.tab').forEach(t=>{t.hidden=t.dataset.tab!==S.tab;t.classList.remove('enter')})}
function renderAll(enter){LP={};GP={};XS=null;TXI=null;ALC={};loanSync();frameUI();
 // Only the visible tab is drawn; the others are redrawn when switched to (every tab switch goes through commit → renderAll).
 // Shown before it's drawn, so charts that size themselves to the tab (History) measure its real width.
   (TABR[S.tab]||renderBudget)();brandSet();
 if(enter){const t=$('#T-'+S.tab);void t.offsetWidth;t.classList.add('enter')}moveInd();fmtAll()}
function moveInd(){const b=$(`.tabs [data-t="${S.tab}"]`),i=$('.ind');if(!b)return;i.style.width=b.offsetWidth+'px';i.style.transform=`translateX(${b.offsetLeft-i.offsetLeft}px)`;const T=b.parentElement;if(T.scrollWidth>T.clientWidth+2){const x=b.offsetLeft-(T.clientWidth-b.offsetWidth)/2;T.scrollTo({left:Math.max(0,x),behavior:RM?'auto':'smooth'})}}
function commit(enter){if(INB&&SRV){INB=false;if(autoFile()){LP={}}}save();rerender(enter)}
function rerender(enter){const a=document.activeElement,k=a&&a.dataset?a.dataset.key:null,raw=k?a.value:null,ss=k&&'selectionStart' in a?[a.selectionStart,a.selectionEnd]:null;
 renderAll(enter);
 if(k){const e=document.querySelector(`[data-key="${CSS.escape(k)}"]`);if(e){e.value=raw;RESTORING=true;try{e.focus({preventScroll:true})}finally{RESTORING=false}try{if(ss)e.setSelectionRange(ss[0],ss[1])}catch(_){}}}}
function go(k){S.cur=k;commit(true)}

/* ---------- events ---------- */
let inT;
document.addEventListener('input',e=>{if(e.rx)return;const t=e.target,d=t.dataset;INB=!!(t.closest&&t.closest('[data-build]'));
 if(d.alpct){const e=(S.alloc||{})[d.alpct];if(e){e.pct||(e.pct={});e.pct[d.g]=num(t.value)}save();clearTimeout(inT);inT=setTimeout(()=>commit(),350);return}
 if(d.filt){FLQ=t.value;FLN=50;const a=document.activeElement,ss=[a.selectionStart,a.selectionEnd];renderBank();const e2=document.querySelector('[data-key="flq"]');if(e2){RESTORING=true;try{e2.focus()}finally{RESTORING=false}try{e2.setSelectionRange(ss[0],ss[1])}catch(_){}}return}
 if(d.live==='sp'){const box=t.closest('.spf');if(box)spLeft(box);return}
 if(d.live==='wf'){WFS[d.f]=+t.value;const o=$('#wfo-'+d.f);if(o)o.textContent=(WFS[d.f]<0?'−':d.f==='inc'&&WFS[d.f]>0?'+':'')+f0(Math.abs(WFS[d.f]));clearTimeout(inT);inT=setTimeout(fcBody,250);return}
 if(d.live==='px'){PX=num(t.value);pxLive();return}
 if(d.live==='wi'){const l=S.loans.find(x=>x.id===d.id);WI[l.id]=+t.value;$('#wo-'+l.id).textContent=f0(+t.value);wiLive(l,+t.value);return}
 if(!d.k)return;const v=t.value,n=num(v);
 if(d.k==='inc')editPlan(p=>{const i=p.income.find(x=>x.id===d.id);if(i)i[d.f]=d.f==='name'?v:n});
 else if(d.k==='item')editPlan(p=>{const g=p.groups.find(x=>x.id===d.g),i=g&&g.items.find(x=>x.id===d.id);if(i)i[d.f]=d.f==='name'?v:d.f==='due'?Math.min(31,Math.round(n)):n});
 else if(d.k==='gname')editPlan(p=>{const g=p.groups.find(x=>x.id===d.g);if(g)g.name=v});
 else if(d.k==='act'){const m=MOW(S.cur);if(v.trim()==='')delete m.act[d.id];else m.act[d.id]=n}
 else if(d.k==='gmon'){const g=S.goals.find(x=>x.id===d.id);if(g)verSet(g,'mp',xStart(),Math.max(0,n))}
 else if(d.k==='gov'){const m=MOW(S.cur);m.gplan||(m.gplan={});if(v.trim()==='')delete m.gplan[d.id];else m.gplan[d.id]=n}
 else if(d.k==='lxb'){const l=S.loans.find(x=>x.id===d.id);if(l)setUsual(l,xStart(),Math.max(0,n))}
 else if(d.k==='alv'){const a=(S.al||[]).find(x=>x.id===d.id);if(a)a.v=Math.max(0,a.src==='extra'&&a.mode==='%'?Math.min(100,n):n)}
 else if(d.k==='lov'){const m=MOW(S.cur);m.lxp||(m.lxp={});if(v.trim()==='')delete m.lxp[d.id];else m.lxp[d.id]=Math.max(0,n)}
 else if(d.k==='once'){const e=extras().find(x=>x.id===d.id);if(e)e[d.f]=d.f==='name'?v:d.f==='due'?Math.min(31,Math.round(n)):n}
 else if(d.k==='lname'){const l=S.loans.find(x=>x.id===d.id);if(l)l.name=v}
 else if(d.k==='gname2'){const g=S.goals.find(x=>x.id===d.id);if(g)g.name=v}
 save();clearTimeout(inT);inT=setTimeout(()=>commit(),350)});
document.addEventListener('change',e=>{if(e.rx)return;const t=e.target,d=t.dataset;INB=!!(t.closest&&t.closest('[data-build]'));
 if(d.mm){monthMove(d.mm,t.value);return}
 if(d.mv){catMove(d.mv,t.value);return}
 if(d.tx&&t.tagName==='SELECT'){const cb=document.querySelector(`input[data-alw="${CSS.escape(d.tx)}"]`);const tx=BK.tx.find(x=>x.id===d.tx);if(cb&&tx)cb.checked=defAlways(t.value,tx.date.slice(0,7));return}
 if(d.alacct){if(t.value){S.alloc||(S.alloc={});S.alloc[t.value]={mode:'order',goals:[],pct:{},rest:'last'}}return commit()}
 if(d.gacct){const g=S.goals.find(x=>x.id===d.gacct);if(g&&t.value){S.alloc||(S.alloc={});const e=S.alloc[t.value]||(S.alloc[t.value]={mode:'order',goals:[],pct:{},rest:'last'});if(!e.goals.includes(g.id)){e.goals.push(g.id);if(e.mode==='split'){e.pct||(e.pct={});const used=e.goals.reduce((x,id)=>x+(+(e.pct[id]||0)),0);e.pct[g.id]=Math.max(0,100-used)}}toast(e.goals.length>1?`Shared with ${e.goals.length-1} other goal${e.goals.length>2?'s':''}. Set the order or split in Accounts for goals.`:`${g.name} now uses this account`)}return commit()}
 if(d.catchall){S.catchAll=t.value||undefined;if(!S.catchAll)delete S.catchAll;let n=0;Object.entries(S.txd||{}).forEach(([id,r])=>{if(r.auto==='rest'){txUndo(id);n++}});const f=autoFile();
  toast(S.catchAll==='review'?`${n} purchase${n===1?'':'s'} moved back to To review`:`Unlinked purchases now go to ${txLabel({v:'i:'+flexDefault(TK),k:TK})}${f?` (${f} re-filed)`:''}`);return commit()}
 if(d.aladd){const e=(S.alloc||{})[d.aladd];if(e&&t.value&&!e.goals.includes(t.value)){e.goals.push(t.value);if(e.mode==='split'){e.pct||(e.pct={});const used=e.goals.reduce((x,id)=>x+(+(e.pct[id]||0)),0);e.pct[t.value]=Math.max(0,100-used)}}return commit()}
 if(d.alrest){const e=(S.alloc||{})[d.alrest];if(e)e.rest=t.checked?'last':'none';return commit()}
 if(d.tops)return;
 if(d.rule){const r=(S.rules||[]).find(x=>x.id===d.rule);if(r){const v=normT(t.value);if(v&&v!==r.p){r.p=v;ruleReapply(r);toast('Rule updated and re-applied')}}return commit()}
 if(d.rulev){const r=(S.rules||[]).find(x=>x.id===d.rulev);if(r&&t.value&&t.value!==r.v){r.v=t.value;ruleReapply(r);toast(`Now filing to ${txLabel({v:r.v,k:TK})}`)}return commit()}
 if(d.ruleshift){const r=(S.rules||[]).find(x=>x.id===d.ruleshift);if(r){if(t.value)r.shift=t.value;else delete r.shift;ruleReapply(r);toast('Rule updated and re-applied')}return commit()}
 if(d.rulemin||d.rulemax){const r=(S.rules||[]).find(x=>x.id===(d.rulemin||d.rulemax));if(r){const f=d.rulemin?'min':'max',v=t.value.trim();if(v==='')delete r[f];else r[f]=r2(num(v));ruleReapply(r)}return commit()}
 if(d.al){const a=(S.al||[]).find(x=>x.id===d.al);if(!a)return;const v=t.value;if(d.f==='to'){a.to=v;if(v==='snow'){a.how=a.how||'rate';a.loans=a.loans||[];if(a.roll==null)a.roll=true}if(v==='keep'){a.src='extra'}}else if(d.f==='from'){if(v)a.from=v;if(a.until&&a.until<a.from)a.until=a.from}else if(d.f==='until'){a.until=v&&v<a.from?a.from:v}else if(d.f==='loan'){const L=new Set(a.loans||[]);t.checked?L.add(d.l):L.delete(d.l);a.loans=[...L]}else if(d.f==='roll')a.roll=t.checked;return commit()}
 if(!d.c)return;
 if(d.c==='loan'){const l=S.loans.find(x=>x.id===d.id);if(!l)return;if(d.f==='start'){if(t.value)l.start=t.value}else if(d.f==='origStart'){l.origStart=t.value||''}else if(d.f==='due')l.due=Math.min(31,Math.round(num(t.value)));else if(d.f==='xtra')setUsual(l,xStart(),Math.max(0,num(t.value)));else l[d.f]=num(t.value)}
 if(d.c==='hh'){S.hh={...(S.hh||{}),[d.f]:t.value.trim()};brandSet();return commit()}
 if(d.c==='bankfrom'){S.bankFrom=t.value||'';save();bankLoad();return}
 if(d.c==='refresh'){const b=d.f==='open'?{open:t.checked}:{hours:+t.value};fetch('api/bank/settings',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)}).then(async r=>{const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error||'Couldn’t save');if(BK.st)BK.st.refresh=j.refresh;toast(syncWord(j.refresh));renderSettings()}).catch(e=>{toast(e.message);renderSettings()});return}
 if(d.c==='goal'){const g=S.goals.find(x=>x.id===d.id);if(!g)return;if(d.f==='auto')g.auto=t.checked;else if(d.f==='monthly')verSet(g,'mp',xStart(),Math.max(0,num(t.value)));else if(d.f==='by'){if(t.value)g.by=t.value;else delete g.by}else g[d.f]=num(t.value)}
 commit()});
document.addEventListener('toggle',e=>{const d=e.target;if(d.matches&&d.matches('details[data-key]')){d.open?OPEN.add(d.dataset.key):OPEN.delete(d.dataset.key)}},true);
document.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches('.clh')){e.preventDefault();e.target.click();return}if(e.key==='Enter'&&e.target.matches('.in')&&!e.target.closest('dialog')){e.preventDefault();const all=$$('.tab:not([hidden]) .in:not([disabled])'),i=all.indexOf(e.target);(all[i+1]||e.target).focus();all[i+1]?.select?.()}});
// Clicking into an amount selects it so it's easy to replace. Not when a redraw puts the cursor back (RESTORING).
let RESTORING=false;
document.addEventListener('focusin',e=>{if(RESTORING)return;const el=e.target;if(el.matches('.in.a')&&!el.closest('dialog')){el._sel=true;setTimeout(()=>{if(el._sel)el.select?.();el._sel=false},0)}});
// Amounts get thousands separators as you type; num() ignores the commas when reading them.
function fmtAmt(v){v=String(v).replace(/[^0-9.]/g,'');if(!v)return '';const i=v.indexOf('.');let a=i<0?v:v.slice(0,i);const b=i<0?'':'.'+v.slice(i+1).replace(/\./g,'');a=a.replace(/^0+(?=\d)/,'')||(b?'0':'');return a.replace(/\B(?=(\d{3})+(?!\d))/g,',')+b}
const AMT='input.in[inputmode="decimal"]';
function fmtAll(root=document){root.querySelectorAll(AMT).forEach(e=>{if(e.value)e.value=fmtAmt(e.value)})}
document.addEventListener('input',e=>{const t=e.target;t._sel=false;if(!t.matches||!t.matches(AMT))return;const v=t.value,pos=t.selectionStart??v.length;
 const keep=v.slice(0,pos).replace(/[^0-9.]/g,'').length,f=fmtAmt(v);if(f===v)return;t.value=f;
 let c=0,i=0;while(i<f.length&&c<keep){if(/[0-9.]/.test(f[i]))c++;i++}try{t.setSelectionRange(i,i)}catch(_){}},true);
document.addEventListener('click',e=>{const nd=e.target.closest('#sk .nd'),lk=nd?null:e.target.closest('#sk .lk');if((nd||lk)&&K){if(SKD){SKD=false;return}const n=nd?K.all[+nd.dataset.n]:K.L[+lk.dataset.l].t;return skOpen(n,{l:e.clientX,r:e.clientX,y:e.clientY})}
 if(!e.skDone&&!e.target.closest('#skc')&&!e.target.closest('dialog')&&$('#skc:not([hidden])'))skClose();   // skDone: the React handler did this first
 if(e.rx)return;   // handled by the element's own React handler (bridge.js on)
 const b=e.target.closest('[data-act]');if(!b)return;const d=b.dataset;INB=!!b.closest('[data-build]');
 switch(d.act){
 case'bankConnect':return bankConnect(d.id||'',d.kind||'');
 case'invAllow':return bankConnect(d.id,'investments');
 case'wr':WR=d.r;return renderWealth();
 case'lr':LR=d.r;try{localStorage.setItem('pfb_lr',LR)}catch(_){}return renderLoans();
 case'bankSync':return bankSync();
 case'bankRemove':return bankRemove(d.id);
 case'txAdd':{const t=BK.tx.find(x=>x.id===d.id),sel=document.querySelector(`select[data-tx="${CSS.escape(d.id)}"]`);if(!t||!sel)return;const al=document.querySelector(`input[data-alw="${CSS.escape(d.id)}"]`);txAssign(t,sel.value);
  if(al&&al.checked&&sel.value!=='once'){const r=addRule(patternOf(t),tdir(t),sel.value),n=autoFile();toast(`Filed. ${n?n+' more like it filed too. ':''}New ones matching “${r.p}” file themselves.`)}return commit()}
 case'txAll':{let n=0,nr=0;$$('select[data-tx]').forEach(sel=>{const t=BK.tx.find(x=>x.id===sel.dataset.tx);if(t&&!(S.txd&&S.txd[t.id])){txAssign(t,sel.value);n++;const al=document.querySelector(`input[data-alw="${CSS.escape(t.id)}"]`);if(al&&al.checked&&sel.value!=='once'){addRule(patternOf(t),tdir(t),sel.value);nr++}}});const m2=nr?autoFile():0;toast(`Added ${n+m2} transaction${n+m2===1?'':'s'}${nr?`, ${nr} new rule${nr===1?'':'s'}`:''}`);return commit()}
 case'fixPairs':{const I=pairIssues();I.forEach(({id,o,r})=>{txUndo(id);S.txd[id]={v:'xfer',k:r.k,amt:r.amt,d:r.d,n:r.n,auto:'pair',pair:o};if(!S.txd[o]||S.txd[o].v==='skip'){const u=BK.tx.find(t=>t.id===o);if(u)S.txd[o]={v:'xfer',k:u.date.slice(0,7),amt:r2(u.amount),d:u.date,n:u.merchant||u.name,auto:'pair',pair:id}}});TXI=null;toast(`${I.length} made into transfers`);return commit()}
 case'catTx':if(d.k&&d.k!==S.cur){S.cur=d.k;commit(true)}return catOpen(d.v);
 case'tclose':CT=null;return $('#tdlg').close();
 case'flowDet':return flowOpen(d.v);
 case'fclose':FD=null;return $('#fdlg').close();
 case'flowTx':{FD=null;$('#fdlg').close();return catOpen(d.v)}
 case'delMonth':{const k=d.k;if(!confirm(`Delete ${lab(k)}?\n\nThis removes everything recorded for ${lab(k)}: actual spending, logged loan payments and savings deposits, one-time items, and the bank transactions counted there (they won't be filed again).\n\nBudget plans, loans and goals stay.`))return;
  delete S.months[k];S.txGone||(S.txGone={});Object.entries(S.txd||{}).forEach(([id,r])=>{if(r.k===k){delete S.txd[id];S.txGone[id]=1}});
  if(histMonths()[0]===k){const f=addM(k,1);S.histFrom=f>TK?TK:f}
  OPEN.delete('h-'+k);LP={};TXI=null;toast(`Deleted ${lab(k)}`);return commit()}
 case'histAll':delete S.histFrom;return commit();
 case'bcol':{const sec=b.closest('section');if(!sec)return;const shut=!sec.classList.contains('shut');bcSet(d.v,shut);sec.classList.toggle('shut',shut);b.setAttribute('aria-expanded',String(!shut));return}
 case'sview':{SV=d.v;try{localStorage.setItem('pfb_sview',SV)}catch(_){}if(S.tab!=='settings'){S.tab='settings';scrollTo({top:0});return commit(true)}return renderSettings()}
 case'bview':{if(d.v==='rules'||d.v==='accounts'){SV=d.v==='rules'?'rules':'connections';S.tab='settings';scrollTo({top:0});return commit(true)}BV=d.v;try{localStorage.setItem('pfb_bview',BV)}catch(_){}if(S.tab!=='bank'){S.tab='bank';scrollTo({top:0});return commit(true)}return renderBank()}
 case'bfilt':FLF=d.v;FLN=50;return renderBank();
 case'bmore':FLN=1e9;return renderBank();
 case'crng':CR=d.v;return catRender();
 case'mvHere':{const t=BK.tx.find(x=>x.id===d.id);if(!t||!CT)return;const rl=rulesFor(CT).find(x=>ruleHit(x,t)),km=rl?ruleMonth(t,rl):t.date.slice(0,7);if(S.txd&&S.txd[d.id])txUndo(d.id);txAssign(t,CT,undefined,km);if(S.noAuto)delete S.noAuto[d.id];toast(`Moved ${t.merchant||t.name} here${km!==t.date.slice(0,7)?`, counting in ${lab(km)}`:''}`);commit();catRender();return}
 case'mvShow':{const sc=b.closest('dialog')||b.closest('section')||document,pn=sc.querySelector(`[data-mvp="${CSS.escape(d.id)}"]`);if(pn){pn.hidden=!pn.hidden;if(!pn.hidden)pn.querySelector('select').focus()}return}
 case'catRuleDel':{const r=(S.rules||[]).find(x=>x.id===d.id);S.rules=(S.rules||[]).filter(x=>x.id!==d.id);if(r)toast(`${titleC(r.p)} no longer files here. What it already filed stays.`);commit();return catRender()}
 case'catLink':{CT=null;$('#tdlg').close();return lnkOpen(d.kind,d.id)}
 case'recAdd':return recAdd(d.id);
 case'recNo':{S.notBill||(S.notBill={});S.notBill[d.id]=1;toast('Ignored. It stays in Flex spending; “Ignored suggestions” brings it back.');return commit()}
 case'recBack':{if(S.notBill)delete S.notBill[d.id];toast('It’s back in the suggestions');return commit()}
 case'ruleDel':{S.rules=(S.rules||[]).filter(r=>r.id!==d.id);toast('Rule removed. Anything it already filed stays where it is.');return commit()}
 case'lnkPay':return lnkOpen(d.kind,d.id);
 case'lclose':LK=null;return $('#ldlg').close();
 case'alMode':{const e=(S.alloc||{})[d.a];if(e){e.mode=d.v;if(d.v==='split'&&!Object.keys(e.pct||{}).length){e.pct={};const n=e.goals.length||1;e.goals.forEach((id,i)=>e.pct[id]=i===n-1?100-Math.floor(100/n)*(n-1):Math.floor(100/n))}}return commit()}
 case'alUp':case'alDn':{const e=(S.alloc||{})[d.a];if(e){const i=e.goals.indexOf(d.g),j=d.act==='alUp'?i-1:i+1;if(i>=0&&j>=0&&j<e.goals.length){[e.goals[i],e.goals[j]]=[e.goals[j],e.goals[i]]}}return commit()}
 case'alRm':{const e=(S.alloc||{})[d.a];if(e){e.goals=e.goals.filter(x=>x!==d.g);if(e.pct)delete e.pct[d.g];if(!e.goals.length)delete S.alloc[d.a]}return commit()}
 case'alDel':{if(S.alloc&&confirm('Stop using this account for goals? Money you added by hand stays.'))delete S.alloc[d.a];return commit()}
 case'lenders':{bcSet('lsetup',false);renderLoans();const el=$('#lsetup');if(!el){SV='connections';S.tab='settings';scrollTo({top:0});return commit(true)}el.scrollIntoView({behavior:RM?'auto':'smooth',block:'start'});return}
 case'alGo':{bcSet('galloc',false);renderGoals();const el=$('#sec-alloc');if(el)el.scrollIntoView({behavior:RM?'auto':'smooth',block:'start'});return}
 case'budv':{BUDV=d.v;try{localStorage.setItem('pfb_budv',BUDV)}catch(_){}if(S.tab!=='budget'){S.tab='budget'}scrollTo({top:0});return commit(true)}
 case'bscope':{BSCOPE=d.v;try{localStorage.setItem('pfb_bscope',BSCOPE)}catch(_){}return renderBudget()}
 case'fillPast':return fillPast();
 case'recInAdd':return recInAdd(d.id);
 case'recInNo':{S.notInc||(S.notInc={});S.notInc[d.id]=1;toast('Ignored');return commit()}
 case'topFile':return topFile(d.id);
 case'txUndo':txUndo(d.id,true);return commit();
 case'txMore':BK.show=(BK.show||40)+60;return rerender();
 case'delRc':{const k=d.k,m=MOW(k),r=(m.rc||[]).find(x=>x.id===d.id);if(r&&r.bank){if(!confirm(`Remove ${r.store||'this transaction'} (${f2(r.amt)}) from ${mon(k)}? It goes back to the Bank tab to review.`))return;txUndo(r.txid,true);toast('Moved back to Bank review');return commit()}if(!r||!confirm(`Remove the ${f2(r.amt)} entry from ${r.store||'this store'}? Its amount comes off the actual spending.`))return;m.rc=m.rc.filter(x=>x!==r);if(m.act[r.item]!=null){const v=r2(m.act[r.item]-r.amt);if(v>0.004)m.act[r.item]=v;else delete m.act[r.item]}toast('Removed');return commit()}
 case'origAdd':{OPEN.add('l-'+d.id);rerender();const e=document.querySelector(`[data-key="lo-${d.id}"]`);if(e){e.scrollIntoView({behavior:RM?'auto':'smooth',block:'center'});e.focus()}return}
 case'tab':if(S.tab!==d.t){S.tab=d.t;scrollTo({top:0,behavior:RM?'auto':'smooth'});commit(true)}return;
 case'openMonth':S.cur=d.k;S.tab='budget';scrollTo({top:0});return commit(true);
 case'hrng':HR=d.v;try{localStorage.setItem('pfb_hr',HR)}catch(_){}return renderHistory();
 case'mgo':return go(d.k);case'mprev':return go(addM(S.cur,-1));case'mnext':return go(addM(S.cur,1));case'mtoday':return go(TK);
 case'pick':{const i=$('#mp');try{i.showPicker()}catch(_){i.style.pointerEvents='auto';i.focus();i.click()}return}
 case'seg':{if(d.go){const t=$(d.go);if(t){if(S.tab!=='budget'){S.tab='budget';commit(true)}setTimeout(()=>$(d.go).scrollIntoView({behavior:RM?'auto':'smooth',block:'start'}),20)}}else{$$('[data-seg]').forEach(x=>x.classList.toggle('hov',x.dataset.seg===d.seg))}return}
 case'flow':S.flow=d.v;return commit();
 case'zin':return zz(.7,null,null,1);case'zout':return zz(1.45,null,null,1);case'zfit':return zfit();
 case'logPay':return payDialog(d.id);
 case'assignLoan':{const best=[...S.loans].filter(l=>row(l,S.cur)).sort((a,b)=>b.apr-a.apr)[0];if(best)payDialog(best.id,totals().left);return}
 case'assignGoal':return depDialog(S.goals[0]?.id,r2(totals().left));
 case'logDep':return depDialog(d.id);
 case'quickDep':{const g=S.goals.find(x=>x.id===d.id);if(S.cur>TK)return;const v=goalPlan(g,S.cur);MOW(S.cur).dep[g.id]=v;toast(`Saved ${f0(v)} toward ${g.name}`);return commit()}
 case'gNeed':{const g=S.goals.find(x=>x.id===d.id),n=g&&goalNeed(g);if(n==null)return;verSet(g,'mp',xStart(),Math.ceil(n));toast(`${g.name}: ${f0(Math.ceil(n))} a month from ${labS(xStart())}`);return commit()}
 case'unPay':delete MOW(d.k).pay[d.id];return commit();
 case'lnkAdd':return linkLoan(d.id);
 case'liabAllow':return bankConnect(d.id,'liabilities');
 case'paySrc':{const l=S.loans.find(x=>x.id===d.id);if(!l||!l.acct)return;const nb=d.v==='bank';if(nb===(l.paySrc==='bank'))return;if(nb)l.paySrc='bank';else delete l.paySrc;
  // Re-pair this loan account's transfers so checking payments land on the loan (or go back to transfers).
  // A checking payment matched to this loan's account is a payment on it, even if it was filed as Transfer/Ignore by hand.
  const P=txPairs();P.forEach((o,id)=>{const t=BK.tx.find(x=>x.id===id),ot=BK.tx.find(x=>x.id===o);if(!t||!ot||t.amount<=0||ot.account!==l.acct)return;const r=S.txd&&S.txd[id];
   if(nb){if(!r||r.auto==='pair'||['xfer','skip'].includes(r.v)){if(r)txUndo(id);if(S.noAuto)delete S.noAuto[id]}}else if(r&&r.v==='l:'+l.id&&r.auto==='pair')txUndo(id)});
  autoFile();LP={};const inst=l.link?l.link.inst:'your lender',nf=Object.values(S.txd).filter(x=>x.v==='l:'+l.id).length;toast(nb?`${l.name} now counts the payments from your bank (${nf} found). ${inst}’s figures fill in months without one.`:`${l.name} uses ${inst}’s payment figures again.`);return commit()}
 case'trackFrom':{const l=S.loans.find(x=>x.id===d.id);if(!l||!d.k||d.k>=l.start)return;const r=l.apr/1200,BS=bankSrc(l),an=l.anch;
  // Walk back from the opening balance of the current start month: last month's opening = (this opening + that month's payment) / (1 + rate).
  let b=an&&an.k===l.start?(an.eob!=null?an.eob/(1+r):an.open):l.bal;for(let k=addM(l.start,-1);k>=d.k;k=addM(k,-1)){const mp=S.months[k]?.pay?.[l.id],pk=(l.rp||{})[k],pay=BS?(mp??pk):(pk??mp);b=(b+(pay!=null?pay:l.min))/(1+r)}
  if(!confirm(`Track ${l.name} from ${lab(d.k)}? Its balance then is estimated at ${f0(b)} from the payments since. You can change it under Loan details.`))return;l.bal=r2(b);l.start=d.k;LP={};toast(`${l.name} now tracks from ${lab(d.k)}`);return commit()}
 case'lnkUnlink':{const l=S.loans.find(x=>x.id===d.id);if(!l||!confirm(`Stop updating ${l.name} from ${l.link?l.link.inst:'the bank'}? Payments found so far stay as logged payments.`))return;lp(l).a.forEach(r=>{if(r.auto)MOW(r.k).pay[l.id]=r2(r.pay)});['acct','real','rp','live','link','auto','paySrc'].forEach(f=>delete l[f]);LP={};toast('Unlinked '+l.name);return commit()}
 case'unDep':delete MOW(d.k).dep[d.id];return commit();
 case'dclose':$('#dlg').close();return;
 case'fillAct':{const g=plan().groups.find(x=>x.id===d.g),m=MOW(S.cur);g.items.forEach(i=>{if(m.act[i.id]==null)m.act[i.id]=+i.amt||0});return commit()}
 case'addInc':{const id=uid();editPlan(p=>p.income.push({id,name:'New income',amt:0}));return commitFocus(`[data-key="in-${id}"]`)}
 case'addOnceInc':{const id=uid();extras().push({id,kind:'inc',name:'Freelance',amt:0});return commitFocus(`[data-key="ia-${id}"]`)}
 case'addOnceItem':{const id=uid();extras().push({id,kind:'item',gid:d.g,name:'One-time bill',amt:0,due:0});return commitFocus(`[data-key="fn-${id}"]`)}
 case'onceAdd':{const nm=$('#paN').value.trim(),a=num($('#paA').value),k=$('#paM').value,bp=basePlan(k),gs=bp.groups,g=gs.some(x=>x.id===$('#paG').value)?$('#paG').value:((gs.find(x=>!x.flex)||gs[0])||{}).id;if(!nm){toast('Give it a name, like Vet appointment');return $('#paN').focus()}if(!(a>0)){toast('Add the amount you expect to spend');return $('#paA').focus()}if(!g)return;extras(k).push({id:uid(),kind:'item',gid:g,name:nm,amt:r2(a),due:0});toast(`Added ${nm} (${f0(a)}) to ${lab(k)}`);return commit()}
 case'delOnce':{const m=MOW(d.m||S.cur);m.extra=(m.extra||[]).filter(x=>x.id!==d.id);delete m.act[d.id];return commit()}
 case'once':{const k=S.cur,m=MOW(k),ex=extras();
  if(d.kind==='goal'){m.gplan||(m.gplan={});const g=S.goals.find(x=>x.id===d.id);if(m.gplan[d.id]!=null)delete m.gplan[d.id];else m.gplan[d.id]=goalMon(g,S.cur);return commitFocus(`[data-key="gm-${d.id}"]`)}
  const e=ex.find(x=>x.id===d.id);
  if(e){m.extra=ex.filter(x=>x!==e);if(e.kind==='inc')editPlan(p=>{if(!p.income.some(i=>i.id===e.id))p.income.push({id:e.id,name:e.name,amt:e.amt})});else editPlan(p=>{const g=p.groups.find(x=>x.id===e.gid);if(g&&!g.items.some(i=>i.id===e.id))g.items.push({id:e.id,name:e.name,amt:e.amt,due:e.due||0})});toast(`${e.name} now repeats every month from ${mon(k)}`)}
  else if(d.kind==='inc'){const i=basePlan(k).income.find(x=>x.id===d.id);if(!i)return;ex.push({id:i.id,kind:'inc',name:i.name,amt:i.amt});editPlan(p=>p.income=p.income.filter(x=>x.id!==d.id));toast(`${i.name} now counts only in ${mon(k)}`)}
  else{const g=basePlan(k).groups.find(x=>x.id===d.g),i=g&&g.items.find(x=>x.id===d.id);if(!i)return;ex.push({id:i.id,kind:'item',gid:g.id,name:i.name,amt:i.amt,due:i.due||0});editPlan(p=>{const gg=p.groups.find(x=>x.id===d.g);if(gg)gg.items=gg.items.filter(x=>x.id!==d.id)});toast(`${i.name} now counts only in ${mon(k)}`)}
  return commit()}
 case'delInc':editPlan(p=>p.income=p.income.filter(i=>i.id!==d.id));return commit();
 case'addItem':{const id=uid();editPlan(p=>{const g=p.groups.find(g=>g.id===d.g)||(isLoose(d.g)?ensureLoose(p,!!d.flex):null);if(g)g.items.push({id,name:d.flex?'New item':'New bill',amt:0,due:0})});return commitFocus(`[data-key="${d.flex?'bxn':'bfn'}-${id}"]`)}
 case'grpUngroup':{const g=plan().groups.find(x=>x.id===d.g);if(!g)return;editPlan(p=>{const x=p.groups.find(y=>y.id===d.g);if(!x)return;ensureLoose(p,!!x.flex).items.push(...x.items);p.groups=p.groups.filter(y=>y!==x)});toast(`${g.name} is ungrouped; its ${g.flex?'items':'bills'} are under Not in a group`);return commit()}
 case'fillAvg':return fillAvg(!!d.flex);
 case'delItem':{const it=(allItems(S.cur).find(x=>x.i.id===d.id)||{}).i,f=INB?scopeStart():delFrom([d.id],it?it.name:'this item');editPlan(p=>{const g=p.groups.find(x=>x.id===d.g);if(g)g.items=g.items.filter(i=>i.id!==d.id)},f);const n=itemGone([d.id],f);toast(`Removed ${it?it.name:'item'} from ${lab(f)} on${n?`. ${n} transaction${n===1?'':'s'} moved to Flex spending`:''}`);return commit()}
 case'addGrp':{const id=uid(),iid=uid(),col=PAL[plan().groups.length%PAL.length];editPlan(p=>p.groups.push({id,name:d.flex?'New spending group':'New group',color:col,flex:!!d.flex,items:[{id:iid,name:d.flex?'New item':'New bill',amt:0,due:0}]}));return commitFocus(`[data-key="bgn-${id}"]`)}
 case'delGrp':{const g=plan().groups.find(x=>x.id===d.g);if(!confirm(`Delete ${g.name} and its ${g.items.length} ${g.flex?'item':'bill'}${g.items.length===1?'':'s'} from ${lab(S.cur)} onward?${SRV?' Bank transactions filed there move to Flex spending.':''}`))return;const ids=g.items.map(i=>i.id),f=INB?scopeStart():delFrom(ids,g.name);editPlan(p=>p.groups=p.groups.filter(x=>x.id!==d.g),f);itemGone(ids,f);return commit()}
 case'addLoan':{const id=uid();S.loans.push({id,name:'New loan',apr:5,bal:1000,min:100,due:0,start:S.cur,color:PAL[S.loans.length%PAL.length]});OPEN.add('l-'+id);return commitFocus(`[data-key="ln-${id}"]`)}
 case'delLoan':{const l=S.loans.find(x=>x.id===d.id);if(!confirm(`Delete ${l.name} and its payment history?`))return;S.loans=S.loans.filter(x=>x.id!==d.id);return commit()}
 case'addGoal':{const id=uid();S.goals.push({id,name:'New goal',target:5000,saved:0,color:PAL[(S.goals.length+3)%PAL.length]});alSet('g:'+id,xStart(),200);OPEN.add('g-'+id);return commitFocus(`[data-key="gt-${id}"]`)}
 case'delGoal':{const g=S.goals.find(x=>x.id===d.id);if(!confirm(`Delete ${g.name} and its deposits?`))return;S.goals=S.goals.filter(x=>x.id!==d.id);return commit()}
 case'csvTx':{const q=v=>{v=String(v??'');return /[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v},txd=S.txd||{},rows=[['Date','Name','Merchant','Amount','Account','Pending','Filed to','Counts in','Filed by']].concat((BK.tx||[]).map(t=>{const r=txd[t.id];return [t.date,t.name,t.merchant,t.amount,t.accountName,t.pending?'yes':'',r?txLabel(r):'',r?r.k:'',r?(r.auto?'automatically':'by hand'):'']}));const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([rows.map(r=>r.map(q).join(',')).join('\n')],{type:'text/csv'}));a.download='budgeteer-transactions-'+new Date().toISOString().slice(0,10)+'.csv';a.click();return}
 case'hcCard':{let n=0;(d.ids||'').split(',').forEach(id=>{const r=S.txd&&S.txd[id],t=r&&txOf(id,r),f=r&&flexDefault(r.k);if(!t||!f)return;txUndo(id);txAssign(t,'i:'+f,undefined,r.k);n++});TXI=null;LP={};toast(`${n} card payment${n===1?'':'s'} now count as spending`);return commit()}
 case'grng':GR=d.r;try{localStorage.setItem('pfb_gr',GR)}catch(_){}return renderGoals();
 case'scAdd':{S.al||(S.al=[]);const m=xStart(),gl=S.goals[0],ln=S.loans.filter(l=>!loanGone(l,TK))[0],a=d.v==='goal'?{to:gl?'g:'+gl.id:'keep',src:gl?'plan':'extra',mode:'$',v:200}:d.v==='loan'?{to:ln?'l:'+ln.id:'snow',src:'plan',mode:'$',v:100}:d.v==='snow'?{to:'snow',src:'plan',mode:'$',v:300,how:'rate',roll:true,loans:[]}:{to:gl?'g:'+gl.id:'keep',src:'extra',mode:'%',v:50};S.al.push({id:uid(),from:m,until:'',loans:[],...a});ALE=S.al[S.al.length-1].id;FSC=true;bcSet('bx',false);return commit()}
 case'scEdit':{ALE=ALE===d.id?null:d.id;FSC=!!ALE;return rerender()}
 case'scAddTo':{S.al||(S.al=[]);const to=d.to,a=to==='snow'?{to,src:'plan',mode:'$',v:300,how:'rate',roll:true,loans:[]}:to==='keep'?{to,src:'extra',mode:'%',v:100}:{to,src:'plan',mode:'$',v:to.startsWith('g:')?200:100};S.al.push({id:uid(),from:xStart(),until:'',loans:[],...a});ALE=S.al[S.al.length-1].id;FSC=true;return commit()}
 case'scDel':{S.al=(S.al||[]).filter(a=>a.id!==d.id);if(!S.al.length)delete S.al;if(ALE===d.id)ALE=null;return commit()}
 case'scSrc':{const a=(S.al||[]).find(x=>x.id===d.id);if(a){a.src=d.v;if(d.v==='plan'){a.mode='$';if(a.to==='keep')a.to=S.goals[0]?'g:'+S.goals[0].id:'snow'}}return commit()}
 case'scMode':{const a=(S.al||[]).find(x=>x.id===d.id);if(a){a.mode=d.v;if(d.v==='%'&&a.v>100)a.v=50}return commit()}
 case'scHow':{const a=(S.al||[]).find(x=>x.id===d.id);if(a)a.how=d.v;return commit()}
 case'scMove':{const A=S.al||[],X=A.filter(a=>a.src==='extra'),i=X.findIndex(a=>a.id===d.id),j=i+(+d.v);if(i>=0&&j>=0&&j<X.length){const ia=A.indexOf(X[i]),ja=A.indexOf(X[j]);[A[ia],A[ja]]=[A[ja],A[ia]]}return commit()}
 case'skGo':{return catOpen(d.v)}
 case'skNode':{const n=K&&K.all[+d.n];if(n)skCard(n);return}
 case'skZoom':{const n=K&&K.all[+d.n];skClose();if(n&&SEL!==n.id)zfocus(n);return}
 case'skX':{return skClose()}
 case'skJob':{skClose();BUDV='build';try{localStorage.setItem('pfb_budv',BUDV)}catch(_){}bcSet('bx',false);commit(true);const go=b=>{const h=$('[data-act="bcol"][data-v="bx"]'),sec=h&&(h.closest('section')||h),hd=$('header');if(!sec)return;const y=sec.getBoundingClientRect().top-(hd?hd.offsetHeight:0)-16;if(Math.abs(y)>6)scrollTo({top:y+scrollY,behavior:b})};setTimeout(()=>go(RM?'auto':'smooth'),80);setTimeout(()=>go('auto'),900);return}
 case'fcMonth':{FDK=d.k;FSC=true;return fcBody()}
 case'fcEdit':{S.cur=d.k;BUDV='build';try{localStorage.setItem('pfb_budv',BUDV)}catch(_){}scrollTo({top:0});return commit(true)}
 case'xSweep':{const lk=addM(TK,-1),T=totals(lk),amt=r2(T.incA-(T.fixedA+T.flexA+T.loansA+T.saveA));if(amt<0.5)return;let rem=amt;const m=MOW(TK);m.dep||(m.dep={});m.lxp||(m.lxp={});const done=[];
  xmAt(TK).forEach(r=>{if(rem<=0.005||r.to==='keep')return;const a=Math.min(rem,r.mode==='%'?rem*(+r.v||0)/100:(+r.v||0));if(a<=0.005)return;let to=r.to;if(to==='snow'){const l=[...S.loans].filter(l=>!loanGone(l,TK)&&row(l,TK)&&(!(r.loans&&r.loans.length)||r.loans.includes(l.id))).sort(r.how==='bal'?(a,b)=>balEnd(a,TK)-balEnd(b,TK):(a,b)=>b.apr-a.apr)[0];if(!l)return;to='l:'+l.id}
   if(to.startsWith('g:'))m.dep[to.slice(2)]=r2((+m.dep[to.slice(2)]||0)+a);else{const l=S.loans.find(x=>'l:'+x.id===to);if(!l)return;const cur=loanXo(l,TK);m.lxp[l.id]=r2((cur!=null?cur:loanUsual(l,TK))+a)}rem-=a;done.push(destName(to)+' '+f0(a))});
  MOW(lk).swept=amt;toast(done.length?'Sent: '+done.join(', '):'Nothing to send: your rules keep it');return commit()}
 case'frng':FR=d.r;try{localStorage.setItem('pfb_fr',FR)}catch(_){}return fcBody();
 case'wfReset':WFS={inc:0,cost:0,extra:0};return renderForecast();
 case'spOpen':{const sc=b.closest('dialog')||b.closest('section')||document,box=sc.querySelector(`[data-spf="${CSS.escape(d.id)}"]`);if(!box)return;box.hidden=!box.hidden;if(!box.hidden)spForm(box,d.id);return}
 case'spAdd':{const box=b.closest('.spf');if(!box)return;spAddPart(box);return}
 case'spSave':{const box=b.closest('.spf');if(box)spSave(box);return}
 case'rvDone':{MOW(addM(TK,-1)).rv=1;return commit()}
 case'ps':PS=d.v;return renderLoans();
 case'pxClear':{const m=xStart();(S.al||[]).filter(a=>a.to==='snow'&&a.from<=m&&(!a.until||a.until>=m)).forEach(a=>alEnd(a,m));PX=null;PS=null;toast('Snowball stops after '+labS(addM(m,-1)));return commit()}
 case'pxApply':{const X=Math.max(0,PX??pxNow()),how=pxHow(),sm=pxSim(X,how),m=xStart();S.al||(S.al=[]);S.al.filter(a=>a.to==='snow'&&a.src==='plan'&&a.from<=m&&(!a.until||a.until>=m)).forEach(a=>alEnd(a,m));if(X>0)S.al.push({id:uid(),to:'snow',src:'plan',mode:'$',v:X,how,roll:true,loans:[],from:m,until:''});PX=null;PS=null;toast(`Snowball: ${f0(X)} a month from ${labS(m)}, debt free about ${labS(sm.end)}`);return commit()}
 case'wiPlan':{const l=S.loans.find(x=>x.id===d.id),w=l?Math.round(WI[l.id]||0):0;if(!l)return;if(!w)return toast('Drag the slider to an amount first');const m=xStart(),v=loanUsual(l,m)+w;setUsual(l,m,v);WI[l.id]=0;toast(`${l.name}: ${f0(v)} extra a month from ${labS(m)}`);return commit()}
 case'export':{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(S,null,1)],{type:'application/json'}));a.download='budgeteer-backup-'+new Date().toISOString().slice(0,10)+'.json';a.click();return}
 case'import':return $('#file').click();
 case'bkList':return bkList();
 case'ntHide':return ntHide(d.id);
 case'cvImport':return cvImport();
 case'cvCancel':CV={};return renderSettings();
 case'cvDel':return cvDel(d.id);
 case'cvGo':{if(S.tab!=='settings'||SV!=='connections'){SV='connections';S.tab='settings';commit(true)}const c=$('#cvcard');if(c)c.scrollIntoView({behavior:RM?'auto':'smooth',block:'start'});return}
 case'ntTest':return ntTest();
 case'bkRestore':return bkRestore(d.id);
 case'fsRetry':return FS.loaded?fsFlush(true):fsInit();
 case'syncInfo':return $('footer').scrollIntoView({behavior:RM?'auto':'smooth'})}});
function commitFocus(sel){commit();const e=$(sel);if(e){e.focus();e.select?.()}}
addEventListener('scroll',()=>$('#bar').classList.toggle('sc',scrollY>6),{passive:true});
addEventListener('resize',moveInd);
document.fonts&&document.fonts.ready.then(moveInd);
