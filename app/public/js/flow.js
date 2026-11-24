'use strict';
/* ---------- money flow (sankey) ---------- */
let K=null,Z=null,ZW=0,ZH=0,SEL=null,PN=null,zt;
function hl(i,li){const s=$('#sk svg');if(!s)return;if(li!=null){s.classList.add('hlt');s.querySelectorAll('.lk').forEach(p=>p.classList.toggle('on',+p.dataset.l===li));return}if(i==null){s.classList.remove('hlt');return}const n=K.all[i];s.classList.add('hlt');s.querySelectorAll('.lk').forEach(p=>{const l=K.L[p.dataset.l];p.classList.toggle('on',l.s===n||l.t===n||(n.ci===3&&l.t.id===n.p&&l.s.id==='b'))})}
function zset(v,anim){const s=$('#sk svg');if(!s)return;if(!anim){Z={...Z,...v};s.setAttribute('viewBox',`${Z.x} ${Z.y} ${Z.w} ${Z.h}`);return}
 const o={...Z},t0=performance.now();cancelAnimationFrame(zt);const st=t=>{let p=Math.min(1,(t-t0)/(RM?1:600));p=1-Math.pow(1-p,3);zset({x:o.x+(v.x-o.x)*p,y:o.y+(v.y-o.y)*p,w:o.w+(v.w-o.w)*p,h:o.h+(v.h-o.h)*p});if(p<1)zt=requestAnimationFrame(st)};zt=requestAnimationFrame(st)}
function zz(f,px,py,anim){if(!Z)return;const w=Math.max(ZW/8,Math.min(ZW,Z.w*f)),h=w*ZH/ZW,cx=px??Z.x+Z.w/2,cy=py??Z.y+Z.h/2;SEL=null;zbar(null);zset({x:Math.max(0,Math.min(ZW-w,cx-(cx-Z.x)*(w/Z.w))),y:Math.max(0,Math.min(ZH-h,cy-(cy-Z.y)*(h/Z.h))),w,h},anim)}
function zfit(){SEL=null;zbar(null);zset({x:0,y:0,w:ZW,h:ZH},1)}
// Which details a chart node opens: an item, loan, goal, income source, or (for a group) the whole group.
function nodeKey(n){if(!n||!n.id)return null;const id=n.id;if(id==='left'||id==='b'||id==='over')return null;if(id[0]==='i')return 'inc:'+id.slice(1);if(id==='gL'||id==='gS')return null;if(id[0]==='g'&&id.includes('~'))return 'i:'+id.split('~')[1];
 if(id[0]==='g')return n.solo&&K?(()=>{const kid=plan().groups.find(g=>'g'+g.id===id);return kid&&kid.items.length===1?'i:'+kid.items[0].id:'grp:'+id.slice(1)})():'grp:'+id.slice(1);
 if(id[0]==='t'){const x=id.slice(1);if(S.loans.some(l=>l.id===x))return 'l:'+x;if(S.goals.some(g=>g.id===x))return 'g:'+x;return 'i:'+x}return null}
function zfocus(n){const g=n.ci===3?K.all.find(x=>x.id===n.p):n.ci===2?n:null;if(!g||g.id==='left')return;if(!g)return;if(SEL===g.id)return zfit();SEL=g.id;const kids=K.all.filter(x=>x.p===g.id),B=K.all.find(x=>x.id==='b'),ns=[g,B,...kids];
 let x0=B.x-60,x1=Math.max(g.x+340,...kids.map(k=>k.x+330)),y0=Math.min(...ns.map(k=>k.y))-34,y1=Math.max(...ns.map(k=>k.y+k.h))+30,w=x1-x0,h=y1-y0;const r=K.W/K.H;
 if(w/h<r){const nw=h*r;x0-=(nw-w)/2;w=nw}else{const nh=w/r;y0-=(nh-h)/2;h=nh}w=Math.min(w,K.W);h=w/r;zset({x:Math.max(0,Math.min(K.W-w,x0)),y:Math.max(0,Math.min(K.H-h,y0)),w,h},1);zbar(g)}
// Hover card (#skt) and click card (#skc) live in .skw, positioned in its scrolled content box.
// A click on any name, bar or ribbon: an item, income, loan or goal opens its pop-up (catOpen); a group,
// Budget, Left over or Over budget opens a card with its breakdown, each line opening its own pop-up.
let SKD=false;
const skPos=(el,x,y,below)=>{const w=$('.skw');if(!w||!el)return;const r=w.getBoundingClientRect(),ew=el.offsetWidth,eh=el.offsetHeight;let L=x-r.left+w.scrollLeft+16,T=y-r.top+(below?16:-eh/2);
 if(L+ew>w.scrollLeft+w.clientWidth-6)L=x-r.left+w.scrollLeft-ew-16;L=Math.max(w.scrollLeft+6,Math.min(L,w.scrollLeft+w.clientWidth-ew-6));T=Math.max(6,Math.min(T,w.clientHeight-eh-6));el.style.left=L+'px';el.style.top=T+'px'};
