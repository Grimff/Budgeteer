// history: moved from app/public/js/history.js unchanged except `export`. Its top-level let/var stay there (shared state the
// classic files reassign); everything else here reads the app's globals by name as before, and dist/history.js puts these
// exports on the global object (lib/history.global.js) so the classic files and the React screens still call them by name.
// globals: each function is on the global object before any code here runs, each const right after its line, as in a classic script.
Object.assign(globalThis, { monthSum, histMonths });
/* ---------- render: history ---------- */
export function monthSum(k){const p=plan(k),m=MO(k),rows=[];let inc=0;p.income.forEach(i=>{inc+=incActual(k,i)});
 let spU=0;p.groups.forEach(g=>{if(g.loose&&!g.items.length)return;let pl=0,ac=0,est=false;g.items.forEach(i=>{const a=+i.amt||0;pl+=a;if(g.flex){const fa=flexAct(k,i.id);if(fa!=null){ac+=fa;if(a<=0.5)spU+=fa}else if(!seenNone(k,i)){ac+=a;est=true}}else{const pd=billPaid(k,i.id);ac+=pd?pd.amt:seenNone(k,i)?0:a;if(pd&&a<=0.5)spU+=pd.amt}});rows.push({name:g.name,c:g.color,pl,ac,est:g.flex&&est,flex:g.flex})});
 let lp=0,la=0,lest=false,extra=0,isv=0;S.loans.forEach(l=>{lp+=loanPlan(l,k);if(k<l.start){la+=l.min;lest=true;return}const r=row(l,k);if(!r)return;la+=r.pay;if(!r.lg)lest=true;const mn=Math.min(l.min,r.open+r.int);if(r.lg&&r.pay>mn+0.005){extra+=r.pay-mn;isv+=payEffect(l,k,r.pay).saved}});
 rows.push({name:'Loan payments',c:C.sky,pl:lp,ac:la,est:lest,sav:true});
 let sp=0,sa=0;S.goals.forEach(g=>{sp+=goalPlan(g,k);sa+=savedIn(g,k)});rows.push({name:'Savings goals',c:C.lilac,pl:sp,ac:sa,est:false,sav:true});
 const pl=rows.reduce((a,r)=>a+r.pl,0),ac=rows.reduce((a,r)=>a+r.ac,0),flexLogged=p.groups.some(g=>g.flex&&g.items.some(i=>flexAct(k,i.id)!=null));
 const spP=rows.filter(r=>!r.sav).reduce((a,r)=>a+r.pl,0),spA=rows.filter(r=>!r.sav).reduce((a,r)=>a+r.ac,0);
 return{k,inc,rows,pl,ac,spP,spA,spU,spX:spA-spU,extra,isv,sa,flexLogged,anyLog:flexLogged||Object.keys(m.pay).length>0||Object.keys(m.dep).length>0}}
export function histMonths(){let lo=TK;[...Object.keys(S.plans),...Object.keys(S.months)].forEach(k=>{if(k<lo)lo=k});{const bf=budStart();if(bf&&lo<bf)lo=bf<TK?bf:TK}if(S.histFrom&&S.histFrom>lo)lo=S.histFrom<TK?S.histFrom:TK;let hi=TK;Object.keys(S.months).forEach(k=>{const m=S.months[k];if(k>hi&&(Object.keys(m.act||{}).length||Object.keys(m.pay||{}).length||Object.keys(m.dep||{}).length))hi=k});
 const out=[];for(let k=lo,n=0;k<=hi&&n<240;k=addM(k,1),n++)out.push(k);return out}

