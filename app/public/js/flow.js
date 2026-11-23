'use strict';
/* ---------- money flow (sankey) ---------- */
let K=null,Z=null,ZW=0,ZH=0,SEL=null,PN=null,zt;
function sankey(){const el=$('#sk');if(!el)return;el.classList.toggle('cmpv',S.flow==='compare');if(S.flow==='compare'){K=null;return compareView(el)}const p=plan(),m=MO(S.cur),act=S.flow==='actual';
 const IC=[C.pink,C.butter,C.aqua,C.lilac];
 const inc=p.income.map((i,ix)=>{const pv=+i.amt||0,av=chartInc(S.cur,i);return{id:'i'+i.id,name:i.name,v:act?av:pv,pv,av,c:IC[ix%IC.length]}}).filter(x=>x.v>0),groups=[];
 p.groups.forEach(g=>{const its=g.items.map(i=>{const pv=+i.amt||0,av=chartItem(g,i,S.cur);return{id:'t'+i.id,name:i.name,v:act?av:pv,pv,av,c:g.color}}).filter(x=>x.v>0);if(its.length)groups.push({id:'g'+g.id,name:g.name,c:g.color,go:g.flex?'#sec-flex':'#sec-fixed',its})});
 const li=S.loans.map(l=>{const r=S.cur<l.start?null:row(l,S.cur),pv=loanPlan(l,S.cur),av=r&&r.lg?r.pay:(l.acct&&l.link&&S.cur>=TK?0:pv);return{id:'t'+l.id,name:l.name,v:act?av:pv,pv,av,c:C.sky}}).filter(x=>x.v>0);if(li.length)groups.push({id:'gL',name:'Loans',c:C.sky,tab:'loans',its:li});
 const gi=S.goals.map(g=>{const pv=goalPlan(g,S.cur),av=Math.max(0,savedIn(g,S.cur));return{id:'t'+g.id,name:g.name,v:act?av:pv,pv,av,c:C.lilac}}).filter(x=>x.v>0);if(gi.length)groups.push({id:'gS',name:'Savings',c:C.lilac,tab:'goals',its:gi});
 const sum=(a,f)=>a.reduce((t,x)=>t+(x[f]||0),0);groups.forEach(g=>{g.v=sum(g.its,'v');g.pv=sum(g.its,'pv');g.av=sum(g.its,'av')});
 const I=inc.reduce((a,x)=>a+x.v,0),O=groups.reduce((a,x)=>a+x.v,0),left=I-O;
 if(!I&&!O){el.innerHTML='<p class="mut" style="padding:30px 0">Add income and bills to see your money flow.</p>';return}
 if(left<-0.5)inc.push({id:'over',name:'Over budget',v:-left,c:'#ff6b7f'});
 const B={id:'b',name:'Budget',v:Math.max(I,O),c:'#fff4fa'},gN=groups.map(g=>({id:g.id,name:g.name,v:g.v,pv:g.pv,av:g.av,c:g.c,go:g.go,tab:g.tab,its:g.its,solo:g.its.length===1}));if(left>0.5)gN.push({id:'left',name:'Left over',v:left,c:C.lime,solo:true});
 const iN=[];groups.forEach(g=>{if(g.its.length>1)g.its.forEach(x=>iN.push({...x,p:g.id}))});
 const cols=[inc,[B],gN,iN],W=1660,xs=[200,610,1030,1340],nw=18,GAP=[40,0,30,24],MIN=[44,44,36,32];
 const tot=Math.max(...cols.map(c=>c.reduce((a,n)=>a+n.v,0)));let k=1050/tot,H=0;
 cols.forEach((c,ci)=>{c.h=c.reduce((a,n)=>a+(n.h=Math.max(MIN[ci],n.v*k)),0)+GAP[ci]*Math.max(0,c.length-1);H=Math.max(H,c.h)});H+=60;
 cols.forEach((c,ci)=>{let y=(H-c.h)/2;c.forEach(n=>{n.x=xs[ci];n.y=y;y+=n.h+GAP[ci];n.o=0;n.q=0;n.ci=ci})});
 const Ls=[];inc.forEach(n=>Ls.push({s:n,t:B,c:n.c,v:n.v}));gN.forEach(n=>Ls.push({s:B,t:n,c:n.c,v:n.v}));iN.forEach(n=>Ls.push({s:gN.find(g=>g.id===n.p),t:n,c:n.c,v:n.v}));
 const ps=Ls.map((l,i)=>{const a=l.v*l.s.h/l.s.v,b=l.v*l.t.h/l.t.v,x0=l.s.x+nw,x1=l.t.x,y0=l.s.y+l.s.o,y1=l.t.y+l.t.q,xm=(x0+x1)/2;l.s.o+=a;l.t.q+=b;
  return `<path class="lk" data-l="${i}" fill="${l.c}" d="M${x0},${y0}C${xm},${y0} ${xm},${y1} ${x1},${y1}L${x1},${y1+b}C${xm},${y1+b} ${xm},${y0+a} ${x0},${y0+a}Z"></path>`}).join('');
 const tw=t=>t.length*12.2+30;
 const all=cols.flat(),ns=all.map((n,i)=>{const cy=n.y+n.h/2,rect=`<rect x="${n.x}" y="${n.y}" width="${nw}" height="${n.h}" rx="6" fill="${n.c}"/>`,lw=Math.max(tw(n.name),tw(f0(n.v)));let lab,hx0,hx1;
  if(n.ci===0){hx0=n.x-14-lw;hx1=n.x+nw+4}else if(n.ci===3||(n.ci===2&&n.solo)){hx0=n.x-4;hx1=n.x+nw+14+lw}else{hx0=Math.min(n.x,n.ci===1?n.x+nw/2-lw/2:n.x);hx1=n.ci===1?n.x+nw/2+lw/2:n.x+nw+10+lw}
  if(n.ci===0)lab=`<text class="lb" x="${n.x-14}" y="${cy-4}" text-anchor="end" fill="#fff4fa" font-size="23" font-weight="600">${esc(n.name)}</text><text class="lb" x="${n.x-14}" y="${cy+22}" text-anchor="end" fill="#bca8b9" font-size="20">${f0(n.v)}</text>`;
  else if(n.ci===3||(n.ci===2&&n.solo))lab=`<text class="lb" x="${n.x+nw+14}" y="${cy-4}" fill="#fff4fa" font-size="23" font-weight="600">${esc(n.name)}</text><text class="lb" x="${n.x+nw+14}" y="${cy+22}" fill="#bca8b9" font-size="20">${f0(n.v)}</text>`;
  else{const w=Math.max(tw(n.name),tw(f0(n.v))),bx=n.ci===1?n.x+nw/2-w/2:n.x+nw+10;lab=`<g class="pl"><rect x="${bx}" y="${cy-28}" width="${w}" height="56" rx="12" fill="#1b1221" fill-opacity=".9" stroke="${n.ci===1?'rgba(255,236,246,.2)':n.c}" stroke-opacity=".7"/><text x="${bx+w/2}" y="${cy-4}" text-anchor="middle" fill="#fff4fa" font-size="22" font-weight="600">${esc(n.name)}</text><text x="${bx+w/2}" y="${cy+20}" text-anchor="middle" fill="#bca8b9" font-size="19">${f0(n.v)}</text></g>`}
  const hy=Math.min(n.y,cy-30),hit=`<rect class="hit" x="${hx0}" y="${hy}" width="${hx1-hx0}" height="${Math.max(n.y+n.h,cy+30)-hy}" fill="#000" fill-opacity="0"/>`;
  return `<g class="nd" data-n="${i}" tabindex="0" role="button" aria-label="${esc(n.name)}, ${f0(n.v)}">${hit}${rect}${lab}</g>`}).join('');
 if(!Z||ZW!==W||ZH!==H){ZW=W;ZH=H;Z={x:0,y:0,w:W,h:H};SEL=null}
 K={L:Ls,all,W,H,I,O,left,act};skClose();el.innerHTML=`<svg viewBox="${Z.x} ${Z.y} ${Z.w} ${Z.h}" role="img" aria-label="Money flow from income to groups to bills">${ps}${ns}</svg>`;zbar(SEL?all.find(n=>n.id===SEL):null)}
