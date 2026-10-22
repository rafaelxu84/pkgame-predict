// Tiny SVG line chart for a single price series (0–1). No dependencies.
const NS = 'http://www.w3.org/2000/svg';
const el = (name, attrs = {}) => {
  const n = document.createElementNS(NS, name);
  Object.entries(attrs).forEach(([k, v]) => n.setAttribute(k, v));
  return n;
};

function niceRange(min, max) {
  let lo = Math.max(0, min - 0.03);
  let hi = Math.min(1, max + 0.03);
  if (hi - lo < 0.1) { const mid = (hi + lo) / 2; lo = Math.max(0, mid - 0.05); hi = Math.min(1, mid + 0.05); }
  const step = hi - lo > 0.5 ? 0.25 : hi - lo > 0.2 ? 0.1 : 0.05;
  lo = Math.floor(lo / step) * step;
  hi = Math.ceil(hi / step) * step;
  const ticks = [];
  for (let v = lo; v <= hi + 1e-9; v += step) ticks.push(+v.toFixed(4));
  return { lo, hi, ticks };
}

export function renderChart(host, points, { fmtX, fmtY, label = '' } = {}) {
  host.innerHTML = '';
  if (!points || points.length < 2) {
    host.innerHTML = '<div class="chart-empty"></div>';
    return;
  }
  // Draw at the host's real pixel width so labels stay readable on phones.
  const W = Math.max(280, Math.round(host.clientWidth || 640));
  const H = W < 520 ? 180 : 220, padL = 4, padR = 40, padT = 14, padB = 24;
  const xs = points.map((p) => p.t), ys = points.map((p) => p.p);
  const x0 = Math.min(...xs), x1 = Math.max(...xs);
  const { lo, hi, ticks } = niceRange(Math.min(...ys), Math.max(...ys));
  const X = (t) => padL + ((t - x0) / (x1 - x0 || 1)) * (W - padL - padR);
  const Y = (p) => padT + (1 - (p - lo) / (hi - lo || 1)) * (H - padT - padB);

  const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H, class: 'chart-svg', role: 'img', 'aria-label': label });
  const defs = el('defs');
  const grad = el('linearGradient', { id: 'chartFill', x1: 0, x2: 0, y1: 0, y2: 1 });
  grad.append(el('stop', { offset: '0%', 'stop-color': '#0FBFD5', 'stop-opacity': '0.28' }));
  grad.append(el('stop', { offset: '100%', 'stop-color': '#0FBFD5', 'stop-opacity': '0' }));
  defs.append(grad);
  svg.append(defs);

  ticks.forEach((v) => {
    const y = Y(v);
    svg.append(el('line', { x1: padL, x2: W - padR, y1: y, y2: y, class: 'chart-grid' }));
    const tx = el('text', { x: W - padR + 8, y: y + 4, class: 'chart-tick' });
    tx.textContent = fmtY(v);
    svg.append(tx);
  });

  // x labels: start / middle / end
  [x0, (x0 + x1) / 2, x1].forEach((t, i) => {
    const tx = el('text', { x: X(t), y: H - 6, class: 'chart-tick', 'text-anchor': i === 0 ? 'start' : i === 1 ? 'middle' : 'end' });
    tx.textContent = fmtX(t);
    svg.append(tx);
  });

  const d = points.map((p, i) => `${i ? 'L' : 'M'}${X(p.t).toFixed(1)},${Y(p.p).toFixed(1)}`).join('');
  svg.append(el('path', { d: `${d}L${X(x1).toFixed(1)},${H - padB}L${X(x0).toFixed(1)},${H - padB}Z`, fill: 'url(#chartFill)' }));
  svg.append(el('path', { d, class: 'chart-line' }));

  const last = points[points.length - 1];
  svg.append(el('circle', { cx: X(last.t), cy: Y(last.p), r: 4, class: 'chart-dot' }));

  const cross = el('line', { y1: padT, y2: H - padB, class: 'chart-cross', visibility: 'hidden' });
  const hoverDot = el('circle', { r: 4.5, class: 'chart-dot', visibility: 'hidden' });
  svg.append(cross, hoverDot);
  host.append(svg);

  const tip = document.createElement('div');
  tip.className = 'chart-tip';
  tip.hidden = true;
  host.append(tip);

  const onMove = (ev) => {
    const r = svg.getBoundingClientRect();
    const vx = ((ev.clientX - r.left) / r.width) * W;
    const t = x0 + ((vx - padL) / (W - padL - padR)) * (x1 - x0);
    let best = points[0];
    for (const p of points) if (Math.abs(p.t - t) < Math.abs(best.t - t)) best = p;
    const cx = X(best.t), cy = Y(best.p);
    cross.setAttribute('x1', cx); cross.setAttribute('x2', cx); cross.setAttribute('visibility', 'visible');
    hoverDot.setAttribute('cx', cx); hoverDot.setAttribute('cy', cy); hoverDot.setAttribute('visibility', 'visible');
    tip.hidden = false;
    tip.innerHTML = `<strong>${fmtY(best.p)}</strong><span>${fmtX(best.t, true)}</span>`;
    const left = (cx / W) * r.width;
    tip.style.left = `${Math.min(Math.max(left, 60), r.width - 60)}px`;
  };
  const onLeave = () => {
    cross.setAttribute('visibility', 'hidden'); hoverDot.setAttribute('visibility', 'hidden'); tip.hidden = true;
  };
  svg.addEventListener('pointermove', onMove);
  svg.addEventListener('pointerdown', onMove);
  svg.addEventListener('pointerleave', onLeave);
}
