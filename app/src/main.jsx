// The React screens. Loaded by index.html after the other js files (which it uses by name: S, plan, f0, …) and
// before sample.js / server-sync.js, so the app starts with these screens in place.
import { draw, replaceScreen } from './bridge.js';
import { addParity, runParity, monthsToTry, emptyHousehold, withS, at } from './parity.js';
import { History } from './screens/History.jsx';

replaceScreen('renderHistory', () => draw($('#T-history'), <History />));

// Parity cases: the same data drawn both ways (self-test only).
const setHR = v => { const o = HR; HR = v; return () => { HR = o; }; };
addParity({
  name: 'History', fn: 'renderHistory', el: '#T-history', cases: () => {
    const c = [];
    for (const k of monthsToTry()) for (const r of ['6', '12', 'all']) c.push({ label: `${k} ${r}`, set: () => at(k, () => setHR(r)) });
    c.push({ label: 'folds open', set: () => { OPEN.add('h-' + addM(TK, -1)); OPEN.add('h-' + addM(TK, -2)); return () => { OPEN.delete('h-' + addM(TK, -1)); OPEN.delete('h-' + addM(TK, -2)); }; } });
    c.push({ label: 'history start set', set: () => { const o = S.histFrom; S.histFrom = addM(TK, -2); return () => { S.histFrom = o; }; } });
    c.push({ label: 'empty household', set: () => withS(emptyHousehold()) });
    return c;
  },
});
window.reactParity = runParity;
