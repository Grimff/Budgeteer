// Builds the React screens (app/src) into app/public/dist/app.js, which index.html loads after the other js files, and
// each app/src/lib/<name>.global.js (a js/ file's code moved to an ES module) into dist/<name>.js, which index.html loads
// right after js/<name>.js (that file keeps only its shared let/var).
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
  // The screens read the app's shared globals (S, plan, f0, …) by name, like the other js files do.
  banner: { js: "'use strict';" }, logLevel: 'warning',
};
const LIB = path.join(ROOT, 'app', 'src', 'lib');
const libs = (fs.existsSync(LIB) ? fs.readdirSync(LIB) : []).filter(f => f.endsWith('.global.js')).map(f => ({
  ...opts, entryPoints: [path.join(LIB, f)], outfile: path.join(ROOT, 'app', 'public', 'dist', f.replace('.global.js', '.js')), jsx: undefined }));
(async () => {
  if (process.argv.includes('--watch')) { for (const o of [opts, ...libs]) { const ctx = await esbuild.context({ ...o, logLevel: 'info' }); await ctx.watch(); } console.log('Watching app/src …'); return; }
  await Promise.all([opts, ...libs].map(o => esbuild.build(o)));
  const kb = (fs.statSync(opts.outfile).size / 1024).toFixed(0);
  console.log(`Built app/public/dist/app.js (${kb} KB)` + (libs.length ? ' and ' + libs.map(o => 'dist/' + path.basename(o.outfile)).join(', ') : ''));
})().catch(e => { console.error(e.message || e); process.exit(1); });
