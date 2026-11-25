// Static checks for the app (app/public/index.html and the code in app/src). Run after every edit and before every release:
//   node tools/check.js
// Catches the mistakes that have slipped through before:
//  - syntax errors and stray control characters (a heredoc once turned \b into a backspace)
//  - two click actions with the same name in ACT (app/src/actions.js; a JS object keeps only the last, like the old
//    switch's second `case`: v5's schedule Remove ran the accounts card's alDel, so nothing was removed)
//  - buttons whose data-act / onAct('x') has no handler
//  - the same data-k / data-c / data-live key handled twice
//  - another field kind handled inside the data-c handler (CHG.c), or CHG.c not last in ORDER_CHG: it would never run
//    (v5: schedule dropdowns didn't save because their handler sat after `if(!d.c)return;`)
'use strict';
const fs = require('fs'), path = require('path');
// The app is one script, dist/app.js, built by tools/build.js from app/src (main.jsx and everything it imports).
const PUB = path.join(__dirname, '..', 'app', 'public'), html = fs.readFileSync(path.join(PUB, 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m => m[1]);
const bad = [];
if (scripts.join() !== 'dist/app.js') bad.push('index.html must load only dist/app.js (it loads: ' + (scripts.join(', ') || 'nothing') + ')');
if (fs.existsSync(path.join(PUB, 'js'))) bad.push('app/public/js/ is gone (the code is app/src/lib); remove it');
const SRC = path.join(__dirname, '..', 'app', 'src'), jsx = {};
(function walk(d) { for (const f of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, f.name); if (f.isDirectory()) walk(p); else if (/\.jsx?$/.test(f.name)) jsx[path.relative(path.join(SRC, '..'), p)] = fs.readFileSync(p, 'utf8'); } })(SRC);
// syntax: each file parsed as the module it is (esbuild, from npm install; tools/build.js parses them all anyway)
let esb = null; try { esb = require('esbuild'); } catch (_) { }
if (esb) for (const [f, t] of Object.entries(jsx)) try { esb.transformSync(t, { loader: f.endsWith('.jsx') ? 'jsx' : 'js', jsx: 'automatic', format: 'esm' }); } catch (e) { bad.push(`Syntax in ${f}: ${(e.errors && e.errors[0] && e.errors[0].text) || e.message}`); }
const lib = Object.entries(jsx).filter(([f]) => f.startsWith('src/lib/')).map(([, t]) => t).join('\n'), s = html + Object.values(jsx).join('\n');
for (const [f, t] of [['index.html', html], ['css/app.css', fs.readFileSync(path.join(PUB, 'css', 'app.css'), 'utf8')], ...Object.entries(jsx)]) {
  const ctl = [...t].filter(c => c.charCodeAt(0) < 32 && !'\n\r\t'.includes(c)).length;
  if (ctl) bad.push(`${ctl} control character(s) in ${f}`);
}

// Click actions: ACT's keys in actions.js (plus the aliases set after it, `ACT.x = ACT.y`).
const A = jsx['src/actions.js'] || '', actBody = A.slice(A.indexOf('export const ACT = {'), A.indexOf('\n};', A.indexOf('export const ACT = {')));
const cases = [...actBody.matchAll(/^  '([A-Za-z0-9_]+)': function \(d, b, e\) \{/gm), ...A.matchAll(/^ACT\.([A-Za-z0-9_]+) = ACT\./gm)].map(m => m[1]), count = {};
if (!cases.length) bad.push('No click actions found in app/src/actions.js (check.js needs updating)');
cases.forEach(c => count[c] = (count[c] || 0) + 1);
const dup = Object.entries(count).filter(([, n]) => n > 1).map(([c, n]) => `${c}×${n}`);
if (dup.length) bad.push('Duplicate click actions: ' + dup.join(', '));
const used = new Set([...s.matchAll(/data-act="([A-Za-z0-9_]+)"/g), ...Object.entries(jsx).filter(([f]) => f.endsWith('.jsx')).flatMap(([, t]) => [...t.matchAll(/onAct\('([A-Za-z0-9_]+)'\)/g)])].map(m => m[1]));
const orphan = [...used].filter(a => !count[a]);
if (orphan.length) bad.push('Buttons with no handler: ' + orphan.join(', '));

for (const [re, name] of [[/d\.k==='([A-Za-z0-9_]+)'/g, 'data-k'], [/d\.c==='([A-Za-z0-9_]+)'/g, 'data-c'], [/d\.live==='([A-Za-z0-9_]+)'/g, 'data-live']]) {
  const c = {}; [...(lib + A).matchAll(re)].forEach(m => c[m[1]] = (c[m[1]] || 0) + 1);
  const rep = Object.entries(c).filter(([, n]) => n > 1).map(([k, n]) => `${k}×${n}`);
  if (rep.length) bad.push(`Same ${name} handled twice: ` + rep.join(', '));
}

// Field change handlers: each kind is its own CHG entry, tried in ORDER_CHG's order; data-c ('c') must be last and only
// handle data-c fields.
{ const ci = A.indexOf("export const CHG = {"), cb = A.slice(ci, A.indexOf('\n};', ci)), cc = cb.slice(cb.indexOf("  'c': function (t, d, e) {"));
  const order = (A.match(/export const ORDER_CHG = \[(.*)\];/) || [])[1] || '', keys = [...order.matchAll(/\['([A-Za-z0-9_]+)',/g)].map(m => m[1]);
  if (ci < 0 || !keys.length || !cb.includes("  'c': function")) bad.push('Field change handlers not found (check.js needs updating)');
  else {
    if (keys[keys.length - 1] !== 'c') bad.push('The data-c change handler must be the last one tried (ORDER_CHG)');
    const other = [...new Set([...cc.matchAll(/\n\s*if\(d\.([a-zA-Z]+)\b/g)].map(m => m[1]).filter(k => k !== 'c'))];
    if (other.length) bad.push('Other field kinds handled inside the data-c handler (never reached): d.' + other.join(', d.'));
    const missing = [...cb.matchAll(/^  '([A-Za-z0-9_]+)': function/gm)].map(m => m[1]).filter(k => !keys.includes(k));
    if (missing.length) bad.push('Change handlers not in ORDER_CHG (never run): ' + missing.join(', '));
  }
}

if (bad.length) { console.log('FAIL\n - ' + bad.join('\n - ')); process.exit(1); }
console.log(`OK · ${cases.length} actions, ${used.size} buttons, no duplicates, change handlers in order` + (esb ? '' : ' (syntax not checked: run npm install)'));
