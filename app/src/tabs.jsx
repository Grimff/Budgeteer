// The tab screens on the store (phase 3, step 3, piece 3): each tab section holds one persistent root, a TabScreen that
// subscribes to the store (useVersion) and to its own tick. It draws its screen:
// - when the store changes (every renderAll / commit) and its tab is the one showing: the visible tab follows the
//   budget; a hidden tab keeps what it showed, as before ("only the visible tab is drawn");
// - when its renderX is called by name (redraw), shown or not, as the old renderX drew into its section either way.
// Body is memo'd on a draw count, so nothing else re-renders a screen. After React is done (after the changed() or the
// redraw, never inside React's commit, where a nested flushSync wouldn't flush), each screen that drew gets resync()
// and its old after-draw step: This month → sankey(), Forecast → fcBody(), Bank → bankBadge().
import { memo, useLayoutEffect, useRef } from 'react';
import { tick, hasRoot, mountRoot, resync, drawStep } from './bridge.js';
import { useVersion, afterFlush } from './store.js';
import { History } from './screens/History.jsx';
import { Wealth } from './screens/Wealth.jsx';
import { Goals } from './screens/Goals.jsx';
import { Loans } from './screens/Loans.jsx';
import { Settings } from './screens/Settings.jsx';
import { Bank } from './screens/Bank.jsx';
import { ThisMonth } from './screens/Budget.jsx';
import { Forecast } from './screens/Forecast.jsx';
import { Build } from './screens/Build.jsx';
import { BK } from './lib/bank.js';
import { BUDV } from './lib/build.js';
import { S } from './lib/core.js';
import { SRV } from './lib/server-sync.js';
import { bankBadge, fcBody, sankey } from './named.jsx';

const TABS = ['budget', 'loans', 'goals', 'wealth', 'history', 'bank', 'settings'];
const TT = Object.fromEntries(TABS.map(t => [t, tick()]));   // per tab: redraw asked by name
const REQ = {};                                              // the Budget view asked by name (renderBuild / renderForecast)
const SCREEN = { loans: Loans, goals: Goals, wealth: Wealth, history: History, bank: Bank, settings: Settings };
const BUDGET = { month: ThisMonth, fc: Forecast, build: Build };
// Budget's view: the one asked by name, else what BUDV says (renderBudget's old dispatch).
const budView = v => v || (BUDV === 'build' ? 'build' : BUDV === 'fc' ? 'fc' : 'month');

let PEND = [];
function flush() {
  const p = PEND; PEND = [];
  for (const { t, view, el } of p) {
    resync(el);
    if (t === 'budget') { const v = budView(view); if (v === 'month') sankey(); else if (v === 'fc') fcBody(); }
    else if (t === 'bank') { if (SRV && BK.st && BK.st.configured) bankBadge(); }
  }
}
afterFlush(flush);

const Body = memo(function Body({ t, n, view, el }) {
  useLayoutEffect(() => { if (n) PEND.push({ t, view, el }); });
  if (!n) return null;   // mounted, not drawn yet
  drawStep();
  const C = t === 'budget' ? BUDGET[budView(view)] : SCREEN[t];
  return <C />;
});

function TabScreen({ t, el }) {
  const v = useVersion(), o = TT[t].use(), d = useRef({ v, o, n: 0, view: null }), c = d.current;
  if (o !== c.o) { c.o = o; c.v = v; c.n++; c.view = REQ[t] || null; }   // asked by name
  else if (v !== c.v) { c.v = v; if (S.tab === t) { c.n++; c.view = null; } }   // the store moved on
  return <Body t={t} n={c.n} view={c.view} el={el} />;
}

// renderX by name: mount the tab's root if it isn't there (first visit, or the parity check dropped it), then draw.
export function redraw(t, view) {
  const el = document.getElementById('T-' + t); if (!el) return;
  REQ[t] = view || null;
  if (!hasRoot(el)) mountRoot(el, <TabScreen t={t} el={el} />);
  TT[t].bump(); flush();
}
// renderAll's tab step: the store already drew the visible tab; only a tab with no root yet is drawn here.
export function drawTabR() { const el = document.getElementById('T-' + S.tab); if (el && !hasRoot(el)) redraw(TABS.includes(S.tab) ? S.tab : 'budget'); else if (!el) redraw('budget'); }
