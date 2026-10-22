import * as api from './api.js';
import {
  t, getLang, setLang, applyStatic, fmtUSD, fmtPK, fmtPct, fmtCents, fmtOdds,
  fmtDate, fmtTime, fmtEnds, outcomeName,
} from './i18n.js';
import * as store from './store.js';
import { renderChart } from './chart.js';
import { renderAbout } from './about.js';

// ---------------------------------------------------------------- config

const CATS = [
  { key: 'trending', tag: '' },
  { key: 'politics', tag: 'politics' },
  { key: 'sports', tag: 'sports' },
  { key: 'soccer', tag: 'soccer' },
  { key: 'crypto', tag: 'crypto' },
  { key: 'economy', tag: 'economy' },
  { key: 'esports', tag: 'esports' },
  { key: 'tech', tag: 'tech' },
  { key: 'pop', tag: 'pop-culture' },
  { key: 'weather', tag: 'weather' },
  { key: 'geo', tag: 'geopolitics' },
];
const SORT_KEYS = ['volume', 'liquidity', 'ending', 'new'];
const PAGE = 24;
const DETAIL_REFRESH_S = 15;
const LIST_REFRESH_S = 60;
const BOOK_TTL_MS = 45000;

// ---------------------------------------------------------------- state

const S = {
  view: 'list',
  cat: 'trending',
  sort: 'volume',
  q: '',
  events: [],
  offset: 0,
  hasMore: true,
  loading: false,
  error: null,
  detail: null, // { slug, event, marketId, oi, range, book, history }
  slip: null, // { event, market, oi, stake }
  geo: null,
  feedOk: null,
  timers: [],
  marketIndex: new Map(), // marketId -> { event, market }
  books: new Map(), // marketId -> { oi, book, at } — live CLOB books, fresher than Gamma
};

const $ = (sel, root = document) => root.querySelector(sel);
const main = $('#main');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const ICON = {
  back: '<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 18l-6-6 6-6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  close: '<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
  search: '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="2"/><path d="M20 20l-3.5-3.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  ext: '<svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  ok: '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  warn: '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 8v5M12 16.5v.01" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
};

function clearTimers() { S.timers.forEach(clearInterval); S.timers = []; }
function every(sec, fn) { S.timers.push(setInterval(() => { if (!document.hidden) fn(); }, sec * 1000)); }

// Gamma's prices can trail the CLOB by a minute or more, so any market with a recently
// fetched book keeps trading at that book when fresh Gamma data arrives.
function indexEvents(events) {
  events.forEach((e) => e.markets.forEach((m) => {
    const lb = S.books.get(m.id);
    if (lb && !m.closed && Date.now() - lb.at < BOOK_TTL_MS) Object.assign(m, api.bookPrices(m, lb.oi, lb.book));
    S.marketIndex.set(m.id, { event: e, market: m });
  }));
}

function useBook(m, oi, book) {
  S.books.set(m.id, { oi, book, at: Date.now() });
  Object.assign(m, api.bookPrices(m, oi, book));
}

async function fetchBook(m, oi) {
  const book = await api.getBook(m.tokens[oi]);
  // apply to whatever object currently represents this market (a refresh may have replaced it)
  useBook(S.marketIndex.get(m.id)?.market || m, oi, book);
  return book;
}

// ---------------------------------------------------------------- toasts

function toast(msg, kind = 'success') {
  const host = $('#toasts');
  const n = document.createElement('div');
  n.className = 'pk-toast app-toast';
  n.dataset.kind = kind;
  n.setAttribute('role', 'status');
  n.innerHTML = `<span class="pk-toast-icon">${kind === 'error' ? ICON.warn : ICON.ok}</span><span class="pk-toast-message">${esc(msg)}</span>`;
  host.append(n);
  setTimeout(() => { n.dataset.state = 'closed'; setTimeout(() => n.remove(), 300); }, 3200);
}

// ---------------------------------------------------------------- header / status

function renderBalance() {
  $('#balance').textContent = fmtPK(store.getState().balance);
}

function renderStatus() {
  const bar = $('#statusbar');
  const st = api.apiStats();
  const parts = [];
  if (S.feedOk === false) {
    parts.push(`<span class="status-item" data-tone="loss"><i class="status-dot"></i>${esc(t('feedErr'))}</span>`);
  } else if (S.feedOk) {
    parts.push(`<span class="status-item" data-tone="win"><i class="status-dot"></i>${esc(t('feedOk', { ms: st.lastMs }))}</span>`);
  }
  if (S.geo && S.geo.country) {
    const where = t('geo', { c: S.geo.country, r: S.geo.region ? `-${S.geo.region}` : '' });
    parts.push(`<span class="status-item">${esc(where)}</span>`);
    parts.push(`<span class="status-item" data-tone="${S.geo.blocked ? 'warn' : 'win'}">${esc(S.geo.blocked ? t('geoBlocked') : t('geoOk'))}</span>`);
  }
  if (st.lastAt) parts.push(`<span class="status-item status-time">${esc(t('updated', { t: fmtTime(st.lastAt) }))}</span>`);
  bar.innerHTML = parts.join('');
}

