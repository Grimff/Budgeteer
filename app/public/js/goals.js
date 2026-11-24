'use strict';
/* ---------- render: goals ---------- */
// Goal timeline: % of target by month for each goal with a target (history from 6 months back, projection after).
let GR=(()=>{try{return localStorage.getItem('pfb_gr')||'2y'}catch(_){return '2y'}})();