function hl(i,li){const s=$('#sk svg');if(!s)return;if(li!=null){s.classList.add('hlt');s.querySelectorAll('.lk').forEach(p=>p.classList.toggle('on',+p.dataset.l===li));return}if(i==null){s.classList.remove('hlt');return}const n=K.all[i];s.classList.add('hlt');s.querySelectorAll('.lk').forEach(p=>{const l=K.L[p.dataset.l];p.classList.toggle('on',l.s===n||l.t===n||(n.ci===3&&l.t.id===n.p&&l.s.id==='b'))})}
function zset(v,anim){const s=$('#sk svg');if(!s)return;if(!anim){Z={...Z,...v};s.setAttribute('viewBox',`${Z.x} ${Z.y} ${Z.w} ${Z.h}`);return}
 const o={...Z},t0=performance.now();cancelAnimationFrame(zt);const st=t=>{let p=Math.min(1,(t-t0)/(RM?1:600));p=1-Math.pow(1-p,3);zset({x:o.x+(v.x-o.x)*p,y:o.y+(v.y-o.y)*p,w:o.w+(v.w-o.w)*p,h:o.h+(v.h-o.h)*p});if(p<1)zt=requestAnimationFrame(st)};zt=requestAnimationFrame(st)}
function zz(f,px,py,anim){if(!Z)return;const w=Math.max(ZW/8,Math.min(ZW,Z.w*f)),h=w*ZH/ZW,cx=px??Z.x+Z.w/2,cy=py??Z.y+Z.h/2;SEL=null;zbar(null);zset({x:Math.max(0,Math.min(ZW-w,cx-(cx-Z.x)*(w/Z.w))),y:Math.max(0,Math.min(ZH-h,cy-(cy-Z.y)*(h/Z.h))),w,h},anim)}
function zfit(){SEL=null;zbar(null);zset({x:0,y:0,w:ZW,h:ZH},1)}
// Which details a chart node opens: an item, loan, goal, income source, or (for a group) the whole group.
function nodeKey(n){if(!n||!n.id)return null;const id=n.id;if(id==='left'||id==='b'||id==='over')return null;if(id[0]==='i')return 'inc:'+id.slice(1);if(id==='gL'||id==='gS')return null;
 if(id[0]==='g')return n.solo&&K?(()=>{const kid=plan().groups.find(g=>'g'+g.id===id);return kid&&kid.items.length===1?'i:'+kid.items[0].id:'grp:'+id.slice(1)})():'grp:'+id.slice(1);
 if(id[0]==='t'){const x=id.slice(1);if(S.loans.some(l=>l.id===x))return 'l:'+x;if(S.goals.some(g=>g.id===x))return 'g:'+x;return 'i:'+x}return null}
