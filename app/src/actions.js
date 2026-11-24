// Click handlers, one per action (were the cases of the click switch in js/events.js, moved here unchanged). Each takes
// d = the element's data-* values, b = the element, e = the click. Elements call them through onAct('name') (bridge.js).
export const ACT = {
  'bankConnect': function (d, b, e) { return bankConnect(d.id||'',d.kind||''); },
  'invAllow': function (d, b, e) { return bankConnect(d.id,'investments'); },
  'wr': function (d, b, e) { WR=d.r;return renderWealth(); },
  'lr': function (d, b, e) { LR=d.r;try{localStorage.setItem('pfb_lr',LR)}catch(_){}return renderLoans(); },
  'bankSync': function (d, b, e) { return bankSync(); },
  'bankRemove': function (d, b, e) { return bankRemove(d.id); },
  'txAdd': function (d, b, e) { {const t=BK.tx.find(x=>x.id===d.id),sel=document.querySelector(`select[data-tx="${CSS.escape(d.id)}"]`);if(!t||!sel)return;const al=document.querySelector(`input[data-alw="${CSS.escape(d.id)}"]`);txAssign(t,sel.value);
  if(al&&al.checked&&sel.value!=='once'){const r=addRule(patternOf(t),tdir(t),sel.value),n=autoFile();toast(`Filed. ${n?n+' more like it filed too. ':''}New ones matching “${r.p}” file themselves.`)}return commit()} },
  'txAll': function (d, b, e) { {let n=0,nr=0;$$('select[data-tx]').forEach(sel=>{const t=BK.tx.find(x=>x.id===sel.dataset.tx);if(t&&!(S.txd&&S.txd[t.id])){txAssign(t,sel.value);n++;const al=document.querySelector(`input[data-alw="${CSS.escape(t.id)}"]`);if(al&&al.checked&&sel.value!=='once'){addRule(patternOf(t),tdir(t),sel.value);nr++}}});const m2=nr?autoFile():0;toast(`Added ${n+m2} transaction${n+m2===1?'':'s'}${nr?`, ${nr} new rule${nr===1?'':'s'}`:''}`);return commit()} },
  'fixPairs': function (d, b, e) { {const I=pairIssues();I.forEach(({id,o,r})=>{txUndo(id);S.txd[id]={v:'xfer',k:r.k,amt:r.amt,d:r.d,n:r.n,auto:'pair',pair:o};if(!S.txd[o]||S.txd[o].v==='skip'){const u=BK.tx.find(t=>t.id===o);if(u)S.txd[o]={v:'xfer',k:u.date.slice(0,7),amt:r2(u.amount),d:u.date,n:u.merchant||u.name,auto:'pair',pair:id}}});TXI=null;toast(`${I.length} made into transfers`);return commit()} },
  'catTx': function (d, b, e) { if(d.k&&d.k!==S.cur){S.cur=d.k;commit(true)}return catOpen(d.v); },
  'tclose': function (d, b, e) { CT=null;return $('#tdlg').close(); },
  'flowDet': function (d, b, e) { return flowOpen(d.v); },
  'fclose': function (d, b, e) { FD=null;return $('#fdlg').close(); },
  'flowTx': function (d, b, e) { {FD=null;$('#fdlg').close();return catOpen(d.v)} },
  'delMonth': function (d, b, e) { {const k=d.k;if(!confirm(`Delete ${lab(k)}?\n\nThis removes everything recorded for ${lab(k)}: actual spending, logged loan payments and savings deposits, one-time items, and the bank transactions counted there (they won't be filed again).\n\nBudget plans, loans and goals stay.`))return;
  delete S.months[k];S.txGone||(S.txGone={});Object.entries(S.txd||{}).forEach(([id,r])=>{if(r.k===k){delete S.txd[id];S.txGone[id]=1}});
  if(histMonths()[0]===k){const f=addM(k,1);S.histFrom=f>TK?TK:f}
  OPEN.delete('h-'+k);LP={};TXI=null;toast(`Deleted ${lab(k)}`);return commit()} },
  'histAll': function (d, b, e) { delete S.histFrom;return commit(); },
  'bcol': function (d, b, e) { {const sec=b.closest('section');if(!sec)return;const shut=!sec.classList.contains('shut');bcSet(d.v,shut);sec.classList.toggle('shut',shut);b.setAttribute('aria-expanded',String(!shut));return} },
  'sview': function (d, b, e) { {SV=d.v;try{localStorage.setItem('pfb_sview',SV)}catch(_){}if(S.tab!=='settings'){S.tab='settings';scrollTo({top:0});return commit(true)}return renderSettings()} },
  'bview': function (d, b, e) { {if(d.v==='rules'||d.v==='accounts'){SV=d.v==='rules'?'rules':'connections';S.tab='settings';scrollTo({top:0});return commit(true)}BV=d.v;try{localStorage.setItem('pfb_bview',BV)}catch(_){}if(S.tab!=='bank'){S.tab='bank';scrollTo({top:0});return commit(true)}return renderBank()} },
  'bfilt': function (d, b, e) { FLF=d.v;FLN=50;return renderBank(); },
  'bmore': function (d, b, e) { FLN=1e9;return renderBank(); },
  'crng': function (d, b, e) { CR=d.v;return catRender(); },
  'mvHere': function (d, b, e) { {const t=BK.tx.find(x=>x.id===d.id);if(!t||!CT)return;const rl=rulesFor(CT).find(x=>ruleHit(x,t)),km=rl?ruleMonth(t,rl):t.date.slice(0,7);if(S.txd&&S.txd[d.id])txUndo(d.id);txAssign(t,CT,undefined,km);if(S.noAuto)delete S.noAuto[d.id];toast(`Moved ${t.merchant||t.name} here${km!==t.date.slice(0,7)?`, counting in ${lab(km)}`:''}`);commit();catRender();return} },
  'mvShow': function (d, b, e) { {const sc=b.closest('dialog')||b.closest('section')||document,pn=sc.querySelector(`[data-mvp="${CSS.escape(d.id)}"]`);if(pn){pn.hidden=!pn.hidden;if(!pn.hidden)pn.querySelector('select').focus()}return} },
  'catRuleDel': function (d, b, e) { {const r=(S.rules||[]).find(x=>x.id===d.id);S.rules=(S.rules||[]).filter(x=>x.id!==d.id);if(r)toast(`${titleC(r.p)} no longer files here. What it already filed stays.`);commit();return catRender()} },
  'catLink': function (d, b, e) { {CT=null;$('#tdlg').close();return lnkOpen(d.kind,d.id)} },
  'recAdd': function (d, b, e) { return recAdd(d.id); },
  'recNo': function (d, b, e) { {S.notBill||(S.notBill={});S.notBill[d.id]=1;toast('Ignored. It stays in Flex spending; “Ignored suggestions” brings it back.');return commit()} },
  'recBack': function (d, b, e) { {if(S.notBill)delete S.notBill[d.id];toast('It’s back in the suggestions');return commit()} },
  'ruleDel': function (d, b, e) { {S.rules=(S.rules||[]).filter(r=>r.id!==d.id);toast('Rule removed. Anything it already filed stays where it is.');return commit()} },
  'lnkPay': function (d, b, e) { return lnkOpen(d.kind,d.id); },
  'lclose': function (d, b, e) { LK=null;return $('#ldlg').close(); },
  'alMode': function (d, b, e) { {const e=(S.alloc||{})[d.a];if(e){e.mode=d.v;if(d.v==='split'&&!Object.keys(e.pct||{}).length){e.pct={};const n=e.goals.length||1;e.goals.forEach((id,i)=>e.pct[id]=i===n-1?100-Math.floor(100/n)*(n-1):Math.floor(100/n))}}return commit()} },
  'alUp': function (d, b, e) { {const e=(S.alloc||{})[d.a];if(e){const i=e.goals.indexOf(d.g),j=d.act==='alUp'?i-1:i+1;if(i>=0&&j>=0&&j<e.goals.length){[e.goals[i],e.goals[j]]=[e.goals[j],e.goals[i]]}}return commit()} },
  'alRm': function (d, b, e) { {const e=(S.alloc||{})[d.a];if(e){e.goals=e.goals.filter(x=>x!==d.g);if(e.pct)delete e.pct[d.g];if(!e.goals.length)delete S.alloc[d.a]}return commit()} },
  'alDel': function (d, b, e) { {if(S.alloc&&confirm('Stop using this account for goals? Money you added by hand stays.'))delete S.alloc[d.a];return commit()} },
  'lenders': function (d, b, e) { {bcSet('lsetup',false);renderLoans();const el=$('#lsetup');if(!el){SV='connections';S.tab='settings';scrollTo({top:0});return commit(true)}el.scrollIntoView({behavior:RM?'auto':'smooth',block:'start'});return} },
  'alGo': function (d, b, e) { {bcSet('galloc',false);renderGoals();const el=$('#sec-alloc');if(el)el.scrollIntoView({behavior:RM?'auto':'smooth',block:'start'});return} },
  'budv': function (d, b, e) { {BUDV=d.v;try{localStorage.setItem('pfb_budv',BUDV)}catch(_){}if(S.tab!=='budget'){S.tab='budget'}scrollTo({top:0});return commit(true)} },
  'bscope': function (d, b, e) { {BSCOPE=d.v;try{localStorage.setItem('pfb_bscope',BSCOPE)}catch(_){}return renderBudget()} },
  'fillPast': function (d, b, e) { return fillPast(); },
  'recInAdd': function (d, b, e) { return recInAdd(d.id); },
  'recInNo': function (d, b, e) { {S.notInc||(S.notInc={});S.notInc[d.id]=1;toast('Ignored');return commit()} },
  'topFile': function (d, b, e) { return topFile(d.id); },
  'txUndo': function (d, b, e) { txUndo(d.id,true);return commit(); },
  'txMore': function (d, b, e) { BK.show=(BK.show||40)+60;return rerender(); },
  'delRc': function (d, b, e) { {const k=d.k,m=MOW(k),r=(m.rc||[]).find(x=>x.id===d.id);if(r&&r.bank){if(!confirm(`Remove ${r.store||'this transaction'} (${f2(r.amt)}) from ${mon(k)}? It goes back to the Bank tab to review.`))return;txUndo(r.txid,true);toast('Moved back to Bank review');return commit()}if(!r||!confirm(`Remove the ${f2(r.amt)} entry from ${r.store||'this store'}? Its amount comes off the actual spending.`))return;m.rc=m.rc.filter(x=>x!==r);if(m.act[r.item]!=null){const v=r2(m.act[r.item]-r.amt);if(v>0.004)m.act[r.item]=v;else delete m.act[r.item]}toast('Removed');return commit()} },
  'origAdd': function (d, b, e) { {OPEN.add('l-'+d.id);rerender();const e=document.querySelector(`[data-key="lo-${d.id}"]`);if(e){e.scrollIntoView({behavior:RM?'auto':'smooth',block:'center'});e.focus()}return} },
  'tab': function (d, b, e) { if(S.tab!==d.t){S.tab=d.t;scrollTo({top:0,behavior:RM?'auto':'smooth'});commit(true)}return; },
  'openMonth': function (d, b, e) { S.cur=d.k;S.tab='budget';scrollTo({top:0});return commit(true); },
  'hrng': function (d, b, e) { HR=d.v;try{localStorage.setItem('pfb_hr',HR)}catch(_){}return renderHistory(); },
  'mgo': function (d, b, e) { return go(d.k); },
  'mprev': function (d, b, e) { return go(addM(S.cur,-1)); },
  'mnext': function (d, b, e) { return go(addM(S.cur,1)); },
  'mtoday': function (d, b, e) { return go(TK); },
  'pick': function (d, b, e) { {const i=$('#mp');try{i.showPicker()}catch(_){i.style.pointerEvents='auto';i.focus();i.click()}return} },
  'seg': function (d, b, e) { {if(d.go){const t=$(d.go);if(t){if(S.tab!=='budget'){S.tab='budget';commit(true)}setTimeout(()=>$(d.go).scrollIntoView({behavior:RM?'auto':'smooth',block:'start'}),20)}}else{$$('[data-seg]').forEach(x=>x.classList.toggle('hov',x.dataset.seg===d.seg))}return} },
  'flow': function (d, b, e) { S.flow=d.v;return commit(); },
  'zin': function (d, b, e) { return zz(.7,null,null,1); },
  'zout': function (d, b, e) { return zz(1.45,null,null,1); },
  'zfit': function (d, b, e) { return zfit(); },
  'logPay': function (d, b, e) { return payDialog(d.id); },
  'assignLoan': function (d, b, e) { {const best=[...S.loans].filter(l=>row(l,S.cur)).sort((a,b)=>b.apr-a.apr)[0];if(best)payDialog(best.id,totals().left);return} },
  'assignGoal': function (d, b, e) { return depDialog(S.goals[0]?.id,r2(totals().left)); },
  'logDep': function (d, b, e) { return depDialog(d.id); },
  'quickDep': function (d, b, e) { {const g=S.goals.find(x=>x.id===d.id);if(S.cur>TK)return;const v=goalPlan(g,S.cur);MOW(S.cur).dep[g.id]=v;toast(`Saved ${f0(v)} toward ${g.name}`);return commit()} },
  'gNeed': function (d, b, e) { {const g=S.goals.find(x=>x.id===d.id),n=g&&goalNeed(g);if(n==null)return;verSet(g,'mp',xStart(),Math.ceil(n));toast(`${g.name}: ${f0(Math.ceil(n))} a month from ${labS(xStart())}`);return commit()} },
  'unPay': function (d, b, e) { delete MOW(d.k).pay[d.id];return commit(); },
  'lnkAdd': function (d, b, e) { return linkLoan(d.id); },
  'liabAllow': function (d, b, e) { return bankConnect(d.id,'liabilities'); },
  'paySrc': function (d, b, e) { {const l=S.loans.find(x=>x.id===d.id);if(!l||!l.acct)return;const nb=d.v==='bank';if(nb===(l.paySrc==='bank'))return;if(nb)l.paySrc='bank';else delete l.paySrc;
  // Re-pair this loan account's transfers so checking payments land on the loan (or go back to transfers).
  // A checking payment matched to this loan's account is a payment on it, even if it was filed as Transfer/Ignore by hand.
  const P=txPairs();P.forEach((o,id)=>{const t=BK.tx.find(x=>x.id===id),ot=BK.tx.find(x=>x.id===o);if(!t||!ot||t.amount<=0||ot.account!==l.acct)return;const r=S.txd&&S.txd[id];
   if(nb){if(!r||r.auto==='pair'||['xfer','skip'].includes(r.v)){if(r)txUndo(id);if(S.noAuto)delete S.noAuto[id]}}else if(r&&r.v==='l:'+l.id&&r.auto==='pair')txUndo(id)});
  autoFile();LP={};const inst=l.link?l.link.inst:'your lender',nf=Object.values(S.txd).filter(x=>x.v==='l:'+l.id).length;toast(nb?`${l.name} now counts the payments from your bank (${nf} found). ${inst}’s figures fill in months without one.`:`${l.name} uses ${inst}’s payment figures again.`);return commit()} },
  'trackFrom': function (d, b, e) { {const l=S.loans.find(x=>x.id===d.id);if(!l||!d.k||d.k>=l.start)return;const r=l.apr/1200,BS=bankSrc(l),an=l.anch;
  // Walk back from the opening balance of the current start month: last month's opening = (this opening + that month's payment) / (1 + rate).
  let b=an&&an.k===l.start?(an.eob!=null?an.eob/(1+r):an.open):l.bal;for(let k=addM(l.start,-1);k>=d.k;k=addM(k,-1)){const mp=S.months[k]?.pay?.[l.id],pk=(l.rp||{})[k],pay=BS?(mp??pk):(pk??mp);b=(b+(pay!=null?pay:l.min))/(1+r)}
  if(!confirm(`Track ${l.name} from ${lab(d.k)}? Its balance then is estimated at ${f0(b)} from the payments since. You can change it under Loan details.`))return;l.bal=r2(b);l.start=d.k;LP={};toast(`${l.name} now tracks from ${lab(d.k)}`);return commit()} },
  'lnkUnlink': function (d, b, e) { {const l=S.loans.find(x=>x.id===d.id);if(!l||!confirm(`Stop updating ${l.name} from ${l.link?l.link.inst:'the bank'}? Payments found so far stay as logged payments.`))return;lp(l).a.forEach(r=>{if(r.auto)MOW(r.k).pay[l.id]=r2(r.pay)});['acct','real','rp','live','link','auto','paySrc'].forEach(f=>delete l[f]);LP={};toast('Unlinked '+l.name);return commit()} },
  'unDep': function (d, b, e) { delete MOW(d.k).dep[d.id];return commit(); },
  'dclose': function (d, b, e) { $('#dlg').close();return; },
  'fillAct': function (d, b, e) { {const g=plan().groups.find(x=>x.id===d.g),m=MOW(S.cur);g.items.forEach(i=>{if(m.act[i.id]==null)m.act[i.id]=+i.amt||0});return commit()} },
  'addInc': function (d, b, e) { {const id=uid();editPlan(p=>p.income.push({id,name:'New income',amt:0}));return commitFocus(`[data-key="in-${id}"]`)} },
  'addOnceInc': function (d, b, e) { {const id=uid();extras().push({id,kind:'inc',name:'Freelance',amt:0});return commitFocus(`[data-key="ia-${id}"]`)} },
  'addOnceItem': function (d, b, e) { {const id=uid();extras().push({id,kind:'item',gid:d.g,name:'One-time bill',amt:0,due:0});return commitFocus(`[data-key="fn-${id}"]`)} },
  'onceAdd': function (d, b, e) { {const nm=$('#paN').value.trim(),a=num($('#paA').value),k=$('#paM').value,bp=basePlan(k),gs=bp.groups,g=gs.some(x=>x.id===$('#paG').value)?$('#paG').value:((gs.find(x=>!x.flex)||gs[0])||{}).id;if(!nm){toast('Give it a name, like Vet appointment');return $('#paN').focus()}if(!(a>0)){toast('Add the amount you expect to spend');return $('#paA').focus()}if(!g)return;extras(k).push({id:uid(),kind:'item',gid:g,name:nm,amt:r2(a),due:0});toast(`Added ${nm} (${f0(a)}) to ${lab(k)}`);return commit()} },
  'delOnce': function (d, b, e) { {const m=MOW(d.m||S.cur);m.extra=(m.extra||[]).filter(x=>x.id!==d.id);delete m.act[d.id];return commit()} },
  'once': function (d, b, e) { {const k=S.cur,m=MOW(k),ex=extras();
  if(d.kind==='goal'){m.gplan||(m.gplan={});const g=S.goals.find(x=>x.id===d.id);if(m.gplan[d.id]!=null)delete m.gplan[d.id];else m.gplan[d.id]=goalMon(g,S.cur);return commitFocus(`[data-key="gm-${d.id}"]`)}
  const e=ex.find(x=>x.id===d.id);
  if(e){m.extra=ex.filter(x=>x!==e);if(e.kind==='inc')editPlan(p=>{if(!p.income.some(i=>i.id===e.id))p.income.push({id:e.id,name:e.name,amt:e.amt})});else editPlan(p=>{const g=p.groups.find(x=>x.id===e.gid);if(g&&!g.items.some(i=>i.id===e.id))g.items.push({id:e.id,name:e.name,amt:e.amt,due:e.due||0})});toast(`${e.name} now repeats every month from ${mon(k)}`)}
  else if(d.kind==='inc'){const i=basePlan(k).income.find(x=>x.id===d.id);if(!i)return;ex.push({id:i.id,kind:'inc',name:i.name,amt:i.amt});editPlan(p=>p.income=p.income.filter(x=>x.id!==d.id));toast(`${i.name} now counts only in ${mon(k)}`)}
  else{const g=basePlan(k).groups.find(x=>x.id===d.g),i=g&&g.items.find(x=>x.id===d.id);if(!i)return;ex.push({id:i.id,kind:'item',gid:g.id,name:i.name,amt:i.amt,due:i.due||0});editPlan(p=>{const gg=p.groups.find(x=>x.id===d.g);if(gg)gg.items=gg.items.filter(x=>x.id!==d.id)});toast(`${i.name} now counts only in ${mon(k)}`)}
  return commit()} },
  'delInc': function (d, b, e) { editPlan(p=>p.income=p.income.filter(i=>i.id!==d.id));return commit(); },
  'addItem': function (d, b, e) { {const id=uid();editPlan(p=>{const g=p.groups.find(g=>g.id===d.g)||(isLoose(d.g)?ensureLoose(p,!!d.flex):null);if(g)g.items.push({id,name:d.flex?'New item':'New bill',amt:0,due:0})});return commitFocus(`[data-key="${d.flex?'bxn':'bfn'}-${id}"]`)} },
  'grpUngroup': function (d, b, e) { {const g=plan().groups.find(x=>x.id===d.g);if(!g)return;editPlan(p=>{const x=p.groups.find(y=>y.id===d.g);if(!x)return;ensureLoose(p,!!x.flex).items.push(...x.items);p.groups=p.groups.filter(y=>y!==x)});toast(`${g.name} is ungrouped; its ${g.flex?'items':'bills'} are under Not in a group`);return commit()} },
  'fillAvg': function (d, b, e) { return fillAvg(!!d.flex); },
  'delItem': function (d, b, e) { {const it=(allItems(S.cur).find(x=>x.i.id===d.id)||{}).i,f=INB?scopeStart():delFrom([d.id],it?it.name:'this item');editPlan(p=>{const g=p.groups.find(x=>x.id===d.g);if(g)g.items=g.items.filter(i=>i.id!==d.id)},f);const n=itemGone([d.id],f);toast(`Removed ${it?it.name:'item'} from ${lab(f)} on${n?`. ${n} transaction${n===1?'':'s'} moved to Flex spending`:''}`);return commit()} },
  'addGrp': function (d, b, e) { {const id=uid(),iid=uid(),col=PAL[plan().groups.length%PAL.length];editPlan(p=>p.groups.push({id,name:d.flex?'New spending group':'New group',color:col,flex:!!d.flex,items:[{id:iid,name:d.flex?'New item':'New bill',amt:0,due:0}]}));return commitFocus(`[data-key="bgn-${id}"]`)} },
  'delGrp': function (d, b, e) { {const g=plan().groups.find(x=>x.id===d.g);if(!confirm(`Delete ${g.name} and its ${g.items.length} ${g.flex?'item':'bill'}${g.items.length===1?'':'s'} from ${lab(S.cur)} onward?${SRV?' Bank transactions filed there move to Flex spending.':''}`))return;const ids=g.items.map(i=>i.id),f=INB?scopeStart():delFrom(ids,g.name);editPlan(p=>p.groups=p.groups.filter(x=>x.id!==d.g),f);itemGone(ids,f);return commit()} },
  'addLoan': function (d, b, e) { {const id=uid();S.loans.push({id,name:'New loan',apr:5,bal:1000,min:100,due:0,start:S.cur,color:PAL[S.loans.length%PAL.length]});OPEN.add('l-'+id);return commitFocus(`[data-key="ln-${id}"]`)} },
  'delLoan': function (d, b, e) { {const l=S.loans.find(x=>x.id===d.id);if(!confirm(`Delete ${l.name} and its payment history?`))return;S.loans=S.loans.filter(x=>x.id!==d.id);return commit()} },
  'addGoal': function (d, b, e) { {const id=uid();S.goals.push({id,name:'New goal',target:5000,saved:0,color:PAL[(S.goals.length+3)%PAL.length]});alSet('g:'+id,xStart(),200);OPEN.add('g-'+id);return commitFocus(`[data-key="gt-${id}"]`)} },
  'delGoal': function (d, b, e) { {const g=S.goals.find(x=>x.id===d.id);if(!confirm(`Delete ${g.name} and its deposits?`))return;S.goals=S.goals.filter(x=>x.id!==d.id);return commit()} },
  'csvTx': function (d, b, e) { {const q=v=>{v=String(v??'');return /[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v},txd=S.txd||{},rows=[['Date','Name','Merchant','Amount','Account','Pending','Filed to','Counts in','Filed by']].concat((BK.tx||[]).map(t=>{const r=txd[t.id];return [t.date,t.name,t.merchant,t.amount,t.accountName,t.pending?'yes':'',r?txLabel(r):'',r?r.k:'',r?(r.auto?'automatically':'by hand'):'']}));const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([rows.map(r=>r.map(q).join(',')).join('\n')],{type:'text/csv'}));a.download='budgeteer-transactions-'+new Date().toISOString().slice(0,10)+'.csv';a.click();return} },
  'hcCard': function (d, b, e) { {let n=0;(d.ids||'').split(',').forEach(id=>{const r=S.txd&&S.txd[id],t=r&&txOf(id,r),f=r&&flexDefault(r.k);if(!t||!f)return;txUndo(id);txAssign(t,'i:'+f,undefined,r.k);n++});TXI=null;LP={};toast(`${n} card payment${n===1?'':'s'} now count as spending`);return commit()} },
  'grng': function (d, b, e) { GR=d.r;try{localStorage.setItem('pfb_gr',GR)}catch(_){}return renderGoals(); },
  'scAdd': function (d, b, e) { {S.al||(S.al=[]);const m=xStart(),gl=S.goals[0],ln=S.loans.filter(l=>!loanGone(l,TK))[0],a=d.v==='goal'?{to:gl?'g:'+gl.id:'keep',src:gl?'plan':'extra',mode:'$',v:200}:d.v==='loan'?{to:ln?'l:'+ln.id:'snow',src:'plan',mode:'$',v:100}:d.v==='snow'?{to:'snow',src:'plan',mode:'$',v:300,how:'rate',roll:true,loans:[]}:{to:gl?'g:'+gl.id:'keep',src:'extra',mode:'%',v:50};S.al.push({id:uid(),from:m,until:'',loans:[],...a});ALE=S.al[S.al.length-1].id;FSC=true;bcSet('bx',false);return commit()} },
  'scEdit': function (d, b, e) { {ALE=ALE===d.id?null:d.id;FSC=!!ALE;return rerender()} },
  'scAddTo': function (d, b, e) { {S.al||(S.al=[]);const to=d.to,a=to==='snow'?{to,src:'plan',mode:'$',v:300,how:'rate',roll:true,loans:[]}:to==='keep'?{to,src:'extra',mode:'%',v:100}:{to,src:'plan',mode:'$',v:to.startsWith('g:')?200:100};S.al.push({id:uid(),from:xStart(),until:'',loans:[],...a});ALE=S.al[S.al.length-1].id;FSC=true;return commit()} },
  'scDel': function (d, b, e) { {S.al=(S.al||[]).filter(a=>a.id!==d.id);if(!S.al.length)delete S.al;if(ALE===d.id)ALE=null;return commit()} },
  'scSrc': function (d, b, e) { {const a=(S.al||[]).find(x=>x.id===d.id);if(a){a.src=d.v;if(d.v==='plan'){a.mode='$';if(a.to==='keep')a.to=S.goals[0]?'g:'+S.goals[0].id:'snow'}}return commit()} },
  'scMode': function (d, b, e) { {const a=(S.al||[]).find(x=>x.id===d.id);if(a){a.mode=d.v;if(d.v==='%'&&a.v>100)a.v=50}return commit()} },
  'scHow': function (d, b, e) { {const a=(S.al||[]).find(x=>x.id===d.id);if(a)a.how=d.v;return commit()} },
  'scMove': function (d, b, e) { {const A=S.al||[],X=A.filter(a=>a.src==='extra'),i=X.findIndex(a=>a.id===d.id),j=i+(+d.v);if(i>=0&&j>=0&&j<X.length){const ia=A.indexOf(X[i]),ja=A.indexOf(X[j]);[A[ia],A[ja]]=[A[ja],A[ia]]}return commit()} },
  'skGo': function (d, b, e) { {return catOpen(d.v)} },
  'skNode': function (d, b, e) { {const n=K&&K.all[+d.n];if(n)skCard(n);return} },
  'skZoom': function (d, b, e) { {const n=K&&K.all[+d.n];skClose();if(n&&SEL!==n.id)zfocus(n);return} },
  'skX': function (d, b, e) { {return skClose()} },
  'skJob': function (d, b, e) { {skClose();BUDV='build';try{localStorage.setItem('pfb_budv',BUDV)}catch(_){}bcSet('bx',false);commit(true);const go=b=>{const h=$('[data-act="bcol"][data-v="bx"]'),sec=h&&(h.closest('section')||h),hd=$('header');if(!sec)return;const y=sec.getBoundingClientRect().top-(hd?hd.offsetHeight:0)-16;if(Math.abs(y)>6)scrollTo({top:y+scrollY,behavior:b})};setTimeout(()=>go(RM?'auto':'smooth'),80);setTimeout(()=>go('auto'),900);return} },
  'fcMonth': function (d, b, e) { {FDK=d.k;FSC=true;return fcBody()} },
  'fcEdit': function (d, b, e) { {S.cur=d.k;BUDV='build';try{localStorage.setItem('pfb_budv',BUDV)}catch(_){}scrollTo({top:0});return commit(true)} },
  'xSweep': function (d, b, e) { {const lk=addM(TK,-1),T=totals(lk),amt=r2(T.incA-(T.fixedA+T.flexA+T.loansA+T.saveA));if(amt<0.5)return;let rem=amt;const m=MOW(TK);m.dep||(m.dep={});m.lxp||(m.lxp={});const done=[];
  xmAt(TK).forEach(r=>{if(rem<=0.005||r.to==='keep')return;const a=Math.min(rem,r.mode==='%'?rem*(+r.v||0)/100:(+r.v||0));if(a<=0.005)return;let to=r.to;if(to==='snow'){const l=[...S.loans].filter(l=>!loanGone(l,TK)&&row(l,TK)&&(!(r.loans&&r.loans.length)||r.loans.includes(l.id))).sort(r.how==='bal'?(a,b)=>balEnd(a,TK)-balEnd(b,TK):(a,b)=>b.apr-a.apr)[0];if(!l)return;to='l:'+l.id}
   if(to.startsWith('g:'))m.dep[to.slice(2)]=r2((+m.dep[to.slice(2)]||0)+a);else{const l=S.loans.find(x=>'l:'+x.id===to);if(!l)return;const cur=loanXo(l,TK);m.lxp[l.id]=r2((cur!=null?cur:loanUsual(l,TK))+a)}rem-=a;done.push(destName(to)+' '+f0(a))});
  MOW(lk).swept=amt;toast(done.length?'Sent: '+done.join(', '):'Nothing to send: your rules keep it');return commit()} },
  'frng': function (d, b, e) { FR=d.r;try{localStorage.setItem('pfb_fr',FR)}catch(_){}return fcBody(); },
  'wfReset': function (d, b, e) { WFS={inc:0,cost:0,extra:0};return renderForecast(); },
  'spOpen': function (d, b, e) { {const sc=b.closest('dialog')||b.closest('section')||document,box=sc.querySelector(`[data-spf="${CSS.escape(d.id)}"]`);if(!box)return;box.hidden=!box.hidden;if(!box.hidden)spForm(box,d.id);return} },
  'spAdd': function (d, b, e) { {const box=b.closest('.spf');if(!box)return;spAddPart(box);return} },
  'spSave': function (d, b, e) { {const box=b.closest('.spf');if(box)spSave(box);return} },
  'rvDone': function (d, b, e) { {MOW(addM(TK,-1)).rv=1;return commit()} },
  'ps': function (d, b, e) { PS=d.v;return renderLoans(); },
  'pxClear': function (d, b, e) { {const m=xStart();(S.al||[]).filter(a=>a.to==='snow'&&a.from<=m&&(!a.until||a.until>=m)).forEach(a=>alEnd(a,m));PX=null;PS=null;toast('Snowball stops after '+labS(addM(m,-1)));return commit()} },
  'pxApply': function (d, b, e) { {const X=Math.max(0,PX??pxNow()),how=pxHow(),sm=pxSim(X,how),m=xStart();S.al||(S.al=[]);S.al.filter(a=>a.to==='snow'&&a.src==='plan'&&a.from<=m&&(!a.until||a.until>=m)).forEach(a=>alEnd(a,m));if(X>0)S.al.push({id:uid(),to:'snow',src:'plan',mode:'$',v:X,how,roll:true,loans:[],from:m,until:''});PX=null;PS=null;toast(`Snowball: ${f0(X)} a month from ${labS(m)}, debt free about ${labS(sm.end)}`);return commit()} },
  'wiPlan': function (d, b, e) { {const l=S.loans.find(x=>x.id===d.id),w=l?Math.round(WI[l.id]||0):0;if(!l)return;if(!w)return toast('Drag the slider to an amount first');const m=xStart(),v=loanUsual(l,m)+w;setUsual(l,m,v);WI[l.id]=0;toast(`${l.name}: ${f0(v)} extra a month from ${labS(m)}`);return commit()} },
  'export': function (d, b, e) { {const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(S,null,1)],{type:'application/json'}));a.download='budgeteer-backup-'+new Date().toISOString().slice(0,10)+'.json';a.click();return} },
  'import': function (d, b, e) { return $('#file').click(); },
  'bkList': function (d, b, e) { return bkList(); },
  'ntHide': function (d, b, e) { return ntHide(d.id); },
  'cvImport': function (d, b, e) { return cvImport(); },
  'cvCancel': function (d, b, e) { CV={};return renderSettings(); },
  'cvDel': function (d, b, e) { return cvDel(d.id); },
  'cvGo': function (d, b, e) { {if(S.tab!=='settings'||SV!=='connections'){SV='connections';S.tab='settings';commit(true)}const c=$('#cvcard');if(c)c.scrollIntoView({behavior:RM?'auto':'smooth',block:'start'});return} },
  'ntTest': function (d, b, e) { return ntTest(); },
  'bkRestore': function (d, b, e) { return bkRestore(d.id); },
  'fsRetry': function (d, b, e) { return FS.loaded?fsFlush(true):fsInit(); },
  'syncInfo': function (d, b, e) { return $('footer').scrollIntoView({behavior:RM?'auto':'smooth'}) },
};
ACT.alDn = ACT.alUp;   // one handler moves a goal up or down (d.act says which)

