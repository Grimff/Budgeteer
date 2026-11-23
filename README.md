# Budgeteer

A self-hosted household budget that runs as a web page on your own computer or server. Everyone
on your network sees the same budget, every change is saved to a JSON file you control, and bank
transactions come in automatically through [Plaid](https://plaid.com).

- One HTML file for the app, one small Node server, **no npm dependencies, no build step**.
- Your budget and bank data never leave your machine. The only outside connection is Plaid.

```
budgeteer/
├── app/
│   ├── server.js               tiny server (Node 18+), reads settings from .env
│   └── public/index.html       the whole app
├── brand/                      logo and icons
├── tools/                      checks and local test servers (see CLAUDE.md)
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
npm start          # or: node app/server.js
```

Open <http://localhost:8095>. Data is saved in `./data`.

**With Docker:**

```sh
docker compose up -d --build
```

Open `http://localhost:8095` (or `http://YOUR-SERVER-IP:8095` from other devices). Data is saved
in `./data` next to the compose file. Change the port with `HOST_PORT` in `.env`.

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

## Updating

Edit `app/public/index.html` and reload the page; no restart needed. If you change `server.js`,
restart (`npm start` again, or `docker compose up -d --build`). Run `npm run check` after every edit.

## Notes

- For use away from home, put it behind a VPN (like Tailscale) or a reverse proxy with HTTPS, and
  turn on `BASIC_AUTH` first.
- Download a backup any time from Settings; daily copies are also kept in `data/backups/`.
