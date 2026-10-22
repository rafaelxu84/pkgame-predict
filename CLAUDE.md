# PK.GAME Predict — prototype

Feasibility prototype: Polymarket-style prediction markets inside PK.GAME (operator based in Armenia).
Live Polymarket market data, demo bets only (no real money, no wallet). Owner: Rafa (works in Chinese + English).

## Status
- Built and smoke-tested with mocked API data (desktop 1440 + mobile 390, no console errors).
- NOT yet tested against live Polymarket data, NOT yet pushed to GitHub.
- Next steps:
  1. Repo is initialised and committed locally (commit 59bb813), but has NO remote yet. Commit CLAUDE.md, then `gh repo create pkgame-predict --public --source=. --push` (ask Rafa which account/org).
  2. Enable GitHub Pages (branch `main`, root): `gh api -X POST repos/<owner>/pkgame-predict/pages -f "source[branch]=main" -f "source[path]=/"`
  3. Open the Pages URL and test end to end with live data (list, categories, search, detail, chart, book, demo bet, My bets, EN/中文, phone width).

## Stack
Plain static site, no build. ES modules. Run locally: `python3 -m http.server 8000`.
- `assets/css/pkgame-ds.css` — PKGAME DS 2.4 player dark theme, copied verbatim from the RTP Ranking prototype. Do not edit.
- `assets/css/app.css` — prototype layout; use DS tokens (`--bg-0..4`, `--fg-0..4`, `--brand-cyan` #0FBFD5, `--win` #00D68F, `--loss` #FF8CA0, `--warn`, `--sp-*`, `--r-*`) and DS classes (`pk-card`, `pk-odds`, `pk-chip`, `pk-segment`, `pk-button[data-variant]`, `pk-stat`, `pk-toast`, `pk-tabbar-item`, `pk-navpills`).
- `assets/js/api.js` — Polymarket calls + normalisation. `app.js` views/router/bet slip. `store.js` demo wallet (localStorage, PK$ 1,000). `chart.js` SVG chart. `i18n.js` EN/ZH strings + formatters (`?lang=zh`). `about.js` "How it works" page.
- Currency shown to players is PK$ (not R$).

## Polymarket API (public, no key, CORS allowed from browsers)
- Gamma `GET https://gamma-api.polymarket.com/events` (`tag_slug`, `order`=volume24hr|liquidity|endDate|startDate, `active=true&closed=false`), `/events?slug=`, `/public-search?q=`
- CLOB `GET https://clob.polymarket.com/book?token_id=` (bids ascending, asks descending — best is last), `/prices-history?market=<token>&interval=1d|1w|1m|max&fidelity=<min>`
- `GET https://polymarket.com/api/geoblock` → `{blocked, country, region}` by caller IP. Armenia is not on the blocked list; US/UK/FR/SG/TH etc. are close-only.
- Data quirks handled: `outcomes`/`outcomePrices`/`clobTokenIds` are JSON strings; `bestAsk=1` or `bestBid` null/0 means that side is empty (buy price = null, button disabled); `negRisk` events = mutually exclusive set (sorted by chance); non-negRisk sports events can have 300+ markets grouped by `sportsMarketType` (moneyline, spreads, totals, props).
- Buy price: outcome 0 at `bestAsk`, outcome 1 at `1 - bestBid`. Cash-out at the bid side.

## Known limits / later
Market titles are English only; no server-side cache/proxy; no WebSocket; demo bets ignore book depth.
Production options discussed: display-only, house-priced own book using Polymarket odds, or routing via Polymarket Builder program (user wallets, pUSD on Polygon, builder fee up to 1% taker / 0.5% maker). Kalshi is data-only for us (trading needs a licensed FCM). Licensing review for Armenia needed before real money.
