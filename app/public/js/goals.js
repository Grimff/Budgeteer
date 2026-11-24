'use strict';
// goals's shared state: top-level let/var other files read or reassign. Its code is the ES module app/src/lib/goals.js,
// loaded right after this file as dist/goals.js (tools/build.js), which puts its functions and constants on the global object.
let GR=(()=>{try{return localStorage.getItem('pfb_gr')||'2y'}catch(_){return '2y'}})();
