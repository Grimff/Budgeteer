// Parity check for the move to React: every React screen must draw exactly what the old string-built screen drew,
// for the same data. Runs in the self-test (?selftest, npm test) over many months and settings. Compares
//  1. the element tree: tags, attributes (style compared by its parsed properties, class as a set), input values and
//     checked/selected states, and text (whitespace collapsed);
//  2. the text as the browser shows it (innerText, all folds opened), which catches a missing space between inline
//     elements that 1 can't see.
import { LEGACY, draw, liveReset } from './bridge.js';

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
export function fresh() { LP = {}; GP = {}; XS = null; TXI = null; ALC = {}; loanSync(); }

// A piece of a screen that a whole-screen case can't reach (e.g. hidden in sample mode): its old string function and
// its component are each drawn into a scratch tab and compared the same way. piece: {name, html(): string,
// node(): element, cases(): [{label, set?}]}
const PIECES = [];
export const addPiece = p => PIECES.push(p);
function runPieces(out) {
  for (const pc of PIECES) {
    let n = 0; const fails = [];
    const el = document.createElement('section'); el.className = 'tab parity-scratch'; document.querySelector('main').appendChild(el);
    for (const c of pc.cases()) {
      let undo;
      try {
        undo = c.set && c.set();
        fresh(); el.innerHTML = pc.html(); const A = snap(el);
        fresh(); draw(el, pc.node()); const B = snap(el);
        n++;
        const d = diff(A, B);
        if (d) fails.push(c.label + ' ' + d);
      } catch (e) { fails.push(c.label + ' crashed: ' + (e.stack || e.message)); }
      finally { try { if (undo) undo(); } catch (_) { } }
    }
    el.remove();
    out.push({ ok: !fails.length && n > 0, name: `React ${pc.name} draws what the old one did (${n} cases)`, detail: fails.length ? fails.length + ' differ: ' + fails.slice(0, 3).join(' ‖ ') : '' });
  }
}

export function runParity() {
  const out = [], keep = { S, cur: S.cur };
  for (const sc of SCREENS) {
    let n = 0; const fails = [], fresh1 = [];
    for (const c of sc.cases()) {
      let undo;
      try {
        undo = c.set && c.set();
        const el = document.querySelector(sc.el);
        // a pop-up's text only shows while its dialog is open
        const dlg = sc.dialog && document.querySelector(sc.dialog), shut = dlg && !dlg.open; if (shut) dlg.show();
        try {
        // count-ups (cu) remember what they showed last; both draws start from the same memory
        const pv = { ...PV }, back = () => { for (const k of Object.keys(PV)) delete PV[k]; Object.assign(PV, pv); };
        // also: old functions the old screen calls by name (renderForecast → fcBody) are the old ones while it draws
        // call: how a case draws (a dialog opener called by name with its options); default sc.fn()
        const call = c.call || sc.call || (() => window[sc.fn]());
        const sw = [sc.fn, ...(sc.also || [])].map(n => [n, window[n]]); sw.forEach(([n]) => { window[n] = LEGACY[n]; });
        liveReset(el);   // a persistent root (live) would be overwritten by the old draw
        try { fresh(); call(); } finally { sw.forEach(([n, f]) => { window[n] = f; }); }
        const A = snap(el);
        back(); fresh(); call(); const B = snap(el);
        if (sc.live) fresh1.push({ c, B, pv });
        n++;
        const d = diff(A, B);
        if (d) fails.push(c.label + ' ' + d);
        } finally { if (shut) dlg.close(); }
      } catch (e) { fails.push(c.label + ' crashed: ' + (e.stack || e.message)); }
      finally { try { if (undo) undo(); } catch (_) { } }
    }
    // live screens: one root re-rendered through every case in a row (no remount) must give what a fresh draw gave
    if (sc.live) {
      const el0 = document.querySelector(sc.el), rf = []; liveReset(el0);
      for (const { c, B, pv } of fresh1) {
        let undo;
        try {
          undo = c.set && c.set(); const el = document.querySelector(sc.el);
          for (const k of Object.keys(PV)) delete PV[k]; Object.assign(PV, pv);
          fresh(); (c.call || sc.call || (() => window[sc.fn]()))();
          const d = diff(B, snap(el)); if (d) rf.push(c.label + ' ' + d);
        } catch (e) { rf.push(c.label + ' crashed: ' + (e.stack || e.message)); }
        finally { try { if (undo) undo(); } catch (_) { } }
      }
      out.push({ ok: !rf.length && fresh1.length > 0, name: `React ${sc.name} screen re-rendered in place through every case matches a fresh draw (${fresh1.length} cases)`, detail: rf.length ? rf.length + ' differ: ' + rf.slice(0, 3).join(' ‖ ') : '' });
    }
    out.push({ ok: !fails.length && n > 0, name: `React ${sc.name}${sc.dialog ? '' : ' screen'} draws what the old one did (${n} cases)`, detail: fails.length ? fails.length + ' differ: ' + fails.slice(0, 3).join(' ‖ ') : '' });
  }
  runPieces(out);
  S = keep.S; S.cur = keep.cur;
  fresh(); renderAll();
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
export function withS(obj) { const old = S; S = obj; return () => { S = old; }; }
// Set S.cur (and anything else) for one case; returns the undo.
export function at(k, more) { const old = S.cur; S.cur = k; const u = more && more(); return () => { if (u) u(); S.cur = old; }; }
