// The money-flow chart (was sankey in js/flow.js): income → Budget → groups → lines, planned or actual. The layout
// below is the old code unchanged; it fills K (nodes, ribbons, totals) for the tip, card, zoom and click handlers,
// which stay in flow.js / events.js (all delegated on document). hl and zset change classes and the viewBox on the
// drawn svg, as before; each draw is a fresh root, so nothing here re-renders over them.
import { draw, tx } from '../bridge.js';
import { chartInc, chartItem } from '../lib/bank.js';
import { C, S, TK, f0, plan, $ } from '../lib/core.js';
import { SEL, Z, ZH, ZW, setK, setSEL, setZ, setZH, setZW, skClose } from '../lib/flow.js';
import { goalPlan, loanPlan, row, savedIn } from '../lib/math.js';
import { compareView, zbar } from '../named.jsx';

function layout() {
  const p = plan(), act = S.flow === 'actual';
  const IC = [C.pink, C.butter, C.aqua, C.lilac];
  const inc = p.income.map((i, ix) => { const pv = +i.amt || 0, av = chartInc(S.cur, i); return { id: 'i' + i.id, name: i.name, v: act ? av : pv, pv, av, c: IC[ix % IC.length] }; }).filter(x => x.v > 0), groups = [];
  p.groups.forEach(g => {
    const its = g.items.map(i => { const pv = +i.amt || 0, av = chartItem(g, i, S.cur); return { id: 't' + i.id, name: i.name, v: act ? av : pv, pv, av, c: g.color }; }).filter(x => x.v > 0); if (!its.length) return;
    if (g.loose) its.forEach(x => groups.push({ id: 'g' + g.id + '~' + x.id.slice(1), name: x.name, c: g.color, go: g.flex ? '#sec-flex' : '#sec-fixed', its: [x] }));   // not in a group: each item stands alone
    else groups.push({ id: 'g' + g.id, name: g.name, c: g.color, go: g.flex ? '#sec-flex' : '#sec-fixed', its });
  });
  const li = S.loans.map(l => { const r = S.cur < l.start ? null : row(l, S.cur), pv = loanPlan(l, S.cur), av = r && r.lg ? r.pay : (l.acct && l.link && S.cur >= TK ? 0 : pv); return { id: 't' + l.id, name: l.name, v: act ? av : pv, pv, av, c: C.sky }; }).filter(x => x.v > 0); if (li.length) groups.push({ id: 'gL', name: 'Loans', c: C.sky, tab: 'loans', its: li });
  const gi = S.goals.map(g => { const pv = goalPlan(g, S.cur), av = Math.max(0, savedIn(g, S.cur)); return { id: 't' + g.id, name: g.name, v: act ? av : pv, pv, av, c: C.lilac }; }).filter(x => x.v > 0); if (gi.length) groups.push({ id: 'gS', name: 'Savings', c: C.lilac, tab: 'goals', its: gi });
  const sum = (a, f) => a.reduce((t, x) => t + (x[f] || 0), 0); groups.forEach(g => { g.v = sum(g.its, 'v'); g.pv = sum(g.its, 'pv'); g.av = sum(g.its, 'av'); });
  const I = inc.reduce((a, x) => a + x.v, 0), O = groups.reduce((a, x) => a + x.v, 0), left = I - O;
  if (!I && !O) return null;
  if (left < -0.5) inc.push({ id: 'over', name: 'Over budget', v: -left, c: '#ff6b7f' });
  const B = { id: 'b', name: 'Budget', v: Math.max(I, O), c: '#fff4fa' }, gN = groups.map(g => ({ id: g.id, name: g.name, v: g.v, pv: g.pv, av: g.av, c: g.c, go: g.go, tab: g.tab, its: g.its, solo: g.its.length === 1 })); if (left > 0.5) gN.push({ id: 'left', name: 'Left over', v: left, c: C.lime, solo: true });
  const iN = []; groups.forEach(g => { if (g.its.length > 1) g.its.forEach(x => iN.push({ ...x, p: g.id })); });
  const cols = [inc, [B], gN, iN], W = 1660, xs = [200, 610, 1030, 1340], GAP = [40, 0, 30, 24], MIN = [44, 44, 36, 32];
  const tot = Math.max(...cols.map(c => c.reduce((a, n) => a + n.v, 0))); let k = 1050 / tot, H = 0;
  cols.forEach((c, ci) => { c.h = c.reduce((a, n) => a + (n.h = Math.max(MIN[ci], n.v * k)), 0) + GAP[ci] * Math.max(0, c.length - 1); H = Math.max(H, c.h); }); H += 60;
  cols.forEach((c, ci) => { let y = (H - c.h) / 2; c.forEach(n => { n.x = xs[ci]; n.y = y; y += n.h + GAP[ci]; n.o = 0; n.q = 0; n.ci = ci; }); });
  const Ls = []; inc.forEach(n => Ls.push({ s: n, t: B, c: n.c, v: n.v })); gN.forEach(n => Ls.push({ s: B, t: n, c: n.c, v: n.v })); iN.forEach(n => Ls.push({ s: gN.find(g => g.id === n.p), t: n, c: n.c, v: n.v }));
  return { cols, Ls, all: cols.flat(), W, H, I, O, left, act };
}

