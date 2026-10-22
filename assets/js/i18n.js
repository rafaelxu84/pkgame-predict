const STR = {
  en: {
    skip: 'Skip to content',
    brandTag: 'Predict',
    navMarkets: 'Markets',
    navBets: 'My bets',
    navAbout: 'How it works',
    demo: 'Demo',
    langBtn: '中文',
    // categories
    cat_trending: 'Trending', cat_politics: 'Politics', cat_sports: 'Sports', cat_crypto: 'Crypto',
    cat_economy: 'Economy', cat_esports: 'Esports', cat_tech: 'Tech & AI', cat_pop: 'Culture',
    cat_weather: 'Weather', cat_geo: 'Geopolitics', cat_soccer: 'Soccer', cat_nba: 'NBA',
    // sort
    sortBy: 'Sort', sort_volume: '24h volume', sort_liquidity: 'Liquidity', sort_ending: 'Ending soon', sort_new: 'Newest',
    searchPh: 'Search markets',
    searchFor: 'Results for “{q}”',
    clear: 'Clear',
    loadMore: 'Load more',
    chance: 'chance',
    vol: '{v} Vol.',
    ends: 'Ends {d}',
    endsIn: 'Ends in {d}',
    ended: 'Ended',
    moreOutcomes: '+{n} more',
    moreMarkets: '+{n} markets',
    showAll: 'Show all {n}',
    showLess: 'Show less',
    type_moneyline: 'Winner', type_child_moneyline: 'Game winner', type_spreads: 'Spread', type_totals: 'Totals', type_both_teams_to_score: 'Both teams score',
    type_first_half_moneyline: '1st half winner', type_first_half_spreads: '1st half spread', type_first_half_totals: '1st half totals',
    yes: 'Yes', no: 'No',
    // detail
    back: 'Back',
    outcome: 'Outcome',
    prob: 'Chance',
    buyYes: 'Buy Yes', buyNo: 'Buy No',
    payout: 'Pays',
    volume: 'Volume', volume24: '24h volume', liquidity: 'Liquidity', endDate: 'End date',
    chart: 'Price history',
    book: 'Order book',
    bookFor: '{o} · {m}',
    price: 'Price', size: 'Shares', total: 'Total',
    spread: 'Spread {s}',
    lastTrade: 'Last {p}',
    bids: 'Bids', asks: 'Asks',
    emptyBook: 'No resting orders on this side.',
    rules: 'Rules',
    resolution: 'Resolution source',
    resolutionNone: 'Resolved by the UMA optimistic oracle based on the rules above.',
    dataFrom: 'Live data: Polymarket Gamma + CLOB API · refreshed every {s}s',
    closedTag: 'Closed', resolvedTag: 'Resolved',
    // slip
    slip: 'Bet slip',
    slipEmpty: 'Pick an outcome to start a demo bet.',
    stake: 'Stake',
    avgPrice: 'Avg. price',
    shares: 'Shares',
    toWin: 'Potential payout',
    profit: 'Profit if right',
    odds: 'Odds',
    place: 'Place demo bet',
    placed: 'Demo bet placed: {o} on “{m}”',
    insufficient: 'Not enough demo balance.',
    minStake: 'Minimum stake is PK$ 1.',
    closedMarket: 'This market is not accepting orders.',
    noLiquidity: 'No sellers on this side right now.',
    slipNote: 'Demo only. No real money, no wallet. Price is Polymarket’s live best ask.',
    max: 'Max',
    close: 'Close',
    // bets
    betsTitle: 'My demo bets',
    betsEmpty: 'No demo bets yet.',
    browse: 'Browse markets',
    open: 'Open', settled: 'Settled',
    entry: 'Entry', now: 'Now', value: 'Value', pnl: 'P/L',
    cashOut: 'Cash out',
    cashedOut: 'Cashed out PK$ {v}',
    won: 'Won', lost: 'Lost',
    resetDemo: 'Reset demo balance',
    resetDone: 'Demo balance reset to PK$ 1,000.',
    balance: 'Balance', inBets: 'In open bets', totalPnl: 'Total P/L',
    // status bar
    feedOk: 'Polymarket feed live · {ms} ms',
    feedErr: 'Polymarket feed unreachable — check network',
    geo: 'Your IP: {c}{r}',
    geoOk: 'Polymarket trading allowed',
    geoBlocked: 'Polymarket trading blocked here',
    // states
    loading: 'Loading…',
    errTitle: 'Couldn’t load markets',
    errBody: 'The Polymarket API didn’t respond. Check the connection and try again.',
    retry: 'Try again',
    noResults: 'No open markets here right now.',
    notFound: 'Market not found.',
    updated: 'Updated {t}',
  },
  zh: {
    skip: '跳到正文',
    brandTag: '预测',
    navMarkets: '市场',
    navBets: '我的下注',
    navAbout: '说明',
    demo: '演示',
    langBtn: 'EN',
    cat_trending: '热门', cat_politics: '政治', cat_sports: '体育', cat_crypto: '加密货币',
    cat_economy: '经济', cat_esports: '电竞', cat_tech: '科技与 AI', cat_pop: '文化娱乐',
    cat_weather: '天气', cat_geo: '地缘政治', cat_soccer: '足球', cat_nba: 'NBA',
    sortBy: '排序', sort_volume: '24 小时成交', sort_liquidity: '流动性', sort_ending: '即将截止', sort_new: '最新',
    searchPh: '搜索市场',
    searchFor: '“{q}” 的结果',
    clear: '清除',
    loadMore: '加载更多',
    chance: '概率',
    vol: '成交 {v}',
    ends: '{d} 截止',
    endsIn: '{d}后截止',
    ended: '已截止',
    moreOutcomes: '另有 {n} 项',
    moreMarkets: '另有 {n} 个玩法',
    showAll: '显示全部 {n} 个',
    showLess: '收起',
    type_moneyline: '胜负', type_child_moneyline: '单局胜负', type_spreads: '让分', type_totals: '大小', type_both_teams_to_score: '双方进球',
    type_first_half_moneyline: '上半场胜负', type_first_half_spreads: '上半场让分', type_first_half_totals: '上半场大小',
    yes: '是', no: '否',
    back: '返回',
    outcome: '选项',
    prob: '概率',
    buyYes: '买 是', buyNo: '买 否',
    payout: '赔付',
    volume: '总成交', volume24: '24 小时成交', liquidity: '流动性', endDate: '截止时间',
    chart: '价格走势',
    book: '盘口',
    bookFor: '{o} · {m}',
    price: '价格', size: '份数', total: '金额',
    spread: '价差 {s}',
    lastTrade: '最新成交 {p}',
    bids: '买单', asks: '卖单',
    emptyBook: '这一侧暂无挂单。',
    rules: '规则',
    resolution: '结算数据源',
    resolutionNone: '按上方规则由 UMA 乐观预言机结算。',
    dataFrom: '实时数据：Polymarket Gamma + CLOB 接口 · 每 {s} 秒刷新',
    closedTag: '已关闭', resolvedTag: '已结算',
    slip: '下注单',
    slipEmpty: '选一个选项开始演示下注。',
    stake: '投注额',
    avgPrice: '成交价',
    shares: '份数',
    toWin: '可赔付',
    profit: '猜对盈利',
    odds: '赔率',
    place: '确认演示下注',
    placed: '已演示下注：{m} · {o}',
    insufficient: '演示余额不足。',
    minStake: '最低投注 PK$ 1。',
    closedMarket: '这个市场暂停接单。',
    noLiquidity: '这一侧暂时没有卖单。',
    slipNote: '仅演示，不涉及真钱和钱包。价格取 Polymarket 实时最优卖价。',
    max: '全部',
    close: '关闭',
    betsTitle: '我的演示下注',
    betsEmpty: '还没有演示下注。',
    browse: '去看市场',
    open: '未结算', settled: '已结算',
    entry: '买入', now: '现价', value: '市值', pnl: '盈亏',
    cashOut: '提前兑现',
    cashedOut: '已兑现 PK$ {v}',
    won: '赢', lost: '输',
    resetDemo: '重置演示余额',
    resetDone: '演示余额已重置为 PK$ 1,000。',
    balance: '余额', inBets: '未结算投注', totalPnl: '总盈亏',
    feedOk: 'Polymarket 数据正常 · {ms} 毫秒',
    feedErr: '连不上 Polymarket 接口，请检查网络',
    geo: '你的 IP：{c}{r}',
    geoOk: 'Polymarket 允许此地区交易',
    geoBlocked: 'Polymarket 限制此地区交易',
    loading: '加载中…',
    errTitle: '市场加载失败',
    errBody: 'Polymarket 接口没有响应，请检查网络后重试。',
    retry: '重试',
    noResults: '这里暂时没有开放的市场。',
    notFound: '找不到这个市场。',
    updated: '更新于 {t}',
  },
};

