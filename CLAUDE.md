# Budgeteer

Self-hosted household budget web app for a household sharing one budget. Runs with `npm start` or in
Docker (`docker compose up -d --build`) on port 8095. Bank data comes from Plaid.

## Deploy

- `app/public/` – the front end; the only CDN is Plaid Link (`cdn.plaid.com`, its `Plaid` global is the one global
  the code uses), loaded on demand. `index.html` (markup only) loads `css/app.css` (with `fonts/` Inter woff files),
  `icons/`, and one script, `dist/app.js` (git-ignored): the whole app, built by `tools/build.js` (esbuild; `npm install`
  once; `npm run build`/`watch`; `npm start`, `npm test`, realtest and livetest build first) from `app/src/main.jsx`
  and everything it imports. check.js enforces that index.html loads only that.
- **The code (`app/src/`)** is ES modules with explicit imports; nothing is shared through globals.
  - `lib/<name>.js`: the app's logic, what the old js/<name>.js files held (core, math, budget, loans, goals, history,
    flow, events, bank, build, goal-accounts, compare, settings, wealth, linked-loans, alerts, csv-import, subs, calendar, sample,
    server-sync). `screens/`, `popups/`, `flow/`, `frame.jsx`, `schedule.jsx`, `ui.jsx`: React. `actions.js`: click and
    field handlers. `bridge.js`, `store.js`, `tabs.jsx`: drawing and the store. `named.jsx`: the functions written in
    React that other code calls by name (renderX, catRender, sankey, fsUI…). `parity.js`: the re-render check.
    `debug.js`: `window.__app`. `main.jsx`: the entry.
  - **Shared state** (a module's `export let`, e.g. the caches LP/GP/XS that renderAll resets, BUDV, SV, S): other
    modules read it through the import (live) and change it only with its setter, `set<Name>(v)` (`export function
    setLP(v){return LP=v}` next to the `let`); an ES module can't assign another module's variable.
  - **Load order:** what a file did as it loaded (listeners, settings read from localStorage, the app's start) is its
    `start<Name>()` (end of each lib file), which main.jsx calls in the old order: core … csv-import, then the React
    frame and main.jsx's own setup, then sample and server-sync (which starts the app: `renderAll` + `fsInit`). A
    module's top level only defines things (functions, and consts from literals or its own earlier consts), so the
    order the bundle evaluates modules in doesn't matter. New code that must run at load goes in its file's start<Name>.
  - **Sample mode** sets `window.__app` (debug.js): every module's names (shared variables settable), for the console
    or a test script (`with (__app) { … }`); `__store`, `__drawNo`, `__paritySnap` for the self-test. The app never reads
    them. The self-test's results are `window.SELFTEST_RESULT`.
  - The parity check's stand-in for `recurring()` (a case with made-up bill suggestions) is bank.js's `RECF`/`setRECF`
    (it used to replace `window.recurring`).
  See "How the front end works" below.
- `app/server.js` – Node 18+, no npm dependencies. Reads `.env` (project folder or cwd) at start;
  real environment variables win. Relative `DATA_DIR` is resolved from the project folder.
- **Settings and secrets:** `.env` (git-ignored; template `.env.example`) holds `PLAID_CLIENT_ID`, `PLAID_SECRET`,
  `PLAID_ENV`, `BASIC_AUTH` and the rest. `data/` is git-ignored and never committed.
- **Docker:** `docker-compose.yml` builds the `Dockerfile` (stage 1 runs `npm ci` + `tools/build.js`; stage 2 is
  node:22-alpine + `app/` without `src/` + the built `dist/`; `.dockerignore` lets in only those files), loads `.env` with `env_file`,
  forces `DATA_DIR=/data`, `PORT=8080`, and mounts `${DATA_PATH:-./data}:/data`. `DATA_REQUIRED=1` makes the server exit at
  start when there's no budget file (a NAS share not mounted yet), so Docker's restart policy retries until it is.
- **Release:** run `npm test` (must pass), bump the footer "Version N" (`fsUIR` in app/src/chrome.jsx) and the
  README, commit, push main, then tag `vN` and push the tag. Current: **Version 3** (Version 1 was the string-built front end; 3 is the React one, see "How the front end
  works"; 2 was skipped). "Version N"/"vN" mentions below are
  from the app's earlier history and use the old numbering.

## Data on the server (`data/`)

`budgeteer-data.json` (the budget), `backups/` (daily copies of the budget and of
`bank-loans.json`), `bank-connections.json` (**Plaid access tokens, private**),
`bank-transactions.json`, `bank-loans.json` (balance per account per day + Liabilities details),
`bank-investments.json` (holdings + deposit/withdrawal flows).

**`data/` holds real data and real Plaid tokens** (never committed). Never print tokens, never run a
server against a real `data/` folder while testing; use `tools/realtest.js`.

## Working on the code

- **No personal data in tracked files.** The repo is on GitHub: no real names, amounts, account numbers,
  employers or lenders in code, comments or docs. The starting budget (`seedPlan`/`seedLoans`/`seedGoals`) is
  empty on purpose. Use generic examples.

- The code files (app/src/lib/*.js, what used to be the js/ files) are mostly long one-line functions. Make edits with small Python scripts that do
  exact `str.replace` with a count assertion (write the script with the Write tool, run with
  `python -I`). Keep new code in the same compact style, with a short comment on anything non-obvious.
- **Shell pitfall:** passing code through Bash heredocs can collapse `\\` → `\`, which turned `\b`
  into a backspace character once. After every edit run **`node tools/check.js`**: syntax, control characters,
  duplicate click actions (a second `case'x':` never runs; v6 shipped with the schedule's `alDel`/`alMode`
  shadowed by the Goals accounts card's, so Remove did nothing), buttons with no handler, repeated
  data-k/data-c/data-live keys, and change handlers after `if(!d.c)return;`. Name new actions with a prefix no
  other feature uses (schedule = `sc*`, accounts card = `al*`). check.js parses every file in app/src
  (esbuild), checks every name used is imported or declared (TypeScript, from `npm install`; the browser's globals
  and Plaid's `Plaid` excepted) and that index.html loads only dist/app.js. Use the Write tool for JSON/launch files.
- **`npm test`** before every push (check its exit code, not a piped tail): check.js, `tools/test-server.js` (server vs a fake Plaid, twice), and the in-app
  self-test in headless Chrome (`--dump-dom` of `/?selftest`; skipped with a note if no Chrome/Chromium/Edge).
- **Sample household / self-test** (`app/src/lib/sample.js`): `?demo` installs `demoFetch` over `window.fetch`, answering every
  `api/` call in the page from `sampleData()` (seeded, 7 months, 5 accounts, rules that file everything), and uses
  `KEY+'_demo'` for localStorage, so real data is never read or written. `?selftest` = demo + `selfTest()` (35+
  checks: totals against the raw sample transactions, transfers, set-asides, loans, goals, health checks, saving, every
  tab and view). Add a check there for any new feature or bug fix. A new `api/` route needs a `demoFetch` answer.
- **Testing recipe** (`node tools/realtest.js` does all of this; port 18096): copy the 5 JSON files from `data/` to a temp folder, replace every
  `access_token` with `fake-<item_id>`, run a tiny fake Plaid (replays accounts from that copy;
  `/transactions/sync` returns nothing new unless `<temp copy>/fake-sync.json` holds a scripted
  `{item_id, added, modified, removed}` update, replayed once; everything else 500) and `server.js` with
  `DATA_DIR`, `PORT`, `PLAID_CLIENT_ID/SECRET=test`, `PLAID_BASE` pointing at it. Open it in the
  browser pane, drive it with JS, check phone width (375px) for overflow. Delete the copy after.
- **Live test** (`NAS=http://your-server:8095 node tools/livetest.js`, same port): the budget is downloaded
  once from the server and kept in memory (saves never go back), bank data is read from the server with GET
  only, sync/connect are answered locally. Use it when the `data/` snapshot is too old to show a bug.
  No tokens involved.
- Every input someone types in needs a `data-key` (see Text fields).
- **Change handler order:** the `change` listener returns at `if(!d.c)return;`. Any handler keyed on another
  data attribute (`d.al`, `d.mm`, `d.mv`, rules…) must come before that line, or it silently never runs (v5's
  schedule dropdowns/months/checkboxes did nothing until v6 moved `if(d.al)` up).

## How the front end works (React)

- **Screens** are components (`app/src/screens/`, pop-ups in `popups/`, the money-flow card in `flow/`, the schedule
  editor `schedule.jsx`, shared bits in `ui.jsx`). They read the app's state straight from the modules (`S`, `plan()`,
  the caches) and must stay pure: no saves or data changes while drawing.
- **Drawing follows the store** (`store.js`, `tabs.jsx`). `S` is plain module state; `renderAll` (after every
  `commit()` and view switch) runs `frameUIR` → `changed()`, which re-renders the page frame (`frame.jsx`, one root in
  `#app`) and the visible tab. Each tab section holds one root (`TabScreen`): it draws when the store changes and its
  tab is showing (a hidden tab keeps what it showed), or when its `renderX` is called by name (`named.jsx` →
  `redraw(t)`, shown or not; `renderBuild`/`renderForecast` ask for that Budget view). After React is done (never
  inside its commit) each screen that drew gets `resync()` and its after-draw step: This month → `sankey()`, Forecast
  → `fcBody()`, Bank → `bankBadge()`. `brandSet`/`bankBadge` redraw the header alone (`frameChanged`).
- **Re-renders happen in place**, so `resync(el)` puts back what a fresh draw would show and React doesn't control:
  details `open`, field values/ticks/choices (fields are uncontrolled: `defaultValue`), `hidden`, inner scroll, and a
  select's `selected` attribute. Consequences to keep in mind:
  - a box that code fills by hand gets a new element on every draw with `key={'…' + drawNo()}` (Bank's split box
    `.spf`, This month's money-flow part `#zb`/`.skw`, Forecast's `#fcb`); Build's ⋮⋮ drag moves rows by hand, so
    `ORDN` (counted in build.js) keys the `.bgrps` lists (without it React throws; a self-test check covers it);
  - parts that change while typing or dragging follow a small tick of their own (`tick()` in bridge.js):
    Loans' plan text and what-if (`pxLive`/`wiLive`), Forecast's what-if outputs (`wfLive`), the rules search
    (`rulesFilter`). Never `draw()` into an element a live root renders;
  - charts re-measure after every render, start over when their range changes (`key`), and keep only the hovered
    point in state (`hv`, null when not hovering); `CountUp` runs `cu` after every render (`el._cu` stops an older
    animation);
  - the clicked button keeps focus and the page doesn't jump to the top (the old string-built pages did both).
- **Pop-ups and dialogs**: their shells are in `frame.jsx`; each part is drawn into its box by its function
  (`catRender`, `flowRender`, `lnkList`/`lnkRule`, `openD`, `spForm`, `compareView`, `skCard`/`skTip`/`zbar`) with
  `draw()`, a fresh root each time, like `innerHTML=`. The money-flow chart (`sankeyR`) is drawn the same way into
  `#sk`; `hl`/`zset` set its classes and viewBox and `skPos`/`skPlace` place the tip and card by hand.
- **Handlers**: every click action is a function in `actions.js` (`ACT`, `(d = data-*, b = element, e = click)`);
  an element with `data-act` gets `onClick={onAct('x')}` (sets INB, closes the flow card on a click outside it; an
  inner element's action wins over its row's). Fields: `onInput={onInp}` and/or `ref={onChg}` (a native `change`
  listener, so text fields fire on commit), running the first handler in `ORDER_INP`/`ORDER_CHG` that applies. The
  frame's own listeners are `FRAME_ON`. `events.js` keeps the page-wide ones: folds (`OPEN`), keyboard,
  select-on-focus, amount formatting, the flow chart's nodes and its outside-click close.
- **Checks**: `check.js` (also every name imported, via TypeScript). The self-test runs `parity.js`: each tab drawn
  fresh for every case in `main.jsx` (`addParity`: every month, each range/view, an empty household), then one root
  re-rendered through all of them must match each fresh draw. `__paritySnap()` (sample mode) records every case,
  pop-ups and `addPiece` parts included, to compare two builds when changing code under the screens. Add cases for
  every view switch a screen has.
- **JSX notes**: a `<table>` needs an explicit `<tbody>`; SVG attributes camelCase (`strokeWidth`); keep attribute
  strings exact (`fillOpacity=".35"`); lengths as strings (`'16px'`); `{' '}` where inline elements need a space;
  `cond ? x : null`, never `cond && x` (prints 0).
- **History**: Version 1 built every screen as HTML strings in classic scripts sharing globals. The move to React
  (Version 3) replaced them screen by screen with no feature added or removed: each React screen was compared with
  the old one for every case until the old code was deleted, then the code became ES modules with explicit imports in
  one bundle, checked with a snapshot of every tab, view and month of the sample (text and the core math) and a
  click-through of every tab against the previous build at each step.

## Server API (`server.js`)

- `GET /api/health`, `GET /api/rev`, `GET/PUT /api/data` (PUT with `baseRev` → 409 on conflict;
  atomic write; daily backup). Optional `BASIC_AUTH=user:pass`.
- **Backups:** `dailyBackup` copies the budget before the first save of each local day (`today()`) to
  `backups/budgeteer-YYYY-MM-DD.json`. `GET /api/backups` (`listBackups`: daily + `budgeteer-before-restore-<time>.json`),
  `POST /api/backups/restore {id}` (listed ids only; saves the current budget as a before-restore copy, keeps 10, writes
  the copy with a new rev). Client: `bkList`/`bkRestore`/`BkCard` in settings.js (Settings → General → Backups).
- **Phone alerts:** `NOTIFY_URL` (ntfy topic URL → JSON publish `{topic,title,message}` to the server root; a URL with
  `/api/webhook/` → `{title,message}`), optional `NOTIFY_AUTH`. `GET /api/notify` → `{configured,target}`, `POST
  /api/notify {alerts:[{key,title,message}]}` sends each key once (`data/notify-sent.json`, 62 days, serialized),
  `POST /api/notify/test`. `syncAll` sends `conn:<item>:<code>` itself for connections with errors.
- **CSV import:** `POST /api/bank/import {rows:[{date,name,amount}], account | newAccount{name,type}, balance?}`,
  `DELETE /api/bank/import/:acctId`. Imported accounts are one more item (`item_id:'csv'`, `kind:'csv'`, no token) in
  `bank-connections.json`; transactions go to `bank-transactions.json` (`item:'csv'`), balances to `bank-loans.json`,
  so every bank route serves them unchanged; `syncAll` skips the item; Plaid-only routes need keys, these don't
  (`status.configured` is true with only CSV accounts; `status.plaid` says whether keys are set). Ids hash
  account|date|amount|name|repeat-count, so re-imports skip. Refused (409) while a sync runs (`bankBusy`).
- **Efficiency:** GET routes read JSON through `readCached` (`viewBank/viewTx/viewLoans/viewInv`, cached until the
  file's size or mtime changes; never mutate what they return). Code that edits a file uses `loadX()` (fresh read)
  and `writeJ`/`writeAtomic`, which update/clear the cache. Responses over 1 KB are gzipped when accepted (`res.gz`);
  app files (`staticFile`: only listed types, only inside app/public) are cached in memory, text ones gzipped, with an
  ETag (304 on repeat visits; edits still apply on reload).
  Liabilities and Investments refresh only every `BANK_DETAIL_HOURS` (default 24, `item.detailAt`) on automatic
  syncs; `syncAll(true)` (Sync now, exchange, reconnected) always refreshes them, and a Sync now during an
  automatic sync waits for it, then runs once in full (`fullNext`).
- Bank: `/api/bank/status|link-token|exchange|reconnected|sync|transactions?from=|loans|accounts`, `PUT /api/bank/settings`,
  `DELETE /api/bank/items/:id`. Env `PLAID_CLIENT_ID`, `PLAID_SECRET`, `PLAID_ENV`, optional
  `PLAID_REDIRECT_URI`, `PLAID_BASE` (mock), `BANK_SYNC_HOURS` (default 1, used until a refresh time is
  picked in Settings). **Refresh setting** (Version 36): `data/bank-settings.json` `{hours, open}`; hours is one of
  `SYNC_CHOICES` 0/1/2/3/6/12/24 (0 = only Sync now), open = check when the app is opened. `PUT
  /api/bank/settings {hours?, open?}`; `/api/bank/status` returns `refresh{hours,open,last,next}`. A 1-minute
  `syncTick` syncs when `max(lastAll,lastTry)+hours` has passed, so changes apply at once; `lastAll` starts from
  the connections' saved `lastSync`, so a restart doesn't trigger an extra sync. `POST /api/bank/sync` with
  `{auto:true}` (sent when the app is opened or comes back into view) is skipped if open is off or a sync
  finished in the last 10 minutes (`OPEN_SYNC_MIN`); Sync now always runs.
- **Pending transactions** are stored and served (`pending:true`); each posted one carries `ppid` =
  Plaid's `pending_transaction_id`. Loan payment history (`/api/bank/loans`) still uses posted only.
- Each sync per connection: `/accounts/get` (balances, snapshotted daily) → `/transactions/sync`
  (skipped for `kind:'invest'`) → `/liabilities/get` if it has loans → `/investments/holdings/get`
  + `/investments/transactions/get` (last 120 days, merged) if it has investment accounts.
  `item.liab` / `item.inv`: '' untried, `ok`, `none`, `consent` (needs update-mode Link).
- `POST /api/bank/link-token`: `{}` new bank (transactions + optional liabilities/investments, falls
  back if not enabled), `{kind:'invest'}` brokerage (investments only, so Fidelity/Schwab appear),
  `{item_id, liabilities|investments:true}` add an add-on, `{item_id, accounts:true}` pick more
  accounts at that bank.
- `/api/bank/loans`: loan + credit accounts with `bal`, `months{YYYY-MM: balance}`, `pays{YYYY-MM}`,
  `liab`. `/api/bank/accounts`: every account with `bal`, `avail`, `days` (400), `months`;
  investment accounts add `holdings[]`, `flows[{date,amt}]` (+ = money in).

## Data model (`S`, saved as `data`; `cur`, `tab`, `flow` are per browser)

- `plans{YYYY-MM: {income[], groups[{id,name,color,flex,items[{id,name,amt,due}]}]}}` – versions,
  each effective from its month. `editPlan(fn,k)` edits version `k` and every later one (`k`
  defaults to the viewed month, or the Build scope month). `plan(k)` adds that month's one-time extras.
- `months{k: {act, pay{loan}, dep{goal}, extra[], gplan{goal}, lxp{loan}, rc[], swept, rv}}` (`swept` = last
  month's real left over sent by the rules, `rv` = monthly review dismissed).
- **Schedule** (v5, `S.al[]`): every planned amount toward a goal or loan, with a start and an optional stop:
  `{id, to:'g:id'|'l:id'|'snow'|'keep', src:'plan'|'extra', mode:'$'|'%', v, from, until, how, loans[], roll}`.
  `plan` = a set amount every month that goes in the budget (goal saving, loan extra, snowball); `extra` = a
  share of what the plan leaves over, top to bottom in list order. A snowball pays only `loans` (empty = all),
  highest rate or smallest balance first, and `roll` adds each of its loans' minimum once paid off. A loan share
  stops at payoff, a goal share at its target; `until` stops it at a month. `alAt(k)`, `alPlan(to,k)` (set
  amount, used by the card/Build boxes), `alSet(to,m,v)` (set from month m on, ending earlier items via
  `alEnd`). (Older v3/v4 shapes, goal `g.mp`/`g.monthly`, loan `l.xp`/`l.xtra`, `S.pxPlan`, `S.xm`, are no longer
  converted; data saved by any recent version is already in this shape.) Old names stay as wrappers: `goalMon`, `loanUsual`, `setUsual`, `verSet(g,'mp',…)`, `xmAt` (left-over
  rules), `snowR`. `xsBuild()` simulates month by month (set amounts first, then the pool, then left-over rules)
  into `XS{k:{pool, keep, snow, dest, 'p|'+dest, 'x|'+dest, 's|l:id'}}` (total / set / left-over / snowball part);
  `exShare` feeds `loanXtra` (= month override + shares) and `goalPlan` (= month override ?? share). `NOX` while it
  runs; `LP`/`GP` dropped after. Editor `AlList`/`AlForm` (`ALE` = open item; actions `scAdd/scAddTo/scEdit/scDel/scSrc/
  scMode/scHow/scMove` (renamed from `al*` in v7), change `data-al`, input `alv`) is in Build step 6 and the Forecast. Verified on live data:
  migration keeps every month's totals; a snowball on two loans with a stop date pays only those, rolls the
  first's minimum into the second, stops on time; left-over check passes.
- **Plan as totals see it** (`plan(k)` over `plan0(k)`, v4): a bill with `freq` 3/6/12 and due month `dm` becomes a
  monthly set-aside (`amt/freq`, `base` = bill amount); `billPaid` returns the set-aside as the paid amount (`real`
  = actual payment), so the due month never spikes; `sinkFund(id,k)` = set-asides − payments while it's a
  set-aside bill; not-due months show **Set aside**. Build shows `i.base ?? i.amt` in amount boxes. (Spending
  roll-over, `i.roll`/`carry`, was removed; an old `roll` flag in saved data is ignored.)
- `loans[{…,acct,anch,xp}]` – balance path from `start`/`bal`; unlogged months assume the minimum, plus the
  **planned extra** from this month on. `l.xp{YYYY-MM: amount}` = usual extra in versions, each in force from its
  month (`loanUsual`, `setUsual(l,m,v)` drops later versions), set from `xStart()` = the viewed month or the
  current one, whichever is later, so past months never change (v3).
  `months[k].lxp[id]` = one month's own extra (Build step 6, current/future months only). `loanXtra`, `loanPlan`
  (min + extra, capped at what's owed) is what the budget plans everywhere (totals, monthSum, sankey, compare,
  pop-up). Set in Build step 5 (`lxb`), on the loan card (`xtra`), by the what-if **Add to the plan** (`wiPlan`)
  or by the **Extra payment plan** (below). **Interest saved by month k** (`savedL(l,k)`) = lifetime
  interest of the minimum-only path − lifetime interest of `cutP(l,k)` (payments as made/planned through k,
  minimums after; `path(..., cut)`), never below $0 and never falling as k moves on; this month's plan counts only
  once paid or when viewing a later month. `extraPaid(l,k)` likewise. The debt chart readout shows this instead
  of the balance gap (which shrinks as the minimum path catches up). The loan card adds "+$X with planned
  extras".
  **Link-month opening** (`anchOpen`): once the lender's balance shows that month's payment (month over, payment
  from the lender, or balance read after the bank payment date) open = (balance + payment)/(1+rate); before that
  eob/(1+rate). (A lender's balance at linking can leave out accrued interest, which the old rule missed.)
  **Extra payment plan** (Loans page card, `PxCard`/`pxSim`/`PxText`): X a month toward loans one at a time,
  highest rate (`PS='rate'`, avalanche) or smallest balance (`'bal'`, snowball) first; a paid-off loan's minimum
  rolls into the next. Compared with minimums and no rollover. **Use this plan** (`pxApply`) writes each loan's
  `xp` versions from `xStart()` (+$1 in a payoff month so cents don't add a month) and saves `S.pxPlan{x,how,at}`
  (shown as In use; `pxClear` stops it; any hand edit via `setUsual` drops it). Verified: applying it gives the
  same interest and payoff months through `path()` as the simulation.
  **Loan card** (v3): name/APR, one-line link status, balance + progress, three label/value rows (this month,
  paid off, interest saved), the Extra each month box, then one **Payments, what-if and details** fold (payment
  source, bank links, what-if, fields, history, unlink/delete). A linked loan whose account is gone after its
  payoff month shows Paid off, not "account not found".
  Linked loans (`acct`): `loanSync()` copies bank data in memory only (`real`, `rp`, `live`, `link`,
  `auto`; stripped by `sharedData()`); known real balances win in `path()`; `anch` resets the
  opening balance in the link month (and shifts the minimum-only path the same, so no fake savings).
- `goals[]` – `goalSaved` = manual (`saved` + `dep`) + `linkedSaved` (share of accounts in `alloc`). v4:
  `goalMon(g,k)` (versions `g.mp`), `goalPlan` = month override ?? monthly + extra-money share, capped from this
  month on at what's left to the target (by projection); `goalProj(g,k)` = real up to last month, this month adds
  what's left of its plan, later months add their plan (cache `GP`); `goalEta(g)`; target date `g.by` →
  `goalNeed(g)` and On track / Behind (`gNeed` sets the plan to the needed amount). Future months show projected
  balances and a "Planned for <month>" box (one-month override); real deposits only in this or past months.
- `alloc{acctId:{mode:'order'|'split',goals[],pct{},rest}}` – accounts shared between goals
  (`allocWith`, cached `ALC`). Order fills each goal to its target in turn (last takes leftover
  unless `rest:'none'`); split uses percents. Investment accounts (`isInv`; the server's `isInvA` hands over as type
  `investment` any `brokerage` account or retirement account filed under another type, e.g. `other`/`401k`, and fetches
  its holdings and flows; before, such a 401(k) counted its market gains as saving): progress uses the
  balance share, but "saved this month" (`linkedChange`) counts only contributions from take-home
  pay (`homeMatch`: each deposit needs its own checking payment of the same amount 0–5 days before / 1 after that is a
  transfer out, not filed to a bill, purchase, income or loan; one filed to a goal is already that goal's deposit and
  isn't counted again; before, any same-amount checking transaction within 5 days counted); payroll contributions and
  market change show on the goal card (`invInfo`). Data & math → Goal math → "Saved in <month>, line by line"
  (`savedWork`) shows where each goal's actual comes from, deposit by deposit.
- `txd{txId:{v,k,amt,d,n,auto?,pair?,extra?}}` – filed bank transactions. `v`: `i:item`,
  `inc:income`, `once` (one-time income), `l:loan`, `g:goal`, `xfer`, `skip`. `k` = month it counts
  in. `auto`: rule id, `'pair'` or `'rest'` (catch-all).
- `rules[{id,p,dir,v,min?,max?,x?[],shift?}]`, `catchAll` (item id | `'review'` | unset),
  `noAuto{}` (auto-filings the person undid), `txGone{}` (removed with a deleted month),
  `notBill{}` / `notInc{}` (ignored suggestions), `merchantMap{}` (suggestion only), `histFrom`,
  `bankFrom` (filing start date). Older saved data may also hold an unused `badges[]`.

## Bank filing (`autoFile`, after every bank load and after the other browser's changes load)

1. **Pairs** (`txPairs`): money out of checking/savings + the same amount arriving on another
   connected card/loan account (or both Plaid-labeled transfers) within 5 days → both `xfer`.
2. **Rules** (`ruleFor`, longest `p` wins): `normName` = merchant + name without digits or
   punctuation, so reference codes don't matter. `patternOf` = first 3–4 words (5 for transfers)
   plus a qualifier (`QUAL`: GAS, PHARMACY…) so Costco ≠ Costco Gas. `x` excludes more specific
   names. `shift` moves late/early payments to the next/previous month (`ruleMonth`). Income
   rules only take checking/savings deposits; goal flags only take `TRANSFER_OUT` (`goalTx`).
3. **Catch-all** (`flexable` → `flexDefault`): purchases, payment apps and card refunds go to the
   chosen item (Build → Spending; default the Flex item). Left for review: deposits into
   checking, loan/card payments, account transfers.

- **Pending** (`PSET`, `Pnd(id)` tag, `.pnd`): pending charges file like any other (filings get `pend:1`) but
  never pair as transfers. `pendCarry()` (start of `autoFile`): when one posts, a hand filing moves to the
  posted id (same category and month, posted amount) and an automatic one is redone; a pending charge that
  vanished without posting (released hold) is unfiled; same-id posting refreshes the amount. A bill paid
  only by pending charges shows **Pending** on This month.
- **Bill paid early for next month** (`earlyMonth`, in the rules step; `earlyFix()` at the start of `autoFile` applies
  it to rule filings made before it existed): a payment of a monthly bill late in a month (day ≥ due+14 and ≥ last−12,
  or the last 10 days with no due day), about the bill's size (±25%), when that month already has the bill paid
  (≥90%, by an earlier payment) and the next month has none, counts in the next month. Rent for the 1st paid on the
  25th used to show twice in that month (bills up by a rent) and unpaid in the next. Hand filings are never moved.
- **Pending → posted keeps the filing** (`pendCarry`): a rule filing is redone by the rules unless no rule matches the
  posted description, in which case it keeps the pending filing; a vanished pending charge hands its filing to an
  unfiled posted one of the same amount 0–10 days later (ACH posts often carry no `pending_transaction_id`), else it
  was a released hold and is unfiled. Before, such a payment fell back to To review and its bill showed unpaid.
- **Manual always wins:** automation only files unfiled transactions; `ruleReapply` only redoes
  what that rule filed; Move / Undo / Add are manual.
- Fixed bills and income get actuals from `txd` (`txIdx` → `billPaid`, `incGot`); groceries/flex
  use `flexAct` (filed + hand entries, never the stored `act`, which could drift).
- `totals()`: bills = paid else planned, spending = filed else planned; income this month = max(received, planned).
  Exception (`seenNone(k,i)`): in a finished month (`k<TK`), a bank-linked line (has a rule, not a set-aside bill) with
  nothing filed counts $0, not its plan, in `totals` and History's `monthSum` alike (the ledger already showed $0).
- **Budget start** (`budStart()`): the Start date (`bankFrom`) month, or the first month the bank has
  transactions for when that is later. `firstMonth()` and `histMonths()` use it; loan tracking dates
  never move the budget's start. Older plan versions may exist in data; they are ignored.
- **Budget summary** (current/future month): "Gone out so far" = only money that really moved (paid bills,
  filed spending, logged loan payments, savings) with "still planned" and "incl. $X extra to loans" (`xLo`);
  "Left over (projected)". Past
  months show "Actual out".
- **Same number everywhere:** Loans "Total owed today" = Σ `debtNow` (same as Wealth) in the current month,
  `balEnd` for other months. Interest saved never shows below $0.
- **Wealth performance** (`perf`, `invSeries`): each account starts at its own first saved value, so
  connecting an account later is not growth; "Value now" is the investments total.
- **Storage is the server only** ("budget on the server" section: `fsInit`/`fsLoad`/`fsQueue`/`fsFlush`/`fsPoll`/`fsUI`;
  the old local-file mode was removed). `FS.state`: `wait` (connecting), `ok`, `err` (unreachable or a save failed;
  the 10-second `fsPoll` reconnects via `fsInit` or retries the save). The browser keeps a copy in localStorage
  (`KEY`). `REVK` = the server revision that copy matches. On load: if there are unsaved local edits (`PEND`) and the
  server is still at `REVK`, they are pushed; otherwise the server copy replaces them. A save while the server copy
  is still loading (`wait`) doesn't set `PEND`; a save while unreachable (`err`) does. Any 409 adopts the server copy
  and re-files; a toast says so unless the save was auto-only (`FS.autoOnly`). Never asks "which version".

## Screens

- **Needs a look** (`lib/alerts.js`, `AlertsCard` above the setup checklist, current month only): `alertsNow()` = banks
  with errors, linked bills (have a rule) not paid by their due day or due within 3 days (`isDue`, `billPaid`), flex
  items over plan (`flexAct`), price increases from last month on (`priceUps`, key `price:<month of change>:<pattern>`),
  transactions to sort (`inbox`). Keys carry the month; **Hide** (`ntHide`) stores keys
  in localStorage `pfb_alerts_hidden`. `notifyAlerts()` runs after each `bankLoad` and posts them to `/api/notify`
  (skipped in sample mode). Settings → Connections → Phone alerts (`NtCard`, `ntTest`).
- **CSV import screen** (`lib/csv-import.js`, `CsvCard` in Settings → Connections, also shown without Plaid keys):
  `cvSplit` (quotes, CRLF, BOM, `,`/`;`/tab), `cvNum` (parentheses, currency, decimal comma), `cvDate`
  (`ymd`/`mdy`/`dmy`), `cvLoadText` guesses columns, `cvRows` builds Plaid-signed rows, `cvImport`/`cvDel`. State in
  `CV` (not saved); selects use `data-cv` and inputs `data-cvt` with their own listeners (not the main change listener).
- **Only the visible tab is drawn:** `renderAll` shows the tab and the store redraws it (tabs.jsx); hidden tabs keep stale
  content until switched to. Every tab switch must go through `commit()`/`renderAll` (all `S.tab=` sites do). Calling one
  tab's `renderX()` directly is fine. Tab draw functions must stay free of side effects (no saves or data changes).
- **Budget → This month** is read-only (no inputs): header with the This month / Build budget
  switch, summary bar, money-flow card, then **Budget lines**: a `.ledger` (CSS columns, so cards
  pack without gaps) of one card per section (income, each bill group, each spending group, loans,
  savings), each row Planned / Actual / status. Hand-entered purchases (`RcList`, non-bank) below.
  All editing is in Build budget (or Loans/Goals tabs).
  - **Money-flow card:** Planned / Actual (what's happened so far, `chartItem`) / Compare
    (`compareView`, worst first). v8: every node has an invisible `.hit` rect over its bar **and label**
    (labels are `pointer-events:none`, so before v8 only the 18px bar was clickable), `tabindex`/Enter.
    Hover (not on touch, `NOHOV`) shows `#skt` (amount, planned vs actual `pv`/`av`, % of income); ribbons
    (`.lk`) highlight and click through to their target. Click (`skOpen`): item/income/loan/goal → `catOpen`;
    a group, Budget, Left over or Over budget → `#skc` card (`skCard`: breakdown rows → `skGo`/`skNode`,
    Transactions and trends `flowDet`, Zoom in `skZoom`, Edit in Build budget, Open Loans/Goals; Left over →
    Give it a job `skJob` = Build step 6 open + scrolled, Forecast). Card/tip live in `.skw` (the scroller),
    placed by `skPlace`/`skPos` inside its visible area; Escape or a click elsewhere closes; a drag-pan
    (`SKD`) isn't a click. The old "Edit these bills" (`seg` → `#sec-*`, gone) was dead; now `budv build`.
  - **Every income, bill, flex item, loan and goal row opens the same pop-up** (`catOpen` →
    `catRender`):
    - this month / all months / **Trends** (`CR==='trend'` runs `flowRender` and moves its body in:
      6-month history, per-store visits and monthly average), search, linked rules as chips
    - auto-filed rows say which rule filed them (`ruleTag`)
    - each transaction with Move (category + month)
    - "Same payee, filed somewhere else" (`samePayee`) with Move here

    Keep this true for any new kind of line.
  - **Bill calendar** (`BillCal`, collapsible key `bcal`, after the Budget lines, any month): `calBills(k)`
    (`lib/calendar.js`) = bills due that month (set-aside bills only in their due month, at the full amount) and loan
    payments still running, on their due day in a Sunday-first grid; phones (≤760px) get a list of only the days with
    something due. Chips are coloured by `billState`/`loanState`, which the Budget lines use too (one status logic),
    and open the line's pop-up. No due day → listed under the grid.
  - **Getting set up** (`GuideCard`, collapsible key `guide`): checklist under the summary in the current
    month (bank, paychecks linked, bills linked, loans, goals, transactions to sort); hidden when all done.
  - **Suggestions:** `recurring()` → "Looks like a bill" (Add as bill / Ignore, restorable).
- **Budget → Forecast** (`BUDV='fc'`, v5): KPIs (debt free, next goal, kept per month, months over budget);
  **Your plan over time** (`FcLanes`: one lane per loan/goal + Snowball/Kept, bars = schedule items from/until,
  clipped at payoff/reached, striped = left-over source, light striped `fls` = months a snowball pays that loan;
  click a bar to edit; ticks = payoff/reached, diamonds = target dates; range `FR`); **Debt and savings** line chart
  (`FcChart`), click a month → `FcDetail` (income, bills, spending, one-time items, each loan payment, each goal,
  kept; Edit in Build budget `fcEdit`); milestones; table; What if (collapsed; `WFS` → `WF` only while drawing).
  Lane classes are `.fcl*` (not `.fl`, which is the Bank tag style). v6: a **+** on each lane (`alAddTo`) adds an
  item for that loan/goal; the open editor renders once, under its lane (`.fcle`; `AlList(false)` in the list
  below has no form) and scrolls into view (`FSC`); overlapping items in a lane stack on rows (`place`/`geo`,
  26px each; snowball stretches get their own row); the Snowball lane names its loans; range adds **All** (to the
  last payoff or goal); months-over-budget KPI opens that month; month detail lists that month's schedule items.
- **Budget → This month summary** (v4, `SB`): current = Income arrived / Spent so far / Still to come / Left over
  (projected); future = Income / Planned out / Extra money or To goals / Left over (planned); past = Income / Spent /
  Under or Over plan / Left over. **Monthly review** (`RvCard`, current month until Done): last month's result,
  biggest overs (`cmpRows`, opens that month's pop-up via `catTx` `data-k`), unfiled count, and **Send by my rules**
  (`xSweep`: goal shares → `dep` this month, loan shares → this month's `lxp`; sets `swept`).
- **Split a transaction** (v4, Move panel → Split between categories…, `SpForm`/`spSave`): parts are normal filings
  `<tx>~n` with `sp:<tx>`; the parent keeps `{v:'split', parts}` (amt 0) so it isn't to-review; Undo on a part
  (`byUser`) undoes the whole split; the Filed list hides parts; `catMove` keeps `sp`.
- **No plan** (`hasPlan`, `unplannedA(k)` in math.js): an item whose amount is $0/blank is tracked only. It counts in Spent
  and Left over, but every over/under comparison leaves it out: the Budget summary's Under/Over plan (bills + spending
  only, never savings or loan extras), ledger rows (**No plan**) and card headers ("$x with no plan"), Compare
  (`cmpRows` → No plan), the monthly review, History (`spU`/`spX`) and alerts. Build shows "No plan" in empty amount
  boxes and offers **Fill in from what you usually spend** (`usualAmt`: average of the last 3 months with spending,
  spending rounded up to $5; `fillAvg`). Compare treats a set-aside bill in a month it isn't due as set aside.
- **Order and grouping in Build** (end of build.js): each row and group has a ⋮⋮ handle (`.grip`, `data-drag` i/g):
  pointer drag moves it live among `.bitems` / `.bgrps` (an item can go to another group of its kind), ↑/↓ on a
  focused handle moves it one place; `orderRead` → `orderApply(fx,gO,iO)` saves with the Build scope (`INB`).
  **Not in a group** = one loose group per kind (`g.loose`, ids `LOOSE.fixed`/`LOOSE.flex`, names Bills/Spending,
  `ensureLoose`, listed first). It's an ordinary group to totals, filing and pop-ups; the Budget page labels its card
  "Not in a group", the money flow shows each of its items as its own node (`g<loose>~<item>`, `nodeKey` → `i:`), and
  History skips it when empty. **Ungroup** (`grpUngroup`) moves a group's items into it.
- **Budget → Build budget** (`renderBuild`, `BUDV`): (v4: step 3 bills have a frequency/due-month select, step 5 goal monthly amounts are versions from `xStart()`, new step 6 Schedule (`XmStep` → `AlList`), step 7
  Just for <month>, whose savings/loan extras show only for this month and later) scope bar (all months | from this month;
  elements under `[data-build]` set `INB` so edits start at `scopeStart()` and `commit()` re-files),
  Start, Income (+ `recurringIn` suggestions), Bills, Spending (+ catch-all choice, `topStores`; steps 3 and 4 render through `bGroups(fx)` with `billRow`/`flexRow`),
  Loans and savings (incl. goal monthly amounts), 6 Just for {month} (one-time income/bills and
  goal amounts for the viewed month only, outside `[data-build]`; **Plan ahead** adds a one-time item to any of the next 24 months (`onceAdd` → `extras(k)`) and lists upcoming ones with remove/Open). "Fill in past months"
  (`fillPast`) copies newer items into older versions.
- **Loans:** header **Lenders** button (opens and scrolls to "Loans from your bank", `lenders`), total debt
  chart first (`DebtChart`; range switch 1M/3M/YTD/1Y/All like Wealth, `LR`, `pfb_lr`, default All: short
  ranges look back from the viewed month, label each month and fit the scale to the window; All starts at
  $0 and runs to the projected payoff; the readout says "Behind by" when above the minimum-only path), then interest saved / KPIs, best-rate tip, loan cards, "Loans from your bank" (track or
  link a Plaid loan; Allow for Liabilities; a lender connected twice is detected by same lender, type and
  balance and left out). A hand-added loan with a linked bank payment shows
  "From your bank" when the month's paid amount equals its bank filings, "logs itself…" / Not seen
  before it arrives, and its history marks bank months "from bank". The Budget tab's loan pop-up explains the paid
  number (`LoanNote`).
- **Goals:** hero (projected in future months; On track; Next goal reached), **Goal timeline** (`GoalChart`, % of
  target, history solid / projection dashed, reached dots, target-date diamonds, `GR` 1Y/2Y/5Y/All `pfb_gr`); header **Accounts** button (`alGo`); "Accounts for goals" card (`AllocCard`: add accounts, order or % split); goal cards
  pick accounts (`data-gacct`) and Flag transfers (`lnkOpen('goal')`).
- **Wealth:** header **Connections** button (Settings → Connections); net worth, investments chart with market gain (deposits removed), holdings, balances.
- **History:** 6 months / 12 months / All switch (`HR`, `pfb_hr`, default 6, ending at the viewed month)
  for the chart and the month list; the chart draws at the width shown and labels every `step`-th
  month (short month, year under the first label and January). Delete a month (`delMonth`).
- **Bank:** header (sync status; Rules, Connections → Settings; Sync now) and sections (`BV`): To
  review (+ double counts, How filing works), Filed (filters, search, Move / Undo), **Recurring** (`BV='subs'`,
  `Subs`/`SubRow`): `subsList()` (`lib/subs.js`) groups the last 14 months of posted charges by `merchKey` (no transfers,
  loan payments, or charges filed as anything but a budget line), keeps those at most once a month on a steady gap
  (1/2/3/6/12 months; monthly needs 3 in a row, others 2), about the same day (±7) and a steady price with at most one
  step (`change{prev,since,up}`); two identical monthly charges first seen in the last ~70 days show as **new**.
  Rows: cadence, next expected date, budget line (opens its pop-up), yearly cost; stopped ones fold away. The sample's
  Streamflix went from $13.99 to $15.99 last month to show a price change.
- **Health-check dot** (`hcDot()` in settings.js, drawn in frame.jsx): a dot on the gear (`.tdot`, red if any check is
  bad, butter otherwise) when `healthChecks()` finds something other than transactions to sort (the Bank badge shows
  those; that check is marked `inbox`); off until the budget and bank data have loaded. With the dot, the gear
  (`data-hc`) opens Settings → Data & math, where the health check is.
- **Settings** (gear tab, `renderSettings`, `SV`): General (household name `S.hh{name,sub}` shown
  by `brandSet` in the header and tab title; clicking the brand opens it; start date; catch-all
  `CatchSel`; backups), Rules (`FilingCard` counts per filing step this month; `RulesCard` grouped
  by category, search `RQ`/`rulesFilter`, each rule lists what it filed with Undo), Connections
  (`RefreshCard` refresh time + open-app check, `syncWord`; `ConnCard`: Add accounts, Reconnect, Sync, Connect,
  review-from date), Data & math (`DataView`, Version 36: Budget / Loan / Goal / Net worth math for the viewed
  month, opened by the **Health check** (`healthChecks`/`HealthCard`, v3: Budget and History agree for 7 months,
  linked loans within a few dollars of the lender, total owed the same everywhere, connections OK, no transfers
  counted as spending (`pairIssues`), **card purchases all in the budget** (a checking payment to a card is
  ignored, so a card that isn't connected, sends no transactions, or whose transactions start after the budget
  start loses its purchases; `hcCard` re-files those payments to the catch-all), nothing to review, last month's
  paychecks and bills seen, goal splits ≤ 100%), built from the same functions the tabs use — `totals`, `soFarOf` (shared with renderBudget), `row`,
  `debtNow`/`balEnd`, `manualSaved`/`linkedSaved`, `acctsOf` — plus a Your data summary, budget JSON download,
  transactions CSV (`csvTx`) and lazy raw JSON (`#rawd`). Wide tables (`.dmt.num`) stack on phones using
  `data-l` labels). `bview` rules/accounts
  redirect here.

## Layout conventions

- Every tab starts with a `.phead` (h1 + one-line description + optional `.phact` buttons on the right);
  settings/setup sits **below** the main content of a page and collapses. A page's setup is reached from
  a header button with the gear icon (`btn g sm ib` + `${GEAR}`): Loans → Lenders, Goals → Accounts,
  Wealth/Bank → Connections.
- Clickable things must look clickable: `.lnk` is a soft pill (tinted with its own text colour),
  `details.more>summary` is an outlined pill with a chevron, `.btn.g` has an outline, `button.pill` has a
  thin border. Don't put `.lnk` mid-sentence where a plain button would do.
- Header: one line above 1360px (at 1240 the This month and Synced pills pushed the month off screen); below that the tabs get their own row (≤760px adds the phone rules).
  The money-flow chart's min width is 840/860px (scrolls inside its card on phones).
- Collapsible cards: `<section class="card cl">` + `clh(key, shut, title, summary)` header
  (`data-act="bcol"`). State per browser in `BCL` (`pfb_bcl`): `isShut(key, default)`,
  `bcSet(key, shut)`. Used by the 6 Build steps (`b1`–`b6`, summary from `BSM`), Loans → "Loans
  from your bank" (`lsetup`, open by default only when something needs action) and Goals →
  "Accounts for goals" (`galloc`, closed by default; `alGo` opens it).
- Phones (≤760px): the tab row scrolls sideways (`moveInd` keeps the current tab in view); `.phead`
  wraps its buttons under the title. The month shows as "Nov 2026" (`#mlab` `data-s` via `::after`; the full name stays
  in its text).
  The phone rules from the layout pass are together at the end of app.css ("phone layout pass"): Bank → Filed and
  the pop-up's transaction rows put Move/Undo under the amount; `.bki` rows (Loans from your bank, Connections) give
  the name its own line; Build bill rows are name/amount/× then **Due** day (`.bdue`, a label that is
  `display:contents` on wider screens) and frequency; Forecast lanes put the name above the track and show only
  years on the axis; History's month tables and Data & math's tables stack. The money-flow chart keeps its min width
  and scrolls sideways (`.skhint` says so); `sankeyR` starts it scrolled to the Budget and group columns when it
  overflows. Check with a 375px screenshot of every tab, view and pop-up; wider screens must stay pixel-identical.
  **Touch** (same section of app.css, ≤760px): pop-ups are bottom sheets (full width from the bottom edge, a handle;
  `sheetSwipe()` in events.js closes one pulled down from the top of its content, through its own close button so
  `CT`/`LK`/`FD` clear); tap targets are 44px where cheap (`.btn.sm`, `.add`, selects, tabs, month arrows; Build's
  frequency select 40) and small controls (`.x`, `.lnk`, `.pill`, `.grip`, `.fcp`, chips, `.clh`) get an invisible
  `::after` hit area instead (don't give those an `::after` of their own). Charts: `onPointerDown` sets the point and
  a touch pointerleave doesn't clear it, so a tap shows the readout and it stays; History's chart has a readout too
  (`hv`, `.hrd`, only while a month is pointed at or tapped). Charts (`DebtChart`, `AreaChart`) draw at the width shown
  (min 340) so labels stay readable.
- The same transaction can be on the page twice (Bank Filed list + pop-up), so look up its parts relative to the clicked button, not with a page-wide `querySelector` (`mvShow`).
- Class names: don't reuse `.fl` (Bank tag style) for layout; Build spending rows are `.brow.bfl`.

## Empty and loading states

- `Empty` (ui.jsx, `section.card.empty` with an `IC` icon, what the page will show and the first step) replaces a
  page's charts and $0 cards when there's nothing yet: Loans (no loans: Connect a lender / Add a loan by hand; "Every
  loan is paid off" now only when there are paid-off loans), Goals (no goals), History (every month $0), This month's
  money flow (no income, bills, loans or goals: `noPlan`), Forecast's Debt and savings chart (no loans or goals). The
  monthly review hides for a month with nothing in it.
- Loading: `SkelCards`/`Skel` (shimmering shapes) instead of "Loading…" on Bank, Wealth and Settings → Connections while
  the bank data loads, and on every tab but Settings on a new browser until the budget arrives (`!HADL && !FS.loaded &&
  FS.state==='wait'`; `HADL` = this browser had its own copy at start; `setFS` redraws when that wait ends).

## Text fields

`rerender()` redraws ~350 ms after typing and restores the focused field by `data-key`.
Amount boxes select their text on click, except while focus is being restored (`RESTORING`) or
after typing started. Amounts (`input.in[inputmode="decimal"]`) get thousands separators
(`fmtAmt`, `fmtAll`); `num()` ignores commas.

## Design

- **Logo** (`brand/logo.svg`, source; `brand/icon-32|180|512.png` rendered from it): rounded tile cut into
  pink/butter/lime/aqua/lilac wedges, dark center with a white "B". `index.html`'s `<head>` links the SVG favicon,
  a 32px PNG fallback, the 180px `apple-touch-icon` and `theme-color`, and
  the header `.mark` holds the same SVG inline (clip id `lgclip`). `app/public/icons/` holds copies of the `brand/`
  files that the page and manifest use. If the logo changes, update `brand/`, `icons/` and the inline SVG.

Dark plum background, pink primary (`--pink #ffb6d9`) with lime, butter, coral, lilac, aqua, sky.
Inter for text, Inter Display for headings and numbers. Big rounded cards. Must work at phone
width (375px) with no sideways scrolling.

## Open items

- **https:** the manifest and iPhone meta tags give Add to Home Screen with an icon and full screen over plain http.
  Serving over https (e.g. `tailscale serve`) would also allow an offline mode and Plaid OAuth return handling with
  `PLAID_REDIRECT_URI` set to the https address.
- **Brokerage investment history:** if Plaid sends no flows, Retirement goals show balance but no
  contributions; check the server log.
- **Payment source** (`bankSrc(l)`): hand-added loans always use bank filings; a linked loan uses its
  lender's figures (`l.rp`) unless switched to **Your bank** (`l.paySrc='bank'`, card switch `paySrc`).
  Then in `path()` a month's filed/hand amount (`months[k].pay`) wins and the lender only fills gaps;
  a checking payment that pairs with that loan's account files to `l:<id>` (`autoFile`, auto `'pair'`),
  and switching re-files those pairs (including ones filed Transfer/Ignore by hand). Lender `rp` drops
  disbursements (`/disburs|proceeds|funding|advance/`). Rows: `auto` = lender figure.
- **Paid off** (`loanGone(l,k)`: tracking started and the balance path ended before month `k`): from the
  month after the last payment the loan leaves the Budget tab's Loan payments card (its $0 already drops
  out of totals) and moves to a collapsed **Paid off** section on the Loans page (`lpaid`); Build step 5
  shows a Paid off pill; the set-up checklist ignores it. The payoff month itself still shows the final
  payment. A linked lender reporting ≤ $0.50 sets `l.done` (month, saved), and `path()` stops after it, so a
  lender that later closes the account shows "Paid off …" instead of "Bank account not found".
- **Track from earlier** (`trackFrom`): when lender or bank payments exist before `l.start`, the card
  offers to move the start back; the start balance is walked back from the current opening balance
  (anchor) with those payments (minimum where none). The anchor still resets the link month.
- **Hand-added loans** (no `acct`) can link bank payments like bills (`lnkOpen('loan')` → rules to
  `l:<id>`; `LoanLinkLine` on the loan card, Build step 5, the pop-up). When a bank payment files
  into a month that only had a hand-logged amount, it replaces it (`rec.hand` keeps the old value;
  `txUndo` restores it), so a payment is never counted twice.
- Filing only covers transactions on/after `bankFrom`. Balance/investment history starts at the
  first sync after connecting.
- Liabilities covers student loans, mortgages and cards only; enter APR/minimum for auto and
  personal loans by hand.
- **Ideas not built yet:** separate logins per household member.
