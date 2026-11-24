// goals: moved from app/public/js/goals.js unchanged except `export`. Its top-level let/var stay there (shared state the
// classic files reassign); everything else here reads the app's globals by name as before, and dist/goals.js puts these
// exports on the global object (lib/goals.global.js) so the classic files and the React screens still call them by name.
// globals: each function is on the global object before any code here runs, each const right after its line, as in a classic script.

/* ---------- render: goals ---------- */
// Goal timeline: % of target by month for each goal with a target (history from 6 months back, projection after).

