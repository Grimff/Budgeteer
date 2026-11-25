// Sample mode only: window.__app, every module's names in one object (shared variables read live and set through
// their setters), for poking at the app from the console or a test script (`with (__app) { … }`). Nothing in the app
// reads it: every file imports what it uses.
import * as core from './lib/core.js';
import * as math from './lib/math.js';
import * as budget from './lib/budget.js';
import * as loans from './lib/loans.js';
import * as goals from './lib/goals.js';
import * as history from './lib/history.js';
import * as flow from './lib/flow.js';
import * as events from './lib/events.js';
import * as bank from './lib/bank.js';
import * as build from './lib/build.js';
import * as goalAccounts from './lib/goal-accounts.js';
import * as compare from './lib/compare.js';
import * as settings from './lib/settings.js';
import * as wealth from './lib/wealth.js';
import * as linkedLoans from './lib/linked-loans.js';
import * as alerts from './lib/alerts.js';
import * as csvImport from './lib/csv-import.js';
import * as subs from './lib/subs.js';
import * as calendar from './lib/calendar.js';
import * as sample from './lib/sample.js';
import * as serverSync from './lib/server-sync.js';
import * as named from './named.jsx';

export function appNamespace() {
  const app = {};
  for (const M of [core, math, budget, loans, goals, history, flow, events, bank, build, goalAccounts, compare, settings, wealth, linkedLoans, alerts, csvImport, subs, calendar, sample, serverSync, named])
    for (const k of Object.keys(M)) {
      // a shared variable: its module exports set<k>, and its value isn't a function
      const set = typeof M['set' + k] === 'function' && typeof M[k] !== 'function' ? M['set' + k] : null;
      Object.defineProperty(app, k, { get: () => M[k], set: set ? v => { set(v); } : undefined, enumerable: true });
    }
  return app;
}
