// The budget store (phase 3, step 3): a thin layer over the global S. S stays where it is (the classic scripts and the
// handlers read and write it directly); the store adds a version that moves on whenever the page redraws, and the
// components that use useBudget() re-render then. renderAll's frame step (frameUIR) calls changed() first thing, so
// every commit() and every view switch reaches the subscribers, synchronously, before the tab itself is drawn.
// The frame subscribes now; the tab screens move onto it one by one (real re-renders instead of fresh roots).
import { useSyncExternalStore } from 'react';
import { flushSync } from 'react-dom';

let V = 0;
const subs = new Set();
export const subscribe = f => { subs.add(f); return () => subs.delete(f); };
export const version = () => V;
// Something changed: subscribers re-render now (flushSync, so they're done before the caller goes on).
export function changed() { V++; flushSync(() => subs.forEach(f => f())); }
export const useBudget = () => { useSyncExternalStore(subscribe, version); return S; };
