'use strict';
// linked-loans's shared state: top-level let/var other files read or reassign. Its code is the ES module app/src/lib/linked-loans.js,
// loaded right after this file as dist/linked-loans.js (tools/build.js), which puts its functions and constants on the global object.
let LASTOPEN=0;
let BV=null,FLF='all',FLN=50;
