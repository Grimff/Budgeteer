// The budget store (phase 3, step 3): a thin layer over the global S. S stays where it is (the classic scripts and the
// handlers read and write it directly); the store adds a version that moves on whenever the page redraws, and the
// components that use useBudget() re-render then: the page frame and the tab screens (tabs.jsx). renderAll's frame
// step (frameUIR) calls changed() first thing, so every commit() and view switch reaches them, synchronously.
// frameChanged(): the header alone (household name, Bank count), without redrawing the tab.
// afterFlush(f): runs f after every changed(), once React is done (tabs.jsx: resync and each screen's after-draw step).
import { useSyncExternalStore } from 'react';
import { flushSync } from 'react-dom';
import { S } from './lib/core.js';

let V = 0, FV = 0, after = () => { };
const subs = new Set(), fsubs = new Set();
export const subscribe = f => { subs.add(f); return () => subs.delete(f); };
const fsubscribe = f => { fsubs.add(f); return () => fsubs.delete(f); };
export const version = () => V;
export const afterFlush = f => { after = f; };
// Something changed: subscribers re-render now (flushSync, so they're done before the caller goes on).
export function changed() { V++; flushSync(() => subs.forEach(f => f())); after(); }
export function frameChanged() { FV++; flushSync(() => fsubs.forEach(f => f())); }
export const useBudget = () => { useSyncExternalStore(subscribe, version); return S; };
export const useVersion = () => useSyncExternalStore(subscribe, version);
export const useFrame = () => useSyncExternalStore(fsubscribe, () => FV);
