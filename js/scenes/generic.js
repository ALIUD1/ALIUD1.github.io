/* fig. 0N · the generic scene: "Blip builds it." (SPEC §5.5)
 *
 * Any article without a known data-scene gets this figure. It is built
 * entirely from the article's own steps, so a new project needs no JS:
 *   - one node per <li> in ol.steps (count clamped to 2..9),
 *   - node label = li[data-label], else the first 3 words of its sentence,
 *   - node tip = the li's plain sentence (so nothing is hover-only).
 *
 * Beat i (u = progress inside the beat):
 *   u 0–.4   wire i draws (i ≥ 1)
 *   u .4–.6  node i's outline draws and its label fades in
 *   u 0–.6   Blip (in a hard hat) hops from node i−1 to node i on a parabola;
 *            in b0 it walks in from x −40
 *   u .6–1   node i fills with the article's accent at .15
 * At T = N Blip is happy. Everything is a pure function of T.
 *
 * Beat count is per mount: setup() stores it on state.beats, and core reads
 * state.beats before scene.beats (which stays 0 here on purpose).
 */
(function () {
  'use strict';
  var S = window.SCENES = window.SCENES || {};

  /* SPEC §5.5 drew 150×60 nodes on rows 190/390, which left the top and bottom
   * ~190u of the 560u stage blank (the stage reads as unfinished). The nodes are
   * now 180×80 with a 22u label and the two rows sit at 150/420, so the figure
   * fills the stage; the row/column/wire rules are unchanged. */
  var VB_W = 800, VB_H = 560;
  var NODE_W = 180, NODE_H = 80, RX = 12;
  var MIN_GAP = 32, MARGIN = 20;   // used only if a row is too crowded for 180-wide nodes
  var ROW_1 = 280, ROW_A = 150, ROW_B = 420; // centre y: single row (N ≤ 4); two rows (N ≥ 5)
  var LABEL_MAX = 16, LABEL_PX = 22;
  var HOP = 60;                    // parabola height of each hop

  /* ---------- small pure helpers ---------- */
  function clamp(v, lo, hi) {
    lo = lo == null ? 0 : lo; hi = hi == null ? 1 : hi;
    return v < lo ? lo : v > hi ? hi : v;
  }
  function seg(T, a, b) { return clamp((T - a) / (b - a)); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function easeInOut(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function r2(v) { return Math.round(v * 100) / 100; }

  /* Write an attribute/style only when it changes (render runs every frame while scrolling). */
  function setOpacity(node, v) {
    var s = String(r2(v));
    if (node._op !== s) { node._op = s; node.style.opacity = s; }
  }

  /* Rounded rect as one closed path, so it can be revealed with pathLength=1. */
  function roundRectD(x, y, w, h, r) {
    return 'M' + (x + r) + ' ' + y + 'H' + (x + w - r) +
      'A' + r + ' ' + r + ' 0 0 1 ' + (x + w) + ' ' + (y + r) + 'V' + (y + h - r) +
      'A' + r + ' ' + r + ' 0 0 1 ' + (x + w - r) + ' ' + (y + h) + 'H' + (x + r) +
      'A' + r + ' ' + r + ' 0 0 1 ' + x + ' ' + (y + h - r) + 'V' + (y + r) +
      'A' + r + ' ' + r + ' 0 0 1 ' + (x + r) + ' ' + y + 'Z';
  }

  /* ---------- layout (pure; also used by core's ?check) ----------
   * Returns N rects {x, y, w, h} (top-left corner + size) in viewBox units.
   *   N ≤ 4: one row centred on y 280, centres evenly spaced 120 → 680.
   *   N ≥ 5: row 1 on y 150 with ceil(N/2) nodes left → right, row 2 on y 420
   *          right → left starting under the last row-1 node (x 680), same columns.
   * A row of four or five can't fit 180-wide nodes between centres 120 and 680,
   * so for those rows only the nodes narrow and the row widens to the stage margins. */
  function rowGeometry(k) {
    var w = NODE_W, x0 = 120, x1 = 680;
    var step = k > 1 ? (x1 - x0) / (k - 1) : 0;
    if (k > 1 && step < w + MIN_GAP) {
      w = Math.floor((VB_W - 2 * MARGIN - MIN_GAP * (k - 1)) / k);
      step = w + MIN_GAP;
      x0 = MARGIN + w / 2;
    }
    var cx = [];
    for (var j = 0; j < k; j++) cx.push(k > 1 ? x0 + step * j : (x0 + x1) / 2);
    return { w: w, cx: cx };
  }

  function layout(N) {
    N = clamp(Math.round(N) || 2, 2, 9);
    var out = [], g, j;
    function push(cx, cy, w) { out.push({ x: r2(cx - w / 2), y: cy - NODE_H / 2, w: w, h: NODE_H }); }
    if (N <= 4) {
      g = rowGeometry(N);
      for (j = 0; j < N; j++) push(g.cx[j], ROW_1, g.w);
      return out;
    }
    var top = Math.ceil(N / 2);
    g = rowGeometry(top);
    for (j = 0; j < top; j++) push(g.cx[j], ROW_A, g.w);                  // row 1: left → right
    for (j = 0; j < N - top; j++) push(g.cx[top - 1 - j], ROW_B, g.w);    // row 2: right → left
    return out;
  }

  /* Wire from node a to node b: horizontal inside a row, vertical at the turn.
   * Returns the path and a small chevron at the end, pointing along the flow. */
  function wireGeom(a, b) {
    var p, q, dir;
    if (a.y === b.y) {
      var right = b.x > a.x, cy = a.y + a.h / 2;
      p = { x: right ? a.x + a.w : a.x, y: cy };
      q = { x: right ? b.x : b.x + b.w, y: cy };
      dir = right ? { x: 1, y: 0 } : { x: -1, y: 0 };
    } else {
      var cx = a.x + a.w / 2;
      p = { x: cx, y: a.y + a.h };
      q = { x: cx, y: b.y };
      dir = { x: 0, y: 1 };
    }
    var s = 6, bx = q.x - dir.x * s, by = q.y - dir.y * s; // chevron arms meet at q
    return {
      d: 'M' + r2(p.x) + ' ' + r2(p.y) + 'L' + r2(q.x) + ' ' + r2(q.y),
      head: 'M' + r2(bx - dir.y * s) + ' ' + r2(by - dir.x * s) + 'L' + r2(q.x) + ' ' + r2(q.y) +
            'L' + r2(bx + dir.y * s) + ' ' + r2(by + dir.x * s)
    };
  }

  /* ---------- labels and tips come from the article text ---------- */
  function sentenceOf(li) {
    var p = li.querySelector('p');
    return ((p || li).textContent || '').replace(/\s+/g, ' ').trim();
  }
  function truncate(s) {
    return s.length > LABEL_MAX ? s.slice(0, LABEL_MAX - 1).replace(/\s+$/, '') + '…' : s;
  }
  function labelOf(li) {
    var given = (li.getAttribute('data-label') || '').trim();
    if (given) return truncate(given);
    return truncate(sentenceOf(li).split(' ').slice(0, 3).join(' ').replace(/[.,;:]+$/, ''));
  }
  /* Bricolage at 85% stretch averages about .55em per glyph; shrink long labels to fit the node. */
  function labelSize(str, w) {
    return Math.max(12, Math.min(LABEL_PX, Math.floor((w - 20) / (str.length * 0.55))));
  }

  /* ---------- the scene ---------- */
  S.generic = {
    beats: 0,          // placeholder: the real count is per mount, on state.beats
    pan: 'follow',
    tag: 'fig. 0N',    // core fills in the project number
    layout: layout,

    setup: function (api, svg, article) {
      var lis = api.steps && api.steps.length ? api.steps
        : Array.prototype.slice.call(article.querySelectorAll('ol.steps > li'));
      var N = clamp(lis.length, 2, 9);
      var rects = layout(N);
      var gWires = api.el('g', null, svg), gNodes = api.el('g', null, svg);
      var wires = [], nodes = [];

      rects.forEach(function (r, i) {
        var li = lis[i];

        // wire i joins node i-1 to node i; a dashed ghost shows the plan before it's built
        if (i > 0) {
          var w = wireGeom(rects[i - 1], r);
          api.path(w.d, 'dash thin', gWires);
          var line = api.path(w.d, 'ln2', gWires);
          var head = api.path(w.head, 'ln2', gWires);
          wires[i] = { line: line, head: head };
        }

        var g = api.el('g', { 'class': 'node' }, gNodes);
        var d = roundRectD(r.x, r.y, r.w, r.h, RX);
        api.el('rect', { x: r.x, y: r.y, width: r.w, height: r.h, rx: RX, 'class': 'dash thin' }, g); // blueprint
        var base = api.el('rect', { x: r.x, y: r.y, width: r.w, height: r.h, rx: RX, 'class': 'f-paper2' }, g);
        var fill = api.el('rect', { x: r.x, y: r.y, width: r.w, height: r.h, rx: RX, 'class': 'f-accent' }, g);
        var outline = api.path(d, 'ln', g);
        var str = li ? labelOf(li) : '', px = labelSize(str, r.w);
        var label = api.text(r2(r.x + r.w / 2), r2(r.y + r.h / 2 + px * 0.35), str, 't-big t-mid-a', g); // baseline ≈ optical centre
        label.style.fontSize = px + 'px';
        var idx = api.text(r.x + 2, r.y - 8, (i < 9 ? '0' : '') + (i + 1), 't-small c-ink2', g);
        if (li) api.tip(g, sentenceOf(li));
        nodes[i] = { r: r, base: base, fill: fill, outline: outline, label: label, idx: idx };
      });

      return { beats: N, poster: N, live: false, N: N, rects: rects, wires: wires, nodes: nodes, api: api };
    },

    render: function (st, T) {
      var N = st.N, api = st.api;
      T = clamp(T, 0, N);

      // drawing: every node/wire is a function of its own beat progress b = T − i
      for (var i = 0; i < N; i++) {
        var b = clamp(T - i), n = st.nodes[i], w = st.wires[i];
        if (w) {
          var wt = seg(b, 0, 0.4);
          api.reveal(w.line, wt);
          setOpacity(w.head, seg(b, 0.34, 0.4));
        }
        var ot = seg(b, 0.4, 0.6);
        api.reveal(n.outline, ot);
        setOpacity(n.base, ot);
        setOpacity(n.label, ot);
        setOpacity(n.idx, ot);
        setOpacity(n.fill, 0.15 * seg(b, 0.6, 1));
      }

      // Blip: hop from node i−1 to node i during u 0–.6 (b0 walks in from x −40)
      var k = Math.min(N - 1, Math.floor(T)), u = T >= N ? 1 : T - k;
      var to = st.rects[k], tx = to.x + to.w / 2, ty = to.y;
      var from = k > 0 ? st.rects[k - 1] : null;
      var fx = from ? from.x + from.w / 2 : -40, fy = from ? from.y : ty;
      var s = easeInOut(seg(u, 0, 0.6));
      var x = lerp(fx, tx, s), y = lerp(fy, ty, s) - (from ? HOP * Math.sin(Math.PI * s) : 0);

      return {
        x: r2(x), y: r2(y),
        form: 'hardhat',
        expr: T >= N ? 'happy' : 'open',
        look: { x: tx, y: to.y + to.h / 2 }   // eyes on the node being built
      };
    }
  };
})();
