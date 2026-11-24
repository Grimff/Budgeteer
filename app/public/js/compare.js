'use strict';
// compare's shared state: top-level let/var other files read or reassign. Its code is the ES module app/src/lib/compare.js,
// loaded right after this file as dist/compare.js (tools/build.js), which puts its functions and constants on the global object.
let FD=null;