const NW = 18, tw = t => t.length * 12.2 + 30;
// A ribbon; s.o / t.q move down each node as its ribbons are laid, in the same order as before.
function ribbon(l) {
  const a = l.v * l.s.h / l.s.v, b = l.v * l.t.h / l.t.v, x0 = l.s.x + NW, x1 = l.t.x, y0 = l.s.y + l.s.o, y1 = l.t.y + l.t.q, xm = (x0 + x1) / 2; l.s.o += a; l.t.q += b;
  return `M${x0},${y0}C${xm},${y0} ${xm},${y1} ${x1},${y1}L${x1},${y1 + b}C${xm},${y1 + b} ${xm},${y0 + a} ${x0},${y0 + a}Z`;
}
function Node({ n, i }) {
  const cy = n.y + n.h / 2, lw = Math.max(tw(n.name), tw(f0(n.v))); let lab, hx0, hx1;
  if (n.ci === 0) { hx0 = n.x - 14 - lw; hx1 = n.x + NW + 4; } else if (n.ci === 3 || (n.ci === 2 && n.solo)) { hx0 = n.x - 4; hx1 = n.x + NW + 14 + lw; } else { hx0 = Math.min(n.x, n.ci === 1 ? n.x + NW / 2 - lw / 2 : n.x); hx1 = n.ci === 1 ? n.x + NW / 2 + lw / 2 : n.x + NW + 10 + lw; }
  if (n.ci === 0) lab = <><text className="lb" x={n.x - 14} y={cy - 4} textAnchor="end" fill="#fff4fa" fontSize="23" fontWeight="600">{tx(n.name)}</text><text className="lb" x={n.x - 14} y={cy + 22} textAnchor="end" fill="#bca8b9" fontSize="20">{f0(n.v)}</text></>;
  else if (n.ci === 3 || (n.ci === 2 && n.solo)) lab = <><text className="lb" x={n.x + NW + 14} y={cy - 4} fill="#fff4fa" fontSize="23" fontWeight="600">{tx(n.name)}</text><text className="lb" x={n.x + NW + 14} y={cy + 22} fill="#bca8b9" fontSize="20">{f0(n.v)}</text></>;
  else { const w = Math.max(tw(n.name), tw(f0(n.v))), bx = n.ci === 1 ? n.x + NW / 2 - w / 2 : n.x + NW + 10; lab = <g className="pl"><rect x={bx} y={cy - 28} width={w} height="56" rx="12" fill="#1b1221" fillOpacity=".9" stroke={n.ci === 1 ? 'rgba(255,236,246,.2)' : n.c} strokeOpacity=".7" /><text x={bx + w / 2} y={cy - 4} textAnchor="middle" fill="#fff4fa" fontSize="22" fontWeight="600">{tx(n.name)}</text><text x={bx + w / 2} y={cy + 20} textAnchor="middle" fill="#bca8b9" fontSize="19">{f0(n.v)}</text></g>; }
  const hy = Math.min(n.y, cy - 30);
  return <g className="nd" data-n={i} tabIndex="0" role="button" aria-label={`${tx(n.name)}, ${f0(n.v)}`}><rect className="hit" x={hx0} y={hy} width={hx1 - hx0} height={Math.max(n.y + n.h, cy + 30) - hy} fill="#000" fillOpacity="0" /><rect x={n.x} y={n.y} width={NW} height={n.h} rx="6" fill={n.c} />{lab}</g>;
}

export function sankeyR() {
  const el = $('#sk'); if (!el) return; el.classList.toggle('cmpv', S.flow === 'compare'); if (S.flow === 'compare') { setK(null); return compareView(el); }
  const L = layout();
  if (!L) { draw(el, <p className="mut" style={{ padding: '30px 0' }}>Add income and bills to see your money flow.</p>); return; }
  const { Ls, all, W, H, I, O, left, act } = L, ds = Ls.map(ribbon);
  if (!Z || ZW !== W || ZH !== H) { setZW(W); setZH(H); setZ({ x: 0, y: 0, w: W, h: H }); setSEL(null); }
  setK({ L: Ls, all, W, H, I, O, left, act }); skClose();
  draw(el, <svg viewBox={`${Z.x} ${Z.y} ${Z.w} ${Z.h}`} role="img" aria-label="Money flow from income to groups to bills">{Ls.map((l, i) => <path key={'l' + i} className="lk" data-l={i} fill={l.c} d={ds[i]}></path>)}{all.map((n, i) => <Node key={'n' + i} n={n} i={i} />)}</svg>);
  zbar(SEL ? all.find(n => n.id === SEL) : null);
  // On a phone the chart is wider than its card and scrolls sideways; start at the Budget column, where the money
  // splits up, rather than on the income ribbon alone (only when it scrolls, so wide screens are unchanged).
  const w = el.closest('.skw'), b = all.find(n => n.ci === 1), g = all.find(n => n.ci === 2);
  if (w && b && w.scrollWidth > w.clientWidth + 20 && Z.w === W) { const u = w.scrollWidth / W, x0 = g ? Math.min(b.x - 20, g.x + 300 - w.clientWidth / u) : b.x - 70; w.scrollLeft = Math.max(0, x0 * u); }
}
