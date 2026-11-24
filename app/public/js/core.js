'use strict';
// core's shared state: top-level let/var other files read or reassign. Its code is the ES module app/src/lib/core.js,
// loaded right after this file as dist/core.js (tools/build.js), which puts its functions and constants on the global object.
let S;
let saveT,AUTOSAVE=false;