function setNav(active) {
  document.querySelectorAll('[data-nav]').forEach((a) => {
    if (a.dataset.nav === active) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
}

// ---------------------------------------------------------------- shared bits

function oddsButton(event, m, i, { compact = false } = {}) {
  const price = m.buy[i];
  const pressed = S.slip && S.slip.market.id === m.id && S.slip.oi === i;
  const disabled = !m.accepting || !price;
  const name = outcomeName(m.outcomes[i]);
  return `<button type="button" class="pk-odds app-odds${compact ? ' is-compact' : ''}" data-tone="${toneOf(m.outcomes[i])}"
    data-act="pick" data-mid="${esc(m.id)}" data-oi="${i}" aria-pressed="${pressed}" ${disabled ? 'disabled' : ''}
    aria-label="${esc(`${name} · ${m.label} · ${fmtCents(price)}`)}">
    <span>${esc(name)}</span><span>${fmtCents(price)}</span></button>`;
}

function toneOf(name) {
  if (name === 'Yes' || name === 'Up' || name === 'Over') return 'yes';
  if (name === 'No' || name === 'Down' || name === 'Under') return 'no';
  return 'neutral';
}

function changeBadge(ch) {
  if (ch === null || ch === undefined || Math.abs(ch) < 0.005) return '';
  const up = ch > 0;
  return `<span class="chg" data-tone="${up ? 'up' : 'down'}">${up ? '▲' : '▼'} ${Math.abs(Math.round(ch * 100))}</span>`;
}

function imgTag(src, cls) {
  return src
    ? `<img class="${cls}" src="${esc(src)}" alt="" loading="lazy" decoding="async" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'${cls} is-fallback'}))">`
    : `<span class="${cls} is-fallback"></span>`;
}

// ---------------------------------------------------------------- list view

function eventCard(e) {
  // One headline market (single market, or a game's moneyline) → big buttons; sets and ladders → rows.
  const binary = e.markets.length === 1 || (!e.negRisk && e.isGame);
  const m0 = binary ? e.main : e.markets[0];
  const yesNo = m0.outcomes[0] === 'Yes';
  const extra = binary ? e.markets.length - 1 : 0;
  const head = `
    <div class="mcard-head">
      ${imgTag(e.image, 'mcard-img')}
      <h3 class="mcard-title"><a href="#/e/${esc(e.slug)}">${esc(e.title)}</a></h3>
      ${binary && yesNo ? `<div class="mcard-gauge" style="--p:${Math.round((m0.prices[0] || 0) * 100)}"><b>${fmtPct(m0.prices[0])}</b><small>${esc(t('chance'))}</small></div>` : ''}
    </div>`;
  let body;
  if (binary) {
    body = `<div class="mcard-odds">${m0.outcomes.slice(0, 2).map((_, i) => oddsButton(e, m0, i)).join('')}</div>`;
  } else {
    // sets: the 3 likeliest; ladders: the 3 strikes closest to 50%, kept in Polymarket's order
    const evenness = (m) => Math.abs((m.prices[0] ?? 0) - 0.5);
    const top = e.negRisk
      ? e.openMarkets.slice(0, 3)
      : [...e.openMarkets].sort((a, b) => evenness(a) - evenness(b)).slice(0, 3)
        .sort((a, b) => e.openMarkets.indexOf(a) - e.openMarkets.indexOf(b));
    const more = e.openMarkets.length - top.length;
    body = `<ul class="mcard-outcomes">${top.map((m) => `
      <li>
        <span class="mo-label" lang="en">${esc(m.label)}</span>
        <span class="mo-pct num">${fmtPct(m.prices[0])}</span>
        ${oddsButton(e, m, 0, { compact: true })}${oddsButton(e, m, 1, { compact: true })}
      </li>`).join('')}</ul>
      ${more > 0 ? `<a class="mcard-more" href="#/e/${esc(e.slug)}">${esc(t('moreOutcomes', { n: more }))}</a>` : ''}`;
  }
  return `<article class="pk-card mcard" data-slug="${esc(e.slug)}">
    ${head}${body}
    <footer class="mcard-foot"><span>${esc(t('vol', { v: fmtUSD(e.volume) }))}${extra > 0 ? ` · ${esc(t('moreMarkets', { n: extra }))}` : ''}</span><span>${esc(fmtEnds(e.endDate))}</span></footer>
  </article>`;
}

function skeletonCards(n = 8) {
  return Array.from({ length: n }, () => `<div class="pk-card mcard is-skel" aria-hidden="true">
    <div class="mcard-head"><span class="pk-skeleton" style="width:44px;height:44px"></span><span class="pk-skeleton" style="height:36px;flex:1"></span></div>
    <div class="mcard-odds"><span class="pk-skeleton" style="height:44px"></span><span class="pk-skeleton" style="height:44px"></span></div>
    <span class="pk-skeleton" style="height:14px;width:50%"></span></div>`).join('');
}

function renderListShell() {
  const catChips = CATS.map((c) => `
    <label class="pk-chip" data-selected="${!S.q && S.cat === c.key}">
      <input type="radio" name="cat" value="${c.key}" ${!S.q && S.cat === c.key ? 'checked' : ''}>
      <span class="pk-chip-label">${esc(t(`cat_${c.key}`))}</span>
    </label>`).join('');
  main.innerHTML = `
    <section class="list-head">
      <fieldset class="pk-chip-group cat-row"><legend class="sr-only">Category</legend>
        <div class="pk-chip-list">${catChips}</div>
      </fieldset>
      <div class="list-tools">
        <form class="app-search" role="search" id="search-form">
          ${ICON.search}
          <input type="search" id="search-input" placeholder="${esc(t('searchPh'))}" value="${esc(S.q)}" aria-label="${esc(t('searchPh'))}" autocomplete="off">
        </form>
        <label class="app-select">
          <span class="sr-only">${esc(t('sortBy'))}</span>
          <select id="sort-select" ${S.q ? 'disabled' : ''}>
            ${SORT_KEYS.map((k) => `<option value="${k}" ${S.sort === k ? 'selected' : ''}>${esc(t(`sort_${k}`))}</option>`).join('')}
          </select>
        </label>
      </div>
      ${S.q ? `<div class="search-note"><span>${esc(t('searchFor', { q: S.q }))}</span><button type="button" class="pk-button" data-variant="text" data-size="sm" data-act="clear-search">${esc(t('clear'))}</button></div>` : ''}
    </section>
    <section class="market-grid" id="grid" aria-busy="${S.loading}"></section>
    <div class="pk-load-more" id="more"></div>`;
  renderGrid();
}

function renderGrid() {
  const grid = $('#grid');
  const more = $('#more');
  if (!grid) return;
  grid.setAttribute('aria-busy', String(S.loading));
  if (S.error && !S.events.length) {
    grid.innerHTML = `<div class="pk-empty app-empty"><h3>${esc(t('errTitle'))}</h3><p>${esc(t('errBody'))}</p>
      <button class="pk-button" data-variant="primary" data-act="retry" type="button">${esc(t('retry'))}</button></div>`;
    more.innerHTML = '';
    return;
  }
  if (!S.events.length && S.loading) { grid.innerHTML = skeletonCards(); more.innerHTML = ''; return; }
  if (!S.events.length) { grid.innerHTML = `<div class="pk-empty app-empty"><p>${esc(t('noResults'))}</p></div>`; more.innerHTML = ''; return; }
  grid.innerHTML = S.events.map(eventCard).join('');
  more.innerHTML = S.hasMore && !S.q
    ? `<button class="pk-button" data-variant="secondary" data-act="more" type="button" ${S.loading ? 'aria-busy="true"' : ''}><span class="pk-button-content">${esc(t('loadMore'))}</span></button>`
    : '';
}

async function loadList({ append = false, silent = false } = {}) {
  if (!append) { S.offset = 0; if (!silent) S.events = []; }
  S.loading = true; S.error = null;
  if (!silent) renderGrid();
  try {
    let rows;
    if (S.q) {
      rows = await api.search(S.q);
      S.hasMore = false;
    } else {
      const cat = CATS.find((c) => c.key === S.cat) || CATS[0];
      const page = await api.listEvents({ tag: cat.tag, sort: S.sort, limit: PAGE, offset: append ? S.offset : 0 });
      rows = page.events;
      S.hasMore = page.fetched >= PAGE;
    }
    indexEvents(rows);
    if (append) {
      const seen = new Set(S.events.map((e) => e.id));
      S.events = S.events.concat(rows.filter((e) => !seen.has(e.id)));
    } else {
      S.events = rows;
    }
    S.offset = (append ? S.offset : 0) + PAGE;
    S.feedOk = true;
  } catch (err) {
    S.error = err; S.feedOk = false;
  } finally {
    S.loading = false;
    if (S.view === 'list') renderGrid();
    renderStatus();
  }
}

function showList() {
  S.view = 'list';
  S.listHash = location.hash || '#/';
  setNav('markets');
  renderListShell();
  loadList();
  every(LIST_REFRESH_S, () => loadList({ silent: true }));
}

// ---------------------------------------------------------------- detail view

function selectedMarket() {
  const d = S.detail;
  return d.event.markets.find((m) => m.id === d.marketId) || d.event.markets[0];
}

function renderDetail() {
  const d = S.detail;
  if (!d || !d.event) return;
  const e = d.event;
  const m = selectedMarket();
  const binary = e.markets.length === 1;
  const resolved = e.markets.every((x) => x.closed);

  main.innerHTML = `
    <div class="detail">
      <nav class="detail-nav"><a class="pk-button" data-variant="text" data-size="sm" href="${esc(S.listHash || '#/')}">${ICON.back}<span>${esc(t('back'))}</span></a></nav>
      <header class="detail-head">
        ${imgTag(e.image, 'detail-img')}
        <div class="detail-headtext">
          <div class="detail-tags">${e.tags.slice(0, 4).map((tg) => `<span class="app-tag">${esc(tg.label)}</span>`).join('')}${resolved ? `<span class="app-tag" data-tone="warn">${esc(t('resolvedTag'))}</span>` : ''}</div>
          <h1 class="detail-title">${esc(e.title)}</h1>
          <dl class="detail-meta">
            <div><dt>${esc(t('volume'))}</dt><dd class="num">${fmtUSD(e.volume)}</dd></div>
            <div><dt>${esc(t('volume24'))}</dt><dd class="num">${fmtUSD(e.volume24h)}</dd></div>
            <div><dt>${esc(t('liquidity'))}</dt><dd class="num">${fmtUSD(e.liquidity)}</dd></div>
            <div><dt>${esc(t('endDate'))}</dt><dd>${esc(fmtDate(e.endDate))}</dd></div>
          </dl>
        </div>
      </header>

      <div class="detail-grid">
        <div class="detail-main">
          <section class="panel chart-panel" aria-labelledby="chart-h">
            <div class="panel-head">
              <div>
                <h2 class="panel-title" id="chart-h">${esc(binary ? m.question : m.label)}</h2>
                <div class="chart-now"><b class="num">${fmtPct(m.prices[0])}</b><span>${esc(m.outcomes[0] === 'Yes' ? t('chance') : `${outcomeName(m.outcomes[0])} · ${t('chance')}`)}</span>${changeBadge(m.change1d)}</div>
              </div>
              <fieldset class="pk-segment range-seg"><legend class="sr-only">${esc(t('chart'))}</legend>
                ${Object.keys(api.RANGES).map((r) => `<label data-selected="${d.range === r}"><input type="radio" name="range" value="${r}" ${d.range === r ? 'checked' : ''}><span class="pk-segment-label">${r}</span></label>`).join('')}
              </fieldset>
            </div>
            <div class="chart-host" id="chart"><span class="pk-skeleton" style="height:200px;display:block"></span></div>
          </section>

          <section class="panel" aria-labelledby="out-h">
            <div class="panel-head"><h2 class="panel-title" id="out-h">${esc(t('outcome'))}</h2><span class="panel-sub">${esc(t('prob'))}</span></div>
            ${outcomesHTML(e, m, binary)}
          </section>

          <section class="panel" aria-labelledby="rules-h">
            <div class="panel-head"><h2 class="panel-title" id="rules-h">${esc(t('rules'))}</h2></div>
            <div class="rules-text">${esc(m.description || e.description)}</div>
            <div class="rules-src">
              <span class="rules-src-label">${esc(t('resolution'))}</span>
              ${(m.resolutionSource || e.resolutionSource)
                ? `<a href="${esc(m.resolutionSource || e.resolutionSource)}" target="_blank" rel="noopener noreferrer">${esc(m.resolutionSource || e.resolutionSource)} ${ICON.ext}</a>`
                : `<span>${esc(t('resolutionNone'))}</span>`}
            </div>
          </section>
        </div>

        <aside class="detail-side">
          <section class="panel book-panel" aria-labelledby="book-h">
            <div class="panel-head">
              <h2 class="panel-title" id="book-h">${esc(t('book'))}</h2>
              <fieldset class="pk-segment book-seg"><legend class="sr-only">${esc(t('outcome'))}</legend>
                ${m.outcomes.slice(0, 2).map((o, i) => `<label data-selected="${d.oi === i}"><input type="radio" name="book-oi" value="${i}" ${d.oi === i ? 'checked' : ''}><span class="pk-segment-label">${esc(outcomeName(o))}</span></label>`).join('')}
              </fieldset>
            </div>
            <p class="panel-sub book-for">${esc(binary ? e.title : m.label)}</p>
            <div id="book">${bookHTML()}</div>
          </section>
          <p class="data-note">${esc(t('dataFrom', { s: DETAIL_REFRESH_S }))} · <a href="https://polymarket.com/event/${esc(e.slug)}" target="_blank" rel="noopener noreferrer">polymarket.com ${ICON.ext}</a></p>
        </aside>
      </div>
    </div>`;
  drawChart();
}


const TYPE_ORDER = ['moneyline', 'child_moneyline', 'spreads', 'totals', 'both_teams_to_score', 'first_half_moneyline', 'first_half_spreads', 'first_half_totals'];
const GROUP_LIMIT = 6;

function outcomeRow(e, x, m, binary) {
  return `
    <li class="outcome-row" data-selected="${x.id === m.id}" data-closed="${x.closed}">
      <button type="button" class="outcome-main" data-act="select-market" data-mid="${esc(x.id)}">
        ${!binary && x.image && x.image !== e.image ? imgTag(x.image, 'outcome-img') : ''}
        <span class="outcome-label">${esc(binary || !x.label ? x.question : x.label)}</span>
        <span class="outcome-pct num">${fmtPct(x.prices[0])}</span>
        ${changeBadge(x.change1d)}
      </button>
      <div class="outcome-odds">
        ${x.closed
          ? `<span class="app-tag" data-tone="${x.prices[0] >= 0.99 ? 'win' : 'muted'}">${esc(x.prices[0] >= 0.99 ? outcomeName(x.outcomes[0]) : x.prices[1] >= 0.99 ? outcomeName(x.outcomes[1]) : t('closedTag'))}</span>`
          : x.outcomes.slice(0, 2).map((_, i) => oddsButton(e, x, i)).join('')}
      </div>
    </li>`;
}

function typeLabel(k) {
  const key = `type_${k}`;
  const v = t(key);
  if (v !== key) return v;
  const txt = k.replace(/^(football|basketball|soccer|tennis|lol|dota2)_(game_|team_)?/, '').replace(/_/g, ' ');
  return txt.charAt(0).toUpperCase() + txt.slice(1);
}

function outcomesHTML(e, m, binary) {
  const d = S.detail;
  d.expanded = d.expanded || {};
  // negRisk sets are one list; games are split by market type (winner / spread / totals / props …)
  const groups = new Map();
  e.markets.forEach((x) => {
    const k = e.negRisk ? 'all' : (x.type || 'main');
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(x);
  });
  const rank = (k) => (k === 'main' || k === 'all' ? -1 : TYPE_ORDER.includes(k) ? TYPE_ORDER.indexOf(k) : 10);
  const keys = [...groups.keys()].sort((a, b) => rank(a) - rank(b) || groups.get(b).length - groups.get(a).length);
  if (!d.typeKey || !groups.has(d.typeKey)) d.typeKey = groups.has(m.type || 'main') && !e.negRisk ? (m.type || 'main') : keys[0];
  const k = e.negRisk ? 'all' : d.typeKey;
  const list = groups.get(k) || [];
  const limit = k === 'all' ? 12 : 10;
  const open = d.expanded[k] || list.length <= limit;
  const shown = open ? list : list.slice(0, limit);
  if (!open && list.includes(m) && !shown.includes(m)) shown.push(m);
  const chips = keys.length > 1 ? `
    <div class="type-chips"><div class="pk-chip-list">
      ${keys.map((x) => `<button type="button" class="pk-chip" data-act="type" data-k="${esc(x)}" data-selected="${x === k}">${esc(x === 'main' ? t('type_moneyline') : typeLabel(x))}<span class="pk-chip-count">${groups.get(x).length}</span></button>`).join('')}
    </div></div>` : '';
  return `${chips}
    <ul class="outcome-list">${shown.map((x) => outcomeRow(e, x, m, binary)).join('')}</ul>
    ${list.length > limit ? `<button type="button" class="pk-button outcome-more" data-variant="text" data-size="sm" data-act="toggle-group" data-k="${esc(k)}">${esc(open ? t('showLess') : t('showAll', { n: list.length }))}</button>` : ''}`;
}

function bookHTML() {
  const b = S.detail && S.detail.book;
  if (!b) return '<span class="pk-skeleton" style="height:240px;display:block"></span>';
  const asks = b.asks.slice(0, 6);
  const bids = b.bids.slice(0, 6);
  const cum = (arr) => { let c = 0; return arr.map((l) => (c += l.p * l.s)); };
  const askCum = cum(asks), bidCum = cum(bids);
  const maxCum = Math.max(1, ...askCum, ...bidCum);
  const row = (l, c, side) => `<div class="book-row" data-side="${side}" style="--w:${Math.round((c / maxCum) * 100)}%">
    <span class="num">${fmtCents(l.p)}</span><span class="num">${Math.round(l.s).toLocaleString('en-US')}</span><span class="num">$${Math.round(l.p * l.s).toLocaleString('en-US')}</span></div>`;
  const spread = asks.length && bids.length ? asks[0].p - bids[0].p : null;
  return `
    <div class="book-cols"><span>${esc(t('price'))}</span><span>${esc(t('size'))}</span><span>${esc(t('total'))}</span></div>
    <div class="book-side" aria-label="${esc(t('asks'))}">${asks.length ? asks.map((l, i) => row(l, askCum[i], 'ask')).reverse().join('') : `<p class="book-empty">${esc(t('emptyBook'))}</p>`}</div>
    <div class="book-mid"><span>${spread !== null ? esc(t('spread', { s: fmtCents(spread) })) : ''}</span><span>${b.last !== null ? esc(t('lastTrade', { p: fmtCents(b.last) })) : ''}</span></div>
    <div class="book-side" aria-label="${esc(t('bids'))}">${bids.length ? bids.map((l, i) => row(l, bidCum[i], 'bid')).join('') : `<p class="book-empty">${esc(t('emptyBook'))}</p>`}</div>`;
}

function drawChart() {
  const host = $('#chart');
  const d = S.detail;
  if (!host || !d) return;
  if (!d.history) return;
  const fmtX = (ms, full) => {
    const dt = new Date(ms);
    const loc = getLang() === 'zh' ? 'zh-CN' : 'en-US';
    if (full) return dt.toLocaleString(loc, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    return d.range === '1D' ? dt.toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit' }) : dt.toLocaleDateString(loc, { month: 'short', day: 'numeric' });
  };
  // price history lags too; end the line at the live chance shown above it
  const now = selectedMarket().prices[0];
  const pts = d.history.length && now > 0 ? [...d.history, { t: Date.now(), p: now }] : d.history;
  renderChart(host, pts, { fmtX, fmtY: (p) => `${Math.round(p * 100)}%`, label: t('chart') });
}

async function loadBook() {
  const d = S.detail;
  const m = selectedMarket();
  const oi = d.oi;
  if (!m.tokens[oi]) return;
  let book;
  try {
    book = await fetchBook(m, oi);
  } catch { book = { bids: [], asks: [], last: null }; }
  // the player may have picked another market or side while this was loading
  if (S.detail !== d || selectedMarket().id !== m.id || d.oi !== oi) return;
  d.book = book;
  const host = $('#book');
  if (host) host.innerHTML = bookHTML();
  patchDetailNumbers();
  drawChart();
  syncSlipPrice();
}

async function loadHistory() {
  const d = S.detail;
  const m = selectedMarket();
  try {
    d.history = await api.getHistory(m.tokens[0], d.range);
  } catch { d.history = []; }
  if (S.detail === d) drawChart();
}

async function refreshDetail() {
  const d = S.detail;
  if (!d) return;
  try {
    const e = await api.getEvent(d.slug);
    if (S.detail !== d) return;
    d.event = e;
    indexEvents([e]);
    e.markets.forEach((m) => store.settle(m.id, m.prices, m.closed));
    S.feedOk = true;
    // patch live numbers without rebuilding the page (keeps focus + scroll)
    patchDetailNumbers();
    syncSlipPrice();
  } catch { S.feedOk = false; }
  renderStatus();
  loadBook();
}

function patchDetailNumbers() {
  const d = S.detail;
  const e = d.event;
  const m = selectedMarket();
  const now = $('.chart-now b');
  if (now) now.textContent = fmtPct(m.prices[0]);
  e.markets.forEach((x) => {
    const row = document.querySelector(`.outcome-row [data-mid="${CSS.escape(x.id)}"][data-act="select-market"]`)?.closest('.outcome-row');
    if (!row) return;
    const pct = row.querySelector('.outcome-pct');
    if (pct) pct.textContent = fmtPct(x.prices[0]);
    row.querySelectorAll('.app-odds').forEach((btn) => {
      const i = +btn.dataset.oi;
      const v = btn.querySelector('span:last-child');
      const next = fmtCents(x.buy[i]);
      if (v && v.textContent !== next) {
        btn.dataset.movement = parseFloat(next) > parseFloat(v.textContent) ? 'up' : 'down';
        v.textContent = next;
        btn.setAttribute('aria-label', `${outcomeName(x.outcomes[i])} · ${x.label} · ${next}`);
        btn.disabled = !x.accepting || !x.buy[i];
        setTimeout(() => btn.removeAttribute('data-movement'), 2400);
      }
    });
  });
}

async function showDetail(slug) {
  S.view = 'detail';
  setNav('markets');
  S.detail = { slug, event: null, marketId: null, oi: 0, range: '1W', book: null, history: null };
  const d = S.detail;
  main.innerHTML = `<div class="detail"><span class="pk-skeleton" style="height:120px;display:block;margin-bottom:16px"></span><span class="pk-skeleton" style="height:320px;display:block"></span></div>`;
  try {
    const e = await api.getEvent(slug);
    if (S.detail !== d) return;
    d.event = e;
    indexEvents([e]);
    e.markets.forEach((m) => store.settle(m.id, m.prices, m.closed));
    d.marketId = e.main.id;
    S.feedOk = true;
    renderDetail();
    loadHistory();
    loadBook();
    every(DETAIL_REFRESH_S, refreshDetail);
    every(60, loadHistory);
  } catch (err) {
    S.feedOk = false;
    main.innerHTML = `<div class="pk-empty app-empty"><h3>${esc(err.message === 'Event not found' ? t('notFound') : t('errTitle'))}</h3>
      <a class="pk-button" data-variant="secondary" href="#/">${esc(t('back'))}</a></div>`;
  }
  renderStatus();
  window.scrollTo(0, 0);
}

// Redraw the chart when its box changes width (rotate, resize, slip opening on desktop).
let lastChartW = 0;
if ('ResizeObserver' in window) {
  new ResizeObserver(() => {
    const host = $('#chart');
    if (!host || S.view !== 'detail') return;
    const w = Math.round(host.clientWidth);
    if (Math.abs(w - lastChartW) > 8) { lastChartW = w; drawChart(); }
  }).observe(main);
}

// ---------------------------------------------------------------- bet slip

function openSlip(mid, oi) {
  const hit = S.marketIndex.get(mid);
  if (!hit) return;
  S.slip = { event: hit.event, market: hit.market, oi, stake: S.slip?.stake || 20 };
  renderSlip();
  document.querySelectorAll('.app-odds').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mid === mid && +b.dataset.oi === oi)));
  setTimeout(() => $('#stake-input')?.focus({ preventScroll: true }), 50);
  watchSlipBook();
}