// Typing handlers (were the branches of the input listener in js/events.js, moved here unchanged): t = the field,
// d = its data-* values, e = the event. A field gets the first that applies, in this order (fieldHandlers, bridge.js).
export const INP = {
  'alpct': function (t, d, e) {
    if(d.alpct){const e=(S.alloc||{})[d.alpct];if(e){e.pct||(e.pct={});e.pct[d.g]=num(t.value)}save();clearTimeout(inT);inT=setTimeout(()=>commit(),350);return}
  },
  'filt': function (t, d, e) {
    if(d.filt){FLQ=t.value;FLN=50;const a=document.activeElement,ss=[a.selectionStart,a.selectionEnd];renderBank();const e2=document.querySelector('[data-key="flq"]');if(e2){RESTORING=true;try{e2.focus()}finally{RESTORING=false}try{e2.setSelectionRange(ss[0],ss[1])}catch(_){}}return}
  },
  'live': function (t, d, e) {
    if(d.live==='sp'){const box=t.closest('.spf');if(box)spLeft(box);return}
    if(d.live==='wf'){WFS[d.f]=+t.value;const o=$('#wfo-'+d.f);if(o)o.textContent=(WFS[d.f]<0?'−':d.f==='inc'&&WFS[d.f]>0?'+':'')+f0(Math.abs(WFS[d.f]));clearTimeout(inT);inT=setTimeout(fcBody,250);return}
    if(d.live==='px'){PX=num(t.value);pxLive();return}
    if(d.live==='wi'){const l=S.loans.find(x=>x.id===d.id);WI[l.id]=+t.value;$('#wo-'+l.id).textContent=f0(+t.value);wiLive(l,+t.value);return}
  },
  'k': function (t, d, e) {
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
    save();clearTimeout(inT);inT=setTimeout(()=>commit(),350)
  },
};
export const ORDER_INP = [['alpct', d => d.alpct], ['filt', d => d.filt], ['live', d => d.live], ['k', d => d.k]];

