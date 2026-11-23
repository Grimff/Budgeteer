// Static checks for the app (app/public: index.html and the js/ files it loads). Run after every edit and before every release:
//   node tools/check.js
// Catches the mistakes that have slipped through before:
//  - syntax errors and stray control characters (a heredoc once turned \b into a backspace)
//  - two `case'name':` with the same name in the click switch (v5: the schedule's Remove ran the
//    accounts card's alDel, so nothing was removed)
//  - buttons whose data-act has no handler
//  - the same data-k / data-c / data-live key handled twice
//  - change handlers placed after `if(!d.c)return;`, which never run (v5: schedule dropdowns didn't save)
'use strict';
const fs = require('fs'), path = require('path');
// The app's scripts are the js/ files index.html lists, run in that order in one shared scope; checked as one.
const PUB = path.join(__dirname, '..', 'app', 'public'), html = fs.readFileSync(path.join(PUB, 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m => m[1]);
// dist/app.js is the React screens' bundle (built from app/src by tools/build.js); it's checked as its sources below.
const files = scripts.filter(f => !f.startsWith('dist/'));
const bad = [];
if (!files.length) bad.push('No <script src> files found in index.html');
{ const r = scripts.indexOf('dist/app.js');
  if (r < 0) bad.push('index.html must load dist/app.js (the React screens)');
  else if (!(r > scripts.indexOf('js/events.js') && r < scripts.indexOf('js/sample.js'))) bad.push('dist/app.js must load after js/events.js and before js/sample.js'); }
// The React screens' sources (app/src): their buttons count, and they get the control-character check.
const SRC = path.join(__dirname, '..', 'app', 'src'), jsx = {};
(function walk(d) { for (const f of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, f.name); if (f.isDirectory()) walk(p); else if (/\.jsx?$/.test(f.name)) jsx[path.relative(path.join(SRC, '..'), p)] = fs.readFileSync(p, 'utf8'); } })(SRC);
const onDisk = fs.readdirSync(path.join(PUB, 'js')).filter(f => f.endsWith('.js')).map(f => 'js/' + f);
const unlisted = onDisk.filter(f => !files.includes(f));
if (unlisted.length) bad.push('js/ files not loaded by index.html: ' + unlisted.join(', '));
const src = {}; files.forEach(f => { src[f] = fs.readFileSync(path.join(PUB, f), 'utf8'); });
const js = files.map(f => src[f].replace(/^'use strict';\n/, '')).join('\n'), s = html + js + Object.values(jsx).join('\n');
try { new Function("'use strict';\n" + js); } catch (e) { bad.push('Syntax: ' + e.message); }
for (const f of files) try { new Function(src[f]); } catch (e) { bad.push(`Syntax in ${f}: ${e.message}`); }
for (const f of files) if (!src[f].startsWith("'use strict';")) bad.push(`${f} must start with 'use strict';`);
for (const [f, t] of [['index.html', html], ['css/app.css', fs.readFileSync(path.join(PUB, 'css', 'app.css'), 'utf8')], ...files.map(f => [f, src[f]]), ...Object.entries(jsx)]) {
  const ctl = [...t].filter(c => c.charCodeAt(0) < 32 && !'\n\r\t'.includes(c)).length;
  if (ctl) bad.push(`${ctl} control character(s) in ${f}`);
}

const sw = js.indexOf('switch(d.act){');
const cases = [...js.slice(sw).matchAll(/case'([A-Za-z0-9_]+)':/g)].map(m => m[1]), count = {};
cases.forEach(c => count[c] = (count[c] || 0) + 1);
const dup = Object.entries(count).filter(([, n]) => n > 1).map(([c, n]) => `${c}×${n}`);
if (dup.length) bad.push('Duplicate click actions: ' + dup.join(', '));
const used = new Set([...s.matchAll(/data-act="([A-Za-z0-9_]+)"/g)].map(m => m[1]));
const orphan = [...used].filter(a => !count[a]);
if (orphan.length) bad.push('Buttons with no handler: ' + orphan.join(', '));

for (const [re, name] of [[/d\.k==='([A-Za-z0-9_]+)'/g, 'data-k'], [/d\.c==='([A-Za-z0-9_]+)'/g, 'data-c'], [/d\.live==='([A-Za-z0-9_]+)'/g, 'data-live']]) {
  const c = {}; [...js.matchAll(re)].forEach(m => c[m[1]] = (c[m[1]] || 0) + 1);
  const rep = Object.entries(c).filter(([, n]) => n > 1).map(([k, n]) => `${k}×${n}`);
  if (rep.length) bad.push(`Same ${name} handled twice: ` + rep.join(', '));
}

const ch = js.indexOf("document.addEventListener('change',e=>{const t=e.target,d=t.dataset;INB");
if (ch >= 0) {
  const body = js.slice(ch, js.indexOf('\ndocument.addEventListener(', ch + 10) >>> 0 || undefined), ret = body.indexOf('if(!d.c)return;');
  if (ret >= 0) {
    const after = [...body.slice(ret).matchAll(/\n\s*if\(d\.([a-zA-Z]+)\b/g)].map(m => m[1]).filter(k => k !== 'c');
    if (after.length) bad.push('Change handlers after `if(!d.c)return;` (never run): d.' + [...new Set(after)].join(', d.'));
  }
} else bad.push('Change listener not found (check.js needs updating)');

if (bad.length) { console.log('FAIL\n - ' + bad.join('\n - ')); process.exit(1); }
console.log(`OK · ${cases.length} actions, ${used.size} buttons, no duplicates, change handlers in order`);
