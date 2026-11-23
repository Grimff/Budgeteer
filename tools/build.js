// Builds the React screens (app/src) into app/public/dist/app.js, which index.html loads after the other js files.
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
(async () => {
  if (process.argv.includes('--watch')) { const ctx = await esbuild.context({ ...opts, logLevel: 'info' }); await ctx.watch(); console.log('Watching app/src …'); return; }
  await esbuild.build(opts);
  const kb = (fs.statSync(opts.outfile).size / 1024).toFixed(0);
  console.log(`Built app/public/dist/app.js (${kb} KB)`);
})().catch(e => { console.error(e.message || e); process.exit(1); });
