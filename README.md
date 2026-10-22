# PK.GAME Predict · Prototype

把 Polymarket 预测市场接进 PK.GAME 的可行性小样。**市场数据是实时的，下注是演示的**（PK$ 1,000 演示余额，只存在浏览器里，不涉及真钱和钱包）。

A feasibility prototype for Polymarket-style prediction markets on PK.GAME. Live market data, demo bets only.

## 能看什么

| 页面 | 内容 | 数据 |
|---|---|---|
| 市场列表 | 热门 / 政治 / 体育 / 足球 / 加密 / 经济 / 电竞 / 科技 / 文化 / 天气 / 地缘政治，搜索，按成交量 / 流动性 / 截止时间 / 最新排序 | Gamma API，实时 |
| 市场详情 | 概率、价格走势（1D/1W/1M/ALL）、全部选项（体育按胜负 / 让分 / 大小分分组）、盘口深度、规则和结算数据源 | Gamma + CLOB API，每 15 秒刷新 |
| 下注单 | 按 Polymarket 实时最优卖价成交，显示赔率、份数、可赔付 | 演示 |
| 我的下注 | 实时市值、盈亏、提前兑现（按最优买价）、Polymarket 结算后自动结算 | 演示 |
| 说明 | 实时 / 模拟边界、各类市场结算来源、用到的接口、上线前要做的事 | — |

顶部状态条显示接口延迟和 Polymarket 的地区检测结果（按访问者 IP）。界面支持中英切换（`?lang=zh` / `?lang=en`）。

## 接口（公开，无需密钥，浏览器可直接跨域调用）

- `GET https://gamma-api.polymarket.com/events` — 列表，`tag_slug` 筛分类，`order` 排序
- `GET https://gamma-api.polymarket.com/public-search` — 搜索
- `GET https://clob.polymarket.com/book?token_id=` — 盘口
- `GET https://clob.polymarket.com/prices-history?market=&interval=&fidelity=` — 走势
- `GET https://polymarket.com/api/geoblock` — 地区检测

## 设计系统

`assets/css/pkgame-ds.css` 是 PKGAME DS 2.4（玩家端深色主题）原样拷贝，字体在 `assets/fonts/`。原型专用样式只在 `assets/css/app.css`，全部引用 DS 的 token（`--bg-*`、`--fg-*`、`--brand-cyan`、`--win` / `--loss`、`--sp-*`、`--r-*`）和组件类（`pk-card`、`pk-odds`、`pk-chip`、`pk-segment`、`pk-button`、`pk-stat`、`pk-toast`、`pk-tabbar-item`）。

## 本地运行

纯静态，没有构建步骤：

```bash
python3 -m http.server 8000
# 打开 http://localhost:8000
```

## 结构

```
index.html
assets/
  css/pkgame-ds.css   PKGAME DS 2.4（不要改）
  css/app.css         原型布局
  js/api.js           Polymarket 接口 + 数据整理
  js/app.js           页面、路由、下注单
  js/store.js         演示钱包（localStorage）
  js/chart.js         走势图（SVG，无依赖）
  js/i18n.js          中英文案和格式化
  js/about.js         说明页
```

## 已知限制

- 市场标题和规则是 Polymarket 原文（英文），没有翻译。
- 数据直接从浏览器拉取，没有服务端缓存；正式版需要后端代理、缓存和 WebSocket 实时推送。
- 演示下注不占用盘口深度，大额也按最优价成交。
- 只做了展示和模拟，不涉及真钱、钱包或 Polymarket 下单。
