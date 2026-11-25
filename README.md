# Budgeteer

A self-hosted household budget that runs as a web page on your own computer or server. Everyone
on your network sees the same budget, every change is saved to a JSON file you control, and bank
transactions come in automatically through [Plaid](https://plaid.com).

- A web app whose screens are React, and one small Node server with **no npm dependencies**. The screens are built
  once with esbuild (`npm install` then `npm start` does it; Docker does it inside the image).
- Your budget and bank data never leave your machine. The only outside connection is Plaid.

```
budgeteer/
├── app/
│   ├── server.js               tiny server (Node 18+), reads settings from .env
│   ├── src/                    the app's code: React screens and lib/ (one module per area), built into
│   │                           public/dist/app.js by tools/build.js
│   └── public/                 what the browser loads: index.html, css/, fonts/, icons/, dist/
├── brand/                      logo and icons
├── tools/                      npm test, checks and local test servers (see CLAUDE.md)
├── .env.example                copy to .env and add your Plaid keys
├── docker-compose.yml          run it with Docker
├── Dockerfile
└── data/                       NOT in git: budget, bank data, Plaid tokens
```

## 1. Add your Plaid keys

1. Sign up at [dashboard.plaid.com](https://dashboard.plaid.com) and open **Developers → Keys**.
2. Copy the example settings and fill them in:
   ```sh
   cp .env.example .env
   ```
   Set `PLAID_CLIENT_ID`, `PLAID_SECRET` and `PLAID_ENV` (`sandbox` to try it with Plaid's test bank,
   `production` for your real banks; the secret differs per environment). Set
   `BASIC_AUTH=you:a-good-password` so only your household can open it.

`.env` and `data/` are git-ignored. Never commit them.

## 2. Run it

**With Node** (18 or newer):

```sh
npm install        # once: the tools that build the screens (nothing is installed on the server itself)
npm start          # builds the screens, then starts the server
```

Open <http://localhost:8095>. Data is saved in `./data`.

**With Docker:**

```sh
docker compose up -d --build
```

Open `http://localhost:8095` (or `http://YOUR-SERVER-IP:8095` from other devices). Data is saved
in `./data` next to the compose file, or wherever `DATA_PATH` in `.env` points (a NAS share, say; add
`DATA_REQUIRED=1` so it waits for the share instead of starting empty). Change the port with `HOST_PORT` in `.env`.

## 3. Use it

The footer should say **Version 1 · Saved to the server**. The first browser
to open an empty server saves its budget there; after that everyone loads the same copy.
If two people edit at the same moment, the app keeps the server's copy and re-applies.

## Options (`.env`)

| Setting | What it does |
|---|---|
| `BASIC_AUTH` | `user:password` for the page. The browser asks once and remembers. |
| `PORT` / `HOST_PORT` | Port for `npm start` / for Docker. |
| `DATA_DIR` | Where data is saved for `npm start` (Docker always uses `./data`). |
| `TZ` | Your time zone, like `America/New_York`. |
| `BACKUPS_KEEP` | Days of daily backups kept in `data/backups/` (default 90). |
| `BANK_SYNC_HOURS` | Hours between bank syncs until you pick one in Settings (default 1). |
| `BANK_DETAIL_HOURS` | Hours between refreshes of loan details and investment holdings on automatic syncs (default 24). **Sync now** always refreshes them. |
| `BANK_HISTORY_DAYS` | Days of history pulled when you connect a new bank (default 365). |
| `PLAID_COUNTRIES`, `PLAID_REDIRECT_URI` | Optional Plaid settings. |
| `NOTIFY_URL`, `NOTIFY_AUTH` | Phone alerts (see below). |

## Bank sync (Plaid)

With the keys in `.env`, restart the app, open the **Bank** tab and click **Connect a bank** (from a
computer). Transactions sync every hour by default (Settings → Connections → Refresh bank data) and
are stored in `data/bank-transactions.json`. Bank sign-in tokens are kept in
`data/bank-connections.json`: don't share that file.

**Loans and investments.** Turn on the **Liabilities** and **Investments** products for your Plaid
account in the Plaid dashboard (both are paid add-ons). Then:

- **Loans:** connect your loan servicers and lenders with **Connect a lender** on the Loans tab, and
  click **Track** on each loan account. Student loans and mortgages fill in their APR, minimum and due
  date; payments are picked up from the balance on their own. A bank you connected earlier shows an
  **Allow** button for loan details (one quick sign-in).
- **Teach it once:** on the Budget tab, use **Link payment** on a bill (Power → your electric
  company), **Flag a deposit** on an income (a paycheck → its direct deposit) and **Link stores** on
  groceries or flex items (Food → your grocery stores). Every match since your review start date is
  filed, and new ones file themselves. In Bank review, tick **Always** to do the same from there.
  Rules are listed (and editable) at the bottom of the Bank tab.
- **Everything else** you buy rolls into Flex spending until you link its store. Click any actual
  amount, "Paid" or "Received" on the Budget tab to see the transactions behind it and move one to
  another category. Charges that repeat every month show up above Fixed bills as "Looks like a bill or
  subscription", with **Add as bill**.
- **Your categories and rules are editable.** Rename, add or delete groceries and flex items in the
  check-in. Every rule (its text, category and amount range) can be changed in the Rules card at the
  bottom of the Bank tab, and what it filed is re-filed.
- **Paid early or late?** In a category's pop-up, **Move** a transaction and pick the month it counts
  in. For rent and paychecks, tick "count ones made in the last 5 days of a month toward the next
  month" when linking (or set it in the Rules card) and it happens on its own.
- **Setting up?** Budget tab → **Build budget**. Add income, bills and spending categories once for
  all months, link them, and accept the suggested paychecks, bills and stores.
- **Savings, brokerage and retirement goals:** Goals tab → **Accounts for goals**. Split one account
  between goals by priority (fill in order) or by percent. For an account the app can't see, use
  **Flag transfers** on the goal.
- **Where did we miss?** On the money-flow chart, **Compare** shows each line against its plan, worst
  first. Click anything for its stores, visits and 6-month history.
- **Card and loan payments** from checking are paired with the payment arriving on the card or loan
  and filed as transfers, so they're never counted twice.
- **Brokerages:** use **Connect a brokerage** on the Wealth tab. The Wealth tab shows net worth, bank
  balances, holdings and how your investments did with deposits left out. Balance history starts the
  day you connect.

## Accounts without Plaid (CSV import)

Settings → Connections → **Import from a CSV file**. Download transactions from the bank's website as CSV, pick
the file, check the guessed columns against the preview (purchases should be under **Out**), choose or name the
account, and import. Import again whenever you like: rows already imported are skipped. Imported accounts are
filed, budgeted and shown in Wealth and Loans like connected ones. This works without any Plaid keys.

## Alerts

The Budget tab's **Needs a look** card lists what needs attention this month: a bank that needs you to sign in
again, a linked bill that hasn't shown up by its due day (or is due within 3 days), a spending category over plan,
and transactions to sort. **Hide** removes one in that browser.

To get them on your phone, set `NOTIFY_URL` in `.env` and restart:

- **ntfy:** `NOTIFY_URL=https://ntfy.sh/pick-a-long-random-topic` (or your own ntfy server), and subscribe to that
  topic in the ntfy app. For a protected topic, set `NOTIFY_AUTH=Bearer tk_...`.
- **Home Assistant:** `NOTIFY_URL=http://homeassistant.local:8123/api/webhook/your-id`, with an automation that
  sends `{{ trigger.json.title }}` / `{{ trigger.json.message }}` to your phone.

Each alert is sent once. Alerts about bills and spending go out after a bank refresh while the app is open in a
browser somewhere; bank sign-in problems are sent by the server itself. Settings → Connections → **Phone alerts**
has a test button.

## Backups

The server keeps a copy of the budget each day (`BACKUPS_KEEP` days) in `data/backups/`. Settings → General →
**Restore a daily copy** lists them; restoring keeps the budget from just before as its own copy, so you can switch
back. **Download backup** / **Restore from a file** work with a file you keep yourself.

## On your phone

Open the app in your phone's browser and use **Add to Home Screen** (Safari's Share menu, or Chrome's menu). It opens
full-screen with its own icon.

## Updating

Edit files in `app/public/` and reload the page; no restart needed. After changing a screen in `app/src/`, run
`npm run build` (or keep `npm run watch` running) and reload. If you change `server.js`, restart (`npm start` again,
or `docker compose up -d --build`). Run `npm test` after every change.

## Trying things out and checking the math

- **Sample data:** open `http://YOUR-SERVER:8095/?demo` (or Settings → Data & math → **Try sample data**) for a
  made-up household with seven months of bank activity. Nothing is saved and your real budget isn't touched.
- **Self-test:** `?selftest` loads the same household and checks the budget math, filing, loans, goals and every
  screen, then lists the results. `npm test` runs it too (needs Chrome, Chromium or Edge installed).

## Notes

- For use away from home, put it behind a VPN (like Tailscale) or a reverse proxy with HTTPS, and
  turn on `BASIC_AUTH` first.
- Download a backup any time from Settings; daily copies are also kept in `data/backups/`.
