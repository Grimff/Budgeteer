'use strict';
// math's shared state: top-level let/var other files read or reassign. Its code is the ES module app/src/lib/math.js,
// loaded right after this file as dist/math.js (tools/build.js), which puts its functions and constants on the global object.
let LP={};
let GP={};
let WF={inc:0,cost:0,extra:0};
let XS=null,NOX=false;
let toastT;
let BCL=new Set();
