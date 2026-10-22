// "How it works" page — what this prototype proves, and where each kind of market settles from.
const C = {
  en: {
    title: 'How this prototype works',
    lede: 'A feasibility test for bringing Polymarket-style prediction markets into PK.GAME. Market data is live; bets are demo only.',
    liveH: 'What is live, what is mocked',
    live: [
      ['Live', 'Markets, categories, search, probabilities, 24h volume, liquidity, end dates — Polymarket Gamma API.'],
      ['Live', 'Price history chart and order book — Polymarket CLOB API, refreshed every 15 s.'],
      ['Live', 'Region check — Polymarket geoblock endpoint, using your IP.'],
      ['Mock', 'Wallet and bets. PK$ 1,000 demo balance kept in this browser only. Bets fill at Polymarket’s live best ask; settle when Polymarket resolves the market.'],
    ],
    srcH: 'Where outcomes come from',
    srcCols: ['Category', 'Settlement source on Polymarket'],
    src: [
      ['Crypto price (Up/Down, “above X”)', 'Chainlink Data Streams, settled automatically on-chain.'],
      ['Sports', 'UMA optimistic oracle, against official league results. Polymarket US uses Genius Sports official data.'],
      ['Economy (Fed, CPI, jobs)', 'UMA oracle, against the official release named in each market’s rules (e.g. federalreserve.gov).'],
      ['Politics, culture, tech', 'UMA oracle, against the source named in the rules (results bodies, major media).'],
      ['Weather', 'UMA oracle, against the weather station named in the rules.'],
    ],
    srcNote: 'Each market page shows its own rules and resolution source link.',
    apiH: 'Endpoints used (public, no key)',
    api: [
      ['GET gamma-api.polymarket.com/events', 'list + filter by tag, sort by volume / liquidity / end date'],
      ['GET gamma-api.polymarket.com/public-search', 'search'],
      ['GET clob.polymarket.com/book', 'order book per outcome token'],
      ['GET clob.polymarket.com/prices-history', 'chart'],
      ['GET polymarket.com/api/geoblock', 'region check'],
    ],
    nextH: 'To go from prototype to product',
    next: [
      'Pick the model: display-only, own-book (house prices from Polymarket odds), or route orders via the Polymarket Builder program (user wallets, pUSD on Polygon, builder fee up to 1%).',
      'Licensing review for Armenia before any real-money flow.',
      'Server-side cache/proxy for the feed, WebSocket price updates, and a market whitelist.',
      'Translate market titles (Polymarket content is English only).',
    ],
  },
  zh: {
    title: '这个小样怎么运作',
    lede: '用来测试把 Polymarket 式预测市场接进 PK.GAME 是否可行。市场数据是实时的，下注只是演示。',
    liveH: '哪些是实时的，哪些是模拟的',
    live: [
      ['实时', '市场、分类、搜索、概率、24 小时成交、流动性、截止时间 —— Polymarket Gamma 接口。'],
      ['实时', '价格走势图和盘口 —— Polymarket CLOB 接口，每 15 秒刷新。'],
      ['实时', '地区检测 —— Polymarket 地区限制接口，按你的 IP 判断。'],
      ['模拟', '钱包和下注。PK$ 1,000 演示余额只保存在当前浏览器。按 Polymarket 实时最优卖价成交；Polymarket 结算后自动结算。'],
    ],
    srcH: '结果从哪里来',
    srcCols: ['类别', 'Polymarket 的结算来源'],
    src: [
      ['加密货币价格（涨跌、是否高于 X）', 'Chainlink Data Streams，链上自动结算。'],
      ['体育', 'UMA 乐观预言机，以联赛官方结果为准；Polymarket US 用 Genius Sports 官方数据。'],
      ['经济（美联储、CPI、非农）', 'UMA 预言机，以规则里指定的官方发布为准（如 federalreserve.gov）。'],
      ['政治、文化、科技', 'UMA 预言机，以规则里指定的来源为准（选举机构、主流媒体）。'],
      ['天气', 'UMA 预言机，以规则里指定的气象站为准。'],
    ],
    srcNote: '每个市场详情页都显示它自己的规则和结算来源链接。',
    apiH: '用到的接口（公开，无需密钥）',
    api: [
      ['GET gamma-api.polymarket.com/events', '列表，按标签筛选，按成交 / 流动性 / 截止时间排序'],
      ['GET gamma-api.polymarket.com/public-search', '搜索'],
      ['GET clob.polymarket.com/book', '每个选项的盘口'],
      ['GET clob.polymarket.com/prices-history', '走势图'],
      ['GET polymarket.com/api/geoblock', '地区检测'],
    ],
    nextH: '从小样到正式产品还要做什么',
    next: [
      '定模式：只展示；自营坐庄（用 Polymarket 概率定价）；或通过 Polymarket Builder 计划转单（用户钱包、Polygon 上的 pUSD、builder 费最高 1%）。',
      '真钱上线前做亚美尼亚的牌照合规评估。',
      '服务端缓存/代理数据、WebSocket 实时价格、市场白名单。',
      '翻译市场标题（Polymarket 内容只有英文）。',
    ],
  },
};

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function renderAbout(lang) {
  const c = C[lang] || C.en;
  return `<article class="about">
    <h1 class="page-title">${esc(c.title)}</h1>
    <p class="about-lede">${esc(c.lede)}</p>

    <section class="panel"><h2 class="panel-title">${esc(c.liveH)}</h2>
      <ul class="about-list">${c.live.map(([k, v]) => `<li><span class="app-tag" data-tone="${k === 'Mock' || k === '模拟' ? 'warn' : 'win'}">${esc(k)}</span><span>${esc(v)}</span></li>`).join('')}</ul>
    </section>

    <section class="panel"><h2 class="panel-title">${esc(c.srcH)}</h2>
      <div class="about-table" role="table">
        <div class="about-tr about-th" role="row"><span role="columnheader">${esc(c.srcCols[0])}</span><span role="columnheader">${esc(c.srcCols[1])}</span></div>
        ${c.src.map(([a, b]) => `<div class="about-tr" role="row"><span role="cell">${esc(a)}</span><span role="cell">${esc(b)}</span></div>`).join('')}
      </div>
      <p class="panel-sub">${esc(c.srcNote)}</p>
    </section>

    <section class="panel"><h2 class="panel-title">${esc(c.apiH)}</h2>
      <ul class="about-api">${c.api.map(([a, b]) => `<li><code>${esc(a)}</code><span>${esc(b)}</span></li>`).join('')}</ul>
    </section>

    <section class="panel"><h2 class="panel-title">${esc(c.nextH)}</h2>
      <ol class="about-next">${c.next.map((x) => `<li>${esc(x)}</li>`).join('')}</ol>
    </section>
  </article>`;
}