// Keep the slip priced off the live book while it is open (list cards only carry Gamma prices).
function watchSlipBook() {
  clearInterval(S.slipTimer);
  const tick = () => {
    const slip = S.slip;
    if (!slip || document.hidden) return;
    fetchBook(slip.market, slip.oi).then(() => { if (S.slip === slip) syncSlipPrice(); }).catch(() => {});
  };
  tick();
  S.slipTimer = setInterval(tick, DETAIL_REFRESH_S * 1000);
}

function closeSlip() {
  clearInterval(S.slipTimer);
  S.slip = null;
  const slip = $('#slip');
  slip.hidden = true;
  slip.innerHTML = '';
  document.body.classList.remove('has-slip');
  document.querySelectorAll('.app-odds[aria-pressed="true"]').forEach((b) => b.setAttribute('aria-pressed', 'false'));
}

function syncSlipPrice() {
  if (!S.slip) return;
  const hit = S.marketIndex.get(S.slip.market.id);
  if (hit) { S.slip.market = hit.market; S.slip.event = hit.event; updateSlipNumbers(); }
}

function slipCalc() {
  const { market, oi, stake } = S.slip;
  const price = market.buy[oi] || 0;
  const shares = price ? stake / price : 0;
  return { price, shares, payout: shares, profit: shares - stake };
}

