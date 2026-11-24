'use strict';
// server-sync's shared state: top-level let/var other files read or reassign. Its code is the ES module app/src/lib/server-sync.js,
// loaded right after this file as dist/server-sync.js (tools/build.js), which puts its functions and constants on the global object.
let SRV=false;
