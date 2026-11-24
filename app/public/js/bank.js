'use strict';
// bank's shared state: top-level let/var other files read or reassign. Its code is the ES module app/src/lib/bank.js,
// loaded right after this file as dist/bank.js (tools/build.js), which puts its functions and constants on the global object.
let FLQ='';
let PSET=new Set();
let TXI=null;
let LK=null;
let CT=null;
let CR='month';