function renderSlip() {
  const slip = $('#slip');
  const { event, market, oi } = S.slip;
  const binary = event.markets.length === 1;
  slip.hidden = false;
  document.body.classList.add('has-slip');
  slip.innerHTML = `
    <div class="slip-scrim" data-act="close-slip"></div>
    <div class="slip-panel" role="dialog" aria-modal="false" aria-labelledby="slip-h">
      <header class="slip-head">
        <h2 id="slip-h">${esc(t('slip'))}</h2>
        <span class="app-tag">${esc(t('demo'))}</span>
        <button type="button" class="pk-icon-button" data-variant="ghost" data-act="close-slip" aria-label="${esc(t('close'))}">${ICON.close}</button>
      </header>
      <div class="slip-body">
        <div class="slip-pick">
          ${imgTag(event.image, 'slip-img')}
          <div>
            <p class="slip-event">${esc(event.title)}</p>
            ${binary ? '' : `<p class="slip-market">${esc(market.label)}</p>`}
            <span class="slip-outcome" data-tone="${toneOf(market.outcomes[oi])}">${esc(outcomeName(market.outcomes[oi]))}</span>
          </div>
        </div>
        <dl class="slip-rows">
          <div><dt>${esc(t('avgPrice'))}</dt><dd class="num" id="slip-price"></dd></div>
          <div><dt>${esc(t('odds'))}</dt><dd class="num" id="slip-odds"></dd></div>
        </dl>
        <label class="slip-stake">
          <span>${esc(t('stake'))}</span>
          <span class="slip-stake-shell"><b>PK$</b><input id="stake-input" type="number" inputmode="decimal" min="1" step="1" value="${S.slip.stake}"></span>
        </label>
        <div class="slip-quick">
          ${[10, 50, 100].map((v) => `<button type="button" class="pk-chip" data-act="quick" data-v="${v}">+${v}</button>`).join('')}
          <button type="button" class="pk-chip" data-act="quick" data-v="max">${esc(t('max'))}</button>
        </div>
        <dl class="slip-rows slip-sum">
          <div><dt>${esc(t('shares'))}</dt><dd class="num" id="slip-shares"></dd></div>
          <div><dt>${esc(t('profit'))}</dt><dd class="num" id="slip-profit"></dd></div>
          <div class="slip-payout"><dt>${esc(t('toWin'))}</dt><dd class="num" id="slip-payout"></dd></div>
        </dl>
        <p class="slip-err" id="slip-err" role="alert"></p>
      </div>
      <footer class="slip-foot">
        <button type="button" class="pk-button" data-variant="primary" data-size="lg" data-full="true" data-act="place" id="place-btn">${esc(t('place'))}</button>
        <p class="slip-note">${esc(t('slipNote'))}</p>
        <p class="slip-bal">${esc(t('balance'))} <b class="num">${fmtPK(store.getState().balance)}</b></p>
      </footer>
    </div>`;
  updateSlipNumbers();
}

