// npm test: everything that can be checked without real bank data.
//  1. tools/check.js     static checks on the app (syntax, duplicate actions, handler order)
//  2. tools/test-server.js  the server against a fake Plaid (twice: normal, and day-old loan details)
//  3. the in-app self-test (?selftest) in headless Chrome/Chromium/Edge, if one is installed: a sample household
//     is loaded in the page and the budget math, filing, loans, goals and every screen are checked.
// Needs `npm install` once (to build the React screens). Set CHROME=/path/to/chrome if it isn't found on its own.
'use strict';
const { spawnSync, spawn } = require('child_process'), fs = require('fs'), path = require('path'), os = require('os'), http = require('http');
const ROOT = path.join(__dirname, '..');
let failed = 0;
const run = (name, args, env = {}) => {
  process.stdout.write(`\n▶ ${name}\n`);
  const r = spawnSync(process.execPath, args, { cwd: ROOT, env: { ...process.env, ...env }, encoding: 'utf8' });
  const out = (r.stdout + r.stderr).split('\n').filter(l => l && !/^\d{4}-\d\d-\d\dT/.test(l));   // drop server log lines
  console.log(out.map(l => '  ' + l).join('\n'));
  if (r.status !== 0) failed++;
};
run('Build the React screens', ['tools/build.js']);
run('Static checks', ['tools/check.js']);
run('Server', ['tools/test-server.js']);
run('Server: day-old loan details', ['tools/test-server.js'], { TEST_MODE: 'stale' });

function findChrome() {
  if (process.env.CHROME) return process.env.CHROME;
  const names = ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser', 'microsoft-edge', 'chrome'];
  const fixed = ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Chromium.app/Contents/MacOS/Chromium',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'];
  for (const f of fixed) if (fs.existsSync(f)) return f;
  for (const n of names) for (const d of (process.env.PATH || '').split(path.delimiter)) { const f = path.join(d, n); if (fs.existsSync(f)) return f; }
  return null;
}
(async () => {
  process.stdout.write('\n▶ In-app self-test (?selftest)\n');
  const chrome = findChrome();
  if (!chrome) { console.log('  skipped: no Chrome, Chromium or Edge found (set CHROME=...). Or open http://YOUR-SERVER:8095/?selftest in a browser.'); return finish(); }
  // The page answers every api/ call itself in self-test mode, so this server only serves the app files.
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'budgeteer-test-')), port = 18299;
  const srv = spawn(process.execPath, [path.join(ROOT, 'app', 'server.js')], { env: { ...process.env, DATA_DIR: dir, PORT: String(port), PLAID_CLIENT_ID: '', PLAID_SECRET: '', BASIC_AUTH: '' }, stdio: 'ignore' });
  await new Promise(r => { const t0 = Date.now(), tryIt = () => http.get(`http://127.0.0.1:${port}/api/health`, () => r()).on('error', () => Date.now() - t0 < 5000 ? setTimeout(tryIt, 100) : r()); tryIt(); });
  // Two page loads: the self-test, then (?selftest&act) the click-handler comparison of the move to React.
  for (const [q, what, ms] of [['selftest', 'self-test', 240000]]) {
    const args = ['--headless=new', '--disable-gpu', '--virtual-time-budget=30000', '--dump-dom', `http://127.0.0.1:${port}/?${q}`];
    if (process.getuid && process.getuid() === 0) args.unshift('--no-sandbox');
    const r = spawnSync(chrome, args, { encoding: 'utf8', timeout: ms });
    const m = (r.stdout || '').match(/<pre id="selftest-result"[^>]*>([^<]*)<\/pre>/);
    if (!m) { console.log(`  FAIL ${what}: no result in the page` + (r.error ? ' (' + r.error.message + ')' : '')); failed++; continue; }
    const res = JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&'));
    if (res.pass) console.log(`  PASS ${what}: all ${res.total} checks`);
    else { failed++; (res.failed || []).forEach(f => console.log(`  FAIL ${f.name}${f.detail ? ' · ' + f.detail : ''}`)); }
  }
  srv.kill(); fs.rmSync(dir, { recursive: true, force: true });
  finish();
})();
function finish() { console.log(failed ? `\n${failed} part(s) FAILED` : '\nAll tests passed'); process.exit(failed ? 1 : 0); }
