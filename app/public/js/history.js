'use strict';
// history's shared state: top-level let/var other files read or reassign. Its code is the ES module app/src/lib/history.js,
// loaded right after this file as dist/history.js (tools/build.js), which puts its functions and constants on the global object.
let HR=(()=>{try{return localStorage.getItem('pfb_hr')||'6'}catch(_){return '6'}})();