function updateSlipNumbers() {
  if (!S.slip || $('#slip').hidden) return;
  const { price, shares, payout, profit } = slipCalc();
  const set = (id, v) => { const n = $(id); if (n) n.textContent = v; };
  set('#slip-price', fmtCents(price));
  set('#slip-odds', fmtOdds(price));
  set('#slip-shares', shares.toFixed(2));
  set('#slip-profit', `+${fmtPK(profit)}`);
  set('#slip-payout', fmtPK(payout));
  const err = $('#slip-err');
  const btn = $('#place-btn');
  let msg = '';
  if (!S.slip.market.accepting) msg = t('closedMarket');
  else if (!price) msg = t('noLiquidity');
  else if (!(S.slip.stake >= 1)) msg = t('minStake');
  else if (S.slip.stake > store.getState().balance + 1e-9) msg = t('insufficient');
  if (err) err.textContent = msg;
  if (btn) btn.disabled = !!msg;
}

function placeBet() {
  const { event, market, oi, stake } = S.slip;
  const { price } = slipCalc();
  try {
    store.placeBet({
      eventSlug: event.slug, eventTitle: event.title, marketId: market.id,
      marketLabel: event.markets.length === 1 ? '' : market.label,
      outcome: market.outcomes[oi], outcomeIndex: oi, tokenId: market.tokens[oi],
      price, stake, image: event.image,
    });
    toast(t('placed', { o: outcomeName(market.outcomes[oi]), m: event.markets.length === 1 ? event.title : market.label }));
    closeSlip();
    if (S.view === 'bets') showBets();
  } catch {
    toast(t('insufficient'), 'error');
  }
}