function zbar(g){const e=$('#zb');if(!e)return;e.innerHTML=g?`<span>Showing <b>${esc(g.name)}</b></span>${nodeKey(g)&&nodeKey(g).startsWith('grp:')?`<button class="btn sm" data-act="flowDet" data-v="${nodeKey(g)}">Details</button>`:''}${g.go?`<button class="btn g sm" data-act="budv" data-v="build">Edit in Build budget</button>`:g.tab?`<button class="btn g sm" data-act="tab" data-t="${g.tab}">Open ${g.tab==='loans'?'Loans':'Goals'}</button>`:''}<button class="btn sm" data-act="zfit">Zoom out</button>`:''}
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
function skTip(n,l,e){const t=$('#skt');if(!t)return;if((!n&&!l)||NOHOV.matches){t.hidden=true;return}
 if(l){t.innerHTML=`<small>${esc(l.s.name)} → ${esc(l.t.name)}</small><b>${f0(l.v)}</b><span>${K.I>0?skShare(l.v,K.I)+' of income · ':''}${skHint(l.t)}</span>`}
 else{const vs=skVs(n),sh=n.ci===0?skShare(n.v,K.I)+' of income':n.id==='b'?'':skShare(n.v,K.I)?skShare(n.v,K.I)+' of income':'';
  t.innerHTML=`<small><i style="background:${n.c}"></i>${esc(n.name)}</small><b>${f0(n.v)}</b>${vs||sh?`<span>${[vs,sh].filter(Boolean).join(' · ')}</span>`:''}<em>${skHint(n)}</em>`}
 t.hidden=false;skPos(t,e.clientX,e.clientY)}
