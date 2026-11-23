// Action parity (phase 3, while the old click switch in events.js still exists): every element with a React click
// handler is clicked twice from the same state, once handled by the old switch (REACT_EVENTS = false) and once by its
// own handler, and what changed must be the same: the budget (S), the screen's state (views, open items, ranges, folds,
// what-ifs), open dialogs, the toast, the page's visible text and where the focus is. Part of the self-test.
// Random ids are seeded the same for both clicks, confirm() answers yes, scrolling and downloads do nothing, and
// actions that talk to the server (bank, backups, CSV, alerts test, save) are left out: they finish later.
import { fresh } from './parity.js';

const SCREENS = [];
// screen: {name, set(): undo?} — set draws the screen (renderAll or a view of it)
export const addActScreen = s => SCREENS.push(s);
const SKIP = new Set(['bankConnect', 'invAllow', 'bankSync', 'bankRemove', 'liabAllow', 'lnkAdd', 'bkList', 'bkRestore', 'cvImport', 'cvDel', 'ntTest', 'fsRetry', 'import', 'pick']);
const PER_ACT = 2;   // at most this many elements per action and screen
// The page's state globals (let bindings of the classic scripts, read and written by name).
const UI = ['BUDV', 'BSCOPE', 'SV', 'RQ', 'BV', 'FLF', 'FLQ', 'FLN', 'CT', 'CR', 'FD', 'ALE', 'FSC', 'FR', 'HR', 'LR', 'GR', 'WR', 'PX', 'PS', 'FDK', 'SEL', 'Z', 'ZW', 'ZH', 'WFS', 'CV', 'LK', 'DLG', 'BKP'];
const gv = n => (0, eval)(n);
const sv = (n, v) => { window.__apv = v; (0, eval)(n + '=window.__apv'); delete window.__apv; };
const clone = o => o === undefined ? undefined : JSON.parse(JSON.stringify(o));
const pfb = () => Object.keys(localStorage).filter(k => k.startsWith('pfb_')).sort().map(k => [k, localStorage.getItem(k)]);

function save() {
  return { S: clone(S), ui: UI.map(n => { const v = gv(n); return v && typeof v === 'object' && !(v instanceof Set) ? clone(v) : v; }), open: [...OPEN], bcl: [...BCL], nth: clone(NTH), wi: clone(WI), pv: { ...PV }, show: BK.show, ls: pfb() };
}
function restore(s) {
  S = clone(s.S); UI.forEach((n, i) => sv(n, s.ui[i] && typeof s.ui[i] === 'object' ? clone(s.ui[i]) : s.ui[i]));
  OPEN.clear(); s.open.forEach(x => OPEN.add(x)); BCL = new Set(s.bcl);
  for (const k of Object.keys(NTH)) delete NTH[k]; Object.assign(NTH, clone(s.nth));
  for (const k of Object.keys(WI)) delete WI[k]; Object.assign(WI, clone(s.wi));
  for (const k of Object.keys(PV)) delete PV[k]; Object.assign(PV, s.pv);
  BK.show = s.show;   // rows shown in To review (txMore)   // count-ups start from what they showed
  const now = new Map(pfb()); for (const [k] of now) localStorage.removeItem(k); for (const [k, v] of s.ls) localStorage.setItem(k, v);
  document.querySelectorAll('dialog[open]').forEach(d => d.close());
  const t = $('#toast'); t.classList.remove('on'); t.textContent = '';
  fresh();
}
const focusOf = () => { const a = document.activeElement; if (!a || a === document.body) return ''; return a.tagName + '|' + (a.id || a.dataset.key || a.dataset.act || '') + '|' + (a.closest('[id]') || {}).id; };
function capture() {
  return {
    S: JSON.stringify(S), ui: JSON.stringify(UI.map(n => { const v = gv(n); return v instanceof Set ? [...v] : v; })), open: [...OPEN].sort().join(','), bcl: [...BCL].sort().join(','),
    nth: JSON.stringify(NTH), wi: JSON.stringify(WI), show: String(BK.show), ls: JSON.stringify(pfb()), tab: S.tab,
    dialogs: [...document.querySelectorAll('dialog[open]')].map(d => d.id + ':' + d.innerText).join(' || '),
    toast: $('#toast').classList.contains('on') ? $('#toast').textContent : '', page: $('main').innerText, focus: focusOf(),
  };
}
// a seeded Math.random, so uid() gives the same ids in both runs
function seeded() { let x = 12345; return () => { x = (x * 1103515245 + 12345) % 2147483648; return x / 2147483648; }; }
// what can be clicked: shown on the page (hidden tabs keep their old content, which nobody can click)
const live = () => [...document.querySelectorAll('[data-act]')].filter(b => b.isConnected && b.getClientRects().length && hasReact(b));
const hasReact = el => { const k = Object.keys(el).find(k => k.startsWith('__reactProps$')); return !!(k && el[k].onClick); };

