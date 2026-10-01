/* fig. 04 · Noverwatch: "Blip tries to play Overwatch."
 *
 * A reenactment of the Windows service from SPEC §5.4. Blip walks in wearing a
 * headset, presses a generic PLAY button, Windows creates the game's process,
 * the WMI process-start event runs along the tripwire to the watchtower, and
 * the Process.Kill() mallet comes down. Then the service goes back to listening.
 *
 * Layers:
 *  - Scroll layer: a pure function of T (5 beats). The one side effect is the
 *    slam at T = 3.5: on a forward crossing it shakes the stage and hit-stops
 *    Blip; the log's time string is captured on the first crossing only, so
 *    scrubbing back and forth always redraws the same picture.
 *  - Click layer: "Launch Overwatch" plays a 1.6 s clip on wall-clock time
 *    (state.live) that overrides the drawing, appends a log entry with a
 *    random PID and "Blocked n" (n counts up from 2: same watcher), and
 *    escalates the caption by attempt number.
 * No game art and no brand colors: the window and button are generic.
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
  function r2(v) { return Math.round(v * 100) / 100; }
  /* straight travel with a parabolic hop of height h */
  function hop(a, b, t, h) {
    return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) - h * Math.sin(Math.PI * t) };
  }
  /* constant-speed travel along a polyline */
  function along(pts, t) {
    var lens = [], total = 0, i;
    for (i = 1; i < pts.length; i++) {
      var l = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
      lens.push(l); total += l;
    }
    var d = clamp(t) * total;
    for (i = 0; i < lens.length; i++) {
      if (d <= lens[i] || i === lens.length - 1) {
        var f = lens[i] ? clamp(d / lens[i]) : 1;
        return { x: lerp(pts[i].x, pts[i + 1].x, f), y: lerp(pts[i].y, pts[i + 1].y, f) };
      }
      d -= lens[i];
    }
    return pts[pts.length - 1];
  }
  /* the visitor's clock, e.g. "10/1/2026 3:04:05 PM": toLocaleString('en-US') minus the comma, as in
     the real log. Formatted by hand because the first toLocaleString call loads ICU data (~50 ms),
     and that call landed on the slam frame. */
  function p2(v) { return (v < 10 ? '0' : '') + v; }
  function stamp() {
    var d = new Date(), h = d.getHours();
    return (d.getMonth() + 1) + '/' + d.getDate() + '/' + d.getFullYear() + ' ' + (h % 12 || 12) + ':' +
      p2(d.getMinutes()) + ':' + p2(d.getSeconds()) + ' ' + (h < 12 ? 'AM' : 'PM');
  }

  /* ---------- cached DOM writers (write only on change) ---------- */
  function attr(n, k, v) {
    var key = '_a_' + k;
    if (n[key] !== v) { n[key] = v; n.setAttribute(k, v); }
  }
  function op(n, v) {
    var s = String(r2(clamp(v)));
    if (n._op !== s) { n._op = s; n.style.opacity = s; }
  }
  function txt(n, s) { if (n._t !== s) { n._t = s; n.textContent = s; } }

  /* ---------- fixed geometry (viewBox units, SPEC §5.4) ---------- */
  var FLOOR = 470;
  var PLAY = { x: 310, y: 300, w: 180, h: 64 };          // bottom edge y 364
  var WIN = { x: 320, y: 130, w: 160, h: 96, cx: 400, cy: 178 };
  var BAR = { x: 336, y: 196, w: 128, h: 8 };
  var LAMP = { x: 85, y: 315 };
  var DOT_PATH = [{ x: 400, y: 226 }, { x: 400, y: 450 }, { x: 130, y: 450 }]; // window → wire → tower
  var PARK = -120, PEEK = -20, HOVER = 150, WINDUP = 130;              // mallet head top y
  /* Where the head rests after the slam. Blip is an overlay drawn above the stage, so the head stops
     above the flattened Blip instead of on PLAY (SPEC's y 270); otherwise the pancake, X eyes and stars
     are drawn across "Process.Kill()" (§10: Blip never covers text). The flat costume reaches 26 sprite
     units above the feet, which is up to ~33u on the smallest stages. The reduced-motion poster draws
     Blip at a fixed 44u (stars ~18u high), so there the head can sit lower. */
  var DOWN = 226, DOWN_RM = 240;
  var GROWN_H = 66;  // Blip's full height in viewBox units on the smallest stages: reinflating pushes the head up
  var ENTER_X = 32;  // b0 starts inside the frame: at SPEC's x −40 the overlay hung outside the figure
  var SLAM_T = 3.5;
  var CLIP_MS = 1600, CLIP_SLAM = 700;

  /* captions by attempt (SPEC §5.4); attempts in between keep the last one reached */
  var CAPTIONS = [
    [1, 'nice try.'],
    [2, 'the service is very consistent.'],
    [3, "'Blocked n' counts per watcher, and the service starts a new watcher every 100 s heartbeat, so it's not a lifetime total. It's on the fix list."],
    [5, 'have you considered going outside?'],
    [8, "That matches the 8 kills in Alex's log from testing in March 2026."],
    [12, 'ok. log.txt is getting long.']
  ];
  function captionFor(n) {
    var c = CAPTIONS[0][1];
    for (var i = 0; i < CAPTIONS.length; i++) if (n >= CAPTIONS[i][0]) c = CAPTIONS[i][1];
    return c;
  }

  /* the three log lines the service writes per kill */
  function killLines(pid, time, n) {
    return [
      { c: '', t: 'Overwatch PID: ' + pid + ' blocked at ' + time },
      { c: 'crit', t: 'crit: Overwatch has been killed(stopped)! at ' + time },
      { c: 'crit', t: 'crit: Blocked ' + n }
    ];
  }
  var HEARTBEAT = { c: 'dim', t: 'warn: The Noverwatch system is online' };

  /* PLAY's top edge for a given vertical squash (scaled from its bottom) */
  function playTop(sy) { return PLAY.y + PLAY.h - PLAY.h * sy; }
  /* the head never sinks into Blip while Blip reinflates (sy) on PLAY (top) */
  function pushUp(m, top, sy) { return sy ? Math.min(m, top - GROWN_H * sy - 4 - 44) : m; }

  /* ---------- scene ---------- */
  S.killswitch = {
    beats: 5, poster: 3.9, pan: 'follow', tag: 'fig. 0N · reenactment',

    setup: function (api, svg) {
      var E = api.el, st = {
        api: api, live: false,
        controls: [{ label: 'Launch Overwatch', action: 'launch' }],
        lastT: null, slamTime: '', clip: null, attempt: 0, log: [], pose: null,
        // mobile labels are larger (style.css), so the label boxes are sized from their text (fitBoxes)
        mq: window.matchMedia ? window.matchMedia('(max-width: 959px)') : null, fitKey: null, span: [36, 490]
      };
      var n = st.n = {};

      /* floor */
      E('path', { d: 'M0 ' + FLOOR + 'H800', 'class': 'lr' }, svg);

      /* tripwire: WMI process-start events (with a wider invisible hit area for its tip) */
      var wire = E('g', {}, svg);
      E('rect', { x: 140, y: 438, width: 640, height: 24, 'class': 'f-paper', style: 'opacity:0' }, wire);
      E('line', { x1: 140, y1: 450, x2: 780, y2: 450, 'class': 'dash ldanger' }, wire);
      api.text(776, 438, 'WMI · Win32_ProcessStartTrace', 't-small t-end c-ink2', wire);
      api.tip(wire, 'event-driven: Windows pushes every new process start; no polling');

      /* the event's route, revealed as the dot travels */
      n.trace = api.path('M400 226V450H130', 'ls', svg);
      n.dot = E('circle', { cx: 400, cy: 226, r: 5, 'class': 'f-signal' }, svg);

      /* watchtower: the installed service */
      var tower = E('g', {}, svg);
      E('path', { d: 'M60 332L44 470M110 332L126 470M56 362H114M51 410H119M56 362L119 410M114 362L51 410M51 410L126 470M119 410L44 470', 'class': 'ln' }, tower);
      E('rect', { x: 40, y: 326, width: 90, height: 8, rx: 2, 'class': 'ln f-paper3' }, tower);
      E('rect', { x: 54, y: 300, width: 62, height: 26, rx: 5, 'class': 'ln f-paper2' }, tower);
      n.halo = E('circle', { cx: LAMP.x, cy: LAMP.y, r: 15, 'class': 'f-danger', style: 'opacity:0' }, tower);
      n.lamp = E('circle', { cx: LAMP.x, cy: LAMP.y, r: 7, 'class': 'f-danger blink' }, tower);
      api.text(85, 494, 'service · LocalSystem', 't-small t-mid-a c-ink2', tower);
      api.tip(tower, 'installed Windows service, LocalSystem, manual start');

      /* PLAY: a generic button, no game art */
      n.play = E('g', {}, svg);
      E('rect', { x: PLAY.x, y: PLAY.y, width: PLAY.w, height: PLAY.h, rx: 32, 'class': 'ln thick f-paper2' }, n.play);
      api.text(400, 339, 'PLAY', 't-big t-mid-a', n.play);
      api.tip(n.play, 'generic button, no game art');

      /* the game's window: the process exists before the service reacts */
      n.win = E('g', { style: 'opacity:0' }, svg);
      E('rect', { x: WIN.x, y: WIN.y, width: WIN.w, height: WIN.h, rx: 6, 'class': 'ln f-paper' }, n.win);
      E('path', { d: 'M320 154V136Q320 130 326 130H474Q480 130 480 136V154Z', 'class': 'f-ink' }, n.win);
      api.text(330, 147, 'Overwatch.exe', 't-label f-paper', n.win);
      api.text(336, 182, 'PID 12400', 't-label', n.win);
      E('rect', { x: BAR.x, y: BAR.y, width: BAR.w, height: BAR.h, rx: 4, 'class': 'f-rule' }, n.win);
      n.bar = E('rect', { x: BAR.x, y: BAR.y, width: 0, height: BAR.h, rx: 4, 'class': 'f-signal' }, n.win);
      api.tip(n.win, "the process exists before Noverwatch reacts; the launch itself isn't stopped");

      /* match card: the config check (bottom edge fixed at y 292, just above the tower; see fitBoxes) */
      n.match = E('g', { style: 'opacity:0' }, svg);
      n.matchBox = E('rect', { x: 40, y: 236, width: 310, height: 56, rx: 8, 'class': 'ln f-paper' }, n.match);
      n.m1 = api.text(52, 258, '', 't-label', n.match);
      n.m1a = E('tspan', {}, n.m1); n.m1a.textContent = 'Overwatch.exe == ';
      n.m1b = E('tspan', {}, n.m1); n.m1b.textContent = 'config["Games"]';
      n.m2 = api.text(52, 281, '· ignores case', 't-label c-ink2', n.match);
      n.tick = api.path('M184 274l6 6l12-14', 'lok thick', n.match);

      /* heartbeat toast */
      n.toast = E('g', { style: 'opacity:0' }, svg);
      n.toastBox = E('rect', { x: 40, y: 170, width: 345, height: 56, rx: 8, 'class': 'ln f-paper' }, n.toast);
      n.t1 = api.text(52, 192, '', 't-label', n.toast);
      E('tspan', { 'class': 'c-warn' }, n.t1).textContent = 'warn:';
      E('tspan', {}, n.t1).textContent = ' The Noverwatch system is online';
      n.t2 = api.text(52, 215, '(every 100 s; sped up here)', 't-label c-ink2', n.toast);

      /* the mallet: head 120×44 (wider when the label is), handle up out of frame; group y = head top */
      n.mallet = E('g', { transform: 'translate(0 ' + PARK + ')' }, svg);
      E('rect', { x: 394, y: -260, width: 12, height: 262, rx: 3, 'class': 'ln f-paper3' }, n.mallet);
      n.head = E('rect', { x: 340, y: 0, width: 120, height: 44, rx: 6, 'class': 'ln thick f-paper' }, n.mallet);
      n.kill = api.text(400, 27, 'Process.Kill()', 't-label t-mid-a', n.mallet);
      api.tip(n.mallet, 'Process.Kill() ends the matching PID only');

      /* impact marks at the moment of the slam: off PLAY's ends, and beside the pancake under the head */
      n.burst = api.path('M324 300l-22-10M326 318l-26 2M476 300l22-10M474 318l26 2M360 294l-16-8M440 294l16-8', 'ldanger thick', svg);
      op(n.burst, 0);

      /* terminal: the service's log.txt, in the DOM panel under the stage */
      var term = E('div', { 'class': 'term' }, api.panel);
      n.lines = [];
      for (var i = 0; i < 4; i++) n.lines.push(E('p', {}, term));

      return st;
    },

    render: function (st, T, now) {
      var api = st.api, rm = api.rm(), pose = null;
      fitBoxes(st);

      /* slam bookkeeping: fire once per forward crossing of T = 3.5 */
      var crossed = st.lastT !== null && st.lastT < SLAM_T && T >= SLAM_T;
      if (T >= SLAM_T && !st.slamTime) st.slamTime = stamp(); // captured once, at the first crossing
      if (crossed && !st.clip && !rm) { api.shake(6, 250); api.hitstop(90); }
      st.lastT = T;

      if (st.clip) {
        if (st.clip.t0 == null) st.clip.t0 = now;
        var e = now - st.clip.t0;
        if (e < CLIP_MS) pose = clipFrame(st, T, e);
        else { // clip over: fall back to the scroll layer (a clip that ran out off screen still logs its kill)
          if (!st.clip.slammed) slam(st, st.clip, false);
          st.clip = null; st.live = false;
        }
      }
      if (!pose) pose = st.pose = scrollFrame(st, T);
      // phones: keep the tower, the cards and the toast in view rather than only following Blip
      if (T >= 1 || st.clip) pose.span = st.span;
      return pose;
    },

    action: function (st, name) {
      if (name !== 'launch') return;
      var api = st.api;
      // a click before the previous clip's slam cuts that clip short: write its entry first, so every
      // announced attempt gets its log lines and "Blocked n" never skips a number
      if (st.clip && !st.clip.slammed) slam(st, st.clip, false);
      st.attempt += 1;
      var k = st.attempt, n = k + 1;                         // the same watcher already blocked 1
      var pid = 4 * (250 + Math.floor(Math.random() * 9751)); // multiple of 4 in 1000..40000
      var announce = 'Overwatch PID ' + pid + ' killed. Attempt ' + k + '.';
      if (api.rm()) { // reduced motion: jump straight to the flattened frame plus the log line
        st.clip = null; st.live = false;
        pushLog(st, killLines(pid, stamp(), n));
        return { announce: announce, caption: captionFor(k) };
      }
      st.clip = { t0: null, pid: pid, n: n, k: k, slammed: false, from: st.pose || { x: 200, y: 440 } };
      st.live = true;
      api.wake();
      return { announce: announce };
    }
  };

  function pushLog(st, lines) {
    st.log = st.log.concat(lines).slice(-12);
  }
  /* a clip's slam: its log entry and caption, plus shake and hit-stop when it plays on screen */
  function slam(st, c, fx) {
    c.slammed = true;
    if (fx) { st.api.shake(6, 250); st.api.hitstop(90); }
    pushLog(st, killLines(c.pid, stamp(), c.n));
    st.api.caption(captionFor(c.k));
  }

  /* Size the label boxes from their text. Mobile labels are larger (style.css), so fixed boxes overflowed
     and the match card ran under Blip. This reads layout, so it runs only on the first render and when the
     breakpoint flips, never per frame. */
  function fitBoxes(st) {
    var n = st.n, key = st.mq ? String(st.mq.matches) : 'x';
    if (key === st.fitKey) return;
    function len(t) { try { return t.getComputedTextLength(); } catch (e) { return 0; } }
    n.kill.removeAttribute('textLength'); n.kill.removeAttribute('lengthAdjust');
    var kill = len(n.kill), a = len(n.m1a), b = len(n.m1b), m2 = len(n.m2), t1 = len(n.t1), t2 = len(n.t2);
    if (!kill || !m2) return; // not laid out yet: try again on the next render
    st.fitKey = key;
    var fs = parseFloat(window.getComputedStyle(n.m2).fontSize) || 14, lh = Math.max(23, Math.round(1.3 * fs));
    function boxH(lines) { return Math.round(14 + 1.35 * fs + (lines - 1) * lh); } // 56 for 2 lines at 14u

    // mallet: keep the 120u head and condense the label up to 15%; past that, widen the head
    var hw = 120;
    if (kill > 104 * 1.15) hw = Math.ceil(kill) + 16;
    else if (kill > 104) { n.kill.setAttribute('textLength', '104'); n.kill.setAttribute('lengthAdjust', 'spacingAndGlyphs'); }
    attr(n.head, 'x', String(400 - hw / 2)); attr(n.head, 'width', String(hw));
    attr(n.kill, 'y', String(Math.round(22 + 0.35 * fs)));

    // match card: two lines, or three when line 1 would reach Blip standing on PLAY (x ≥ 360)
    var three = 40 + 24 + a + b > 356, tickX = Math.ceil(52 + m2 + 14);
    var mw = three ? Math.ceil(Math.max(a, b, tickX + 18 - 52)) + 24 : Math.max(310, Math.ceil(Math.max(a + b, tickX + 18 - 52)) + 24);
    var mh = boxH(three ? 3 : 2), top = 292 - mh, y1 = top + 8 + fs;
    attr(n.matchBox, 'y', String(r2(top))); attr(n.matchBox, 'height', String(mh)); attr(n.matchBox, 'width', String(mw));
    attr(n.m1, 'y', String(r2(y1)));
    if (three) { attr(n.m1b, 'x', '52'); attr(n.m1b, 'dy', String(lh)); }
    else { n.m1b.removeAttribute('x'); n.m1b.removeAttribute('dy'); n.m1b._a_x = n.m1b._a_dy = null; }
    var y2 = y1 + lh * (three ? 2 : 1);
    attr(n.m2, 'y', String(r2(y2)));
    attr(n.tick, 'transform', 'translate(' + (tickX - 184) + ' ' + r2(y2 - 281) + ')');

    // toast: top edge fixed at y 170, grows down and right
    var tw = Math.max(345, Math.ceil(Math.max(t1, t2)) + 24), ty = 170 + 8 + fs;
    attr(n.toastBox, 'width', String(tw)); attr(n.toastBox, 'height', String(boxH(2)));
    attr(n.t1, 'y', String(r2(ty))); attr(n.t2, 'y', String(r2(ty + lh)));

    st.span = [36, Math.min(800, Math.max(490, 40 + mw + 4, 40 + tw + 4))];
  }

  /* terminal = scroll-driven kill (if past the slam) + heartbeat + every click's entry; newest 4 */
  function writeTerminal(st, T) {
    var all = [];
    if (T >= SLAM_T) all = all.concat(killLines(12400, st.slamTime, 1));
    if (T >= 4.6) all.push(HEARTBEAT);
    all = all.concat(st.log).slice(-4);
    for (var i = 0; i < 4; i++) {
      var p = st.n.lines[i], L = all[i];
      txt(p, L ? L.t : (i === 0 && !all.length ? 'log.txt' : ''));
      attr(p, 'class', L ? L.c : (i === 0 ? 'dim' : ''));
    }
  }

  /* shared drawing of the props, driven by already-computed values */
  function drawProps(st, v) {
    var n = st.n;
    // window: pop (scale) then CRT-style collapse (scaleY, then scaleX)
    var sx = v.winPop * v.winSx, sy = v.winPop * v.winSy, show = v.winPop > 0.001 && v.winSx > 0.001;
    op(n.win, show ? 1 : 0);
    attr(n.win, 'transform', show ? 'translate(' + WIN.cx + ' ' + WIN.cy + ') scale(' + r2(sx) + ' ' + r2(Math.max(sy, 0.001)) + ') translate(' + -WIN.cx + ' ' + -WIN.cy + ')' : 'scale(0)');
    attr(n.bar, 'width', String(r2(BAR.w * v.bar)));
    // PLAY squash from its bottom edge
    var b = PLAY.y + PLAY.h;
    attr(n.play, 'transform', 'translate(0 ' + b + ') scale(1 ' + r2(v.playSy) + ') translate(0 ' + -b + ')');
    // event dot along its route
    api_reveal(n.trace, v.dot);
    op(n.trace, v.traceOp);
    var d = along(DOT_PATH, v.dot);
    attr(n.dot, 'cx', String(r2(d.x))); attr(n.dot, 'cy', String(r2(d.y)));
    op(n.dot, v.dot > 0 && v.dot < 1 ? 1 : 0);
    // lamp halo, match card, toast, mallet, impact marks
    op(n.halo, 0.35 * v.halo);
    op(n.match, v.match); api_reveal(n.tick, v.tick);
    op(n.toast, v.toast);
    attr(n.mallet, 'transform', 'translate(0 ' + r2(v.mallet) + ')');
    op(n.burst, v.burst);
  }
  /* api.reveal equivalent (kept local so drawProps needs no api handle) */
  function api_reveal(node, t) {
    var o = String(r2(1 - clamp(t)));
    if (node._rv === o) return;
    node._rv = o; node.style.strokeDasharray = '1'; node.style.strokeDashoffset = o;
  }

  /* ---------- scroll layer: pure in T (plus the captured time string) ---------- */
  function scrollFrame(st, T) {
    var down = T >= SLAM_T;

    // PLAY: a press at b1 u .4, and held squashed under the mallet until it lifts
    var press = Math.sin(Math.PI * seg(T, 1.36, 1.5));
    var held = down ? 1 - seg(T, 4.3, 4.4) : 0;
    var playSy = 1 - 0.1 * Math.max(press, held);
    var top = playTop(playSy);
    // b4: Blip reinflates in three steps (sy .5/.8/1 over u .1–.3)
    var sy = T < 4.1 ? 0 : T < 4.1667 ? 0.5 : T < 4.2333 ? 0.8 : 1;

    // mallet head y
    var m = PARK;
    if (T >= 2.6 && T < 3) m = lerp(PARK, PEEK, ease(seg(T, 2.6, 3)));
    else if (T >= 3 && T < 3.45) m = lerp(PEEK, HOVER, ease(seg(T, 3, 3.45)));
    else if (T >= 3.45 && T < SLAM_T) m = lerp(HOVER, WINDUP, easeOut(seg(T, 3.45, SLAM_T)));
    else if (down) m = pushUp(lerp(st.api.rm() ? DOWN_RM : DOWN, PARK, ease(seg(T, 4.3, 4.6))), top, sy);

    var bright = seg(T, 2.5, 2.7) * (1 - seg(T, 3.5, 3.8));
    var beacon = Math.sin(Math.PI * seg(T, 4.6, 4.78));
    drawProps(st, {
      winPop: clamp(easeOutBack(seg(T, 1.4, 1.6)), 0, 1.2),
      winSy: lerp(1, 0.04, seg(T, 3.5, 3.52)),
      winSx: 1 - seg(T, 3.52, 3.55),
      bar: 0.03 * seg(T, 1.45, 1.9),
      playSy: playSy,
      dot: seg(T, 2, 2.5),
      traceOp: T < 2 ? 0 : down ? 0 : 1 - 0.6 * seg(T, 2.6, 2.9),
      halo: Math.max(bright, beacon),
      match: seg(T, 2.5, 2.62) * (1 - seg(T, 3.45, 3.5)),
      tick: seg(T, 2.62, 2.72),
      toast: seg(T, 4.6, 4.7),
      mallet: m,
      burst: down ? 1 - seg(T, 3.5, 3.62) : 0
    });
    writeTerminal(st, T);

    var tower = { x: LAMP.x, y: LAMP.y };
    // b0: walk in, headset drops on at u .55
    if (T < 1) {
      var w = ease(seg(T, 0, 0.85));
      return {
        x: lerp(ENTER_X, 200, w), y: 440 - 3 * Math.abs(Math.sin(w * 6 * Math.PI)),
        form: T >= 0.55 ? 'headset' : 'default', expr: T >= 0.55 ? 'happy' : 'open'
      };
    }
    // b1: hop onto PLAY, then bob on it
    if (T < 2) {
      var u = T - 1, s = seg(T, 1, 1.35);
      if (s < 1) {
        var h = hop({ x: 200, y: 440 }, { x: 400, y: top }, ease(s), 80);
        return { x: h.x, y: h.y, form: 'headset', expr: 'happy' };
      }
      return {
        x: 400, y: top - 6 * Math.abs(Math.sin(u * 3 * Math.PI)), form: 'headset',
        expr: T >= 1.4 ? 'open' : 'happy', look: T >= 1.4 ? { x: WIN.cx, y: WIN.cy } : undefined
      };
    }
    // b2: the event runs to the tower; Blip watches it
    if (T < 3) return { x: 400, y: top, form: 'headset', expr: 'open', look: tower };
    // b3: the mallet comes down
    if (T < SLAM_T) {
      return { x: 400, y: top, form: 'headset', expr: T >= 3.3 ? 'wide' : 'open', look: { x: 400, y: m + 22 } };
    }
    if (T < 4.1) return { x: 400, y: top, form: 'flat', expr: 'x' };
    // b4: reinflate in three steps, a dazed tilt, headset off at u .7
    return {
      x: 400, y: top, sy: sy, rot: 8 * Math.sin(Math.PI * seg(T, 4.3, 4.6)),
      form: T >= 4.7 ? 'default' : 'headset', expr: T < 4.3 ? 'x' : 'open',
      look: T >= 4.6 ? { x: 200, y: 198 } : undefined
    };
  }

  /* ---------- click layer: the 1.6 s "Launch Overwatch" clip, e in ms ---------- */
  function clipFrame(st, T, e) {
    var c = st.clip;
    if (e >= CLIP_SLAM && !c.slammed) slam(st, c, true); // shake, hit-stop, log entry, caption
    var down = e >= CLIP_SLAM;
    var press = Math.sin(Math.PI * seg(e, 300, 440));
    var held = down ? 1 - seg(e, 1000, 1100) : 0;
    var playSy = 1 - 0.1 * Math.max(press, held);
    var top = playTop(playSy);
    var sy = e < 1000 ? 0 : e < 1100 ? 0.5 : e < 1200 ? 0.8 : 1; // reinflate

    var m = PARK;
    if (e < 600) m = lerp(PARK, HOVER, ease(seg(e, 200, 600)));
    else if (!down) m = lerp(HOVER, WINDUP, easeOut(seg(e, 600, CLIP_SLAM)));
    else m = pushUp(lerp(DOWN, PARK, ease(seg(e, 1000, 1300))), top, sy);

    drawProps(st, {
      winPop: clamp(easeOutBack(seg(e, 0, 400)), 0, 1.2),
      winSy: lerp(1, 0.04, seg(e, CLIP_SLAM, CLIP_SLAM + 30)),
      winSx: 1 - seg(e, CLIP_SLAM + 30, CLIP_SLAM + 80),
      bar: 0.03 * seg(e, 150, 400),
      playSy: playSy,
      dot: seg(e, 400, 700),
      traceOp: e < 400 || down ? 0 : 1,
      halo: seg(e, 550, 650) * (1 - seg(e, CLIP_SLAM, 1000)),
      match: 0, tick: 0, toast: 0,
      mallet: m,
      burst: down ? 1 - seg(e, CLIP_SLAM, CLIP_SLAM + 120) : 0
    });
    writeTerminal(st, T);

    // Blip: to PLAY, watch the tower, flattened, then reinflate
    if (e < 400) {
      var h = hop(c.from, { x: 400, y: top }, ease(seg(e, 0, 380)), 60);
      return { x: h.x, y: h.y, form: 'headset', expr: 'happy' };
    }
    if (!down) return { x: 400, y: top, form: 'headset', expr: e >= 600 ? 'wide' : 'open', look: { x: LAMP.x, y: LAMP.y } };
    if (e < 1000) return { x: 400, y: top, form: 'flat', expr: 'x' };
    return {
      x: 400, y: top, sy: sy,
      rot: 8 * Math.sin(Math.PI * seg(e, 1300, 1600)),
      form: 'headset', expr: e < 1300 ? 'x' : 'open'
    };
  }
})();