const skPlace=(el,b)=>{const w=$('.skw');if(!w||!el||!b)return;const r=w.getBoundingClientRect(),ew=el.offsetWidth,eh=el.offsetHeight,o=r.left-w.scrollLeft,vis=[w.scrollLeft+6,w.scrollLeft+w.clientWidth-ew-6];let L=b.r-o+12;if(L>vis[1])L=b.l-o-ew-12;L=Math.max(vis[0],Math.min(vis[1],L));el.style.left=L+'px';el.style.top=Math.max(6,Math.min(b.y-r.top-40,w.clientHeight-eh-6))+'px'};
function skClose(){const c=$('#skc');if(c){c.hidden=true;c.innerHTML=''}const s=$('#sk svg');s&&s.querySelectorAll('.nd.sel').forEach(x=>x.classList.remove('sel'))}
function skOpen(n,at){const k=nodeKey(n);$('#skt')&&($('#skt').hidden=true);if(k&&!k.startsWith('grp:')){skClose();return catOpen(k)}skCard(n,at)}
function skCard(n,at){const c=$('#skc');if(!c||!K)return;const row=(key,name,v,col,base,act2)=>`<button type="button" class="skr" ${act2||`data-act="skGo" data-v="${key}"`}><i style="background:${col}"></i><span>${esc(name)}</span><small>${skShare(v,base)}</small><b>${f0(v)}</b></button>`;
 let body='',foot='',sub='';const I=K.I,O=K.all.filter(x=>x.ci===2&&x.id!=='left').reduce((a,x)=>a+x.v,0),word=K.act?(S.cur<TK?'Actual':'So far'):'Planned';
 if(n.id==='b'){sub=`${word} for ${mon(S.cur)}`;body=`<p class="skh">Coming in</p>${K.all.filter(x=>x.ci===0&&x.id!=='over').map(x=>row(nodeKey(x),x.name,x.v,x.c,I)).join('')}<p class="skh">Going out</p>${K.all.filter(x=>x.ci===2).map(x=>{const j=K.all.indexOf(x),k2=nodeKey(x);return row(k2,x.name,x.v,x.c,I,k2&&!k2.startsWith('grp:')?'':`data-act="skNode" data-n="${j}"`)}).join('')}`}
 else if(n.id==='left'){sub=`${word} for ${mon(S.cur)}`;body=`<div class="skm"><span>Income</span><b>${f0(I)}</b><span>Everything going out</span><b>− ${f0(O)}</b><span>Left over</span><b style="color:var(--lime)">${f0(K.left)}</b></div><p class="dim skp">${K.act?'Hasn’t gone out yet this month.':'Not given a job yet.'} Schedule it toward a goal or a loan, or see where it takes you.</p>`;
  foot=`<button class="btn sm" data-act="skJob">Give it a job</button><button class="btn g sm" data-act="budv" data-v="fc">Forecast</button>`}
 else if(n.id==='over'){sub=`${word} for ${mon(S.cur)}`;body=`<div class="skm"><span>Income</span><b>${f0(I)}</b><span>Everything going out</span><b>− ${f0(O)}</b><span>Over by</span><b style="color:var(--red)">${f0(n.v)}</b></div><p class="dim skp">More is ${K.act?'going':'planned to go'} out than coming in. Trim a line or plan more income.</p>`;foot=`<button class="btn sm" data-act="budv" data-v="build">Build budget</button>`}
 else{const its=n.its||[],G=n.ci===3?K.all.find(x=>x.id===n.p):n;sub=`${word} for ${mon(S.cur)} · ${skShare(n.v,I)} of income`;
  const vs=skVs(n);body=`${vs?`<p class="dim skp" style="margin:0 0 8px">${K.act?'Of ':''}${vs}</p>`:''}${its.map(x=>row(nodeKey(x),x.name,x.v,x.c,n.v)).join('')}`;
  const k=nodeKey(n);foot=`${k&&k.startsWith('grp:')?`<button class="btn sm" data-act="flowDet" data-v="${k}">Transactions and trends</button>`:''}${!n.solo&&G?`<button class="btn g sm" data-act="skZoom" data-n="${K.all.indexOf(G)}">Zoom in</button>`:''}${G&&G.go?`<button class="btn g sm" data-act="budv" data-v="build">Edit in Build budget</button>`:G&&G.tab?`<button class="btn g sm" data-act="tab" data-t="${G.tab}">Open ${G.tab==='loans'?'Loans':'Goals'}</button>`:''}`}
 c.innerHTML=`<div class="skc-h"><span><i style="background:${n.c}"></i><b>${esc(n.name)}</b></span><button type="button" class="x" data-act="skX" aria-label="Close">×</button></div><div class="skc-v">${f0(n.v)}<small>${sub}</small></div><div class="skc-b">${body}</div>${foot?`<div class="skc-f">${foot}</div>`:''}`;
 c.hidden=false;const s=$('#sk svg');s&&s.querySelectorAll('.nd').forEach(x=>x.classList.toggle('sel',K.all[+x.dataset.n]===n));
 skPlace(c,skAt(n)||at);c.querySelector('[data-act="skX"]').focus({preventScroll:true})}
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
function openD(o){DLG=o;$('#dt').textContent=o.title;$('#ds').textContent=o.sub||'';$('#dsel').innerHTML=o.sel?`<label class="f" style="margin-bottom:12px">${esc(o.selLab||'Choose')}<select class="in" id="dsl2">${o.sel.map(x=>`<option value="${x.v}"${x.v===o.selV?' selected':''}>${esc(x.l)}</option>`).join('')}</select></label>`:'';
 $('#da').value=o.amt!=null?fmtAmt(r2(o.amt)):'';$('#dc').innerHTML=(o.chips||[]).map(c=>`<button type="button" data-v="${c.v}">${esc(c.l)}</button>`).join('');$('#ddel').hidden=!o.del;$('#dok').textContent=o.ok||'Save';dprev();$('#dlg').showModal();setTimeout(()=>{$('#da').focus();$('#da').select()},30)}
