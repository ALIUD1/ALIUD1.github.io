/* fig. 01 · Inference Server: "Blip becomes a request."
 *
 * Scroll-driven drawing of one request's trip through the server (SPEC §5.1):
 * client → FastAPI frontend (Future on pending_jobs) → Redis (SET + RPUSH) →
 * worker batch (8 jobs or 200 ms) → MGET/DEL → one ResNet-18 pass →
 * 24-byte reply on the response list → response_reader → set_result → client.
 *
 * Everything in the scroll layer is a pure function of T, so scrubbing back
 * restores the exact picture. Two click layers run on wall-clock time
 * ("Send requests" and "Replay the hang") and set state.live while they play.
 * SCENES.queue.batchSim() is the pure batch-close rule shared with ?check.
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
  function easeOutBack(t) { var c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); }
  function pt(x, y) { return { x: x, y: y }; }
  /* straight travel with a parabolic hop of height h */
  function hop(a, b, t, h) {
    return pt(lerp(a.x, b.x, t), lerp(a.y, b.y, t) - (h || 0) * Math.sin(Math.PI * t));
  }
  function quad(a, c, b, t) {
    var m = 1 - t;
    return pt(m * m * a.x + 2 * m * t * c.x + t * t * b.x, m * m * a.y + 2 * m * t * c.y + t * t * b.y);
  }
  function cubic(a, b, c, d, t) {
    var m = 1 - t, A = m * m * m, B = 3 * m * m * t, C = 3 * m * t * t, D = t * t * t;
    return pt(A * a.x + B * b.x + C * c.x + D * d.x, A * a.y + B * b.y + C * c.y + D * d.y);
  }
  /* constant-speed travel along a polyline */
  function along(pts, t) {
    var lens = [], total = 0, i;
    for (i = 1; i < pts.length; i++) {
      var l = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
      lens.push(l); total += l;
    }
    var d = t * total;
    for (i = 0; i < lens.length; i++) {
      if (d <= lens[i] || i === lens.length - 1) {
        var f = lens[i] ? clamp(d / lens[i]) : 1;
        return hop(pts[i], pts[i + 1], f, 0);
      }
      d -= lens[i];
    }
    return pts[pts.length - 1];
  }
  function r2(v) { return Math.round(v * 100) / 100; }
  function now() { return (window.performance && performance.now) ? performance.now() : Date.now(); }

  /* ---------- cached DOM writers (write only on change) ---------- */
  function A(n, k, v) {
    var c = n.__q || (n.__q = {});
    v = String(v);
    if (c[k] !== v) { c[k] = v; n.setAttribute(k, v); }
  }
  function op(n, v) { A(n, 'opacity', r2(clamp(v))); }
  function at(n, x, y, s, rot) {
    var t = 'translate(' + r2(x) + ' ' + r2(y) + ')';
    if (rot) t += ' rotate(' + r2(rot) + ')';
    if (s != null && s !== 1) t += ' scale(' + r2(s) + ')';
    A(n, 'transform', t);
  }
  function cls(n, c) { A(n, 'class', c); }
  function txt(n, s) { if (n.__t !== s) { n.__t = s; n.textContent = s; } }
  /* rendered font size of a text's size class: phones set bigger viewBox sizes than the nominal
   * 13/14/20. A style read (never layout), cached per class and dropped on resize. */
  var FS = {};
  try { window.addEventListener('resize', function () { FS = {}; }); } catch (e) { /* no window events */ }
  function fontSize(n, d) {
    var c = n.getAttribute('class') || '';
    var k = /\bt-small\b/.test(c) ? 's' : /\bt-big\b/.test(c) ? 'b' : /\bt-mid\b/.test(c) ? 'm' : 'l';
    if (!FS[k]) {
      var v = parseFloat(window.getComputedStyle(n).fontSize);
      if (!(v > 0)) return d;                     // detached / not styled yet: nominal size, no cache
      FS[k] = v;
    }
    return FS[k];
  }
  /* squeeze a mono label into maxW viewBox units (no layout reads: mono advance = .6em of the
     rendered size) */
  function fit(n, s, maxW, size) {
    txt(n, s);
    var w = s.length * 0.6 * fontSize(n, size || 14);
    if (w > maxW) { A(n, 'textLength', maxW); A(n, 'lengthAdjust', 'spacingAndGlyphs'); }
    else if (n.__q && n.__q.textLength) { n.removeAttribute('textLength'); n.__q.textLength = ''; }
  }
  function hits(n, on) { A(n, 'pointer-events', on ? 'all' : 'none'); }
  /* path-based reveal (pathLength=1) */
  function reveal(n, t) {
    t = clamp(t);
    A(n, 'stroke-dasharray', '1 1');
    A(n, 'stroke-dashoffset', r2(1 - t));
    op(n, t > 0.001 ? 1 : 0);
  }

  /* ---------- layout constants (viewBox units, SPEC §5.1) ---------- */
  var LANE_Y = [40, 136, 232, 328];           // W1..W4 lane tops
  var HEAD = pt(488, 250);                    // head slot of the jobs list
  var TAIL = pt(312, 250);
  var SEAT3 = pt(180, 182);                   // Blip's seat on pending_jobs (k = 2)
  var SEAT_TOP = pt(180, 173);
  var TRAY_SEAT = pt(603, 170);               // on W2's tray, above slot 3
  var ROW_SEAT = pt(652, 300);                // beside the argmax rows in the inset
  var READER_TOP = pt(180, 440);
  var DOOR = pt(44, 330);
  var CROWD = [[32, 72], [58, 88], [34, 112], [60, 130], [32, 152], [58, 172], [42, 196]];
  /* queue order on the jobs list: H1, H2, Blip, G1..G5 → pop times [T, duration] */
  var POPS = [[3.2, 0.15], [3.55, 0.15], [4.05, 0.1], [4.2, 0.1], [4.3, 0.1], [4.4, 0.1], [4.5, 0.1], [4.6, 0.1]];
  var LATE = [4.78, 4.84];                    // two late RPUSHes that go to W4
  var DEST = [2, 0, 1, 3, 4, 5, 6, 7];        // locker k's image → W2 tray slot (owner's slot)
  var ARGMAX = [0.62, 0.31, 0.01, 0.85, 0.47, 0.12, 0.73, 0.56]; // illustrative; row 3 = class 1
  var HANG_SEATS = [0, 4, 6];
  var BARS = [[440, 120], [480, 96], [520, 72], [560, 48], [600, 30]];
  var DEADLINE = 1200;                        // 200 ms × 6, the live demo runs 6× slow
  var MAX = 8;

  var TIP = {
    lanes: 'four workers compete on one FIFO list; torch.set_num_threads(1) so they don\'t fight over cores',
    rail: 'FIFO: RPUSH at the tail, BLPOP at the head',
    lockers: 'only the 16-byte id rides the queue; the image waits under its key',
    seats: 'pending_jobs[id]: matched by id, no polling',
    reader: 'its own Redis connection, separate from the request pool',
    bytes: '16s = uuid4 bytes, q = int64 class index: 24 bytes, not JSON',
    resnet: 'one stacked forward pass per batch, on CPU'
  };
  var HANG_CAP1 = 'No error. No log. Just a hang.';
  var HANG_CAP2 = 'Bounded pop, plus a callback so a dying task can\'t die quietly.';
  var READER_BAD = 'BLPOP response 0 (blocks forever)';
  var READER_FIX = 'BLPOP response 1 + add_done_callback → prints the exception';

  function traySlot(lane, k) { return pt(561 + 21 * k, LANE_Y[lane] + 49); }
  function lockerC(k) { return k < 8 ? pt(319 + 27 * k, 95) : pt(319 + 27 * (k - 8), 123); }
  function qShift(T) {
    var s = 0;
    for (var i = 0; i < POPS.length; i++) s += ease(seg(T, POPS[i][0], POPS[i][0] + POPS[i][1]));
    return s;
  }
  function stackCx(T) { return lerp(350, 630, ease(seg(T, 6.4, 6.7))); }

  /* ---------- pure batch-close rule (live button + ?check) ---------- */
  function batchSim(max, deadline) {
    max = max || MAX; deadline = deadline || DEADLINE;
    var sim = {
      max: max, deadline: deadline, opened: null, count: 0, closed: null,
      /* advance the clock; closes on the deadline once it has passed */
      tick: function (t) {
        if (!sim.closed && sim.opened !== null && t - sim.opened >= deadline) {
          sim.closed = { reason: 'deadline', count: sim.count, at: sim.opened + deadline };
        }
        return sim.closed;
      },
      /* one request arrives at time t; returns true if it joined the batch */
      click: function (t) {
        if (sim.tick(t)) return false;
        if (sim.opened === null) sim.opened = t;
        sim.count++;
        if (sim.count >= max) sim.closed = { reason: 'full', count: sim.count, at: t };
        return true;
      },
      /* ring-timer fraction at time t */
      progress: function (t) {
        if (sim.opened === null) return 0;
        var end = sim.closed ? sim.closed.at : t;
        return clamp((end - sim.opened) / deadline);
      }
    };
    return sim;
  }

  /* ---------- Blip's scroll pose ---------- */
  function pose(T) {
    var b = Math.min(7, Math.floor(T)), u = T - b;
    var p, form = 'ticket', expr = 'open', look;
    switch (b) {
      case 0:
        p = pt(lerp(44, 104, ease(seg(u, 0, 0.6))), 280); form = 'default'; break;
      case 1:
        p = hop(pt(104, 280), pt(150, 182), ease(seg(u, 0, 0.35)), 24);
        form = u < 0.15 ? 'default' : 'ticket'; look = SEAT3; break;
      case 2:
        p = hop(pt(150, 182), pt(440, 250), ease(seg(u, 0.5, 0.8)), 70); break;
      case 3:
        p = pt(488 - 24 * (2 - qShift(T)), 250); break;
      case 4:
        p = hop(HEAD, TRAY_SEAT, ease(seg(T, 4.05, 4.15)), 40); break;
      case 5:
        p = TRAY_SEAT; break;
      case 6:
        if (u < 0.4) p = hop(TRAY_SEAT, pt(360, 251), ease(seg(u, 0.15, 0.4)), 40);
        else if (u < 0.7) p = pt(stackCx(T) + 10, 251);
        else { p = hop(pt(640, 251), ROW_SEAT, ease(seg(u, 0.7, 0.8)), 30); look = pt(720, 270); }
        break;
      default: /* b7: reply + wake */
        if (u < 0.12) p = hop(ROW_SEAT, TRAY_SEAT, ease(seg(u, 0, 0.12)), 30);
        else if (u < 0.45) p = along([TRAY_SEAT, pt(508, 450), pt(308, 450)], ease(seg(u, 0.12, 0.45)));
        else if (u < 0.6) p = hop(pt(308, 450), READER_TOP, ease(seg(u, 0.45, 0.6)), 16);
        else if (u < 0.8) p = hop(READER_TOP, SEAT_TOP, ease(seg(u, 0.6, 0.8)), 40);
        else p = hop(SEAT_TOP, DOOR, ease(seg(u, 0.8, 0.88)), 40);
        form = u < 0.7 ? 'pill' : 'default';
        expr = u >= 0.9 ? 'offended' : u >= 0.7 ? 'happy' : 'open';
        if (u >= 0.9) look = 'camera';
    }
    return { x: p.x, y: p.y, form: form, expr: expr, look: look };
  }

  /* ghost ticket that queues up as qi (0..7) on the jobs list, optionally entering from the crowd */
  function queuedGhost(qi, T, from, enterAt) {
    var p = POPS[qi];
    if (T >= p[0]) {
      var t = ease(seg(T, p[0], p[0] + p[1]));
      var q = hop(HEAD, pt(561 + 21 * qi, LANE_Y[1] + 54), t, 30);
      return { x: q.x, y: q.y, s: lerp(1, 0.8, t) };
    }
    var rail = pt(488 - 24 * (qi - qShift(T)), 250);
    if (from) {
      if (T < enterAt) return { x: from.x, y: from.y, s: 1 };
      var e = ease(seg(T, enterAt, enterAt + 0.12));
      var c = pt((from.x + rail.x) / 2, Math.min(from.y, rail.y) - 40);
      var r = quad(from, c, rail, e);
      return { x: r.x, y: r.y, s: 1 };
    }
    return { x: rail.x, y: rail.y, s: 1 };
  }
  /* late ghost k (0/1): crowd → tail → head → W4 tray */
  function lateGhost(k, T, from) {
    var p = seg(T, LATE[k], LATE[k] + 0.1), q, s = 1;
    if (p <= 0) return { x: from.x, y: from.y, s: 1 };
    if (p < 0.4) q = quad(from, pt((from.x + TAIL.x) / 2, from.y - 30), TAIL, ease(p / 0.4));
    else if (p < 0.7) q = hop(TAIL, HEAD, ease((p - 0.4) / 0.3), 0);
    else { var t = ease((p - 0.7) / 0.3); q = hop(HEAD, pt(561 + 21 * k, LANE_Y[3] + 54), t, 30); s = lerp(1, 0.8, t); }
    return { x: q.x, y: q.y, s: s };
  }
  /* when the image in locker k gets its key (SET) */
  function keyAt(k) {
    if (k === 0) return 2.45;
    if (k < 3) return 0;
    if (k < 8) return 2.8 + 0.04 * (k - 3);
    return LATE[k - 8];
  }

  /* ---------- drawing helpers used by setup ---------- */
  function ghostNode(api, parent) {
    var g = api.el('g', {}, parent);
    api.el('rect', { x: -10, y: -12, width: 20, height: 12, rx: 3, 'class': 'ln f-paper' }, g);
    api.el('circle', { cx: -4, cy: -6.5, r: 1.4, 'class': 'f-ink' }, g);
    api.el('circle', { cx: 4, cy: -6.5, r: 1.4, 'class': 'f-ink' }, g);
    return g;
  }
  function pillNode(api, parent) {
    var g = api.el('g', { opacity: 0 }, parent);
    api.el('rect', { x: -11, y: -10, width: 22, height: 10, rx: 5, 'class': 'ln f-paper' }, g);
    api.el('circle', { cx: -3.5, cy: -5, r: 1.2, 'class': 'f-ink' }, g);
    api.el('circle', { cx: 3.5, cy: -5, r: 1.2, 'class': 'f-ink' }, g);
    return g;
  }
  /* image tile: a tiny picture icon, centered on (0,0), 24×20 at scale 1 */
  function tileNode(api, parent) {
    var g = api.el('g', { opacity: 0 }, parent);
    api.el('rect', { x: -12, y: -10, width: 24, height: 20, rx: 2, 'class': 'ln f-paper2' }, g);
    api.el('path', { d: 'M-9 7L-3 0L1 4L4 1L9 7', 'class': 'ls' }, g);
    api.el('circle', { cx: 5, cy: -4, r: 2, 'class': 'f-signal' }, g);
    return g;
  }
  function ringPath(cx, cy, r) {
    return 'M' + cx + ' ' + (cy - r) + 'a' + r + ' ' + r + ' 0 1 1 0 ' + 2 * r + 'a' + r + ' ' + r + ' 0 1 1 0 ' + -2 * r;
  }

  /* ---------- setup: build every node once ---------- */
  function setup(api, svg) {
    var st = { api: api, live: false, T: 0, prevT: -1, send: null, hang: null, hangStatic: false };
    var E = function (tag, attrs, parent) { return api.el(tag, attrs, parent); };
    var X = function (x, y, s, c, parent) { return api.text(x, y, s, c, parent); };

    var base = st.base = E('g', {}, svg);

    /* client door */
    E('rect', { x: 16, y: 230, width: 56, height: 100, rx: 6, 'class': 'ln f-paper2' }, base);
    X(44, 350, 'client', 't-label t-mid-a c-ink2', base);
    E('path', { d: 'M72 280H88', 'class': 'lr' }, base);

    /* FastAPI frontend */
    E('rect', { x: 88, y: 40, width: 184, height: 480, rx: 10, 'class': 'ln f-paper2' }, base);
    X(100, 64, 'FastAPI · main.py', 't-label', base);
    X(180, 96, 'pending_jobs', 't-small t-mid-a c-ink2', base);
    st.seats = [];
    for (var k = 0; k < 8; k++) st.seats.push(E('circle', { cx: 180, cy: 110 + 36 * k, r: 9, 'class': 'ln f-paper' }, base));
    var seatHit = E('rect', { x: 164, y: 96, width: 32, height: 280, 'class': 'f-none', 'pointer-events': 'all' }, base);
    api.tip(seatHit, TIP.seats);
    /* Future ring on seat 3: a dashed ring that spins (CSS) while awaited; the spin class goes on
       only once the ring is visible (render), so an unseen ring never repaints the stage */
    var fut = E('g', { transform: 'translate(180 182)' }, base);
    st.future = E('circle', { cx: 0, cy: 0, r: 14, 'class': 'ls', 'stroke-dasharray': '3 4', opacity: 0 }, fut);
    /* labels stay inside the frontend box (x 88–272): the seat label gets x 196–266 right of the ring,
       the note x 100–264 */
    st.futLabel = X(196, 187, 'Future', 't-label c-signal', base);
    st.futNote = X(100, 418, '', 't-small c-ink2', base);
    fit(st.futNote, 'await future · loop free', 164, 13);
    op(st.futLabel, 0); op(st.futNote, 0);

    /* response_reader (tilts during the hang replay) */
    st.reader = E('g', {}, base);
    var rbox = E('rect', { x: 104, y: 440, width: 152, height: 64, rx: 8, 'class': 'ln f-paper' }, st.reader);
    st.readerTitle = X(180, 466, 'response_reader', 't-label t-mid-a', st.reader);
    st.readerSub = X(180, 488, 'own Redis connection', 't-small t-mid-a c-ink2', st.reader);
    api.tip(rbox, TIP.reader);
    st.rLine1 = X(104, 538, '', 't-label c-signal', base);
    st.rLine2 = X(104, 554, '', 't-label c-ink2', base);
    st.rCount = X(560, 552, '', 't-big c-signal t-end', base);

    /* Redis */
    E('rect', { x: 292, y: 40, width: 232, height: 480, rx: 10, 'class': 'ln f-paper2' }, base);
    X(304, 66, 'Redis', 't-big', base);
    st.flashSet = X(516, 66, 'SET', 't-label t-end c-signal', base);
    st.flashDel = X(516, 66, 'DEL ×8', 't-label t-end c-danger', base);
    op(st.flashSet, 0); op(st.flashDel, 0);
    st.keys = [];
    for (k = 0; k < 10; k++) {
      var c = lockerC(k);
      E('rect', { x: c.x - 11, y: c.y - 11, width: 22, height: 22, rx: 3, 'class': 'lr f-paper' }, base);
      st.keys.push(E('rect', { x: c.x - 9, y: c.y - 9, width: 18, height: 18, rx: 2, 'class': 'f-ink2', opacity: 0 }, base));
    }
    var lockHit = E('rect', { x: 304, y: 80, width: 216, height: 58, 'class': 'f-none', 'pointer-events': 'all' }, base);
    api.tip(lockHit, TIP.lockers);
    X(304, 154, 'SET job_id <image bytes>', 't-small c-ink2', base);
    st.mget = X(304, 178, 'MGET ×8 · one round trip', 't-label c-signal', base);
    op(st.mget, 0);

    /* jobs list */
    X(304, 228, 'jobs', 't-label', base);
    E('path', { d: 'M306 251H506', 'class': 'ln' }, base);
    for (k = 0; k <= 8; k++) E('path', { d: 'M' + (500 - 24 * k) + ' 247V255', 'class': 'lr' }, base);
    X(308, 276, 'tail · RPUSH', 't-label c-ink2', base);
    X(512, 294, 'BLPOP · head', 't-label t-end c-ink2', base);
    var railHit = E('rect', { x: 304, y: 230, width: 210, height: 34, 'class': 'f-none', 'pointer-events': 'all' }, base);
    api.tip(railHit, TIP.rail);
    E('path', { d: 'M524 251H540', 'class': 'lr' }, base);

    /* response list: right → left into the reader */
    X(512, 440, 'response', 't-label t-end c-ink2', base);
    E('path', { d: 'M512 450H262', 'class': 'ln' }, base);
    E('path', { d: 'M270 445L262 450L270 455', 'class': 'ln' }, base);

    /* worker lanes */
    st.lanes = [];
    for (k = 0; k < 4; k++) {
      var y = LANE_Y[k], L = { slots: [] };
      E('path', { d: 'M540 251L540 ' + (y + 44), 'class': 'lr' }, base);
      L.box = E('rect', { x: 540, y: y, width: 244, height: 88, rx: 8, 'class': 'ln f-paper' }, base);
      api.tip(L.box, TIP.lanes);
      X(552, y + 24, 'W' + (k + 1), 't-big', base);
      X(776, y + 20, '1 torch thread', 't-small t-end c-ink2', base);
      for (var j = 0; j < 8; j++) L.slots.push(E('rect', { x: 552 + 21 * j, y: y + 40, width: 18, height: 18, rx: 2, 'class': 'lr f-paper3' }, base));
      L.lid = E('rect', { x: 548, y: y + 33, width: 0, height: 5, rx: 2, 'class': 'f-ink' }, base);
      E('circle', { cx: 752, cy: y + 48, r: 14, 'class': 'lr' }, base);
      L.ring = api.path(ringPath(752, y + 48, 14), 'ls thick', base);
      L.status = X(552, y + 78, '', 't-label', base);
      st.lanes.push(L);
    }
    /* W1 doubles as a big "Send requests" button */
    var w1 = st.lanes[0].box;
    A(w1, 'style', 'cursor:pointer');
    w1.addEventListener('click', function () {
      var r = S.queue.action(st, 'send');
      if (r && r.announce) api.announce(r.announce);
    });
    /* your tickets in W1 (live layer) */
    st.youGhosts = [];
    for (k = 0; k < 8; k++) { var yg = ghostNode(api, base); op(yg, 0); st.youGhosts.push(yg); }

    /* ghosts: 0..6 the crowd at the client, 7..8 already at the head of the list */
    st.ghosts = [];
    for (k = 0; k < 9; k++) st.ghosts.push(ghostNode(api, base));
    /* image tiles: tile k lives in locker k */
    st.tiles = [];
    for (k = 0; k < 10; k++) st.tiles.push(tileNode(api, base));
    /* reply pills: 0,1 lead Blip home; 2..4 are the hang replay */
    st.pills = [];
    for (k = 0; k < 5; k++) st.pills.push(pillNode(api, base));

    /* job id ticket label: above Blip's seat pose (150,182), centred in the frontend box so it never
       crosses the border, with its baseline in the gap between seat 0 (y ≤ 120) and seat 1 (y ≥ 136) */
    st.jobLabel = X(180, 133, '', 't-label t-mid-a c-signal', base);
    op(st.jobLabel, 0);
    newJobId(st);

    /* inset: inside W2 · ResNet-18 */
    var inset = st.inset = E('g', { opacity: 0, 'pointer-events': 'none' }, svg);
    var irect = E('rect', { x: 300, y: 150, width: 480, height: 250, rx: 10, 'class': 'ln f-paper2' }, inset);
    api.tip(irect, TIP.resnet);
    X(316, 176, 'inside W2 · ResNet-18', 't-label', inset);
    st.noGrad = X(520, 212, 'torch.no_grad()', 't-label t-mid-a c-signal', inset);
    st.bars = BARS.map(function (b) {
      return E('rect', { x: b[0] - 7, y: 286 - b[1] / 2, width: 14, height: b[1], rx: 3, 'class': 'f-rule' }, inset);
    });
    st.stack = [];
    for (k = 7; k >= 0; k--) st.stack[k] = E('rect', { x: 0, y: 0, width: 36, height: 28, rx: 2, 'class': 'ls f-paper', opacity: 0 }, inset);
    st.shapeIn = X(316, 384, '[8,3,224,224]', 't-label', inset);
    st.shapeOut = X(764, 384, '[8,1000] → argmax', 't-label t-end', inset);
    st.rowsG = E('g', { opacity: 0 }, inset);
    st.dots = [];
    for (k = 0; k < 8; k++) {
      E('rect', { x: 680, y: 236 + 12 * k, width: 84, height: 5, rx: 2, 'class': 'f-rule' }, st.rowsG);
      st.dots.push(E('circle', { cx: 680 + 84 * ARGMAX[k], cy: 238.5 + 12 * k, r: 0, 'class': k === 2 ? 'f-blip' : 'f-ink' }, st.rowsG));
    }

    /* byte map that rides with the reply: 16 id bytes + 8 class-index bytes */
    st.bytes = E('g', { opacity: 0, 'pointer-events': 'none' }, svg);
    var bhit = E('rect', { x: -4, y: -22, width: 152, height: 34, 'class': 'f-none' }, st.bytes);
    api.tip(bhit, TIP.bytes);
    X(0, -6, '<16sq = 24 B', 't-label', st.bytes);
    for (k = 0; k < 24; k++) E('rect', { x: k * 6, y: 0, width: 5, height: 8, 'class': k < 16 ? 'f-signal' : 'f-ok' }, st.bytes);

    /* the answer, back at the client */
    st.bubble = E('g', { opacity: 0 }, svg);
    E('rect', { x: 12, y: 100, width: 368, height: 58, rx: 8, 'class': 'ln f-paper' }, st.bubble);
    E('path', { d: 'M34 158L42 176L54 158', 'class': 'ln f-paper' }, st.bubble);
    st.json = X(24, 124, '{"Category_Number": 1, "Server_Rate": …}', 't-label', st.bubble);
    /* the "example" tag sits inside the bubble, bottom right (above it, it covered the Redis lockers) */
    X(368, 148, 'example', 't-small t-end c-ink2', st.bubble);
    st.goldfish = X(24, 148, 'ImageNet class 1 is goldfish.', 't-label c-blip', st.bubble);

    st.controls = [
      { label: 'Send requests', action: 'send' },
      { label: 'Replay the hang', action: 'hang' }
    ];
    return st;
  }

  function newJobId(st) {
    var a = new Uint8Array(4), i;
    try { window.crypto.getRandomValues(a); } catch (e) { for (i = 0; i < 4; i++) a[i] = Math.random() * 256; }
    var h = '';
    for (i = 0; i < 4; i++) h += (a[i] < 16 ? '0' : '') + a[i].toString(16);
    st.jobId = 'job_id ' + h.slice(0, 4) + '…' + h.slice(4);
    fit(st.jobLabel, st.jobId, 176);
  }

  /* ---------- render: scroll layer, then live layers on top ---------- */
  function render(st, T, tNow) {
    var api = st.api, rm = api.rm ? api.rm() : false, t = now();
    T = clamp(+T || 0, 0, 8);
    if (T >= 1 && st.prevT < 1) newJobId(st);      // a new ticket on every visit
    st.prevT = T; st.T = T;
    if (!rm && (st.hangStatic || st.rmList)) clearRmHang(st);

    var b = pose(T);

    /* dim everything for the inset (b6), restore in b7 */
    var d = seg(T, 6, 6.15) - seg(T, 7, 7.12);
    op(st.base, 1 - 0.75 * d);
    op(st.inset, d); hits(st.inset, d > 0.5);

    /* Future ring, set_result (spins only while visible and awaited) */
    var done = T >= 7.7;
    op(st.future, seg(T, 1.1, 1.3));
    cls(st.future, done ? 'lok' : T >= 1.1 ? 'ls spin' : 'ls');
    op(st.futLabel, seg(T, 1.1, 1.3));
    fit(st.futLabel, done ? 'set_result' : 'Future', 70);
    cls(st.futLabel, done ? 't-label c-ok' : 't-label c-signal');
    op(st.futNote, seg(T, 1.1, 1.3) * (done ? 0 : 1));
    for (var k = 0; k < 8; k++) { cls(st.seats[k], k === 2 && done ? 'ln f-ok' : 'ln f-paper'); op(st.seats[k], 1); }

    /* static labels in tight boxes: re-fitted each frame (cached writes) so a resize that changes
       the font size keeps them inside */
    fit(st.readerTitle, 'response_reader', 144);
    fit(st.readerSub, 'own Redis connection', 144, 13);
    fit(st.mget, 'MGET ×8 · one round trip', 212);
    fit(st.json, '{"Category_Number": 1, "Server_Rate": …}', 344);
    fit(st.goldfish, 'ImageNet class 1 is goldfish.', 344);

    /* job id label rides above Blip during b1 */
    fit(st.jobLabel, st.jobId, 176);
    op(st.jobLabel, seg(T, 1.15, 1.3) * (1 - seg(T, 2.45, 2.5)));
    at(st.jobLabel, b.x - 150, b.y - 182);

    /* flashes */
    op(st.flashSet, seg(T, 2.45, 2.5) * (1 - seg(T, 2.6, 2.75)));
    op(st.flashDel, seg(T, 5.6, 5.65) * (1 - seg(T, 5.85, 6)));
    op(st.mget, seg(T, 5, 5.06) * (1 - seg(T, 5.65, 5.75)));

    /* keys in the lockers: SET … DEL */
    for (k = 0; k < 10; k++) {
      var ka = keyAt(k), on = k === 1 || k === 2 ? seg(T, 0, 0.3) : seg(T, ka, ka + 0.05);
      if (k < 8) on *= 1 - seg(T, 5.6, 5.7);
      op(st.keys[k], 0.3 * on);
    }

    /* ghosts */
    for (k = 0; k < 9; k++) {
      var g, o;
      if (k >= 7) { g = queuedGhost(k - 7, T, null); o = seg(T, 0, 0.3); }
      else if (k < 5) { g = queuedGhost(3 + k, T, pt(CROWD[k][0], CROWD[k][1]), 2.8 + 0.04 * k); o = seg(T, 0.05 * k, 0.05 * k + 0.3); }
      else { g = lateGhost(k - 5, T, pt(CROWD[k][0], CROWD[k][1])); o = seg(T, 0.05 * k, 0.05 * k + 0.3); }
      /* in W2's tray a ghost fades as its image arrives (b5) */
      if (k !== 5 && k !== 6) {
        var qi = k >= 7 ? k - 7 : 3 + k;
        o *= 1 - tileTravel(DEST.indexOf(qi), T);
      }
      at(st.ghosts[k], g.x, g.y, g.s); op(st.ghosts[k], o);
    }

    /* image tiles */
    for (k = 0; k < 10; k++) {
      var tp = tilePose(k, T, b);
      at(st.tiles[k], tp.x, tp.y, tp.s); op(st.tiles[k], tp.o);
    }

    /* worker lanes (W1 belongs to the live layer while a batch is running) */
    sendTick(st, t, rm);
    for (k = st.send ? 1 : 0; k < 4; k++) drawLane(st.lanes[k], laneScroll(k, T));

    /* inset: stack → bars → rows */
    var cx = stackCx(T);
    for (k = 0; k < 8; k++) {
      var f = ease(seg(T, 6.15 + 0.02 * k, 6.3 + 0.02 * k)), from = traySlot(1, k);
      var fx = cx - 18 + 3 * k, fy = 272 - 3 * k;
      var r = st.stack[k];
      A(r, 'x', r2(lerp(from.x - 7, fx, f))); A(r, 'y', r2(lerp(from.y - 6, fy, f)));
      A(r, 'width', r2(lerp(14, 36, f))); A(r, 'height', r2(lerp(12, 28, f)));
      op(r, seg(T, 6.15 + 0.02 * k, 6.17 + 0.02 * k) * (1 - seg(T, 6.7, 6.75)));
    }
    for (k = 0; k < BARS.length; k++) cls(st.bars[k], T >= 6.4 && cx + 10 >= BARS[k][0] ? 'f-signal' : 'f-rule');
    op(st.noGrad, seg(T, 6.35, 6.42));
    op(st.shapeIn, seg(T, 6.2, 6.3) * (1 - seg(T, 6.68, 6.72)));
    op(st.shapeOut, seg(T, 6.7, 6.78));
    op(st.rowsG, seg(T, 6.7, 6.75));
    for (k = 0; k < 8; k++) A(st.dots[k], 'r', r2(Math.max(0, 3.5 * easeOutBack(seg(T, 6.75 + 0.025 * k, 6.8 + 0.025 * k)))));

    /* b7: byte map + the two pills ahead of Blip */
    var u7 = seg(T, 7, 8);
    var bo = seg(u7, 0, 0.1) * (1 - seg(u7, 0.55, 0.62));
    op(st.bytes, bo); hits(st.bytes, bo > 0.5);
    at(st.bytes, b.x - 72, b.y - 60);
    var px = Math.min(b.x, 508);
    for (k = 0; k < 2; k++) {
      at(st.pills[k], px - 30 - 28 * k, 450);
      op(st.pills[k], seg(u7, 0.2, 0.27) * (1 - seg(u7, 0.45, 0.5)));
    }
    for (k = 2; k < 5; k++) op(st.pills[k], 0);

    /* bubble at the client */
    op(st.bubble, seg(T, 7.85, 7.9));
    op(st.goldfish, seg(T, 7.9, 7.95));

    /* reader labels (scroll state: one flash of the bounded pop) */
    A(st.reader, 'transform', ''); op(st.reader, 1);
    fit(st.rLine1, 'BLPOP response 1', 640);
    op(st.rLine1, seg(T, 7.45, 7.5) * (1 - seg(T, 7.6, 7.7)));
    txt(st.rLine2, ''); txt(st.rCount, '');

    /* live layers */
    var liveSend = drawSend(st, t, rm);
    var liveHang = drawHang(st, t, rm);
    st.live = liveSend || liveHang;

    var out = { x: b.x, y: b.y, form: b.form, expr: b.expr };
    if (b.look) out.look = b.look;
    if (st.hang) {
      out.look = pt(180, 472);
      if (st.hang.phase === 1) out.expr = 'wide';
    }
    /* phone pan (core: `span`): keep the boxes this beat is about in view; Blip is followed inside it */
    var sp = st.hang || st.hangStatic ? [88, 540]    // frontend, reader and the response list
      : st.send ? [540, 786]                         // W1 and its status line
      : T >= 7.8 ? [12, 380]                         // the answer bubble at the client
      : T >= 7 ? null                                // the reply's trip home: follow Blip
      : T >= 6 ? [300, 780]                          // the ResNet inset
      : T >= 3 ? [292, 786]                          // jobs list + W1–W4 status lines
      : T >= 2 ? [88, 524]                           // seat → jobs list
      : T >= 1 ? [88, 272] : null;                   // FastAPI box: job_id, Future
    if (sp) out.span = sp;
    return out;
  }

  /* how far tile k has travelled to W2's tray in b5 (0..1) */
  function tileTravel(k, T) {
    if (k < 0 || k > 7) return 0;
    return ease(seg(T, 5 + 0.03 * k, 5.39 + 0.03 * k));
  }
  function tilePose(k, T, b) {
    var lc = lockerC(k), ka = keyAt(k);
    if (k === 0 && T < 2.5) {
      if (T < 2) return { x: b.x - 34, y: b.y - 12, s: 1, o: 1 };
      var a = quad(pt(116, 170), pt(240, 20), lc, ease(seg(T, 2, 2.45)));
      return { x: a.x, y: a.y, s: lerp(1, 0.7, seg(T, 2, 2.45)), o: 1 };
    }
    var o = k === 1 || k === 2 ? seg(T, 0, 0.3) : seg(T, ka, ka + 0.05);
    if (k >= 8) return { x: lc.x, y: lc.y, s: 0.7, o: o };
    var s = tileTravel(k, T);
    if (s <= 0) return { x: lc.x, y: lc.y, s: 0.7, o: o };
    /* braided bundle: one shared curve, per-tile offset (3k,2k), blended in from the locker and out to the slot */
    var P0 = pt(400, 112), P1 = pt(470, 165), P2 = pt(545, 115), P3 = pt(610, 160);
    var dst = traySlot(1, DEST[k]);
    var B = cubic(P0, P1, P2, P3, s);
    var ox = 3 * k - 10, oy = 2 * k - 7, m3 = Math.pow(1 - s, 3), s3 = s * s * s;
    var weave = 4 * Math.sin(Math.PI * s * 3 + k) * Math.sin(Math.PI * s);
    var x = B.x + ox + (lc.x - P0.x - ox) * m3 + (dst.x - P3.x - ox) * s3;
    var y = B.y + oy + weave + (lc.y - P0.y - oy) * m3 + (dst.y - P3.y - oy) * s3;
    var d = DEST[k];
    o *= 1 - seg(T, 6.15 + 0.02 * d, 6.17 + 0.02 * d);       // becomes a stack layer in b6
    return { x: x, y: y, s: lerp(0.7, 0.6, s), o: o };
  }

  /* lane look in the scroll state */
  function laneScroll(k, T) {
    if (k === 0 || k === 2) return { busy: true, lid: 1, ring: 0, status: 'busy', so: 1 };
    var pulse = T >= 3 && T < 4 ? 0.7 + 0.3 * Math.cos(2 * Math.PI * (T - 3) * 4) : 1;
    if (k === 1) {
      if (T < 3.2) return { lid: 0, ring: 0, status: 'BLPOP jobs 1', so: pulse };
      if (T < 4.75) return { lid: 0, ring: seg(T, 3.2, 4.75) * 0.7, status: 'filling · BLPOP jobs 0.05', so: 1 };
      return { lid: ease(seg(T, 4.75, 4.8)), ring: 0.7, status: 'closed: full (8)', so: 1, closed: true };
    }
    if (T < LATE[0]) return { lid: 0, ring: 0, status: 'BLPOP jobs 1', so: pulse };
    if (T < 4.999) return { lid: ease(seg(T, 4.96, 5)), ring: seg(T, 4.8, 5), status: 'filling · BLPOP jobs 0.05', so: 1 };
    return { lid: 1, ring: 1, status: 'closed: 200 ms (2)', so: 1, closed: true };
  }
  function drawLane(L, s) {
    for (var j = 0; j < 8; j++) cls(L.slots[j], s.busy ? 'ln2 f-ghost' : 'lr f-paper3');
    A(L.lid, 'width', r2(174 * clamp(s.lid)));
    op(L.lid, s.lid > 0.001 ? 1 : 0);
    reveal(L.ring, s.ring);
    cls(L.ring, s.closed ? 'lok thick' : 'ls thick');
    fit(L.status, s.status, 228);
    cls(L.status, s.closed ? 't-label c-ok' : s.you ? 't-label c-signal' : 't-label');
    op(L.status, s.so == null ? 1 : s.so);
  }

  /* ---------- live layer 1: "Send requests" into W1 (6× slow) ---------- */
  /* advance the live batch clock: deadline close (announced) and the 1.5 s reset */
  function sendTick(st, t, rm) {
    var b = st.send;
    if (!b || rm) return;
    if (!b.sim.closed && b.sim.tick(t)) closed(st, b, true);
    if (b.sim.closed && t - b.closedAt >= 1500) st.send = null;
  }
  function drawSend(st, t, rm) {
    var b = st.send, k;
    if (!b) { for (k = 0; k < 8; k++) op(st.youGhosts[k], 0); return false; }
    var sim = b.sim, c = sim.closed, L = st.lanes[0];
    var lid = c ? (rm ? 1 : ease(clamp((t - c.at) / 150))) : 0;
    drawLane(L, {
      lid: lid, ring: sim.progress(t), closed: !!c, you: true,
      status: !c ? 'you · 6× slower than real'
        : c.reason === 'full' ? 'closed: full (8 of 8)' : 'closed: 200 ms deadline (' + c.count + ' of 8)'
    });
    for (k = 0; k < 8; k++) {
      var g = st.youGhosts[k], p = traySlot(0, k);
      if (k < sim.count) {
        var pop = rm ? 1 : clamp((t - b.taps[k]) / 220);
        at(g, p.x, p.y + 5, 0.8 * Math.max(0.01, easeOutBack(pop))); op(g, 1);
      } else op(g, 0);
    }
    return !rm;
  }
  function closed(st, b, speak) {
    var c = b.sim.closed;
    b.closedAt = c.at;
    var msg = c.reason === 'full'
      ? 'Batch closed: 8 of 8, full'
      : 'Batch closed: ' + c.count + ' of 8, 200 millisecond deadline';
    if (speak) st.api.announce(msg);
    return msg;
  }
  function sendClick(st, rm) {
    var t = now(), b = st.send, msg;
    if (b && b.sim.closed) {
      if (!rm && t - b.closedAt < 1500) return undefined;   // still showing the last result
      b = null;
    }
    if (!b) b = st.send = { sim: batchSim(), taps: [], closedAt: 0 };
    if (b.sim.click(t)) b.taps.push(t);
    if (rm && !b.sim.closed) b.sim.tick(b.sim.opened + DEADLINE);   // reduced motion: jump to the end
    if (b.sim.closed) msg = closed(st, b, false);
    paint(st);
    if (!rm) wake(st);
    return msg ? { announce: msg } : undefined;
  }

  /* ---------- live layer 2: "Replay the hang" (10 s) ---------- */
  function drawHang(st, t, rm) {
    var h = st.hang, k;
    if (st.hangStatic) {             // reduced-motion end state
      fit(st.rLine1, READER_FIX, 640); op(st.rLine1, 1);
      for (k = 0; k < 3; k++) cls(st.seats[HANG_SEATS[k]], 'ln f-ok');
      return false;
    }
    if (!h) return false;
    if (rm) { stopHang(st); return false; }
    var e = t - h.t0;
    if (e >= 10000) {
      stopHang(st);
      st.api.announce('Replay finished. ' + HANG_CAP2);
      return false;
    }
    var phase = e < 5000 ? 0 : e < 7500 ? 1 : 2;
    if (phase !== h.phase) {
      h.phase = phase;
      if (phase === 1) cap(st, HANG_CAP1);
      if (phase === 2) cap(st, HANG_CAP2);
    }
    /* reader labels and countdown */
    fit(st.rLine1, phase < 2 ? READER_BAD : READER_FIX, 640); op(st.rLine1, 1);
    txt(st.rLine2, phase === 0 ? 'socket_timeout 5 s (redis-py 8 default)' : phase === 1 ? 'task died · nothing logged' : '');
    cls(st.rLine2, phase === 1 ? 't-label c-danger' : 't-label c-ink2');
    txt(st.rCount, phase === 0 ? String(5 - Math.floor(e / 1000)) : phase === 1 ? '0' : '');
    cls(st.rCount, phase === 1 ? 't-big c-danger t-end' : 't-big c-signal t-end');
    /* reader tilts 10° and fades while dead, then rights itself */
    var tilt = phase === 1 ? ease(clamp((e - 5000) / 300)) : phase === 2 ? 1 - ease(clamp((e - 7500) / 300)) : 0;
    A(st.reader, 'transform', 'rotate(' + r2(10 * tilt) + ' 180 472)');
    op(st.reader, 1 - 0.65 * tilt);
    /* three replies arrive after the reader died, then drain once it's fixed */
    for (k = 0; k < 3; k++) {
      var pill = st.pills[2 + k], seat = HANG_SEATS[k], stop = 312 + 26 * k;
      var seatPt = pt(180, 110 + 36 * seat - 9);
      if (phase === 0) { op(pill, 0); continue; }
      if (phase === 1) {
        var a = ease(clamp((e - 5000 - 150 * k) / 700));
        at(pill, lerp(530, stop, a), 450); op(pill, a > 0 ? 1 : 0);
        cls(st.seats[seat], 'ln f-paper');
        op(st.seats[seat], 0.35 + 0.65 * (0.5 + 0.5 * Math.cos(e / 160)));
        continue;
      }
      var dp = clamp((e - 7500 - 400 * k) / 900), q;
      if (dp < 0.5) q = hop(pt(stop, 450), pt(270, 450), ease(dp / 0.5), 0);
      else q = hop(pt(270, 450), seatPt, ease((dp - 0.5) / 0.5), 40);
      at(pill, q.x, q.y); op(pill, dp < 1 ? 1 : 0);
      cls(st.seats[seat], dp >= 1 ? 'ln f-ok' : 'ln f-paper'); op(st.seats[seat], 1);
    }
    return true;
  }
  function stopHang(st) {
    var h = st.hang;
    st.hang = null;
    cap(st, null);
    if (h && h.btn) h.btn.textContent = 'Replay the hang';
  }
  function hangClick(st, btn, rm) {
    var api = st.api;
    if (rm) {
      st.hang = null; st.hangStatic = true;
      if (!st.rmList && api.panel) {
        var ul = st.rmList = api.el('ul', { 'class': 'q-hang' }, api.panel);
        [READER_BAD + ' · socket_timeout 5 s (redis-py 8 default)', HANG_CAP1, HANG_CAP2].forEach(function (s) {
          api.el('li', {}, ul).textContent = s;
        });
      }
      paint(st);
      return { announce: HANG_CAP1 + ' ' + HANG_CAP2 };
    }
    if (st.hang) { stopHang(st); paint(st); return { announce: 'Replay stopped.' }; }
    st.hang = { t0: now(), phase: -1, btn: btn };
    if (btn) btn.textContent = 'Stop replay';
    paint(st); wake(st);
    return { announce: 'Replaying the hang: the response reader blocks on BLPOP response 0.' };
  }
  function clearRmHang(st) {
    st.hangStatic = false;
    if (st.rmList && st.rmList.parentNode) st.rmList.parentNode.removeChild(st.rmList);
    st.rmList = null;
  }

  /* ---------- glue ---------- */
  function cap(st, s) { if (st.api.caption) st.api.caption(s); }
  function paint(st) { render(st, st.T, now()); }
  function wake(st) { st.live = true; if (st.api.wake) st.api.wake(); }

  S.queue = {
    beats: 8,
    poster: 5,
    pan: 'follow',
    tag: 'fig. 0N · drawing, not a benchmark',   // core numbers it by page order
    setup: setup,
    render: render,
    action: function (st, name, btn) {
      var rm = st.api.rm ? st.api.rm() : false;
      if (name === 'send') return sendClick(st, rm);
      if (name === 'hang') return hangClick(st, btn, rm);
    },
    poke: function (st) {
      if (st.T >= 2 && st.T < 4.1) return { impulse: { x: 60, y: 0 }, caption: 'FIFO. No cutting.', expr: 'offended' };
    },
    batchSim: batchSim
  };
})();