// ---------------------------------------------------------------- bets view

async function showBets() {
  S.view = 'bets';
  setNav('bets');
  renderBets();
  await refreshPositions();
  every(DETAIL_REFRESH_S * 2, refreshPositions);
}

// Live prices for open positions: one Gamma call per event (also settles resolved markets),
// then the book of each open market so cash-out uses the live bid.
async function refreshPositions() {
  const open = () => store.getState().positions.filter((p) => p.status === 'open');
  const slugs = [...new Set(open().map((p) => p.eventSlug))].slice(0, 20);
  if (!slugs.length) return;
  const ok = await Promise.all(slugs.map((s) => api.getEvent(s).then((e) => {
    indexEvents([e]);
    e.markets.forEach((m) => store.settle(m.id, m.prices, m.closed));
    return true;
  }).catch(() => false)));
  S.feedOk = ok.some(Boolean);
  const sides = new Map(open().map((p) => [p.marketId, p.outcomeIndex]));
  await Promise.all([...sides].map(([mid, oi]) => {
    const hit = S.marketIndex.get(mid);
    return hit && !hit.market.closed ? fetchBook(hit.market, oi).catch(() => {}) : null;
  }));
  if (S.view === 'bets') renderBets();
  renderStatus();
}

function bidFor(p) {
  const hit = S.marketIndex.get(p.marketId);
  if (!hit) return null;
  const m = hit.market;
  if (m.bestBid === null && m.bestAsk === null) return m.prices[p.outcomeIndex] ?? null;
  // Cash-out sells into the bids: outcome 0 at best bid, outcome 1 at (1 - best ask). Empty side → null.
  if (p.outcomeIndex === 0) return m.bestBid || null;
  return m.bestAsk !== null && m.bestAsk < 1 ? +(1 - m.bestAsk).toFixed(4) : null;
}