let lang = 'en';
{
  let saved = null;
  try { saved = localStorage.getItem('pkp.lang'); } catch { /* storage blocked */ }
  const urlLang = new URLSearchParams(location.search).get('lang');
  lang = urlLang || saved || ((navigator.language || '').toLowerCase().startsWith('zh') ? 'zh' : 'en');
  if (lang !== 'zh') lang = 'en';
}

export const getLang = () => lang;
export function setLang(l) {
  lang = l === 'zh' ? 'zh' : 'en';
  try { localStorage.setItem('pkp.lang', lang); } catch { /* ignore */ }
  document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
  // ?lang= wins on load, so keep it in step with the toggle or a reload switches back
  const url = new URL(location.href);
  if (url.searchParams.has('lang') && url.searchParams.get('lang') !== lang) {
    url.searchParams.set('lang', lang);
    history.replaceState(history.state, '', url);
  }
}

export function t(key, vars = {}) {
  const s = (STR[lang] && STR[lang][key]) ?? STR.en[key] ?? key;
  return s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? ''));
}

export function applyStatic(root = document) {
  root.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
}

const locale = () => (lang === 'zh' ? 'zh-CN' : 'en-US');

export function fmtUSD(v) {
  if (!v) return '$0';
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
  return `$${Math.round(v)}`;
}

