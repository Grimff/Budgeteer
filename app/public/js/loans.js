'use strict';
// loans's shared state: top-level let/var other files read or reassign. Its code is the ES module app/src/lib/loans.js,
// loaded right after this file as dist/loans.js (tools/build.js), which puts its functions and constants on the global object.
let PX=null,PS=null;
let LR=(()=>{try{return localStorage.getItem('pfb_lr')||'all'}catch(_){return 'all'}})();
