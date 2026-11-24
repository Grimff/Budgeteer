'use strict';
// budget's shared state: top-level let/var other files read or reassign. Its code is the ES module app/src/lib/budget.js,
// loaded right after this file as dist/budget.js (tools/build.js), which puts its functions and constants on the global object.
let FSC=false,FR=(()=>{try{return localStorage.getItem('pfb_fr')||'24'}catch(_){return '24'}})(),WFS={inc:0,cost:0,extra:0},FCT=null,FDK=null;
let SB=[0,0,0,0];