function dprev(){const e=$('#dp');e.innerHTML=DLG&&DLG.prev?DLG.prev(num($('#da').value),$('#dsl2')?.value):''}
$('#da').addEventListener('input',dprev);
$('#dc').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;$('#da').value=b.dataset.v;dprev();$('#da').focus()});
$('#dsel').addEventListener('change',()=>{if(DLG&&DLG.onSel)DLG.onSel($('#dsl2').value);else dprev()});
$('#dform').addEventListener('submit',e=>{e.preventDefault();if(!DLG)return;const v=$('#da').value.trim();if(v===''){$('#da').focus();return}DLG.save(num(v),$('#dsl2')?.value);$('#dlg').close();commit()});
$('#ddel').addEventListener('click',()=>{if(DLG&&DLG.del){DLG.del();$('#dlg').close();commit()}});

// Hand-added loans: which bank payments count toward this loan (rules filing to l:<id>), like a bill's Link payment.
function loanLinkLine(l){if(!SRV||!bankSrc(l))return '';const R=rulesFor('l:'+l.id),n=Object.values(S.txd||{}).filter(x=>x.v==='l:'+l.id&&x.k===S.cur).length;
 return `<div class="llk"><small>${R.length?`Bank payments: <b>${esc(R.map(r=>titleC(r.p)).join(', '))}</b>${n?` · ${n} in ${mon(S.cur)}`:''}`:(l.acct?'Payments from checking to '+esc(l.link?l.link.inst:'this lender')+' count on their own. Link any other way you pay it.':'Link the payment from your bank and it’s logged for you each month.')}</small><span><button class="lnk" data-act="catTx" data-v="l:${l.id}">See payments</button><button class="lnk" data-act="lnkPay" data-kind="loan" data-id="${l.id}">${R.length?'Change':'Link payment'}</button></span></div>`}
function payDialog(id,extraLeft){const l=S.loans.find(x=>x.id===id)||S.loans[0];if(!l)return;const k=S.cur;if(k<l.start){toast(`${l.name} tracking starts ${labS(l.start)}`);return}
 const r=row(l,k);if(!r){toast(l.name+' is paid off');return}if(r.auto){toast(`${l.name} payments come from ${l.link?l.link.inst:'your bank'} automatically`);return}const mn=Math.min(l.min,r.open+r.int),cur=r.lg?r.pay:mn,left=totals().left;
 const chips=[{l:'Minimum',v:r2(mn)},{l:'+$100',v:r2(mn+100)},{l:'+$250',v:r2(mn+250)},{l:'+$500',v:r2(mn+500)},{l:'Round up',v:Math.ceil((mn+1)/100)*100}];if(left>1)chips.push({l:`+ left over (${f0(left)})`,v:r2(mn+left)});chips.push({l:'Pay it off',v:r2(r.open+r.int)});
 const fb=Object.values(S.txd||{}).filter(x=>x.v==='l:'+l.id&&x.k===k).reduce((a,x)=>a+x.amt,0);openD({title:`Log ${l.name} payment`,sub:`${lab(k)} · minimum ${f2(mn)} · balance ${f2(r.open)}${fb>0.004?` · includes ${f2(fb)} from your bank; enter the month’s total`:''}`,sel:S.loans.filter(x=>row(x,k)).map(x=>({v:x.id,l:`${x.name} (${x.apr}%)`})),selV:l.id,selLab:'Loan',onSel:v=>{$('#dlg').close();payDialog(v,extraLeft)},
  amt:extraLeft?r2(mn+extraLeft):cur,chips,ok:'Log payment',del:r.lg?()=>{delete MOW(k).pay[l.id]}:null,
  prev:a=>{if(!a)return 'Enter the amount you paid.';if(a<mn-0.005)return `That’s ${f2(mn-a)} under the minimum.`;const e=payEffect(l,k,a);return e.saved>0.005?`Paying ${f2(a-mn)} extra saves <b>${f2(e.saved)}</b> in interest${e.months>0?` and finishes <b>${mo(e.months)}</b> sooner`:''}.`:'Paying the minimum keeps you on schedule.'},
  save:a=>{MOW(k).pay[l.id]=r2(Math.min(a,r.open+r.int));const e=payEffect(l,k,a);toast(e.saved>0.5?`Logged. That saves ${f0(e.saved)} in interest.`:'Payment logged')}})}