function renderBets() {
  const st = store.getState();
  const open = st.positions.filter((p) => p.status === 'open');
  const done = st.positions.filter((p) => p.status !== 'open');
  let openValue = 0, pnl = 0;
  open.forEach((p) => { const b = bidFor(p); const v = b !== null ? p.shares * b : p.stake; openValue += v; pnl += v - p.stake; });
  done.forEach((p) => { pnl += (p.exitValue || 0) - p.stake; });

  const row = (p) => {
    const isOpen = p.status === 'open';
    const bid = isOpen ? bidFor(p) : null;
    const value = isOpen ? (bid !== null ? p.shares * bid : null) : p.exitValue;
    const diff = value !== null ? value - p.stake : null;
    const statusTxt = p.status === 'won' ? t('won') : p.status === 'lost' ? t('lost') : p.status === 'cashed' ? t('cashOut') : '';
    return `<li class="bet-row">
      ${imgTag(p.image, 'bet-img')}
      <div class="bet-main">
        <a class="bet-title" href="#/e/${esc(p.eventSlug)}">${esc(p.eventTitle)}</a>
        <div class="bet-sub">${p.marketLabel ? `<span>${esc(p.marketLabel)}</span>` : ''}<span class="slip-outcome" data-tone="${toneOf(p.outcome)}">${esc(outcomeName(p.outcome))}</span>${statusTxt ? `<span class="app-tag" data-tone="${p.status === 'won' ? 'win' : p.status === 'lost' ? 'loss' : 'muted'}">${esc(statusTxt)}</span>` : ''}</div>
        <dl class="bet-nums">
          <div><dt>${esc(t('stake'))}</dt><dd class="num">${fmtPK(p.stake)}</dd></div>
          <div><dt>${esc(t('entry'))}</dt><dd class="num">${fmtCents(p.price)}</dd></div>
          ${isOpen ? `<div><dt>${esc(t('now'))}</dt><dd class="num">${bid !== null ? fmtCents(bid) : '–'}</dd></div>` : ''}
          <div><dt>${esc(t('value'))}</dt><dd class="num">${value !== null ? fmtPK(value) : '–'}</dd></div>
          <div><dt>${esc(t('pnl'))}</dt><dd class="num" data-tone="${diff > 0.004 ? 'win' : diff < -0.004 ? 'loss' : ''}">${diff !== null ? `${diff >= 0 ? '+' : '−'}${fmtPK(Math.abs(diff)).replace('PK$ ', 'PK$ ')}` : '–'}</dd></div>
        </dl>
      </div>
      ${isOpen ? `<button type="button" class="pk-button" data-variant="secondary" data-size="sm" data-act="cashout" data-id="${esc(p.id)}" ${bid ? '' : 'disabled'}>${esc(t('cashOut'))}</button>` : ''}
    </li>`;
  };

  main.innerHTML = `
    <div class="bets">
      <header class="bets-head">
        <h1 class="page-title">${esc(t('betsTitle'))}</h1>
        <button type="button" class="pk-button" data-variant="text" data-size="sm" data-act="reset">${esc(t('resetDemo'))}</button>
      </header>
      <dl class="bets-stats">
        <div class="pk-stat"><dt class="pk-stat-label">${esc(t('balance'))}</dt><dd class="pk-stat-value num">${fmtPK(st.balance)}</dd></div>
        <div class="pk-stat"><dt class="pk-stat-label">${esc(t('inBets'))}</dt><dd class="pk-stat-value num">${fmtPK(openValue)}</dd></div>
        <div class="pk-stat"><dt class="pk-stat-label">${esc(t('totalPnl'))}</dt><dd class="pk-stat-value num" data-tone="${pnl > 0.004 ? 'win' : pnl < -0.004 ? 'loss' : ''}">${pnl >= 0 ? '+' : '−'}${fmtPK(Math.abs(pnl))}</dd></div>
      </dl>
      ${st.positions.length ? `
        ${open.length ? `<h2 class="section-title">${esc(t('open'))} · ${open.length}</h2><ul class="bet-list">${open.map(row).join('')}</ul>` : ''}
        ${done.length ? `<h2 class="section-title">${esc(t('settled'))} · ${done.length}</h2><ul class="bet-list">${done.map(row).join('')}</ul>` : ''}
      ` : `<div class="pk-empty app-empty"><h3>${esc(t('betsEmpty'))}</h3><a class="pk-button" data-variant="primary" href="#/">${esc(t('browse'))}</a></div>`}
    </div>`;
}

