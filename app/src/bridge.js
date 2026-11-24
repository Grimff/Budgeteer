// How the React screens plug into the rest of the app (see CLAUDE.md, "React screens").
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';

// Draw a React tree into el the way `el.innerHTML = …` did: the old content is thrown away and built fresh, at once
// (flushSync), so code that runs right after a draw (focus restore by data-key, scrolling, fmtAll) finds the new
// elements, and open folds, inputs and selects start from what the screen says, exactly as before.
// The previous root is dropped rather than unmounted: the screens are pure (no effects or subscriptions), and other
// code may have replaced the content in between, which would make an unmount fail.
export function draw(el, node) {
  if (!el) return;
  el.textContent = '';
  const r = createRoot(el);
  flushSync(() => r.render(node));
}

// A persistent root (phase 3, step 3, piece 3): the first call mounts, later calls re-render in place, so elements
// stay (focus stays on a clicked button). After each render, resync() puts back what a fresh draw used to reset and a
// re-render doesn't: folds open or shut, field values / ticks / choices, `hidden`, and scroll positions, all as the
// screen says now. liveReset() drops the root (the parity check, whose old-draw side overwrites the container).
const ROOTS = new WeakMap();
export function live(el, node) {
  if (!el) return;
  let r = ROOTS.get(el);
  if (!r) { el.textContent = ''; r = createRoot(el); ROOTS.set(el, r); }
  flushSync(() => r.render(node));
  resync(el);
}
export function liveReset(el) { const r = el && ROOTS.get(el); if (r) { ROOTS.delete(el); try { r.unmount(); } catch (_) { } el.textContent = ''; } }
const propsOf = el => { for (const k in el) if (k.startsWith('__reactProps$')) return el[k]; return null; };
const otherRoot = el => { for (const k in el) if (k.startsWith('__reactContainer$')) return true; return false; };
export function resync(root) {
  const walk = el => {
    for (let c = el.firstElementChild; c; c = c.nextElementSibling) {
      if (otherRoot(c)) continue;   // drawn by its own root (the money-flow chart, a dialog part): not ours
      const p = propsOf(c);
      if (p) {
        const t = c.tagName;
        if (t === 'DETAILS') { if (c.open !== !!p.open) c.open = !!p.open; }
        else if (t === 'INPUT' || t === 'TEXTAREA') {
          if (c.type === 'checkbox' || c.type === 'radio') { if (!('checked' in p) && c.checked !== !!p.defaultChecked) c.checked = !!p.defaultChecked; }
          else if (c.type !== 'file' && !('value' in p)) { const v = p.defaultValue == null ? '' : String(p.defaultValue); if (c.value !== v) c.value = v; }
        } else if (t === 'SELECT' && !('value' in p)) {
          const o = [...c.options], want = p.defaultValue == null ? null : String(p.defaultValue);
          let i = want == null ? o.findIndex(x => x.defaultSelected) : o.findIndex(x => x.value === want); if (i < 0) i = 0;
          if (o.length && c.selectedIndex !== i) c.selectedIndex = i;
        }
        if (c instanceof HTMLElement && c.hidden !== !!p.hidden) c.hidden = !!p.hidden;
      }
      if (c.scrollTop) c.scrollTop = 0;
      if (c.scrollLeft) c.scrollLeft = 0;
      walk(c);
    }
  };
  walk(root);
}

// Text as the old screens printed it with esc(): null/undefined → '', and U+FFFD (a bad byte from a bank) removed.
// React escapes the rest itself.
export const tx = s => String(s ?? '').replace(/�/g, '');

// The old draw functions are replaced by name, so every caller (renderAll, click handlers, other screens) now draws
// the React screen. The old ones are kept in LEGACY only for the parity check, until the move to React is done.
// (A top-level function in a classic script is a writable property of window, so assigning it here changes what the
// name means everywhere.)
export const LEGACY = {};
export function replaceScreen(name, fn) {
  if (typeof window[name] !== 'function') throw new Error('No screen function ' + name);
  LEGACY[name] = window[name];
  window[name] = fn;
}

// Click handlers on elements (phase 3). onAct('x') runs ACT.x (actions.js) with the element's data-* values, the element
// and the native click, setting INB (inside Build budget) as the old delegated listener did.
import { ACT } from './actions.js';
export const onAct = name => e => {
  // only the innermost element with an action handles a click (a Delete button inside a row that opens), as the
  // old switch did with closest('[data-act]'); the click still reaches document (clicking elsewhere closes the flow card)
  if (e.nativeEvent.rx) return;
  const b = e.currentTarget; e.nativeEvent.rx = true; INB = !!b.closest('[data-build]');
  // a click outside the money-flow card closes it before the action runs (the action may redraw the card)
  if (!b.closest('#skc') && !b.closest('dialog') && $('#skc:not([hidden])')) skClose();
  e.nativeEvent.skDone = true;
  ACT[name](b.dataset, b, e.nativeEvent);
};

// Field handlers (phase 3): typing (onInput={onInp}) and change (ref={onChg}, the native change event, so text and
// month fields still fire when the value is committed, not on every key). Each runs the first handler that applies
// to the field's data-* values, in the old listeners' order (ORDER_INP / ORDER_CHG in actions.js). The amount-formatting
// input listener in events.js still runs for every field.
import { INP, CHG, ORDER_INP, ORDER_CHG } from './actions.js';
export const onInp = e => {
  const t = e.currentTarget, d = t.dataset, h = ORDER_INP.find(([, f]) => f(d, t));
  INB = !!t.closest('[data-build]');
  if (h) INP[h[0]](t, d, e.nativeEvent);
};
const chg = e => {
  const t = e.currentTarget, d = t.dataset, h = ORDER_CHG.find(([, f]) => f(d, t));
  INB = !!t.closest('[data-build]');
  if (h) CHG[h[0]](t, d, e);
};
export const onChg = el => { if (el && !el._chg) { el._chg = true; el.addEventListener('change', chg); } };
