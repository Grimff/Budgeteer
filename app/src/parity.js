// Parity check for the move to React: every React screen must draw exactly what the old string-built screen drew,
// for the same data. Runs in the self-test (?selftest, npm test) over many months and settings. Compares
//  1. the element tree: tags, attributes (style compared by its parsed properties, class as a set), input values and
//     checked/selected states, and text (whitespace collapsed);
//  2. the text as the browser shows it (innerText, all folds opened), which catches a missing space between inline
//     elements that 1 can't see.
import { draw, liveReset } from './bridge.js';
import * as NAMED from './named.jsx';
import { setTXI } from './lib/bank.js';
import { S, TK, addM, seedGoals, seedLoans, seedPlan, setS } from './lib/core.js';
import { renderAll } from './lib/events.js';
import { setALC } from './lib/goal-accounts.js';
import { loanSync } from './lib/linked-loans.js';
import { PV, setGP, setLP, setXS } from './lib/math.js';

const SCREENS = [];
// screen: {name, fn: 'renderX', el: '#T-x', also?: ['renderY'], dialog?: '#dlg' (opened while measured), call?(),
//          cases(): [{label, set?(): undo?, call?()}]; call draws (by name, fn swapped for the old one), default fn()
export const addParity = s => SCREENS.push(s);

function attrsOf(n) {
  const a = [];
  for (const x of n.attributes) {
    if (x.name === 'style') {
      const s = n.style, l = [];
      for (let i = 0; i < s.length; i++) { const p = s[i]; l.push(p + ':' + s.getPropertyValue(p).trim() + (s.getPropertyPriority(p) ? '!' : '')); }
      if (l.length) a.push('style="' + l.sort().join(';') + '"');
    } else if (x.name === 'class') {
      const c = x.value.trim().split(/\s+/).filter(Boolean).sort().join(' ');
      if (c) a.push('class="' + c + '"');
    } else a.push(x.name + '="' + x.value + '"');
  }
  a.sort();
  const t = n.tagName;
  if (t === 'INPUT' || t === 'SELECT' || t === 'TEXTAREA') a.push('.value=' + JSON.stringify(n.value));
  if (t === 'INPUT' && (n.type === 'checkbox' || n.type === 'radio')) a.push('.checked=' + n.checked);
  if (t === 'OPTION') a.push('.selected=' + n.selected);
  return a.join(' ');
}
// One line per element / text run, indented by depth.
function lines(el, d = 0, out = []) {
  let txt = '';
  const flush = () => { const t = txt.replace(/\s+/g, ' ').trim(); if (t) out.push(' '.repeat(d) + JSON.stringify(t)); txt = ''; };
  for (const n of el.childNodes) {
    if (n.nodeType === 3) { txt += n.data; continue; }
    if (n.nodeType !== 1) continue;
    flush();
    out.push(' '.repeat(d) + '<' + n.tagName.toLowerCase() + (n.attributes.length || /^(INPUT|SELECT|TEXTAREA|OPTION)$/.test(n.tagName) ? ' ' + attrsOf(n) : '') + '>');
    lines(n, d + 1, out);
  }
  flush();
  return out;
}
// Toggle events from the copy below must not reach the app's listener (it remembers which folds are open).
let guard = false;
function shownText(el) {
  if (!guard) { guard = true; window.addEventListener('toggle', e => { if (e.target.closest && e.target.closest('.parity-box')) e.stopImmediatePropagation(); }, true); }
  const box = el.cloneNode(true);
  box.removeAttribute('id'); box.hidden = false; box.classList.add('parity-box');
  box.querySelectorAll('details').forEach(d => { d.open = true; });
  box.querySelectorAll('[id]').forEach(e => e.removeAttribute('id'));
  el.parentNode.insertBefore(box, el.nextSibling);
  const t = box.innerText;
  box.remove();
  return t;
}
const snap = el => ({ tree: lines(el), text: shownText(el) });
function diff(A, B) {
  const n = Math.max(A.tree.length, B.tree.length);
  for (let i = 0; i < n; i++) if (A.tree[i] !== B.tree[i]) {
    // the line's parents, for context
    const path = [], d = (A.tree[i] || B.tree[i] || '').search(/\S/);
    for (let j = i - 1, want = d - 1; j >= 0 && want >= 0; j--) if (A.tree[j].search(/\S/) === want) { path.unshift(A.tree[j].trim().slice(0, 60)); want--; }
    return `at ${path.join(' › ') || 'top'}: old ${(A.tree[i] || '(nothing)').trim().slice(0, 240)} | new ${(B.tree[i] || '(nothing)').trim().slice(0, 240)}`;
  }
  if (A.text !== B.text) {
    let i = 0; while (A.text[i] === B.text[i]) i++;
    return `shown text differs at …${JSON.stringify(A.text.slice(Math.max(0, i - 40), i))}: old ${JSON.stringify(A.text.slice(i, i + 40))} | new ${JSON.stringify(B.text.slice(i, i + 40))}`;
  }
  return '';
}
// The caches renderAll clears before every draw.
export function fresh() { setLP({}); setGP({}); setXS(null); setTXI(null); setALC({}); loanSync(); }

