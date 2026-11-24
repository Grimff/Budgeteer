'use strict';
// events's shared state: top-level let/var other files read or reassign. Its code is the ES module app/src/lib/events.js,
// loaded right after this file as dist/events.js (tools/build.js), which puts its functions and constants on the global object.
let inT;
let RESTORING=false;