function skShare(v,base){return base>0?Math.round(v/base*100)+'%':''}
function skVs(n){if(n.pv==null||S.cur>TK)return '';const w=S.cur<TK?'actual':'so far';return K.act?`${f0(n.pv)} planned`:`${f0(n.av)} ${w}`}
function skHint(n){const k=nodeKey(n);return k&&!k.startsWith('grp:')?'Click for transactions':'Click for the breakdown'}
const NOHOV=matchMedia('(hover: none)');
const skPlace=(el,b)=>{const w=$('.skw');if(!w||!el||!b)return;const r=w.getBoundingClientRect(),ew=el.offsetWidth,eh=el.offsetHeight,o=r.left-w.scrollLeft,vis=[w.scrollLeft+6,w.scrollLeft+w.clientWidth-ew-6];let L=b.r-o+12;if(L>vis[1])L=b.l-o-ew-12;L=Math.max(vis[0],Math.min(vis[1],L));el.style.left=L+'px';el.style.top=Math.max(6,Math.min(b.y-r.top-40,w.clientHeight-eh-6))+'px'};
function skClose(){const c=$('#skc');if(c){c.hidden=true;c.innerHTML=''}const s=$('#sk svg');s&&s.querySelectorAll('.nd.sel').forEach(x=>x.classList.remove('sel'))}
function skOpen(n,at){const k=nodeKey(n);$('#skt')&&($('#skt').hidden=true);if(k&&!k.startsWith('grp:')){skClose();return catOpen(k)}skCard(n,at)}
function skAt(n){const g=$(`#sk .nd[data-n="${K.all.indexOf(n)}"] .hit`);if(!g)return null;const r=g.getBoundingClientRect();return{l:r.left,r:r.right,y:r.top+r.height/2}}
addEventListener('scroll',()=>{const t=$('#skt');t&&(t.hidden=true)},{capture:true,passive:true});
document.addEventListener('mousemove',e=>{const t=$('#skt');if(t&&!t.hidden&&e.target.closest('#sk'))skPos(t,e.clientX,e.clientY)});
document.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches&&e.target.matches('#sk .nd')&&K){e.preventDefault();const n=K.all[+e.target.dataset.n];skOpen(n,skAt(n));return}if(e.key==='Escape'&&$('#skc:not([hidden])')&&!document.querySelector('dialog[open]')){skClose()}});
document.addEventListener('mouseover',e=>{if(!K)return;const n=e.target.closest('#sk .nd'),l=n?null:e.target.closest('#sk .lk');hl(n?+n.dataset.n:null,l?+l.dataset.l:null);skTip(n?K.all[+n.dataset.n]:null,l?K.L[+l.dataset.l]:null,e)});
document.addEventListener('wheel',e=>{const sk=e.target.closest('#sk');if(!sk||!(e.ctrlKey||e.metaKey)||!Z)return;e.preventDefault();const r=sk.querySelector('svg').getBoundingClientRect();zz(e.deltaY<0?.86:1.16,Z.x+(e.clientX-r.left)*Z.w/r.width,Z.y+(e.clientY-r.top)*Z.h/r.height,0)},{passive:false});
document.addEventListener('pointerdown',e=>{const sk=e.target.closest('#sk');if(!sk||e.target.closest('.nd')||!Z||Z.w>=ZW-1)return;PN={x:e.clientX,y:e.clientY,z:{...Z},el:sk,mv:false};SKD=false;sk.classList.add('grab')});
document.addEventListener('pointermove',e=>{if(!PN)return;if(Math.abs(e.clientX-PN.x)+Math.abs(e.clientY-PN.y)>5)PN.mv=true;const r=PN.el.querySelector('svg').getBoundingClientRect(),k=PN.z.w/r.width;zset({x:Math.max(0,Math.min(ZW-Z.w,PN.z.x-(e.clientX-PN.x)*k)),y:Math.max(0,Math.min(ZH-Z.h,PN.z.y-(e.clientY-PN.y)*k))})});
addEventListener('pointerup',()=>{if(PN){SKD=PN.mv;PN.el.classList.remove('grab');PN=null}});

/* ---------- dialog ---------- */
let DLG=null;