// Change handlers (the branches of the change listener; 'c' is every data-c field, then commit). Same order rule.
export const CHG = {
  'mm': function (t, d, e) {
    if(d.mm){monthMove(d.mm,t.value);return}
  },
  'mv': function (t, d, e) {
    if(d.mv){catMove(d.mv,t.value);return}
  },
  'tx': function (t, d, e) {
    if(d.tx&&t.tagName==='SELECT'){const cb=document.querySelector(`input[data-alw="${CSS.escape(d.tx)}"]`);const tx=BK.tx.find(x=>x.id===d.tx);if(cb&&tx)cb.checked=defAlways(t.value,tx.date.slice(0,7));return}
  },
  'alacct': function (t, d, e) {
    if(d.alacct){if(t.value){S.alloc||(S.alloc={});S.alloc[t.value]={mode:'order',goals:[],pct:{},rest:'last'}}return commit()}
  },
  'gacct': function (t, d, e) {
    if(d.gacct){const g=S.goals.find(x=>x.id===d.gacct);if(g&&t.value){S.alloc||(S.alloc={});const e=S.alloc[t.value]||(S.alloc[t.value]={mode:'order',goals:[],pct:{},rest:'last'});if(!e.goals.includes(g.id)){e.goals.push(g.id);if(e.mode==='split'){e.pct||(e.pct={});const used=e.goals.reduce((x,id)=>x+(+(e.pct[id]||0)),0);e.pct[g.id]=Math.max(0,100-used)}}toast(e.goals.length>1?`Shared with ${e.goals.length-1} other goal${e.goals.length>2?'s':''}. Set the order or split in Accounts for goals.`:`${g.name} now uses this account`)}return commit()}
  },
  'catchall': function (t, d, e) {
    if(d.catchall){S.catchAll=t.value||undefined;if(!S.catchAll)delete S.catchAll;let n=0;Object.entries(S.txd||{}).forEach(([id,r])=>{if(r.auto==='rest'){txUndo(id);n++}});const f=autoFile();
      toast(S.catchAll==='review'?`${n} purchase${n===1?'':'s'} moved back to To review`:`Unlinked purchases now go to ${txLabel({v:'i:'+flexDefault(TK),k:TK})}${f?` (${f} re-filed)`:''}`);return commit()}
  },
  'aladd': function (t, d, e) {
    if(d.aladd){const e=(S.alloc||{})[d.aladd];if(e&&t.value&&!e.goals.includes(t.value)){e.goals.push(t.value);if(e.mode==='split'){e.pct||(e.pct={});const used=e.goals.reduce((x,id)=>x+(+(e.pct[id]||0)),0);e.pct[t.value]=Math.max(0,100-used)}}return commit()}
  },
  'alrest': function (t, d, e) {
    if(d.alrest){const e=(S.alloc||{})[d.alrest];if(e)e.rest=t.checked?'last':'none';return commit()}
  },
  'tops': function (t, d, e) {
    if(d.tops)return;
  },
  'rule': function (t, d, e) {
    if(d.rule){const r=(S.rules||[]).find(x=>x.id===d.rule);if(r){const v=normT(t.value);if(v&&v!==r.p){r.p=v;ruleReapply(r);toast('Rule updated and re-applied')}}return commit()}
  },
  'rulev': function (t, d, e) {
    if(d.rulev){const r=(S.rules||[]).find(x=>x.id===d.rulev);if(r&&t.value&&t.value!==r.v){r.v=t.value;ruleReapply(r);toast(`Now filing to ${txLabel({v:r.v,k:TK})}`)}return commit()}
  },
  'ruleshift': function (t, d, e) {
    if(d.ruleshift){const r=(S.rules||[]).find(x=>x.id===d.ruleshift);if(r){if(t.value)r.shift=t.value;else delete r.shift;ruleReapply(r);toast('Rule updated and re-applied')}return commit()}
  },
  'rulemm': function (t, d, e) {
    if(d.rulemin||d.rulemax){const r=(S.rules||[]).find(x=>x.id===(d.rulemin||d.rulemax));if(r){const f=d.rulemin?'min':'max',v=t.value.trim();if(v==='')delete r[f];else r[f]=r2(num(v));ruleReapply(r)}return commit()}
  },
  'al': function (t, d, e) {
    if(d.al){const a=(S.al||[]).find(x=>x.id===d.al);if(!a)return;const v=t.value;if(d.f==='to'){a.to=v;if(v==='snow'){a.how=a.how||'rate';a.loans=a.loans||[];if(a.roll==null)a.roll=true}if(v==='keep'){a.src='extra'}}else if(d.f==='from'){if(v)a.from=v;if(a.until&&a.until<a.from)a.until=a.from}else if(d.f==='until'){a.until=v&&v<a.from?a.from:v}else if(d.f==='loan'){const L=new Set(a.loans||[]);t.checked?L.add(d.l):L.delete(d.l);a.loans=[...L]}else if(d.f==='roll')a.roll=t.checked;return commit()}
  },
  'c': function (t, d, e) {
    if(d.c==='loan'){const l=S.loans.find(x=>x.id===d.id);if(!l)return;if(d.f==='start'){if(t.value)l.start=t.value}else if(d.f==='origStart'){l.origStart=t.value||''}else if(d.f==='due')l.due=Math.min(31,Math.round(num(t.value)));else if(d.f==='xtra')setUsual(l,xStart(),Math.max(0,num(t.value)));else l[d.f]=num(t.value)}
    if(d.c==='hh'){S.hh={...(S.hh||{}),[d.f]:t.value.trim()};brandSet();return commit()}
    if(d.c==='bankfrom'){S.bankFrom=t.value||'';save();bankLoad();return}
    if(d.c==='refresh'){const b=d.f==='open'?{open:t.checked}:{hours:+t.value};fetch('api/bank/settings',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)}).then(async r=>{const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error||'Couldn’t save');if(BK.st)BK.st.refresh=j.refresh;toast(syncWord(j.refresh));renderSettings()}).catch(e=>{toast(e.message);renderSettings()});return}
    if(d.c==='goal'){const g=S.goals.find(x=>x.id===d.id);if(!g)return;if(d.f==='auto')g.auto=t.checked;else if(d.f==='monthly')verSet(g,'mp',xStart(),Math.max(0,num(t.value)));else if(d.f==='by'){if(t.value)g.by=t.value;else delete g.by}else g[d.f]=num(t.value)}
    commit()
  },
};
export const ORDER_CHG = [['mm', (d) => d.mm], ['mv', (d) => d.mv], ['tx', (d, t) => d.tx && t.tagName === 'SELECT'], ['alacct', (d) => d.alacct], ['gacct', (d) => d.gacct], ['catchall', (d) => d.catchall], ['aladd', (d) => d.aladd], ['alrest', (d) => d.alrest], ['tops', (d) => d.tops], ['rule', (d) => d.rule], ['rulev', (d) => d.rulev], ['ruleshift', (d) => d.ruleshift], ['rulemm', (d) => d.rulemin || d.rulemax], ['al', (d) => d.al], ['c', (d) => d.c]];

