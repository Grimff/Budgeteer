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
