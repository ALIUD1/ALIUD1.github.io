/* fig. 03 · CLAWS telemetry: "Blip grows an antenna." SPEC §5.3
 *
 * Act A (beats 0-4): NASA's TSS → the team backend → my /eva page + the Unity headset,
 * then two astronaut cards whose gauges trip WARN, DANGER and FAST, and an alert list
 * (DOM chips in api.panel) that re-sorts danger-first and dedupes by id.
 * Act B (beat 5): the onboarding mock on a laptop, streaming to three clients at 5 Hz.
 *
 * The scroll layer is a pure function of T, so scrubbing back restores every pixel.
 * The 5 Hz loop is the one time-based layer: it is stepped from render(now) (never a
 * timer), only while T ≥ 5.25, motion is on, and core is rendering the stage (core only
 * renders visible stages, so the loop stops offscreen). Teammate blocks are drawn dashed.
 */
(function () {
  'use strict';
  var S = window.SCENES = window.SCENES || {};

  /* ---------- small pure helpers ---------- */
  function clamp(v, lo, hi) {
    lo = lo == null ? 0 : lo; hi = hi == null ? 1 : hi;
    return v < lo ? lo : v > hi ? hi : v;
  }
  function seg(T, a, b) { return clamp((T - a) / (b - a)); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
  function easeOutBack(t) { var c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); }
  function pt(x, y) { return { x: x, y: y }; }
  function hop(a, b, t, h) { return pt(lerp(a.x, b.x, t), lerp(a.y, b.y, t) - (h || 0) * Math.sin(Math.PI * t)); }
  /* constant-speed travel along a polyline */
  function along(pts, t) {
    var lens = [], total = 0, i;
    for (i = 1; i < pts.length; i++) { var l = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y); lens.push(l); total += l; }
    var d = clamp(t) * total;
    for (i = 0; i < lens.length; i++) {
      if (d <= lens[i] || i === lens.length - 1) return hop(pts[i], pts[i + 1], lens[i] ? clamp(d / lens[i]) : 1, 0);
      d -= lens[i];
    }
    return pts[pts.length - 1];
  }
  function r2(v) { return Math.round(v * 100) / 100; }
  function nowMs() { return (window.performance && performance.now) ? performance.now() : Date.now(); }
  function wideScreen() { return !!(window.matchMedia && window.matchMedia('(min-width: 960px)').matches); }
  /* phone type is larger (style.css: mono labels 18u), so labels that sit in a fixed box are squeezed
     to their room. Mono advance = .6em; the size is read once per breakpoint flip (a style read).
     fits: [node, room on wide, room on phones (defaults to the wide room)]. */
  var MQ_WIDE = window.matchMedia ? window.matchMedia('(min-width: 960px)') : null;
  function fitLabels(st, wide) {
    st.fits.forEach(function (f) {
      var node = f[0], px = parseFloat(window.getComputedStyle(node).fontSize) || 14, room = wide ? f[1] : (f[2] || f[1]);
      if (node.textContent.length * 0.6 * px > room) {
        node.setAttribute('textLength', room); node.setAttribute('lengthAdjust', 'spacingAndGlyphs');
      } else { node.removeAttribute('textLength'); node.removeAttribute('lengthAdjust'); }
    });
  }
  /* write every breakpoint-dependent position (SPEC §5.3 geometry on wide; the packed phone layout
     below 960 px), then refit the labels. Runs at the first render and on each breakpoint flip. */
  function relayout(st) {
    var wide = MQ_WIDE ? MQ_WIDE.matches : true;
    if (st.layWide === wide) return;
    st.layWide = wide;
    useLayout(wide);
    var n = st.n;
    n.cards.forEach(function (K, c) {
      var x = cardX(c);
      A(K.box, 'x', x); A(K.box, 'width', L.cw);
      A(K.name, 'x', x + 16);
      A(K.foot, 'x', x + 16); txt(K.foot, L.foot);
    });
    n.gauges.forEach(function (gg) {
      var row = gg.row, G = gg.G, y = rowY(gg.k), x = cardX(gg.c), x0 = x + TRACK_X;
      if (row.tint) { A(row.tint, 'x', x + 8); A(row.tint, 'y', y + L.tint[0]); A(row.tint, 'width', L.cw - 16); A(row.tint, 'height', L.tint[1]); }
      A(row.label, 'x', x + L.lab[0]); A(row.label, 'y', y + L.lab[1]);
      A(row.track, 'x', x0); A(row.track, 'y', y - 3); A(row.track, 'width', TRACK_W);
      A(row.band, 'x', r2(x0 + G.lo * TRACK_W)); A(row.band, 'y', y - 9); A(row.band, 'width', r2((G.hi - G.lo) * TRACK_W));
      var nx = r2(x0 + G.nom * TRACK_W);
      A(row.nom, 'x1', nx); A(row.nom, 'x2', nx); A(row.nom, 'y1', y - 12); A(row.nom, 'y2', y + 12);
      A(row.mark, 'y', y - 9);
      if (row.word) { A(row.word, 'x', x0 + TRACK_W); A(row.word, 'y', y - 14); }
    });
    // act B
    var hy = L.hub.y;
    A(n.wMain, 'd', 'M' + L.mainX0 + ' ' + hy + 'H' + L.hub.x);
    A(n.wTerm, 'd', 'M' + L.hub.x + ' ' + hy + 'V135H' + L.cliX);
    A(n.wUnity, 'd', 'M' + L.hub.x + ' ' + hy + 'V325H' + L.cliX);
    A(n.wPy, 'd', L.pyWire);
    A(n.ws, 'x', L.ws); A(n.ws, 'y', hy - 9);
    var lp = L.laptop;
    A(n.lapBox, 'x', lp[0]); A(n.lapBox, 'y', lp[1]); A(n.lapBox, 'width', lp[2]); A(n.lapBox, 'height', lp[3]);
    A(n.lapBase, 'd', L.base);
    A(n.lapName, 'x', L.lapText); A(n.lapName, 'y', lp[1] + lp[3] / 2 - 9);
    A(n.lapSub, 'x', L.lapText); A(n.lapSub, 'y', lp[1] + lp[3] / 2 + 17);
    A(n.termBox, 'width', L.termW); A(n.termRule, 'x2', 440 + L.termW);
    A(n.termTitle, 'x', L.termX);
    n.term.forEach(function (t) { A(t, 'x', L.termX); });
    A(n.gL, 'transform', L.lx ? 'translate(' + L.lx + ' 0)' : '');
    A(n.gP, 'transform', L.lx ? 'translate(' + L.lx + ' 0)' : '');
    A(n.gR, 'transform', L.rx ? 'translate(' + L.rx + ' 0)' : '');
    var P = L.py;
    A(n.pyBox, 'x', P[0]); A(n.pyBox, 'y', P[1]); A(n.pyBox, 'width', P[2]); A(n.pyBox, 'height', P[3]);
    A(n.pyText, 'x', P[0] + P[2] / 2); A(n.pyText, 'y', P[1] + 25);
    st.pyC = pt(P[0] + P[2] / 2, P[1] + P[3] / 2);
    fitLabels(st, wide);
  }

  /* ---------- cached DOM writers: write only on change, so every frame is cheap ---------- */
  function A(n, k, v) {
    var c = n.__t3 || (n.__t3 = {});
    v = String(v);
    if (c[k] !== v) { c[k] = v; n.setAttribute(k, v); }
  }
  /* opacity, plus visibility so hidden nodes never catch a tip hover */
  function op(n, v) {
    v = clamp(v);
    A(n, 'opacity', r2(v));
    A(n, 'visibility', v > 0.004 ? 'visible' : 'hidden');
  }
  /* whole acts: display:none when gone, so nothing inside can catch a tip */
  function opG(n, v) {
    v = clamp(v);
    A(n, 'opacity', r2(v));
    A(n, 'display', v > 0.004 ? 'inline' : 'none');
  }
  function tf(n, s) { A(n, 'transform', s); }
  function at(n, x, y, s) { tf(n, 'translate(' + r2(x) + ' ' + r2(y) + ')' + (s != null && s !== 1 ? ' scale(' + r2(s) + ')' : '')); }
  function txt(n, s) { if (n.__tx !== s) { n.__tx = s; n.textContent = s; } }
  function css(n, k, v) {
    var c = n.__cs || (n.__cs = {});
    if (c[k] !== v) { c[k] = v; n.style[k] = v; }
  }
  /* pathLength=1 stroke reveal; hidden outright at 0 so round caps leave no dot */
  function reveal(n, t) {
    t = clamp(t);
    A(n, 'stroke-dasharray', '1 1');
    A(n, 'stroke-dashoffset', r2(1 - t));
    A(n, 'opacity', t > 0.001 ? 1 : 0);
  }

  /* ---------- content (SPEC §5.3) ---------- */
  var TIP = {
    tss: 'NASA\'s telemetry server, not mine',
    dashed: 'built by teammates; drawn dashed on purpose',
    mine: 'my EVA page: 699 of the original 762 lines',
    gauges: 'danger: below min or above max · warn: in range but off nominal · fast: change per second over its limit',
    laptop: 'full state JSON pushed to every /ws client each tick',
    unity: 'TssClient.cs parks the newest frame on a background thread and parses it on the main thread',
    pytest: 'steps simulated time by hand to fast-forward the egress procedure'
  };
  var ANN_OPEN = 'o2_vent open: O2 draining in the mock';
  var ANN_CLOSED = 'o2_vent closed: drain stopped';
  var ZERO_LINE = 'o2 0% · (a mock of a mock)';

  /* ---------- act A layout ---------- */
  var BACKEND_ROOF = pt(295, 40), TSS_ROOF = pt(89, 40), JUNCTION = pt(430, 85);
  var REACT = pt(565, 60), PERCH = pt(370, 215), LAPTOP_PERCH = pt(170, 160);
  var CARDS = [{ name: 'EVA-1' }, { name: 'EVA-2' }];
  var CARD_Y = 200;

  /* Two layouts. `wide` (≥ 960 px) is SPEC §5.3 as drawn. Phones see only a ~520-600u slice of the
     800u stage, so `phone` packs the same parts into x 145..655: 250u cards (each gauge's name sits
     above a full-width track), and act B with a narrower laptop nudged right and the clients nudged
     left. Pan spans in render() keep each beat's subject in view on anything narrower. */
  var LAYOUTS = {
    wide: {
      cx: [24, 416], cw: 360, tx: 136, tw: 208, row0: 50, lab: [16, 5], tint: [-17, 34],
      foot: '4 of 22 fields shown · demo values', footFit: 328, labFit: 112,
      lx: 0, rx: 0, laptop: [60, 180, 220, 150], base: 'M44 330H296L284 342H56Z', lapText: 170,
      mainX0: 280, hub: pt(360, 255), cliX: 440, termW: 320, termX: 456, termFit: 288,
      py: [660, 250, 120, 40], pyWire: 'M360 225H720V250', ws: 320, perch: pt(170, 160), split: false,
      spanB: [56, 764]
    },
    phone: {
      cx: [145, 405], cw: 250, tx: 16, tw: 218, row0: 66, lab: [16, -14], tint: [-31, 44],
      // labFit 138: at 19u "suit pressure" would end ~2u short of EVA-2's right-aligned DANGER word
      foot: '4 of 22 fields shown', footFit: 218, labFit: 138,
      // act B, local coords: the left group moves by lx, the client group by rx
      lx: 70, rx: -80, laptop: [90, 180, 140, 120], base: 'M80 300H240L230 312H90Z', lapText: 160,
      mainX0: 300, hub: pt(345, 240), cliX: 360, termW: 292, termX: 450, termFit: 272,
      // pytest sits right of the map; its wire runs at y 216, between the terminal and "Unity map"
      py: [650, 290, 80, 36], pyWire: 'M345 216H610V290', ws: 323, perch: pt(230, 160), split: true,
      spanB: [146, 656]
    }
  };
  var L = LAYOUTS.wide;
  var TRACK_X = L.tx, TRACK_W = L.tw;
  function useLayout(wide) {
    L = wide ? LAYOUTS.wide : LAYOUTS.phone;
    TRACK_X = L.tx; TRACK_W = L.tw;
    LAPTOP_PERCH = L.perch;
    PATH_TERM = [pt(L.mainX0, L.hub.y), L.hub, pt(L.hub.x, 135), pt(L.cliX, 135)];
    PATH_UNITY = [pt(L.mainX0, L.hub.y), L.hub, pt(L.hub.x, 325), pt(L.cliX, 325)];
  }
  function cardX(c) { return L.cx[c]; }
  /* Demo gauges as fractions of the track: safe band [lo, hi], nominal tick, resting value per card.
     Illustration only: no units or real ranges are shown. */
  var GAUGES = [
    { name: 'O2', lo: 0.2, hi: 0.85, nom: 0.6, v: [0.62, 0.59] },
    { name: 'suit pressure', lo: 0.3, hi: 0.7, nom: 0.5, v: [0.51, 0.5] },
    { name: 'battery', lo: 0.15, hi: 0.95, nom: 0.8, v: [0.78, 0.81] },
    { name: 'heart rate', lo: 0.25, hi: 0.75, nom: 0.45, v: [0.46, 0.44] }
  ];
  /* The three b3 events, in arrival order. `rank` is the danger-first sort key used in b4. */
  var ALERTS = [
    { kind: 'warn', word: 'WARN', card: 0, g: 3, at: 3.2, ramp: 0.1, to: 0.66, rank: 1,
      full: 'WARN · EVA-1 heart rate', compact: 'WARN · E1 HR' },
    { kind: 'danger', word: 'DANGER', card: 1, g: 1, at: 3.5, ramp: 0.12, to: 0.8, rank: 0,
      full: 'DANGER · EVA-2 suit pressure', compact: 'DANGER · E2 press' },
    { kind: 'fast', word: 'FAST', card: 0, g: 0, at: 3.8, ramp: 0.03, to: 0.38, rank: 2,
      full: 'FAST · EVA-1 O2', compact: 'FAST · E1 O2' }
  ];
  var MARK_CLS = { none: 'f-ink', warn: 'f-warn', danger: 'f-danger', fast: 'f-signal strobe' };
  var TINT_CLS = { warn: 'f-warn', danger: 'f-danger', fast: 'f-signal' };

  function rowY(g) { return CARD_Y + L.row0 + 44 * g; }
  function trackX(c, f) { return cardX(c) + TRACK_X + f * TRACK_W; }
  function sweepX0() { return L.cx[0]; }
  function sweepW() { return L.cx[1] + L.cw - L.cx[0]; }
  function alertOf(c, g) {
    for (var i = 0; i < ALERTS.length; i++) if (ALERTS[i].card === c && ALERTS[i].g === g) return ALERTS[i];
    return null;
  }
  /* gauge value at T: resting value, eased to the alert value, plus the b2 jitter */
  function gaugeValue(c, g, T) {
    var v = GAUGES[g].v[c], a = alertOf(c, g);
    if (a) v = lerp(v, a.to, ease(seg(T, a.at - a.ramp, a.at)));
    if (T >= 2) v += 0.01 * Math.sin(T * 40 + c * 4 + g);
    return clamp(v);
  }

  /* ---------- act B layout ---------- */
  var PATH_TERM, PATH_UNITY;   // set by useLayout
  var POIS = [pt(474, 272), pt(606, 282), pt(594, 382), pt(478, 374)];
  var EV_START = pt(540, 330);
  var TICK = 200, DOT_MS = 600, EV_SPEED = 30;   // 5 Hz, 600 ms dot trip, 30 u/s
  var MAP = { x: 440, y: 240, w: 200, h: 170 };
  useLayout(true);

  /* ---------- the 5 Hz mock (pure state machine; the caller supplies the time) ---------- */
  function freshSim(vent) {
    return { n: 0, o2: 100, vent: !!vent, zero: false, lines: [], ticks: [], last: null, dirty: false,
      poi: 0, ev: { x: EV_START.x, y: EV_START.y, a: 0 }, evPrev: { x: EV_START.x, y: EV_START.y, a: 0 },
      ventT0: -1e9, postVal: false };
  }
  function simTick(b, t) {
    b.n++; b.dirty = true;
    if (t != null) { b.ticks.push(t); if (b.ticks.length > 4) b.ticks.shift(); }
    if (b.vent) b.o2 = Math.max(0, b.o2 - 0.8);
    if (b.o2 <= 0) b.zero = true;
    b.lines.push('frame #' + b.n + ' · o2 ' + Math.round(b.o2) + '%');
    if (b.lines.length > 5) b.lines.shift();
    // the EV walks toward the next point of interest at 30 u/s and faces where it is going
    b.evPrev = { x: b.ev.x, y: b.ev.y, a: b.ev.a };
    var goal = POIS[b.poi], dx = goal.x - b.ev.x, dy = goal.y - b.ev.y, d = Math.hypot(dx, dy), step = EV_SPEED * TICK / 1000;
    if (d > 0.01) b.ev.a = Math.atan2(dy, dx);
    if (d <= step) { b.ev.x = goal.x; b.ev.y = goal.y; b.poi = (b.poi + 1) % POIS.length; }
    else { b.ev.x += dx / d * step; b.ev.y += dy / d * step; }
  }
  /* terminal view: newest 5 lines; once O2 is gone the punchline stays pinned at the bottom */
  function termLines(b) {
    if (!b.zero) return b.lines;
    return b.lines.slice(-4).concat([ZERO_LINE]);
  }
  function angLerp(a, b, t) {
    var d = b - a;
    while (d > Math.PI) d -= 2 * Math.PI;
    while (d < -Math.PI) d += 2 * Math.PI;
    return a + d * t;
  }

  /* ---------- Blip's scroll pose ---------- */
  function clonePos(u) {
    if (u < 0.5) return pt(lerp(JUNCTION.x, 456, easeOut(seg(u, 0.3, 0.42))), lerp(JUNCTION.y, 102, easeOut(seg(u, 0.3, 0.42))));
    return along([pt(456, 102), pt(480, 140), pt(565, 140)], ease(seg(u, 0.5, 0.95)));
  }
  function pose(T) {
    var b = Math.min(5, Math.floor(T)), u = T - b, p, form = 'antenna', expr = 'open', look;
    switch (b) {
      case 0: // datagram run: backend → TSS → back
        form = 'ping';
        if (u < 0.55) { p = hop(BACKEND_ROOF, TSS_ROOF, ease(seg(u, 0.1, 0.5)), 26); look = pt(89, 85); }
        else { p = hop(TSS_ROOF, BACKEND_ROOF, ease(seg(u, 0.55, 0.95)), 26); look = pt(295, 85); }
        break;
      case 1: // fan-out at the junction, with a double-take at the clone
        form = 'ping';
        if (u < 0.5) p = hop(BACKEND_ROOF, JUNCTION, ease(seg(u, 0, 0.3)), 22);
        else p = hop(JUNCTION, REACT, ease(seg(u, 0.5, 0.8)), 30);
        if (u >= 0.3 && u < 0.5) {
          var c = clonePos(u);
          look = (u >= 0.42 && u < 0.46) ? 'camera' : pt(c.x, c.y - 16);
          if (u >= 0.38) expr = 'wide';
        }
        break;
      case 2: // the sweep: checkRanges() over both cards
        p = hop(REACT, PERCH, ease(seg(u, 0, 0.15)), 40);
        look = pt(sweepX0() + u * sweepW(), 325);
        break;
      case 3: // three alerts trip
        p = PERCH;
        var a = u < 0.45 ? ALERTS[0] : u < 0.75 ? ALERTS[1] : ALERTS[2];
        if (u >= 0.15) look = pt(trackX(a.card, a.to), rowY(a.g));
        if (u >= 0.5 && u < 0.65) expr = 'wide';
        break;
      case 4: // sort + dedupe: watch the list under the stage
        p = PERCH; look = pt(400, 640);
        if (u >= 0.85) expr = 'happy';
        break;
      default: // act B: hop over to the laptop
        p = hop(PERCH, LAPTOP_PERCH, ease(seg(u, 0, 0.25)), 50);
        if (u >= 0.25) look = pt(600, 150);
    }
    return { x: p.x, y: p.y, form: form, expr: expr, look: look };
  }

  /* ---------- build ---------- */
  function setup(api, svg) {
    var E = api.el, T_ = api.text;
    function g(attrs, parent) { return E('g', attrs || {}, parent); }
    function rect(x, y, w, h, cls, parent, rx) { return E('rect', { x: x, y: y, width: w, height: h, rx: rx == null ? 8 : rx, 'class': cls }, parent); }
    function line(x1, y1, x2, y2, cls, parent) { return E('line', { x1: x1, y1: y1, x2: x2, y2: y2, 'class': cls }, parent); }
    function path(d, cls, parent) { return E('path', { d: d, 'class': cls, pathLength: 1 }, parent); }

    var st = { api: api, svg: svg, layWide: null, pyC: pt(720, 270), controls: [{ label: 'uia o2_vent: open / close', action: 'vent', pressed: false, from: 5 }],
      sim: freshSim(false), rmB: false, ventBtn: null, pokeT: -1e9, bx: PERCH.x, by: PERCH.y, live: false };
    var n = st.n = {};

    /* ===== act A ===== */
    var gA = n.gA = g({ 'class': 'act-a' }, svg);

    // wires first, so boxes sit on top of their ends
    n.wTB = path('M210 85H154', 'ls', gA);
    n.wBJ = path('M380 85H430', 'ls', gA);
    n.wJP = path('M430 85C455 85 455 60 480 60', 'ls', gA);
    n.wJU = path('M430 85C455 85 455 140 480 140', 'ls', gA);
    n.junction = E('circle', { cx: JUNCTION.x, cy: JUNCTION.y, r: 4, 'class': 'f-signal' }, gA);

    var tss = g({}, gA);
    rect(24, 40, 130, 90, 'dash f-paper', tss);
    T_(89, 80, 'NASA TSS', 't-big t-mid-a', tss);
    st.fits = [[T_(89, 106, 'UDP · not mine', 't-label t-mid-a c-ink2', tss), 118]];
    api.tip(tss, TIP.tss);

    var backend = g({}, gA);
    rect(210, 40, 170, 90, 'dash f-paper', backend);
    T_(295, 80, 'team backend', 't-big t-mid-a', backend);
    st.fits.push([T_(295, 106, 'Flask-SocketIO', 't-label t-mid-a c-ink2', backend), 158]);
    api.tip(backend, TIP.dashed);

    // labels sit low in their boxes: in b1 Blip lands at (565,60) and the clone at (565,140),
    // and their half-size bodies stand just above the text instead of on it
    var mine = g({}, gA);
    E('rect', { x: 480, y: 30, width: 170, height: 60, rx: 8, 'class': 'f-signal', opacity: 0.12 }, mine);
    rect(480, 30, 170, 60, 'ln', mine);
    T_(565, 77, 'my /eva page', 't-big t-mid-a', mine);
    api.tip(mine, TIP.mine);

    var headset = g({}, gA);
    rect(480, 110, 170, 60, 'dash f-paper', headset);
    T_(565, 157, 'Unity headset', 't-big t-mid-a', headset);
    api.tip(headset, TIP.dashed);

    n.every6 = T_(565, 189, '≈ every 6 s per feed', 't-label t-mid-a c-ink2', gA);
    n.dgLabel = T_(182, 162, '[uint32 ts][uint32 cmd=1]', 't-label t-mid-a', gA);

    // the two astronaut cards (positions are written by layout(), per breakpoint)
    n.gauges = []; n.cards = [];
    CARDS.forEach(function (card, c) {
      var gc = g({}, gA), K = { g: gc };
      n.cards.push(K);
      K.box = rect(0, CARD_Y, 0, 250, 'ln f-paper', gc, 12);
      K.name = T_(0, CARD_Y + 30, card.name, 't-big', gc);
      K.foot = T_(0, CARD_Y + 236, '', 't-label c-ink2', gc);
      st.fits.push([K.foot, LAYOUTS.wide.footFit, LAYOUTS.phone.footFit]);
      GAUGES.forEach(function (G, k) {
        var a = alertOf(c, k);
        var row = {
          tint: a ? rect(0, 0, 0, 0, TINT_CLS[a.kind], gc, 6) : null,
          a: a,
          label: T_(0, 0, G.name, 't-label', gc),
          track: rect(0, 0, 0, 6, 'f-rule', gc, 3),
          band: E('rect', { height: 18, rx: 3, 'class': 'f-ok', opacity: 0.18 }, gc),
          nom: line(0, 0, 0, 0, 'ln2', gc)
        };
        row.mark = E('rect', { x: -2, y: 0, width: 4, height: 18, rx: 1, 'class': MARK_CLS.none }, gc);
        row.word = a ? T_(0, 0, a.word, 't-label t-end' + (a.kind === 'danger' ? ' c-danger' : ''), gc) : null;
        st.fits.push([row.label, LAYOUTS.wide.labFit, LAYOUTS.phone.labFit]);
        n.gauges.push({ c: c, k: k, row: row, G: G });
      });
      api.tip(gc, TIP.gauges);
    });

    n.sweep = line(0, CARD_Y - 6, 0, CARD_Y + 256, 'ls thick', gA);
    n.lab22 = T_(400, 486, '22 fields × 2 astronauts · 10 rate limits', 't-label t-mid-a', gA);
    n.labDedupe = T_(400, 486, 'dedupe by id', 't-label t-mid-a', gA);

    // b0 datagram: two uint32 words, 8 byte cells
    n.dg = g({}, gA);
    for (var i = 0; i < 8; i++) rect(i * 10 + (i >= 4 ? 4 : 0), 0, 9, 11, i < 4 ? 'ls f-paper' : 'ln f-paper', n.dg, 2);
    n.dgJson = T_(0, 0, '{…}', 't-label', gA);

    // b1 clone: a <use> of the ping costume, same size as Blip
    n.clone = g({}, gA);
    E('use', { href: '#blip-ping', width: 64, height: 64 }, n.clone);
    E('use', { href: '#blip-face', width: 64, height: 64, transform: 'translate(16 29) scale(.5)' }, n.clone);

    /* ===== act B ===== */
    var gB = n.gB = g({ 'class': 'act-b' }, svg);
    n.wMain = path('', 'ls', gB);
    n.wTerm = path('', 'ls', gB);
    n.wUnity = path('', 'ls', gB);
    n.wPy = path('', 'ls', gB);
    n.ws = T_(0, 246, '/ws', 't-label t-mid-a', gB);

    // left: the laptop and its switch (shifted by L.lx); right: the three clients (shifted by L.rx)
    var gL = n.gL = g({}, gB), gR = n.gR = g({}, gB);
    var laptop = g({}, gL);
    n.lapBox = rect(60, 180, 220, 150, 'ln f-paper', laptop);
    n.lapBase = E('path', { d: '', 'class': 'ln f-paper2' }, laptop);
    n.lapName = T_(170, 246, 'mock_tss.py', 't-big t-mid-a', laptop);
    n.lapSub = T_(170, 272, 'FastAPI · sim_loop 5 Hz', 't-small t-mid-a c-ink2', laptop);
    api.tip(laptop, TIP.laptop);

    var term = g({}, gR);
    n.termBox = rect(440, 60, 320, 150, 'ln f-paper', term);
    n.termTitle = T_(456, 82, 'panel.py watch', 't-label c-ink2', term);
    st.fits.push([n.termTitle, 288, 272]);
    n.termRule = line(440, 92, 760, 92, 'lr', term);
    n.term = [];
    for (i = 0; i < 5; i++) n.term.push(T_(456, 114 + 20 * i, '', 't-label', term));

    var unity = g({}, gR);
    T_(MAP.x, MAP.y - 8, 'Unity map', 't-label', unity);
    rect(MAP.x, MAP.y, MAP.w, MAP.h, 'ln f-paper', unity, 6);
    var grid = '';
    for (i = 1; i < 6; i++) {
      grid += 'M' + r2(MAP.x + MAP.w * i / 6) + ' ' + MAP.y + 'V' + (MAP.y + MAP.h);
      grid += 'M' + MAP.x + ' ' + r2(MAP.y + MAP.h * i / 6) + 'H' + (MAP.x + MAP.w);
    }
    E('path', { d: grid, 'class': 'lr thin' }, unity);
    var crosses = '';
    POIS.forEach(function (p) { crosses += 'M' + (p.x - 5) + ' ' + (p.y - 5) + 'l10 10M' + (p.x + 5) + ' ' + (p.y - 5) + 'l-10 10'; });
    E('path', { d: crosses, 'class': 'ln2' }, unity);
    n.ev = g({}, unity);
    E('path', { d: 'M7 0L-7-6L-3.5 0L-7 6Z', 'class': 'ls f-signal' }, n.ev);
    rect(MAP.x, 420, MAP.w, 10, 'f-rule', unity, 5);
    n.hud = rect(MAP.x, 420, MAP.w, 10, 'f-ok', unity, 5);
    n.hudText = T_(MAP.x + MAP.w + 8, 430, 'o2 100%', 't-label', unity);
    api.tip(unity, TIP.unity);

    n.py = g({}, gR);
    n.pyBox = rect(0, 0, 0, 0, 'ln f-paper', n.py, 20);
    n.pyText = T_(0, 0, 'pytest', 't-label t-mid-a', n.py);
    api.tip(n.py, TIP.pytest);

    // the uia o2_vent switch
    var sw = g({}, gL);
    n.swTint = rect(100, 360, 140, 40, 'f-warn', sw, 20);
    rect(100, 360, 140, 40, 'ln', sw, 20);
    n.knob = E('circle', { cx: 120, cy: 380, r: 13, 'class': 'ln f-paper3' }, sw);
    n.swState = T_(182, 385, 'closed', 't-label t-mid-a', sw);
    T_(170, 424, 'uia o2_vent', 't-label t-mid-a', sw);

    n.dots = [];
    for (i = 0; i < 8; i++) n.dots.push(E('circle', { r: 4, 'class': 'f-signal' }, gB));
    // the POST label; phones split it over two lines so it fits the narrower view
    n.gP = g({}, gB);
    n.post = T_(170, 0, '', 't-label t-mid-a c-signal', n.gP);
    n.post2 = T_(170, 0, '', 't-label t-mid-a c-signal', n.gP);

    // poke: a thin ring expanding from Blip (≤ .35 alpha)
    n.ring = E('circle', { r: 0, 'class': 'ls thin' }, svg);

    /* ===== alert list (DOM, aria-hidden panel) =====
       No chip or list ever leaves the layout, so the panel's height is fixed from mount and the
       caption and controls below it never move (CLS): chips hide with visibility and are laid out
       with their labels from the start, and the act A and act B lists share one grid cell. */
    if (api.panel) { api.panel.style.display = 'grid'; api.panel.style.alignItems = 'start'; }
    var LIST = 'margin:0;padding:0;min-height:1.5rem;grid-area:1/1';
    n.ulA = E('ul', { style: LIST }, api.panel);
    n.chips = ALERTS.map(function (a) {
      var li = E('li', { 'class': 'chip ' + a.kind, style: 'position:relative;visibility:hidden' }, n.ulA);
      li.__label = li.appendChild(document.createTextNode(''));   // text node, so the dup span survives
      txt(li.__label, wideScreen() ? a.full : a.compact);
      return li;
    });
    // the duplicate WARN overlays the original, then merges into it
    n.dup = E('span', { 'class': 'chip warn', style: 'position:absolute;left:-1px;top:-1px;right:-1px;bottom:-1px;visibility:hidden' }, n.chips[0]);
    n.ulB = E('ul', { style: LIST + ';visibility:hidden' }, api.panel);
    n.bChips = [E('li', { 'class': 'chip' }, n.ulB), E('li', { 'class': 'chip' }, n.ulB), E('li', { 'class': 'chip' }, n.ulB)];
    txt(n.bChips[0], 'mock_tss.py · 5 Hz');
    txt(n.bChips[1], 'o2_vent closed');
    txt(n.bChips[2], 'o2 100%');

    return st;
  }

  /* ---------- render: act A ---------- */
  function renderA(st, T) {
    var n = st.n, b = Math.min(5, Math.floor(T)), u = T - b;

    reveal(n.wTB, seg(T, 0, 0.1));
    reveal(n.wBJ, seg(T, 1, 1.3));
    reveal(n.wJP, seg(T, 1.3, 1.5));
    reveal(n.wJU, seg(T, 1.3, 1.5));
    op(n.junction, seg(T, 1.25, 1.3));
    op(n.every6, seg(T, 1.5, 1.6));

    // b0: the 8-byte question rides out with Blip, the JSON answer rides back
    var p = pose(T), inB0 = b === 0;
    op(n.dgLabel, inB0 ? seg(u, 0.05, 0.1) * (1 - seg(u, 0.55, 0.6)) : 0);
    op(n.dg, inB0 ? seg(u, 0.05, 0.1) * (1 - seg(u, 0.48, 0.52)) : 0);
    at(n.dg, p.x - 112, p.y - 24);
    op(n.dgJson, inB0 ? seg(u, 0.55, 0.6) * (1 - seg(u, 0.93, 0.98)) : 0);
    A(n.dgJson, 'x', r2(p.x + 26)); A(n.dgJson, 'y', r2(p.y - 12));

    // b1: the broadcast clone heads for Unity
    var showClone = b === 1 && u >= 0.3;
    if (showClone) {
      var c = clonePos(u), s = 0.6875 * easeOutBack(seg(u, 0.3, 0.42));
      tf(n.clone, 'translate(' + r2(c.x) + ' ' + r2(c.y) + ') scale(' + r2(Math.max(0.01, s)) + ') translate(-32 -58)');
    }
    op(n.clone, showClone ? 1 - seg(u, 0.8, 1) : 0);

    // cards wake up for the sweep
    var cardOp = lerp(0.4, 1, seg(T, 1.8, 2.05));
    // b2 sweep line
    var sx = sweepX0() + seg(T, 2, 3) * sweepW();
    A(n.sweep, 'x1', r2(sx)); A(n.sweep, 'x2', r2(sx));
    op(n.sweep, seg(T, 2, 2.04) * (1 - seg(T, 2.96, 3)));
    op(n.lab22, seg(T, 2.05, 2.2) * (1 - seg(T, 4.3, 4.45)));
    op(n.labDedupe, seg(T, 4.5, 4.6));

    // gauges: value marker, alert colour + word, b4 tint
    n.gauges.forEach(function (gg) {
      var row = gg.row, a = row.a, v = gaugeValue(gg.c, gg.k, T), on = a && T >= a.at;
      A(row.mark, 'x', r2(trackX(gg.c, v) - 2));
      A(row.mark, 'class', MARK_CLS[on ? a.kind : 'none']);
      if (row.word) op(row.word, a ? seg(T, a.at, a.at + 0.04) : 0);
      if (row.tint) op(row.tint, 0.16 * seg(T, 4.3, 4.6));
    });
    n.cards.forEach(function (K) { A(K.g, 'opacity', r2(cardOp)); });
  }

  /* ---------- render: the alert chips ---------- */
  function renderChips(st, T) {
    var n = st.n, wide = wideScreen(), p = seg(T, 4, 4.4), sorted = p >= 0.5;
    var lift = Math.sin(Math.PI * p);              // movers rise, swap, and settle (y eased)
    ALERTS.forEach(function (a, i) {
      var li = n.chips[i], appear = seg(T, a.at, a.at + 0.05);
      css(li, 'visibility', appear > 0 ? '' : 'hidden');   // '' inherits, so a hidden list hides it too
      txt(li.__label, wide ? a.full : a.compact);
      css(li, 'order', String(sorted ? a.rank : i));
      var moves = a.rank !== i, y = (1 - easeOut(appear)) * 6 - (moves ? lift * 8 : 0);
      var sc = a.kind === 'warn' ? 1 + 0.06 * Math.sin(Math.PI * seg(T, 4.74, 4.82)) : 1;
      css(li, 'transform', (y || sc !== 1) ? 'translateY(' + r2(y) + 'px) scale(' + r2(sc) + ')' : '');
      css(li, 'opacity', String(r2(appear * (moves ? 1 - 0.35 * lift : 1))));
    });
    // b4 u .5-.8: a duplicate WARN slides in over the original and merges into it
    var s1 = easeOut(seg(T, 4.5, 4.62)), s2 = ease(seg(T, 4.66, 4.76)), dop = s1 * (1 - s2);
    css(n.dup, 'visibility', dop > 0.004 ? '' : 'hidden');
    txt(n.dup, wide ? ALERTS[0].full : ALERTS[0].compact);
    var dx = s2 > 0 ? lerp(14, 0, s2) : lerp(48, 14, s1);
    css(n.dup, 'transform', 'translate(' + r2(dx) + 'px,' + r2(-5 * (1 - s2)) + 'px)');
    css(n.dup, 'opacity', String(r2(dop)));
  }

  /* ---------- render: act B ---------- */
  function renderB(st, T, now, liveB) {
    var n = st.n, b = st.sim;

    reveal(n.wMain, seg(T, 5.15, 5.3));
    reveal(n.wTerm, seg(T, 5.25, 5.45));
    reveal(n.wUnity, seg(T, 5.25, 5.45));
    reveal(n.wPy, seg(T, 5.45, 5.55));
    var pys = easeOutBack(seg(T, 5.45, 5.6));
    var pc = st.pyC;
    tf(n.py, 'translate(' + pc.x + ' ' + pc.y + ') scale(' + r2(Math.max(0.01, pys)) + ') translate(' + -pc.x + ' ' + -pc.y + ')');
    op(n.py, seg(T, 5.45, 5.55));

    // step the 5 Hz mock from the frame clock (no timers): catch up at most 1 s, else resync
    if (liveB) {
      if (b.last == null || now - b.last > 1000) { b.last = now; simTick(b, now); }
      while (now - b.last >= TICK) { b.last += TICK; simTick(b, b.last); }
    } else b.last = null;

    // terminal
    var lines = termLines(b);
    for (var i = 0; i < 5; i++) {
      var s = lines[i] || '';
      txt(n.term[i], s);
      A(n.term[i], 'class', 't-label' + (s === ZERO_LINE ? ' c-danger' : ''));
      // the punchline is the one line wider than the phone terminal: squeeze it to the box
      var sq = L.split && s === ZERO_LINE;
      if (sq !== !!n.term[i].__sq) {
        n.term[i].__sq = sq;
        if (sq) { n.term[i].setAttribute('textLength', L.termFit); n.term[i].setAttribute('lengthAdjust', 'spacingAndGlyphs'); }
        else { n.term[i].removeAttribute('textLength'); n.term[i].removeAttribute('lengthAdjust'); }
      }
    }

    // EV marker, interpolated between ticks
    var f = liveB && b.last != null ? clamp((now - b.last) / TICK) : 1;
    var ex = lerp(b.evPrev.x, b.ev.x, f), ey = lerp(b.evPrev.y, b.ev.y, f), ea = angLerp(b.evPrev.a, b.ev.a, f);
    tf(n.ev, 'translate(' + r2(ex) + ' ' + r2(ey) + ') rotate(' + r2(ea * 180 / Math.PI) + ')');

    // O2 HUD
    var o2 = b.o2;
    A(n.hud, 'width', r2(MAP.w * o2 / 100));
    A(n.hud, 'class', o2 > 25 ? 'f-ok' : 'f-warn');
    op(n.hud, o2 > 0 ? 1 : 0);
    txt(n.hudText, 'o2 ' + Math.round(o2) + '%');

    // /ws dots: one per tick to each of the two stream clients, 600 ms trip
    var d = 0;
    if (liveB) {
      b.ticks.forEach(function (t0) {
        var k = (now - t0) / DOT_MS;
        if (k < 0 || k >= 1 || d + 1 >= n.dots.length) return;
        [PATH_TERM, PATH_UNITY].forEach(function (P) {
          var q = along(P, k), dot = n.dots[d++];
          A(dot, 'cx', r2(q.x)); A(dot, 'cy', r2(q.y));
          op(dot, 1 - seg(k, 0.85, 1));
        });
      });
    }
    for (; d < n.dots.length; d++) op(n.dots[d], 0);

    // vent switch: the knob slides over 200 ms; the POST label travels switch → laptop in 400 ms
    var kt = ease(seg(now - b.ventT0, 0, 200)), from = b.vent ? 120 : 220, to = b.vent ? 220 : 120;
    A(n.knob, 'cx', r2(lerp(from, to, kt)));
    A(n.knob, 'class', b.vent ? 'ln f-warn' : 'ln f-paper3');
    op(n.swTint, b.vent ? 0.22 * kt : 0.22 * (1 - kt));
    txt(n.swState, b.vent ? 'open' : 'closed');
    A(n.swState, 'x', b.vent ? 160 : 182);
    var pk = (now - b.ventT0) / 400;
    var body = '{"value": ' + (b.postVal ? 'true' : 'false') + '}', py = r2(lerp(394, 304, ease(clamp(pk))));
    var pop = pk >= 0 && pk < 1 ? seg(pk, 0, 0.15) * (1 - seg(pk, 0.8, 1)) : 0;
    txt(n.post, L.split ? 'POST /uia/o2_vent' : 'POST /uia/o2_vent ' + body);
    txt(n.post2, L.split ? body : '');
    A(n.post, 'y', py); A(n.post2, 'y', r2(py + 20));
    op(n.post, pop); op(n.post2, L.split ? pop : 0);

    // panel chips for act B
    txt(n.bChips[1], 'o2_vent ' + (b.vent ? 'open' : 'closed'));
    A(n.bChips[1], 'class', b.vent ? 'chip warn' : 'chip');
    txt(n.bChips[2], 'o2 ' + Math.round(o2) + '%');
    A(n.bChips[2], 'class', o2 > 0 ? 'chip' : 'chip danger');
  }

  /* reset act B (and the vent toggle) when the reader scrolls back into act A */
  function resetB(st) {
    st.sim = freshSim(false);
    st.rmB = false;
    if (st.ventBtn) st.ventBtn.setAttribute('aria-pressed', 'false');
  }

  /* ---------- phone pan (core: `span`, ignored on wide) ----------
     What must stay readable on each beat. Act A: the top row through b1, then both cards when the
     view holds them; on a view too narrow for both, the card the beat is about (the one being swept
     in b2; the one whose alert just tripped in b3, so the DANGER beat shows EVA-2; EVA-2 while the
     list sorts danger-first in b4, then EVA-1 for the WARN dedupe). Act B: laptop to terminal. */
  function cardSpan(c) { return [cardX(c) - 8, cardX(c) + L.cw + 8]; }
  function span(st, T, showB) {
    if (showB) return L.spanB;
    if (T < 1) return [16, 388];          // b0: backend and TSS, with the datagram label
    if (T < 2) return [202, 673];         // b1: backend, junction, my page, headset, every-6-s label
    var both = [cardX(0) - 4, cardX(1) + L.cw + 4];   // 518u on phones
    var vb = (st.svg.getAttribute('viewBox') || '').split(' '), vbW = +vb[2] || 800;
    if (vbW >= both[1] - both[0]) return both;
    if (T < 3) return cardSpan(sweepX0() + seg(T, 2, 3) * sweepW() < (cardX(0) + L.cw + cardX(1)) / 2 ? 0 : 1);
    if (T < 4) return cardSpan(T >= 3.42 && T < 3.72 ? 1 : 0);
    return cardSpan(T < 4.45 || T >= 5 ? 1 : 0);
  }

  /* ---------- the scene ---------- */
  S.telemetry = {
    beats: 6, poster: 5, pan: 'follow', tag: 'fig. 0N · illustration with demo values',

    setup: setup,

    render: function (st, T, now) {
      var n = st.n, rm = st.api.rm();
      relayout(st);
      if (now == null || !isFinite(now)) now = nowMs();
      // under reduced motion a vent click jumps the poster to act B's end state
      if (rm && st.rmB) T = 6;
      if (T < 5 && st.sim.dirty) resetB(st);

      var liveB = !rm && T >= 5.25;
      var fade = ease(seg(T, 5, 5.25));
      opG(n.gA, 1 - fade);
      opG(n.gB, fade);
      if (fade < 1) renderA(st, T);
      renderChips(st, T);
      renderB(st, T, now, liveB);
      var showB = fade >= 0.5;
      css(n.ulA, 'visibility', showB ? 'hidden' : '');
      css(n.ulB, 'visibility', showB ? '' : 'hidden');


      // Blip
      var o = pose(T);
      if (T >= 5.25 && st.sim.zero) o.expr = 'wide';
      st.bx = o.x; st.by = o.y;

      // poke ring
      var pf = (now - st.pokeT) / 700, poking = !rm && pf >= 0 && pf < 1;
      if (poking) {
        A(n.ring, 'cx', r2(st.ringX)); A(n.ring, 'cy', r2(st.ringY));
        A(n.ring, 'r', r2(8 + 64 * easeOut(pf)));
      }
      op(n.ring, poking ? 0.35 * (1 - pf) : 0);

      var posting = !rm && now - st.sim.ventT0 < 450;
      st.live = liveB || posting || poking;
      o.span = span(st, T, showB);
      return o;
    },

    action: function (st, name, btn) {
      if (name !== 'vent') return;
      var b = st.sim, open = btn.getAttribute('aria-pressed') === 'true';
      st.ventBtn = btn;
      b.vent = open; b.postVal = open; b.dirty = true;
      if (st.api.rm()) {
        // no motion: jump to the end state (drained to 0 when open, a few steady frames when closed)
        st.rmB = true; b.ventT0 = -1e9;
        var guard = 0;
        do { simTick(b, null); guard++; } while (guard < 400 && (b.lines.length < 5 || (open && b.o2 > 0) || (!open && guard < 5)));
      } else {
        b.ventT0 = nowMs();
        st.live = true;
        st.api.wake();
      }
      return { announce: open ? ANN_OPEN : ANN_CLOSED };
    },

    poke: function (st) {
      st.pokeT = nowMs();
      st.ringX = st.bx; st.ringY = st.by - 20;
      st.live = true;
      return { expr: 'happy' };
    }
  };
})();
