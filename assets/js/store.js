// Demo wallet + positions. Lives only in this browser (localStorage); no server, no real money.
const KEY = 'pkp.demo.v1';
const START = 1000;

let state = load();
const subs = new Set();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { balance: START, positions: [] };
}

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* ignore */ }
  subs.forEach((fn) => fn(state));
}

export const getState = () => state;
export const subscribe = (fn) => { subs.add(fn); return () => subs.delete(fn); };

export function reset() {
  state = { balance: START, positions: [] };
  save();
}

// Buy `stake` PK$ of an outcome at `price` (0–1). Shares pay PK$ 1 each if the outcome wins.
export function placeBet({ eventSlug, eventTitle, marketId, marketLabel, outcome, outcomeIndex, tokenId, price, stake, image }) {
  if (stake > state.balance + 1e-9) throw new Error('insufficient');
  const shares = stake / price;
  state.balance = +(state.balance - stake).toFixed(2);
  state.positions.unshift({
    id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    at: Date.now(),
    eventSlug, eventTitle, marketId, marketLabel, outcome, outcomeIndex, tokenId, image,
    price, stake, shares,
    status: 'open', // open | cashed | won | lost
    exitValue: null,
  });
  save();
  return state.positions[0];
}

export function cashOut(id, bidPrice) {
  const p = state.positions.find((x) => x.id === id);
  if (!p || p.status !== 'open') return null;
  const value = +(p.shares * bidPrice).toFixed(2);
  p.status = 'cashed';
  p.exitValue = value;
  p.exitAt = Date.now();
  state.balance = +(state.balance + value).toFixed(2);
  save();
  return value;
}

// Settle open positions on a market that Polymarket has resolved (outcome price 1 or 0).
export function settle(marketId, prices, closed) {
  if (!closed) return false;
  let changed = false;
  state.positions.forEach((p) => {
    if (p.status !== 'open' || p.marketId !== marketId) return;
    const final = prices[p.outcomeIndex];
    if (final >= 0.99) {
      p.status = 'won'; p.exitValue = +p.shares.toFixed(2);
      state.balance = +(state.balance + p.exitValue).toFixed(2);
      changed = true;
    } else if (final <= 0.01) {
      p.status = 'lost'; p.exitValue = 0; changed = true;
    }
  });
  if (changed) save();
  return changed;
}