// Listeners of the page frame's own elements (were attached at load in flow.js, bank.js and events.js; moved here
// unchanged): the amount dialog, the link dialog, the pop-up's search, the month picker and the backup file. The frame
// (frame.jsx) attaches them as native listeners through refs, so they behave exactly as before.
export const FRAME_ON = {
  da: {
    input: ()=>dprev(),
  },
  dc: {
    click: e=>{const b=e.target.closest('button');if(!b)return;$('#da').value=b.dataset.v;dprev();$('#da').focus()},
  },
  dsel: {
    change: ()=>{if(DLG&&DLG.onSel)DLG.onSel($('#dsl2').value);else dprev()},
  },
  dform: {
    submit: e=>{e.preventDefault();if(!DLG)return;const v=$('#da').value.trim();if(v===''){$('#da').focus();return}DLG.save(num(v),$('#dsl2')?.value);$('#dlg').close();commit()},
  },
  ddel: {
    click: ()=>{if(DLG&&DLG.del){DLG.del();$('#dlg').close();commit()}},
  },
  lq: {
    input: e=>{if(!LK)return;LK.q=e.target.value;lnkList()},
  },
  lpick: {
    change: e=>{const c=e.target;if(c.name!=='lp'||!LK)return;const p=c.value;
 LK.sels=c.checked?[...LK.sels.filter(x=>x!==p),p]:LK.sels.filter(x=>x!==p);LK.sibOn=false;
 if(lnkSingle()){const s=LK.sels[0];LK.pat=s;LK.ref=LK.refs[s]||0;LK.amtOn=!!LK.wide[s]}else{LK.pat='';LK.amtOn=false;LK.ref=0}
 lnkRule()},
  },
  ldel: {
    click: ()=>{if(!LK)return;S.rules=(S.rules||[]).filter(r=>r.v!==LK.v);toast('Link removed. Anything already filed stays.');$('#ldlg').close();LK=null;commit()},
  },
  ldlg: {
    close: ()=>{LK=null},
  },
  lform: {
    submit: e=>{e.preventDefault();if(!LK)return;const L=LK,P=lnkPats();if(!P.length)return;
 // The ticked rows become this item's whole set of rules: unticked ones are removed, ticked ones added or kept.
 S.rules=(S.rules||[]).filter(r=>r.v!==L.v||P.includes(r.p));
 const one=lnkSingle(),lim=one&&L.amtOn&&L.ref;
 P.forEach(p=>addRule(p,L.dir,L.v,lim?r2(L.ref*.75):null,lim?r2(L.ref*1.25):null,lnkExclFor(p)));
 // Early-payment setting, then re-file what these rules already filed so it lands in the right month.
 S.rules.filter(r=>r.v===L.v).forEach(r=>{if(L.shift&&L.kind!=='flex')r.shift='next';else delete r.shift;Object.entries(S.txd||{}).forEach(([tid,x])=>{if(x.auto===r.id)txUndo(tid)})});
 const M=lnkMatches();
 if(L.move)M.forEach(t=>{const x=S.txd&&S.txd[t.id];if(x&&x.v!==L.v){txUndo(t.id);if(S.noAuto)delete S.noAuto[t.id]}});
 M.forEach(t=>{if(S.noAuto&&!(S.txd&&S.txd[t.id]))delete S.noAuto[t.id]});
 autoFile();const n=M.filter(t=>S.txd[t.id]&&S.txd[t.id].v===L.v).length;$('#ldlg').close();
 toast(`Linked${P.length>1?' '+P.length+' '+(L.kind==='flex'?'stores':'names'):''}. ${n} ${L.kind==='inc'?'deposit':L.kind==='flex'?'purchase':'payment'}${n===1?'':'s'} now filed to ${L.name}.`);commit()},
  },
  tdq: {
    input: catFilter,
  },
  mp: {
    change: e=>{if(e.target.value)go(e.target.value);e.target.style.pointerEvents='none'},
  },
  file: {
    change: e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{const v=JSON.parse(r.result);if(!((v.plans&&v.loans)||(v.data&&v.data.plans)))throw 0;if(!confirm('Replace everything in this browser with this backup?'))return;const d=v.data&&v.data.plans?v.data:v;S={...d,months:d.months||{},cur:S.cur,tab:S.tab,flow:S.flow};commit(true);toast('Backup restored')}catch(_){alert('That file isn’t a Budgeteer backup.')}};r.readAsText(f);e.target.value=''},
  },
};
