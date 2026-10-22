// Polymarket public, read-only endpoints. No API key, no wallet.
// Gamma  = market catalogue (events, markets, tags, search)
// CLOB   = order book + price history
// Both send CORS headers, so the browser can call them directly.

export const ENDPOINTS = {
  gamma: 'https://gamma-api.polymarket.com',
  clob: 'https://clob.polymarket.com',
  geoblock: 'https://polymarket.com/api/geoblock',
};

const stats = { calls: 0, errors: 0, lastMs: 0, lastAt: 0 };
export const apiStats = () => ({ ...stats });

async function getJSON(url, { timeout = 12000 } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  const t0 = performance.now();
  stats.calls++;
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    stats.lastMs = Math.round(performance.now() - t0);
    stats.lastAt = Date.now();
    return data;
  } catch (err) {
    stats.errors++;
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

const qs = (o) =>
  Object.entries(o)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');

// ---------- normalisation ----------

const parseArr = (v) => {
  if (Array.isArray(v)) return v;
  try { return JSON.parse(v || '[]'); } catch { return []; }
};
const num = (v) => (v === undefined || v === null || v === '' ? null : Number(v));

// Price to BUY each outcome. Outcome 0 buys at best ask; outcome 1 buys at (1 - best bid).
// bestAsk = 1 or bestBid = 0/null means that side of the book is empty → nothing to buy (null).
function buyPrices(outcomes, prices, bestBid, bestAsk, hasBook) {
  const ok = (p) => (p > 0 && p < 0.999 ? +p.toFixed(4) : null);
  return outcomes.map((_, i) => {
    if (!hasBook) return ok(prices[i]);
    if (i === 0) return bestAsk !== null ? ok(bestAsk) : null;
    if (i === 1) return bestBid ? ok(1 - bestBid) : null;
    return ok(prices[i]);
  });
}

export function normMarket(m) {
  const outcomes = parseArr(m.outcomes);
  const prices = parseArr(m.outcomePrices).map(Number);
  const tokens = parseArr(m.clobTokenIds);
  const bestBid = num(m.bestBid);
  const bestAsk = num(m.bestAsk);
  const buy = buyPrices(outcomes, prices, bestBid, bestAsk, bestBid !== null || bestAsk !== null);
  return {
    id: m.id,
    slug: m.slug,
    question: m.question,
    label: m.groupItemTitle || m.question,
    description: m.description || '',
    resolutionSource: m.resolutionSource || '',
    image: m.image || m.icon || '',
    endDate: m.endDate || m.endDateIso || null,
    outcomes,
    prices,
    tokens,
    buy,
    bestBid,
    bestAsk,
    lastTrade: num(m.lastTradePrice),
    change1d: num(m.oneDayPriceChange),
    volume: num(m.volumeNum ?? m.volume) || 0,
    volume24h: num(m.volume24hr) || 0,
    liquidity: num(m.liquidityNum ?? m.liquidity) || 0,
    active: !!m.active,
    closed: !!m.closed,
    accepting: m.acceptingOrders !== false && !!m.active && !m.closed,
    tick: num(m.orderPriceMinTickSize) || 0.01,
    minSize: num(m.orderMinSize) || 5,
    negRisk: !!m.negRisk,
    type: m.sportsMarketType || m.marketType || '',
    umaStatus: m.umaResolutionStatus || '',
  };
}

export function normEvent(e) {
  const markets = (e.markets || []).map(normMarket);
  // Hide markets that never opened; keep closed ones so resolved outcomes still show.
  const shown = markets.filter((m) => m.tokens.length && (m.active || m.closed));
  // Mutually-exclusive sets (negRisk, e.g. "Who wins…?") read best sorted by chance.
  // Everything else (e.g. a game with moneyline / spreads / totals, or a price ladder) keeps Polymarket's order.
  if (e.negRisk) shown.sort((a, b) => (b.prices[0] || 0) - (a.prices[0] || 0));
  const openMarkets = shown.filter((m) => !m.closed);
  const isGame = shown.some((m) => m.type);
  // Headline market for cards and the detail page:
  // - games: the open 'moneyline' (esports list per-game winners before the series winner)
  // - ladders (price or date strikes that aren't one exclusive set): the strike closest to 50%
  // - otherwise the first open market (negRisk sets are sorted by chance)
  const evenness = (m) => Math.abs((m.prices[0] ?? 0) - 0.5);
  const ladder = !e.negRisk && !isGame && openMarkets.length > 1;
  const main = (!e.negRisk && isGame && openMarkets.find((m) => m.type === 'moneyline'))
    || (ladder && openMarkets.reduce((a, b) => (evenness(b) < evenness(a) ? b : a)))
    || openMarkets[0] || shown[0];
  return {
    id: e.id,
    slug: e.slug,
    title: e.title,
    description: e.description || '',
    resolutionSource: e.resolutionSource || '',
    image: e.image || e.icon || '',
    endDate: e.endDate || null,
    volume: num(e.volume) || 0,
    volume24h: num(e.volume24hr) || 0,
    liquidity: num(e.liquidity) || 0,
    closed: !!e.closed,
    negRisk: !!e.negRisk,
    tags: (e.tags || []).map((t) => ({ slug: t.slug, label: t.label })),
    markets: shown,
    openMarkets,
    main,
    isGame,
  };
}

// ---------- calls ----------

export const SORTS = {
  volume: { order: 'volume24hr', ascending: false },
  liquidity: { order: 'liquidity', ascending: false },
  ending: { order: 'endDate', ascending: true },
  new: { order: 'startDate', ascending: false },
};

export async function listEvents({ tag = '', sort = 'volume', limit = 24, offset = 0 } = {}) {
  const s = SORTS[sort] || SORTS.volume;
  const params = {
    limit, offset, active: true, closed: false, archived: false,
    order: s.order, ascending: s.ascending, tag_slug: tag || undefined,
  };
  if (sort === 'ending') params.end_date_min = new Date().toISOString();
  const data = await getJSON(`${ENDPOINTS.gamma}/events?${qs(params)}`);
  // `fetched` (before filtering) tells the caller whether another page exists
  return { events: data.map(normEvent).filter(isTradable), fetched: data.length };
}

// Gamma keeps finished games "active" for a while (all markets closed, or only empty-book props
// left), so lists skip events with nothing to buy. Their detail pages still open from a link.
const isTradable = (e) => e.openMarkets.some((m) => m.accepting && m.buy.some(Boolean));

export async function getEvent(slug) {
  const data = await getJSON(`${ENDPOINTS.gamma}/events?${qs({ slug })}`);
  if (!data.length) throw new Error('Event not found');
  return normEvent(data[0]);
}

export async function search(q) {
  const data = await getJSON(`${ENDPOINTS.gamma}/public-search?${qs({ q, limit_per_type: 20, events_status: 'active' })}`);
  return (data.events || []).map(normEvent).filter(isTradable);
}

export async function getBook(tokenId) {
  // The book's own last_trade_price is shared by both tokens of a market (it can be the other
  // side's price), so the last trade comes from the per-token endpoint.
  const [b, lt] = await Promise.all([
    getJSON(`${ENDPOINTS.clob}/book?${qs({ token_id: tokenId })}`),
    getJSON(`${ENDPOINTS.clob}/last-trade-price?${qs({ token_id: tokenId })}`).catch(() => null),
  ]);
  // CLOB returns bids ascending and asks descending — best level is last in both.
  const bids = (b.bids || []).map((l) => ({ p: +l.price, s: +l.size })).sort((x, y) => y.p - x.p);
  const asks = (b.asks || []).map((l) => ({ p: +l.price, s: +l.size })).sort((x, y) => x.p - y.p);
  return { bids, asks, tick: +b.tick_size || 0.01, last: lt && +lt.price > 0 ? +lt.price : null };
}

// Gamma's bestBid/bestAsk can trail the CLOB by a minute or more, which is too slow for
// in-play games. Re-derive a market's prices from a live book for its outcome `oi` token.
export function bookPrices(m, oi, book) {
  const bid = book.bids.length ? book.bids[0].p : null;
  const ask = book.asks.length ? book.asks[0].p : null;
  // Outcome 1's book mirrors outcome 0's: its bids are outcome-0 asks at 1 - p, and vice versa.
  const flip = (p) => (p === null ? null : +(1 - p).toFixed(4));
  const bestBid = oi === 0 ? bid : flip(ask);
  const bestAsk = oi === 0 ? ask : flip(bid);
  const patch = { bestBid, bestAsk, buy: buyPrices(m.outcomes, m.prices, bestBid, bestAsk, true) };
  // Chance = midpoint while the spread is tight (≤ 10¢, as polymarket.com does); else keep Gamma's.
  if (bestBid !== null && bestAsk !== null && bestAsk - bestBid <= 0.1) {
    const mid = +((bestBid + bestAsk) / 2).toFixed(4);
    patch.prices = [mid, flip(mid)];
  }
  return patch;
}

export const RANGES = {
  '1D': { interval: '1d', fidelity: 5 },
  '1W': { interval: '1w', fidelity: 60 },
  '1M': { interval: '1m', fidelity: 240 },
  ALL: { interval: 'max', fidelity: 720 },
};

export async function getHistory(tokenId, range = '1W') {
  const r = RANGES[range] || RANGES['1W'];
  const d = await getJSON(`${ENDPOINTS.clob}/prices-history?${qs({ market: tokenId, interval: r.interval, fidelity: r.fidelity })}`);
  return (d.history || []).map((h) => ({ t: h.t * 1000, p: h.p }));
}

export async function getGeo() {
  return getJSON(ENDPOINTS.geoblock, { timeout: 6000 });
}