// A piece of a screen that a whole-screen case can't reach (e.g. hidden in sample mode): its component drawn into a
// scratch tab for each case, in the snapshot record (paritySnap). piece: {name, node(): element, cases(): [{label, set?}]}
const PIECES = [];
export const addPiece = p => PIECES.push(p);

// The tab screens (live: true) re-render in place: for each, every case is drawn fresh (a new root), then one root is
// re-rendered through all the cases in a row and must give the same result each time (resync, keys, chart state).
export function runParity() {
  const out = [], keep = { S, cur: S.cur };
  for (const sc of SCREENS) {
    if (!sc.live) continue;
    const fresh1 = [], fails = [];
    for (const c of sc.cases()) {
      let undo;
      try {
        undo = c.set && c.set();
        const el = document.querySelector(sc.el);
        // count-ups (cu) remember what they showed last; both draws start from the same memory
        const pv = { ...PV }, call = c.call || sc.call || (() => NAMED[sc.fn]());
        liveReset(el); fresh(); call(); fresh1.push({ c, B: snap(el), pv });
      } catch (e) { fails.push(c.label + ' crashed: ' + (e.stack || e.message)); }
      finally { try { if (undo) undo(); } catch (_) { } }
    }
    const el0 = document.querySelector(sc.el), rf = [...fails]; liveReset(el0);
    for (const { c, B, pv } of fresh1) {
      let undo;
      try {
        undo = c.set && c.set(); const el = document.querySelector(sc.el);
        for (const k of Object.keys(PV)) delete PV[k]; Object.assign(PV, pv);
        fresh(); (c.call || sc.call || (() => NAMED[sc.fn]()))();
        const d = diff(B, snap(el)); if (d) rf.push(c.label + ' ' + d);
      } catch (e) { rf.push(c.label + ' crashed: ' + (e.stack || e.message)); }
      finally { try { if (undo) undo(); } catch (_) { } }
    }
    out.push({ ok: !rf.length && fresh1.length > 0, name: `React ${sc.name} screen re-rendered in place through every case matches a fresh draw (${fresh1.length} cases)`, detail: rf.length ? rf.length + ' differ: ' + rf.slice(0, 3).join(' ‖ ') : '' });
  }
  setS(keep.S); S.cur = keep.cur;
  fresh(); renderAll();
  return out;
}

// Every case drawn by the current code alone, as the snapshot the comparison uses ({'screen | case': snap JSON}): a record
// to compare two builds with (e.g. before and after old code is removed). Sample mode only (window.__paritySnap).
export function paritySnap() {
  const out = {}, keep = { S, cur: S.cur }, put = (k, v) => { let x = k, i = 2; while (x in out) x = k + ' #' + i++; out[x] = v; };
  for (const sc of SCREENS) for (const c of sc.cases()) {
    let undo;
    try {
      undo = c.set && c.set();
      const el = document.querySelector(sc.el), dlg = sc.dialog && document.querySelector(sc.dialog), shut = dlg && !dlg.open; if (shut) dlg.show();
      try { liveReset(el); fresh(); (c.call || sc.call || (() => NAMED[sc.fn]()))(); put(sc.name + ' | ' + c.label, JSON.stringify(snap(el))); }
      finally { if (shut) dlg.close(); }
    } catch (e) { put(sc.name + ' | ' + c.label, 'crashed: ' + (e.stack || e.message)); }
    finally { try { if (undo) undo(); } catch (_) { } }
  }
  for (const pc of PIECES) {
    const el = document.createElement('section'); el.className = 'tab parity-scratch'; document.querySelector('main').appendChild(el);
    for (const c of pc.cases()) {
      let undo;
      try { undo = c.set && c.set(); fresh(); draw(el, pc.node()); put('piece ' + pc.name + ' | ' + c.label, JSON.stringify(snap(el))); }
      catch (e) { put('piece ' + pc.name + ' | ' + c.label, 'crashed: ' + (e.stack || e.message)); }
      finally { try { if (undo) undo(); } catch (_) { } }
    }
    el.remove();
  }
  setS(keep.S); S.cur = keep.cur; fresh(); renderAll();
  return out;
}

// Helpers for the cases.
// Every month from a year before the budget's first month to 3 months ahead.
export function monthsToTry() {
  let lo = TK;
  [...Object.keys(S.plans), ...Object.keys(S.months)].forEach(k => { if (k < lo) lo = k; });
  const out = [];
  for (let k = addM(lo, -1); k <= addM(TK, 3); k = addM(k, 1)) out.push(k);
  return out;
}
// A household with nothing set up yet (the first visit).
export const emptyHousehold = () => ({ plans: { [TK]: seedPlan() }, loans: seedLoans(), goals: seedGoals(), months: {}, cur: TK, tab: S.tab, flow: 'plan' });
// Run with S replaced; returns the undo.
export function withS(obj) { const old = S; setS(obj); return () => { setS(old); }; }
// Set S.cur (and anything else) for one case; returns the undo.
export function at(k, more) { const old = S.cur; S.cur = k; const u = more && more(); return () => { if (u) u(); S.cur = old; }; }
