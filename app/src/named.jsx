// The app's functions that other code calls by name and that are written in React (they used to be put on the global
// object by name with setGlobal): the tab screens' renderX, the pop-ups, the money-flow chart, the header pieces.
import { drawTabR, redraw } from './tabs.jsx';
import { draw } from './bridge.js';
import { FcBody, wfLiveR } from './screens/Forecast.jsx';
import { catRenderR, flowRenderR } from './popups/Category.jsx';
import { lnkListR, lnkRuleR } from './popups/Link.jsx';
import { openDR, dprevR } from './popups/Amount.jsx';
import { spFormR, spAddPartR } from './popups/Split.jsx';
import { compareViewR } from './flow/Compare.jsx';
import { zbarR, skTipR, skCardR } from './flow/Card.jsx';
import { sankeyR } from './flow/Sankey.jsx';
import { bankBadgeR, frameUIR, brandSetR } from './frame.jsx';
import { fsUIR } from './chrome.jsx';
import { rulesFilterR } from './screens/Settings.jsx';
import { pxLiveR, wiLiveR } from './screens/Loans.jsx';
import { runParity } from './parity.js';
import { FDK, FSC, setFSC } from './lib/budget.js';
import { RM, $ } from './lib/core.js';

// The tab screens are subscribed roots (tabs.jsx): renderAll's tab step only mounts a tab that has no root yet, and
// renderX by name redraws that tab now.
export function drawTab(...a) { return drawTabR(...a); }
export function renderHistory() { return redraw('history'); }
// Budget: This month is React; Build budget and Forecast are still drawn by renderBuild / renderForecast. The
// money-flow chart is drawn into #sk by sankey() afterwards, as before.
export function renderBudget() { return redraw('budget'); }
// Forecast: the frame, then the body into #fcb (the what-if sliders, range and month buttons redraw only the body);
// FSC: scroll the open schedule editor or the month detail into view after adding/opening.
export function fcBody() { const el = $('#fcb'); if (!el) return; draw(el, <FcBody />); if (FSC) { setFSC(false); const t = $('.fcle') || ($('.fcd') && FDK ? $('.fcd') : null); if (t) t.scrollIntoView({ block: 'nearest', behavior: RM ? 'auto' : 'smooth' }); } }
// Pop-ups (phase 2): drawn into the parts of their dialogs in index.html.
export function catRender(...a) { return catRenderR(...a); }
export function flowRender(...a) { return flowRenderR(...a); }
export function lnkList(...a) { return lnkListR(...a); }
export function lnkRule(...a) { return lnkRuleR(...a); }
export function openD(...a) { return openDR(...a); }
export function dprev(...a) { return dprevR(...a); }
export function spForm(...a) { return spFormR(...a); }
export function spAddPart(...a) { return spAddPartR(...a); }
export function compareView(...a) { return compareViewR(...a); }
export function zbar(...a) { return zbarR(...a); }
export function skTip(...a) { return skTipR(...a); }
export function skCard(...a) { return skCardR(...a); }
export function sankey(...a) { return sankeyR(...a); }
export function bankBadge(...a) { return bankBadgeR(...a); }
export function frameUI(...a) { return frameUIR(...a); }
export function brandSet(...a) { return brandSetR(...a); }
export function fsUI(...a) { return fsUIR(...a); }
export function renderBuild() { return redraw('budget', 'build'); }
export function renderForecast() { return redraw('budget', 'fc'); }
export function wfLive(...a) { return wfLiveR(...a); }
// bankBadge (the count on the Bank tab) ran at the end of the old renderBank once the bank was set up.
export function renderBank() { return redraw('bank'); }
export function renderSettings() { return redraw('settings'); }
export function rulesFilter(...a) { return rulesFilterR(...a); }
export function renderLoans() { return redraw('loans'); }
export function pxLive(...a) { return pxLiveR(...a); }
export function wiLive(...a) { return wiLiveR(...a); }
export function renderGoals() { return redraw('goals'); }
export function renderWealth() { return redraw('wealth'); }
export function reactParity(...a) { return runParity(...a); }