function depDialog(id,amt){const g=S.goals.find(x=>x.id===id)||S.goals[0];if(!g)return;const k=S.cur,d=MO(k).dep[g.id],t=target(g),base=goalSaved(g)-(+d||0),left=totals().left;
 const gm=goalPlan(g,k),chips=[];if(gm>0)chips.push({l:`Planned (${f0(gm)})`,v:gm});[100,250,500,1000].forEach(v=>chips.push({l:f0(v),v}));if(left>1)chips.push({l:`Left over (${f0(left)})`,v:r2(left)});
 openD({title:`Save toward ${g.name}`,sub:`${lab(k)} · ${f0(base)} saved${t?' of '+f0(t):''}${gLinked(g)?' · for money outside the linked accounts':''}`,sel:S.goals.map(x=>({v:x.id,l:x.name})),selV:g.id,selLab:'Goal',onSel:v=>{$('#dlg').close();depDialog(v,amt)},
  amt:amt!=null?amt:(d!=null?d:gm||''),chips,ok:'Save deposit',del:d!=null?()=>{delete MOW(k).dep[g.id]}:null,
  prev:a=>{if(!t)return '';const s=base+a,p=Math.min(100,Math.round(s/t*100));const rem=t-s;return rem<=0?'<b>That completes the goal!</b>':`That brings you to <b>${p}%</b>, ${f0(rem)} to go.${goalMon(g,k)>0?` At ${f0(goalMon(g,k))}/month you’d finish around ${labS(addM(k,Math.ceil(rem/goalMon(g,k))))}.`:''}`},
  save:a=>{MOW(k).dep[g.id]=r2(a);toast(`Saved ${f0(a)} toward ${g.name}`)}})}

/* ---------- confetti ---------- */
function confetti(){if(RM)return;const cv=$('#fx'),x=cv.getContext('2d'),dpr=devicePixelRatio||1;cv.width=innerWidth*dpr;cv.height=innerHeight*dpr;x.scale(dpr,dpr);
 const cols=[C.pink,C.lime,C.butter,C.coral,C.lilac,C.aqua,C.sky],P=Array.from({length:150},()=>({x:innerWidth/2+(Math.random()-.5)*160,y:innerHeight*.35,vx:(Math.random()-.5)*14,vy:-Math.random()*13-4,r:Math.random()*Math.PI,vr:(Math.random()-.5)*.35,w:6+Math.random()*7,h:4+Math.random()*6,c:cols[Math.random()*cols.length|0]}));
 const t0=performance.now();(function f(t){x.clearRect(0,0,innerWidth,innerHeight);const age=t-t0;P.forEach(p=>{p.vy+=.38;p.vx*=.99;p.x+=p.vx;p.y+=p.vy;p.r+=p.vr;x.save();x.globalAlpha=Math.max(0,1-age/2200);x.translate(p.x,p.y);x.rotate(p.r);x.fillStyle=p.c;x.fillRect(-p.w/2,-p.h/2,p.w,p.h);x.restore()});if(age<2200)requestAnimationFrame(f);else x.clearRect(0,0,innerWidth,innerHeight)})(t0)}