// ---------------------------------------------------------------- router

function route() {
  clearTimers();
  const h = location.hash.replace(/^#/, '') || '/';
  const [, a, b] = h.split('/');
  if (a === 'e' && b) return showDetail(decodeURIComponent(b));
  if (a === 'bets') return showBets();
  if (a === 'about') { S.view = 'about'; setNav('about'); main.innerHTML = renderAbout(getLang()); window.scrollTo(0, 0); return; }
  if (a === 'c' && b && CATS.some((c) => c.key === b)) S.cat = b;
  else S.cat = 'trending';
  return showList();
}

// ---------------------------------------------------------------- events

document.addEventListener('click', (ev) => {
  const el = ev.target.closest('[data-act]');
  if (!el) {
    // whole-card click on list
    const card = ev.target.closest('.mcard[data-slug]');
    if (card && !ev.target.closest('a,button')) location.hash = `#/e/${card.dataset.slug}`;
    return;
  }
  const act = el.dataset.act;
  if (act === 'pick') { ev.preventDefault(); openSlip(el.dataset.mid, +el.dataset.oi); }
  else if (act === 'close-slip') closeSlip();
  else if (act === 'quick') {
    const v = el.dataset.v;
    S.slip.stake = v === 'max' ? Math.floor(store.getState().balance) : Math.round((+S.slip.stake || 0) + +v);
    $('#stake-input').value = S.slip.stake;
    updateSlipNumbers();
  } else if (act === 'place') placeBet();
  else if (act === 'more') loadList({ append: true });
  else if (act === 'retry') loadList();
  else if (act === 'clear-search') { S.q = ''; renderListShell(); loadList(); }
  else if (act === 'select-market') {
    S.detail.marketId = el.dataset.mid; S.detail.oi = 0; S.detail.book = null; S.detail.history = null;
    renderDetail(); loadHistory(); loadBook();
  } else if (act === 'cashout') {
    const p = store.getState().positions.find((x) => x.id === el.dataset.id);
    const hit = p && S.marketIndex.get(p.marketId);
    if (!hit) return;
    el.disabled = true;
    // sell at the bid as it is now, not as of the last refresh
    fetchBook(hit.market, p.outcomeIndex).catch(() => {}).then(() => {
      const bid = bidFor(p);
      const v = bid && store.cashOut(p.id, bid);
      if (v) toast(t('cashedOut', { v: v.toFixed(2) }));
      if (S.view === 'bets') renderBets();
    });
  } else if (act === 'type') {
    S.detail.typeKey = el.dataset.k;
    renderDetail();
  } else if (act === 'toggle-group') {
    const k = el.dataset.k;
    S.detail.expanded[k] = !S.detail.expanded[k];
    renderDetail();
  } else if (act === 'reset') { store.reset(); toast(t('resetDone')); renderBets(); }
});

document.addEventListener('change', (ev) => {
  const el = ev.target;
  if (el.name === 'cat') {
    S.cat = el.value; S.q = '';
    history.replaceState(null, '', S.cat === 'trending' ? '#/' : `#/c/${S.cat}`);
    S.listHash = location.hash || '#/';
    renderListShell(); loadList();
  } else if (el.id === 'sort-select') { S.sort = el.value; loadList(); }
  else if (el.name === 'range') {
    S.detail.range = el.value; S.detail.history = null;
    document.querySelectorAll('.range-seg label').forEach((l) => l.dataset.selected = String(l.querySelector('input').checked));
    loadHistory();
  } else if (el.name === 'book-oi') {
    S.detail.oi = +el.value; S.detail.book = null;
    document.querySelectorAll('.book-seg label').forEach((l) => l.dataset.selected = String(l.querySelector('input').checked));
    $('#book').innerHTML = bookHTML(); loadBook();
  }
});

document.addEventListener('input', (ev) => {
  if (ev.target.id === 'stake-input') { S.slip.stake = parseFloat(ev.target.value) || 0; updateSlipNumbers(); }
});

document.addEventListener('submit', (ev) => {
  if (ev.target.id === 'search-form') {
    ev.preventDefault();
    const q = $('#search-input').value.trim();
    S.q = q;
    renderListShell(); loadList();
  }
});

document.addEventListener('keydown', (ev) => {
  if (ev.key === 'Escape' && S.slip) closeSlip();
});

$('#lang-toggle').addEventListener('click', () => {
  setLang(getLang() === 'zh' ? 'en' : 'zh');
  applyStatic();
  $('#lang-toggle').textContent = t('langBtn');
  renderStatus();
  // re-render the current view in the new language
  if (S.view === 'list') { renderListShell(); }
  else if (S.view === 'detail' && S.detail?.event) { renderDetail(); }
  else if (S.view === 'bets') renderBets();
  else if (S.view === 'about') main.innerHTML = renderAbout(getLang());
  if (S.slip) renderSlip();
});

store.subscribe(() => { renderBalance(); updateSlipNumbers(); });

// ---------------------------------------------------------------- boot

setLang(getLang());
applyStatic();
$('#lang-toggle').textContent = t('langBtn');
renderBalance();
window.addEventListener('hashchange', () => { closeSlip(); route(); });
route();
api.getGeo().then((g) => { S.geo = g; renderStatus(); }).catch(() => {});