export function fmtPK(v) {
  return 'PK$ ' + Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function fmtPct(p) {
  if (p === null || p === undefined || Number.isNaN(p)) return '–';
  const v = p * 100;
  if (v > 0 && v < 1) return '<1%';
  if (v < 100 && v > 99) return '>99%';
  return `${Math.round(v)}%`;
}

export function fmtCents(p) {
  if (p === null || p === undefined || Number.isNaN(p)) return '–';
  const c = Math.round(p * 1e4) / 100; // drop float noise like 0.09 - 0.08 = 0.00999…
  return `${c < 1 || c > 99 ? c.toFixed(1) : Math.round(c * 10) / 10}¢`;
}

export function fmtOdds(p) {
  if (!p || p <= 0) return '–';
  const o = 1 / p;
  return o >= 100 ? `×${Math.round(o)}` : `×${o.toFixed(2)}`;
}

export function fmtDate(iso) {
  if (!iso) return '–';
  return new Date(iso).toLocaleDateString(locale(), { year: 'numeric', month: 'short', day: 'numeric' });
}

export function fmtTime(ms) {
  return new Date(ms).toLocaleTimeString(locale(), { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function fmtEnds(iso) {
  if (!iso) return '';
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return t('ended');
  const h = ms / 36e5;
  let d;
  if (lang === 'zh') {
    if (h < 1) d = `${Math.max(1, Math.round(ms / 6e4))} 分钟`;
    else if (h < 48) d = `${Math.round(h)} 小时`;
    else if (h < 24 * 60) d = `${Math.round(h / 24)} 天`;
    else return t('ends', { d: fmtDate(iso) });
  } else {
    if (h < 1) d = `${Math.max(1, Math.round(ms / 6e4))}m`;
    else if (h < 48) d = `${Math.round(h)}h`;
    else if (h < 24 * 60) d = `${Math.round(h / 24)}d`;
    else return t('ends', { d: fmtDate(iso) });
  }
  return t('endsIn', { d });
}

// Polymarket outcome names are English. Translate the two generic ones.
export function outcomeName(name) {
  if (lang !== 'zh') return name;
  if (name === 'Yes') return '是';
  if (name === 'No') return '否';
  if (name === 'Up') return '涨';
  if (name === 'Down') return '跌';
  if (name === 'Over') return '大';
  if (name === 'Under') return '小';
  return name;
}
