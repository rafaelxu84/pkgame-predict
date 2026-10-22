# PK.GAME Predict — prototype

Feasibility prototype: Polymarket-style prediction markets inside PK.GAME (operator based in Armenia).
Live Polymarket market data, demo bets only (no real money, no wallet). Owner: Rafa (works in Chinese + English).

## Status
- 2026-10-22: tested end to end against live Polymarket data on the local server (widths 1024, 1440, 390): list, all 11 categories, 4 sorts, load more, search, detail (negRisk set, live esports game, price ladder), chart ranges, book, demo bet, cash-out, My bets, EN/中文, How it works, slip edge cases. No console errors. Bugs found are fixed in commit 0721069.
- Published on Rafa's **personal** GitHub account (not the Spolith org): repo https://github.com/rafaelxu84/pkgame-predict (public), GitHub Pages from `main` root → https://rafaelxu84.github.io/pkgame-predict/ . Pushing to `main` redeploys Pages in ~1 min.
- Same checklist re-run on the Pages URL with live data (incl. bet + cash-out on a live CS2 match, 中文, 390 width): all OK.
- This Mac has no Homebrew; gh 2.103.0 is at `~/.local/bin/gh` (not on PATH), logged in as `rafaelxu84`, and is git's credential helper for github.com.
- Commits are authored `Rafa <rafa@Rafaels-MacBook-Pro.local>` (no git user.email set), so GitHub doesn't link them to Rafa's account.
- Not yet checked: a real phone; auto-settlement of a demo bet when Polymarket resolves the market.

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
- Found with live data (all handled):
  - Gamma `bestBid`/`bestAsk`/`outcomePrices` (and `prices-history`) lag the CLOB by 1–4 min; a live esports match was 15¢ off. The selected detail market, the open slip and open positions are priced from the CLOB book (`api.bookPrices`, `S.books` cache with 45 s TTL re-applied in `indexEvents`). List cards still show Gamma prices.
  - `/book`'s `last_trade_price` is shared by both tokens of a market (can be the other side's price) → use `/last-trade-price?token_id=`.
  - Esports events list per-game winners (`child_moneyline`) before the series `moneyline` → `e.main` picks the moneyline. Non-negRisk events without `sportsMarketType` are ladders (price/date strikes) → `e.main` is the strike closest to 50%; cards show the 3 most even strikes.
  - Finished games stay `active=true, closed=false` for a while with every market closed or only empty-book props left → lists filter with `isTradable`.

## Known limits / later
Market titles are English only; no server-side cache/proxy; no WebSocket; demo bets ignore book depth.
Production options discussed: display-only, house-priced own book using Polymarket odds, or routing via Polymarket Builder program (user wallets, pUSD on Polygon, builder fee up to 1% taker / 0.5% maker). Kalshi is data-only for us (trading needs a licensed FCM). Licensing review for Armenia needed before real money.
