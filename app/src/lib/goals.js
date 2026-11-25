// goals: the code of what was app/public/js/goals.js (unchanged but for imports, `export`, the shared state's setters and
// startGoals(), which holds what used to run as the file loaded).
// Shared state (other files change it with the set… functions; it was js/goals.js):
export let GR=(()=>{try{return localStorage.getItem('pfb_gr')||'2y'}catch(_){return '2y'}})(); export function setGR(v){return GR=v}
/* ---------- render: goals ---------- */
// Goal timeline: % of target by month for each goal with a target (history from 6 months back, projection after).

export function startGoals() { }   // nothing ran at load