function stubs() {
  const o = { confirm: window.confirm, scrollTo: window.scrollTo, siv: Element.prototype.scrollIntoView, ac: HTMLAnchorElement.prototype.click, rnd: Math.random };
  window.confirm = () => true; window.scrollTo = () => {}; Element.prototype.scrollIntoView = () => {}; HTMLAnchorElement.prototype.click = () => {}; Math.random = seeded();
  return () => { window.confirm = o.confirm; window.scrollTo = o.scrollTo; Element.prototype.scrollIntoView = o.siv; HTMLAnchorElement.prototype.click = o.ac; Math.random = o.rnd; };
}
// An element's identity across redraws: its data-* values, and which one of those it is on the page.
const sigs = () => { const n = {}; return live().map(b => { const s = JSON.stringify({ ...b.dataset }); n[s] = (n[s] || 0) + 1; return { b, sig: s + '#' + n[s] }; }); };
// The elements to click on a screen: React-handled, by action, at most PER_ACT of each.
function targets() {
  const seen = {}, out = [];
  sigs().forEach(({ b, sig }) => { const a = b.dataset.act; if (SKIP.has(a)) return; seen[a] = (seen[a] || 0) + 1; if (seen[a] <= PER_ACT) out.push({ sig, act: a }); });
  return out;
}
function clickRun(base, sc, sig, react) {
  restore(base); const u = sc.set && sc.set();
  const t = sigs().find(x => x.sig === sig); if (!t) { try { u && u(); } catch (_) { } return { missing: sig }; }
  const b = t.b;
  const un = stubs(); let out;
  try { window.REACT_EVENTS = react; b.click(); out = capture(); }
  catch (e) { out = { error: String(e && e.message) }; }
  finally { window.REACT_EVENTS = true; un(); }
  try { u && u(); } catch (_) { }
  return out;
}
export const COVERED = new Set();   // actions clicked by some screen (to see what no screen reaches)
// part: [n, m] runs every m-th screen from the n-th (npm test runs four parts, each a page load of its own)
export function runActParity(part) {
  const out = [], base = save(), [pn, pm] = part || [1, 1];
  for (const sc of SCREENS.filter((x, i) => i % pm === pn - 1)) {
    const t0 = performance.now();
    restore(base); const u = sc.set && sc.set(); const T = targets(); try { u && u(); } catch (_) { }
    const fails = [];
    T.forEach(t => COVERED.add(t.act));
    T.forEach(({ sig, act }) => {
      if (/aplog/.test(location.search)) console.log('ap click', sc.name, sig);
      const A = clickRun(base, sc, sig, false), B = clickRun(base, sc, sig, true);
      const diff = Object.keys({ ...A, ...B }).filter(k => A[k] !== B[k]);
      if (A.missing || B.missing) fails.push(`${act}: not on the page again (${sig})`);
      const uiD = () => { const a = JSON.parse(A.ui), b = JSON.parse(B.ui); return UI.filter((n, i) => JSON.stringify(a[i]) !== JSON.stringify(b[i])).map(n => n + ' old ' + JSON.stringify(a[UI.indexOf(n)]).slice(0, 60) + ' new ' + JSON.stringify(b[UI.indexOf(n)]).slice(0, 60)).join(', '); };
      if (!A.missing && !B.missing && diff.length) fails.push(`${sig}: ${diff.map(k => k === 'ui' ? 'ui (' + uiD() + ')' : k + (k === 'page' || k === 'S' ? '' : ` old ${String(A[k]).slice(0, 80)} | new ${String(B[k]).slice(0, 80)}`)).join('; ')}`);
    });
    if (window.AP_LOG || /aplog/.test(location.search)) console.log('actparity', sc.name, T.length, Math.round(performance.now() - t0) + 'ms');
    out.push({ ok: !fails.length && T.length > 0, name: `React click handlers do what the old ones did: ${sc.name} (${T.length} clicks, ${new Set(T.map(t => t.act)).size} actions)`, detail: fails.length ? fails.length + ' differ: ' + fails.slice(0, 3).join(' ‖ ') : '' });
  }
  restore(base); renderAll();
  return out;
}
