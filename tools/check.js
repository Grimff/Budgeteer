// Static checks for app/public/index.html. Run after every edit and before every release:
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
const s = fs.readFileSync(path.join(__dirname, '..', 'app', 'public', 'index.html'), 'utf8');
const js = s.slice(s.indexOf('<script>') + 8, s.lastIndexOf('</script>'));
const bad = [];
try { new Function(js); } catch (e) { bad.push('Syntax: ' + e.message); }
const ctl = [...s].filter(c => c.charCodeAt(0) < 32 && !'\n\r\t'.includes(c)).length;
if (ctl) bad.push(`${ctl} control character(s) in the file`);

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