function payDialog(id,extraLeft){const l=S.loans.find(x=>x.id===id)||S.loans[0];if(!l)return;const k=S.cur;if(k<l.start){toast(`${l.name} tracking starts ${labS(l.start)}`);return}
 const r=row(l,k);if(!r){toast(l.name+' is paid off');return}if(r.auto){toast(`${l.name} payments come from ${l.link?l.link.inst:'your bank'} automatically`);return}const mn=Math.min(l.min,r.open+r.int),cur=r.lg?r.pay:mn,left=totals().left;
 const chips=[{l:'Minimum',v:r2(mn)},{l:'+$100',v:r2(mn+100)},{l:'+$250',v:r2(mn+250)},{l:'+$500',v:r2(mn+500)},{l:'Round up',v:Math.ceil((mn+1)/100)*100}];if(left>1)chips.push({l:`+ left over (${f0(left)})`,v:r2(mn+left)});chips.push({l:'Pay it off',v:r2(r.open+r.int)});
 const fb=Object.values(S.txd||{}).filter(x=>x.v==='l:'+l.id&&x.k===k).reduce((a,x)=>a+x.amt,0);openD({title:`Log ${l.name} payment`,sub:`${lab(k)} · minimum ${f2(mn)} · balance ${f2(r.open)}${fb>0.004?` · includes ${f2(fb)} from your bank; enter the month’s total`:''}`,sel:S.loans.filter(x=>row(x,k)).map(x=>({v:x.id,l:`${x.name} (${x.apr}%)`})),selV:l.id,selLab:'Loan',onSel:v=>{$('#dlg').close();payDialog(v,extraLeft)},
  amt:extraLeft?r2(mn+extraLeft):cur,chips,ok:'Log payment',del:r.lg?()=>{delete MOW(k).pay[l.id]}:null,
  prev:a=>{if(!a)return 'Enter the amount you paid.';if(a<mn-0.005)return `That’s ${f2(mn-a)} under the minimum.`;const e=payEffect(l,k,a);return e.saved>0.005?[`Paying ${f2(a-mn)} extra saves `,{b:f2(e.saved)},' in interest',...(e.months>0?[' and finishes ',{b:mo(e.months)},' sooner']:[]),'.']:'Paying the minimum keeps you on schedule.'},
  save:a=>{MOW(k).pay[l.id]=r2(Math.min(a,r.open+r.int));const e=payEffect(l,k,a);toast(e.saved>0.5?`Logged. That saves ${f0(e.saved)} in interest.`:'Payment logged')}})}
function depDialog(id,amt){const g=S.goals.find(x=>x.id===id)||S.goals[0];if(!g)return;const k=S.cur,d=MO(k).dep[g.id],t=target(g),base=goalSaved(g)-(+d||0),left=totals().left;
 const gm=goalPlan(g,k),chips=[];if(gm>0)chips.push({l:`Planned (${f0(gm)})`,v:gm});[100,250,500,1000].forEach(v=>chips.push({l:f0(v),v}));if(left>1)chips.push({l:`Left over (${f0(left)})`,v:r2(left)});
 openD({title:`Save toward ${g.name}`,sub:`${lab(k)} · ${f0(base)} saved${t?' of '+f0(t):''}${gLinked(g)?' · for money outside the linked accounts':''}`,sel:S.goals.map(x=>({v:x.id,l:x.name})),selV:g.id,selLab:'Goal',onSel:v=>{$('#dlg').close();depDialog(v,amt)},
  amt:amt!=null?amt:(d!=null?d:gm||''),chips,ok:'Save deposit',del:d!=null?()=>{delete MOW(k).dep[g.id]}:null,
  prev:a=>{if(!t)return '';const s=base+a,p=Math.min(100,Math.round(s/t*100));const rem=t-s;return rem<=0?[{b:'That completes the goal!'}]:['That brings you to ',{b:p+'%'},`, ${f0(rem)} to go.${goalMon(g,k)>0?` At ${f0(goalMon(g,k))}/month you’d finish around ${labS(addM(k,Math.ceil(rem/goalMon(g,k))))}.`:''}`]},
  save:a=>{MOW(k).dep[g.id]=r2(a);toast(`Saved ${f0(a)} toward ${g.name}`)}})}

/* ---------- confetti ---------- */
function confetti(){if(RM)return;const cv=$('#fx'),x=cv.getContext('2d'),dpr=devicePixelRatio||1;cv.width=innerWidth*dpr;cv.height=innerHeight*dpr;x.scale(dpr,dpr);
 const cols=[C.pink,C.lime,C.butter,C.coral,C.lilac,C.aqua,C.sky],P=Array.from({length:150},()=>({x:innerWidth/2+(Math.random()-.5)*160,y:innerHeight*.35,vx:(Math.random()-.5)*14,vy:-Math.random()*13-4,r:Math.random()*Math.PI,vr:(Math.random()-.5)*.35,w:6+Math.random()*7,h:4+Math.random()*6,c:cols[Math.random()*cols.length|0]}));
 const t0=performance.now();(function f(t){x.clearRect(0,0,innerWidth,innerHeight);const age=t-t0;P.forEach(p=>{p.vy+=.38;p.vx*=.99;p.x+=p.vx;p.y+=p.vy;p.r+=p.vr;x.save();x.globalAlpha=Math.max(0,1-age/2200);x.translate(p.x,p.y);x.rotate(p.r);x.fillStyle=p.c;x.fillRect(-p.w/2,-p.h/2,p.w,p.h);x.restore()});if(age<2200)requestAnimationFrame(f);else x.clearRect(0,0,innerWidth,innerHeight)})(t0)}
