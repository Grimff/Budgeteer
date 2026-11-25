// Builds the app (app/src: main.jsx and everything it imports, the React screens and the lib/ modules) into
// app/public/dist/app.js, the one script index.html loads.
//   node tools/build.js           build once (npm run build; npm start and npm test run it first)
//   node tools/build.js --watch   rebuild on every change
// Needs `npm install` once (esbuild, react, react-dom; all dev-only, nothing is installed on the server: the Docker
// image builds the bundle in its own stage).
'use strict';
const path = require('path'), fs = require('fs');
const ROOT = path.join(__dirname, '..');
let esbuild;
try { esbuild = require('esbuild'); }
catch (_) { console.error('esbuild is not installed: run `npm install` in ' + ROOT + ' first.'); process.exit(1); }
const opts = {
  entryPoints: [path.join(ROOT, 'app', 'src', 'main.jsx')],
  outfile: path.join(ROOT, 'app', 'public', 'dist', 'app.js'),
  bundle: true, format: 'iife', target: 'es2020', charset: 'utf8', legalComments: 'none',
  jsx: 'automatic', minify: true, define: { 'process.env.NODE_ENV': '"production"' },
  banner: { js: "'use strict';" }, logLevel: 'warning',
};
(async () => {
  if (process.argv.includes('--watch')) { const ctx = await esbuild.context({ ...opts, logLevel: 'info' }); await ctx.watch(); console.log('Watching app/src …'); return; }
  // a stale dist/<name>.js from before the app was one bundle would only confuse
  if (fs.existsSync(path.dirname(opts.outfile))) for (const f of fs.readdirSync(path.dirname(opts.outfile))) if (f !== 'app.js') fs.unlinkSync(path.join(path.dirname(opts.outfile), f));
  await esbuild.build(opts);
  const kb = (fs.statSync(opts.outfile).size / 1024).toFixed(0);
  console.log(`Built app/public/dist/app.js (${kb} KB)`);
})().catch(e => { console.error(e.message || e); process.exit(1); });
