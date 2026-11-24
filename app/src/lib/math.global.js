// Entry for dist/math.js: runs the module where js/math.js used to run and puts its exports on the global object.
import * as M from './math.js';
Object.assign(globalThis, M);
