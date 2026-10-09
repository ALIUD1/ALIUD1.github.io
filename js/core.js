/* Blip, Down the Stack: core engine.
   Boot, measuring, the beat clock, the rAF loop, Blip's physics and hosts, the rail,
   captions / tips / controls, theme + motion toggles, copy-email and the ?check self-test.
   Scenes live in js/scenes/*.js and talk to this file only through `api` (see setup()). */
(function () {
  'use strict';

  var doc = document, root = doc.documentElement, win = window;
  var SCENES = win.SCENES || {};
  var SVGNS = 'http://www.w3.org/2000/svg';
  var VB_W = 800, VB_H = 560, FEET = 58 / 64, MIN_VB_W = 500; // phones never see less than 500u of the stage
  var FORMS = ['default', 'ticket', 'pill', 'eyes', 'ping', 'antenna', 'headset', 'flat', 'legs', 'hardhat'];
  var HTML_TAGS = /^(div|span|canvas|p|ul|li|button)$/;
  var EMAIL = 'liualex639@gmail.com';

  /* ---------- small helpers ---------- */
  function $(s, c) { return (c || doc).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); }
  function clamp(v, lo, hi) { lo = lo == null ? 0 : lo; hi = hi == null ? 1 : hi; return v < lo ? lo : v > hi ? hi : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function easeInOut(t) { t = clamp(t); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(2 - 2 * t, 3) / 2; }
  function easeOut(t) { t = clamp(t); return 1 - Math.pow(1 - t, 3); }
  function easeOutBack(t) { t = clamp(t) - 1; var c = 1.70158; return 1 + (c + 1) * t * t * t + c * t * t; }
  function seg(T, a, b) { return clamp((T - a) / (b - a)); }
  function rng(seed) { // mulberry32
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0; var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function now() { return performance.now(); }
  function isRM() { return root.classList.contains('rm'); }
  function fin(v) { return typeof v === 'number' && isFinite(v); }
  function save(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { /* private mode */ } }
  function mq(q) { return win.matchMedia ? win.matchMedia(q) : { matches: false }; }
  function isScene(s) { return !!s && typeof s.setup === 'function' && typeof s.render === 'function'; }
  function el(tag, attrs, parent) {
    var n = HTML_TAGS.test(tag) ? doc.createElement(tag) : doc.createElementNS(SVGNS, tag);
    for (var k in attrs) if (attrs[k] != null) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }

  var live = $('#live');
  function announce(msg) { // polite region; only ever called after a user action
    if (!live || !msg) return;
    live.textContent = '';
    setTimeout(function () { live.textContent = msg; }, 40);
  }

  /* ---------- media state + cached measurements ---------- */
  var mqWide = mq('(min-width: 960px)'), mqRail = mq('(min-width: 1200px)'), mqFine = mq('(pointer: fine)');
  // the small viewport height, so cached tops do not move when Safari's toolbar collapses
  var probe = el('div', { style: 'position:fixed;top:0;left:0;width:0;height:100svh;visibility:hidden;pointer-events:none', 'aria-hidden': 'true' });
  doc.body.insertBefore(probe, doc.body.firstChild);
  var H = probe.offsetHeight || win.innerHeight, W = win.innerWidth, wide = mqWide.matches, railOn = mqRail.matches, readLine = 0.5 * H;
  var heroBox = null, footBox = null, h1Box = null, cueBox = null, expBox = null, rowBoxes = [], railTop = 0.5 * H;
  var heroStatic = $('.hero .blip-static'), footStatic = $('#contact .blip-static');
  var rows = $$('#experience .row'), hoverRow = null, focusRow = null, legsUntil = 0;
  var lastScroll = 0, lastPointer = -1e9, pointer = null, entered = false;

  function docRect(n) {
    if (!n) return null;
    var r = n.getBoundingClientRect();
    return { x: r.left, y: r.top + win.scrollY, w: r.width, h: r.height };
  }

  /* ---------- the overlay Blip ---------- */
  var btn = $('button.blip');
  if (!btn) { btn = el('button', { 'class': 'blip', type: 'button', 'aria-label': 'Poke Blip' }); doc.body.appendChild(btn); }
  var ink = 'fill="none" style="stroke:var(--pupil)" stroke-width="2.4" stroke-linecap="round"';
  btn.innerHTML =
    '<svg viewBox="0 0 64 64" aria-hidden="true" focusable="false"><g class="b-squash"><g class="b-breathe">' +
    FORMS.map(function (f) { return '<g class="b-form" data-f="' + f + '"><use href="#blip-' + f + '"/></g>'; }).join('') +
    '<g class="b-face"><g class="eyes">' +
      '<g class="eye-open"><ellipse cx="25" cy="33" rx="5" ry="6" style="fill:var(--eye)"/><ellipse cx="39" cy="33" rx="5" ry="6" style="fill:var(--eye)"/>' +
        '<circle class="pupil" cx="25" cy="33" r="2.6" style="fill:var(--pupil)"/><circle class="pupil" cx="39" cy="33" r="2.6" style="fill:var(--pupil)"/></g>' +
      '<g class="eye-happy" ' + ink + '><path d="M20.5 35Q25 28.5 29.5 35M34.5 35Q39 28.5 43.5 35"/></g>' +
      '<g class="eye-x" ' + ink + '><path d="M21.5 29.5l7 7m0-7l-7 7M35.5 29.5l7 7m0-7l-7 7"/></g>' +
      '<g class="brows" fill="none" style="stroke:var(--pupil)" stroke-width="2" stroke-linecap="round"><path d="M20 24.5l7 2.5M44 24.5l-7 2.5"/></g>' +
    '</g></g></g></g></svg>';
  btn.style.transformOrigin = '0 0';
  btn.classList.add('gone');
  var bSvg = $('svg', btn), bSquash = $('.b-squash', btn), pupils = $$('.pupil', btn);

  // Blip's physical state. p and v live in the CURRENT HOST's local frame (SPEC §3.4).
  var B = {
    host: null, p: { x: 0, y: 0 }, v: { x: 0, y: 0 }, screen: { x: 0, y: 0 }, w: 0, wv: 0, k: 1,
    travel: 0, prevSpeed: 0, approach: false, crouchUntil: 0, hop: 0, freezeUntil: 0,
    exprOver: null, exprUntil: 0, lookOver: null, lookUntil: 0, enterFrom: null,
    form: '', expr: '', op: '', shiver: false, squash: '', pup: '', size: 44
  };
  function setExpr(e, ms) { B.exprOver = e; B.exprUntil = now() + ms; setTimeout(kick, ms + 30); }
  function lookAt(fn, ms) { B.lookOver = fn; B.lookUntil = now() + ms; setTimeout(kick, ms + 30); } // fn(frame scrollY) -> viewport point

  /* ---------- projects: records, accents, rail ---------- */
  var railLinks = [];
  var recs = $$('article.project').map(function (article, i) {
    var story = $('.story', article) || article;
    var figure = $('.figure', story);
    if (!figure) { // insert one after the header so the data file can omit it
      figure = el('div', { 'class': 'figure' });
      var hd = $('header', story);
      story.insertBefore(figure, hd ? hd.nextSibling : story.firstChild);
    }
    var accent = article.getAttribute('data-accent');
    article.style.setProperty('--accent', 'var(--' + (/^(signal|ok|warn|danger)$/.test(accent) ? accent : 'signal') + ')');
    var name = article.getAttribute('data-scene');
    return {
      i: i, id: article.id, article: article, story: story, figure: figure,
      scene: isScene(SCENES[name]) ? SCENES[name] : SCENES.generic,
      lis: $$('ol.steps > li', story), ol: $('ol.steps', story),
      tops: [], stepsBottom: 0, top: 0, bottom: 0, aTop: 0, aBottom: 0,
      mounted: false, dead: false, visible: false, T: 0, Ts: 0, lastTs: NaN, force: true, active: -2,
      out: null, panX: 0, vbW: VB_W, vbStr: '', rw: 0, rh: 0, rx: 0, ry: 0, map: null, svgOff: { x: 0, y: 0 },
      shake: null, shakeX: 0, places: [], ctrls: [], capOverride: null, tipText: null, tipVB: null, capStr: null
    };
  });

  (function buildRail() {
    if (!recs.length) return;
    var nav = doc.createElement('nav');
    nav.className = 'rail'; nav.setAttribute('aria-label', 'Project rail');
    var ol = doc.createElement('ol'); nav.appendChild(ol);
    recs.forEach(function (rec, i) {
      var h2 = $('h2', rec.article);
      var li = doc.createElement('li'), a = doc.createElement('a');
      a.href = '#' + rec.id;
      a.innerHTML = '<span class="n"></span><span class="name"></span>';
      a.firstChild.textContent = pad2(i + 1);
      a.lastChild.textContent = h2 ? h2.textContent.trim() : rec.id;
      li.appendChild(a); ol.appendChild(li); railLinks.push(a);
    });
    // before <main>, so keyboard users reach the project rail before the projects (it is fixed, so
    // layout is unchanged); Blip's button stays last in the DOM
    doc.body.insertBefore(nav, $('main') || btn);
  })();

  // Hero index: a tap is a jump, not a tour. The browser's own fragment scroll runs right after this
  // handler, so smooth scrolling is off for that one scroll; hash, history and focus stay native.
  $$('nav.index a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function () {
      root.style.scrollBehavior = 'auto';
      setTimeout(function () { root.style.scrollBehavior = ''; lastScroll = now(); kick(); }, 0);
    });
  });

  /* ---------- mounting a scene ---------- */
  function makeApi(rec) {
    var api = {
      el: el,
      text: function (x, y, str, cls, parent) { var t = el('text', { x: x, y: y, 'class': cls }, parent); t.textContent = str; return t; },
      path: function (d, cls, parent) { return el('path', { d: d, 'class': cls, pathLength: 1 }, parent); },
      reveal: function (node, t) {
        var o = String(Math.round((1 - clamp(t)) * 1e4) / 1e4);
        if (node._rv === o) return;
        node._rv = o; node.style.strokeDasharray = '1'; node.style.strokeDashoffset = o;
      },
      seg: seg, lerp: lerp, clamp: clamp, easeInOut: easeInOut, easeOut: easeOut, easeOutBack: easeOutBack, rng: rng,
      tip: function (node, text) { node.setAttribute('data-tip', text); },
      place: function (domEl, x, y, w, h) {
        domEl.style.position = 'absolute';
        var p = { el: domEl, x: x, y: y, w: w, h: h };
        rec.places = rec.places.filter(function (q) { return q.el !== domEl; }).concat(p);
        if (rec.map) placeOne(rec, p);
      },
      announce: announce,
      caption: function (str) { rec.capOverride = str == null ? null : String(str); updateCaption(rec); },
      figure: rec.figure, panel: rec.panel, stage: rec.svg, steps: rec.lis,
      rm: isRM,
      shake: function (px, ms) { if (!isRM()) { rec.shake = { amp: px || 6, dur: ms || 250, t0: now() }; kick(); } },
      hitstop: function (ms) { if (!isRM()) B.freezeUntil = now() + (ms || 90); },
      wake: function () { kick(); },
      beatsOf: function (a) { return $$('ol.steps > li', a || rec.article).length; }
    };
    return api;
  }

  function buildFigure(rec, scene) {
    var f = rec.figure; f.textContent = '';
    var tag = el('p', { 'class': 'fig-tag' }, f);
    tag.textContent = (scene.tag || 'fig. 0N').replace('0N', pad2(rec.i + 1));
    rec.wrap = el('div', { 'class': 'stage-wrap' }, f);
    rec.svg = el('svg', { 'class': 'stage', viewBox: '0 0 800 560', 'aria-hidden': 'true', focusable: 'false', preserveAspectRatio: 'xMidYMid meet' }, rec.wrap);
    rec.panel = el('div', { 'class': 'panel', 'aria-hidden': 'true' }, f);
    rec.cap = el('p', { 'class': 'cap', 'aria-hidden': 'true' }, f);
    rec.controls = el('div', { 'class': 'controls' }, f);
    rec.places = []; rec.ctrls = []; rec.vbStr = '';
    rec.api = makeApi(rec);
  }

  function mount(rec) {
    if (rec.mounted || rec.dead) return;
    var tries = [rec.scene];
    if (rec.scene !== SCENES.generic && isScene(SCENES.generic)) tries.push(SCENES.generic);
    rec.state = null;
    for (var k = 0; k < tries.length && !rec.state; k++) {
      if (!isScene(tries[k])) continue;
      buildFigure(rec, tries[k]);
      try { rec.state = tries[k].setup(rec.api, rec.svg, rec.article) || {}; rec.scene = tries[k]; }
      catch (e) { console.warn('[blip] scene setup failed for #' + rec.id + (k ? '' : '; falling back to generic'), e); }
    }
    if (!rec.state) { rec.figure.parentNode && rec.figure.parentNode.removeChild(rec.figure); rec.dead = true; return; }
    var N = rec.lis.length, sc = rec.scene;
    rec.beats = rec.state.beats || sc.beats || clamp(N, 2, 9);
    if (sc.beats && sc.beats !== N) console.warn('[blip] #' + rec.id + ' has ' + N + ' steps but its scene expects ' + sc.beats + '; mapping T × ' + sc.beats + '/' + N);
    (rec.state.controls || []).forEach(function (c) {
      var b = el('button', { type: 'button', 'data-action': c.action }, rec.controls);
      b.textContent = c.label;
      if (c.pressed != null) b.setAttribute('aria-pressed', String(!!c.pressed));
      b.addEventListener('click', function () { onAction(rec, c, b); });
      if (c.from != null) b.addEventListener('blur', kick); // a focused gated control stays shown; re-check once it lets go
      rec.ctrls.push({ b: b, from: c.from, hid: null });
    });
    // gate `from` controls now, not on the first visible frame: an off-screen mount must not leave a
    // focusable button that hides itself (and drops focus to <body>) as soon as it scrolls into view
    updateControls(rec, tsOf(rec, clock(rec, win.scrollY + readLine).T));
    wireTips(rec);
    rec.mounted = true; rec.force = true; rec.lastTs = NaN; rec.off = true;
    rec.figure.classList.add('mounted', 'off'); // .off pauses stage CSS animations until it is on screen
    measureStage(rec);
    if (isRM()) renderPoster(rec, true); else kick();
  }

  function safeRender(rec, Ts, t) {
    try { var o = rec.scene.render(rec.state, Ts, t); if (o) rec.out = o; }
    catch (e) { if (!rec.warned) { rec.warned = true; console.warn('[blip] render failed in #' + rec.id, e); } }
    return rec.out;
  }

  function onAction(rec, c, b) {
    if (b.hasAttribute('aria-pressed')) b.setAttribute('aria-pressed', String(b.getAttribute('aria-pressed') !== 'true'));
    var res;
    try { res = rec.scene.action && rec.scene.action(rec.state, c.action, b); } catch (e) { console.warn('[blip] action failed', e); }
    if (res) {
      if (res.announce) announce(res.announce);
      if (res.caption !== undefined) rec.api.caption(res.caption);
    }
    rec.force = true;
    if (isRM()) renderPoster(rec, false); else kick();
  }

  /* ---------- captions + tips ---------- */
  function updateCaption(rec) {
    if (!rec.cap) return;
    var li = rec.lis[rec.active >= 0 ? rec.active : rec.capIdx || 0], code = li && $('code', li), p = li && $('p', li);
    var s = rec.tipText || rec.capOverride || (!wide && p ? p.textContent : code ? code.textContent : '');
    if (s !== rec.capStr) { rec.cap.textContent = s; rec.capStr = s; }
    rec.cap.classList.toggle('tip', !!rec.tipText);
  }
  function wireTips(rec) {
    var f = rec.figure, timer = 0;
    function show(n) {
      rec.tipText = n.getAttribute('data-tip');
      if (rec.map) { // remember the look point in viewBox units so it stays glued while panning
        var r = n.getBoundingClientRect(), m = rec.map;
        rec.tipVB = { x: (r.left + r.width / 2 - m.X0) / m.s, y: (r.top + r.height / 2 - m.Y0) / m.s };
      }
      updateCaption(rec); kick();
    }
    function hide() { rec.tipText = null; rec.tipVB = null; updateCaption(rec); kick(); }
    function tipOf(t) { var n = t && t.closest ? t.closest('[data-tip]') : null; return n && f.contains(n) ? n : null; }
    f.addEventListener('pointerover', function (e) { if (e.pointerType === 'touch') return; var n = tipOf(e.target); if (n) show(n); });
    f.addEventListener('pointerout', function (e) { if (e.pointerType !== 'touch' && rec.tipText && !tipOf(e.relatedTarget)) hide(); });
    var lastTouch = -1e9; // iOS fires click only for a touch that did not scroll
    f.addEventListener('pointerdown', function (e) { if (e.pointerType === 'touch') lastTouch = now(); }, { passive: true });
    f.addEventListener('click', function (e) {
      if (now() - lastTouch > 700) return;
      var n = tipOf(e.target); if (!n) return;
      show(n); clearTimeout(timer); timer = setTimeout(hide, 4000);
    });
  }

  /* ---------- measuring (never inside the frame loop) ---------- */
  function measure() {
    var sy = win.scrollY;
    H = probe.offsetHeight || win.innerHeight; W = win.innerWidth; wide = mqWide.matches; railOn = mqRail.matches;
    readLine = wide ? 0.5 * H : 0.72 * H + 8;
    recs.forEach(function (rec) {
      var a = rec.article.getBoundingClientRect(), s = rec.story.getBoundingClientRect();
      rec.aTop = a.top + sy; rec.aBottom = a.bottom + sy; rec.top = s.top + sy; rec.bottom = s.bottom + sy;
      rec.tops = rec.lis.map(function (li) { return li.getBoundingClientRect().top + sy; });
      rec.stepsBottom = rec.ol ? rec.ol.getBoundingClientRect().bottom + sy : rec.bottom;
    });
    heroBox = docRect(heroStatic); footBox = docRect(footStatic);
    h1Box = docRect($('.hero h1')); cueBox = docRect($('.hero .cue')); expBox = docRect($('#experience'));
    rowBoxes = rows.map(docRect);
    var railA = railOn && $('.rail a'), ra = railA && railA.getBoundingClientRect(); // fixed: viewport coords
    railTop = ra && ra.height ? ra.top : 0.5 * H;
    B.size = btn.offsetWidth || (wide ? 44 : 36);
    recs.forEach(function (rec) { if (rec.mounted) { measureStage(rec); updateCaption(rec); } });
    if (isRM()) recs.forEach(function (rec) { if (rec.mounted) renderPoster(rec); });
  }
  function measureStage(rec) { // svg offset inside .stage-wrap, for api.place
    var s = rec.svg.getBoundingClientRect(), w = rec.wrap.getBoundingClientRect();
    rec.svgOff = { x: s.left - w.left - rec.shakeX, y: s.top - w.top };
    rec.rx = s.left - rec.shakeX; rec.ry = s.top; rec.rw = s.width; rec.rh = s.height;
    panTo(rec, 0); mapRec(rec); rec.places.forEach(function (p) { placeOne(rec, p); });
  }

  /* ---------- stage mapping + pan (SPEC §4.4) ----------
     Below 960 px the view follows Blip (or stays centered for pan:'center'). A scene may also return
     `span: [x0, x1]` (viewBox x) from render: the labels that must stay readable on that beat. The pan
     then keeps the span inside the view and follows Blip only within the slack (a span wider than the
     view is centered). Include Blip's x in the span if Blip must stay visible too.
     The view width fills the stage-wrap's own aspect (full height, so labels are as large as the wrap
     allows); a span wider than that widens the view to hold it (the stage letterboxes vertically) and
     the camera eases between widths, so a beat's must-read labels never clip at the stage edge. */
  function panTo(rec, dt) { // dt = 0 snaps
    if (!rec.rw || !rec.rh) return false;
    var o = rec.out, sp = o && o.span, hasSp = !wide && sp && fin(sp[0]) && fin(sp[1]);
    var x0 = hasSp ? Math.min(sp[0], sp[1]) : 0, x1 = hasSp ? Math.max(sp[0], sp[1]) : 0;
    var aspW = clamp(VB_H * rec.rw / rec.rh, MIN_VB_W, VB_W);
    var pad = !wide && rec.map && rec.map.s ? 16 / rec.map.s : 0; // the edge fade, in viewBox units
    var goalW = wide ? VB_W : clamp(Math.max(aspW, x1 - x0 + 2 * pad), MIN_VB_W, VB_W), k = dt ? 1 - Math.exp(-6 * dt) : 1;
    var vbW = !dt || wide || Math.abs(goalW - rec.vbW) < 0.3 ? goalW : rec.vbW + (goalW - rec.vbW) * k, max = VB_W - vbW;
    var want = rec.scene.pan === 'center' ? max / 2 : (o && fin(o.x) ? o.x : VB_W / 2) - vbW / 2;
    if (hasSp) want = x1 - x0 + 2 * pad > vbW ? (x0 + x1 - vbW) / 2 : clamp(want, x1 - vbW + pad, x0 - pad);
    want = clamp(want, 0, max);
    rec.panX += (want - rec.panX) * k;
    rec.vbW = vbW; rec.panX = clamp(rec.panX, 0, max);
    var str = (Math.round(rec.panX * 10) / 10) + ' 0 ' + (Math.round(vbW * 10) / 10) + ' 560';
    if (str !== rec.vbStr) { rec.svg.setAttribute('viewBox', str); rec.vbStr = str; rec.vbMoved = true; rec.svg.classList.toggle('cut-l', rec.panX > 0.5); rec.svg.classList.toggle('cut-r', rec.panX < max - 0.5); }
    return Math.abs(want - rec.panX) > 0.3 || vbW !== goalW;
  }
  function mapRec(rec) {
    var s = Math.min(rec.rw / rec.vbW, rec.rh / VB_H) || 1, ox = (rec.rw - rec.vbW * s) / 2, oy = (rec.rh - VB_H * s) / 2;
    rec.map = { s: s, ox: ox, oy: oy, X0: rec.rx + ox - rec.panX * s, Y0: rec.ry + oy };
  }
  function placeOne(rec, p) {
    var m = rec.map, st = p.el.style;
    st.left = (rec.svgOff.x + m.ox + (p.x - rec.panX) * m.s) + 'px'; st.top = (rec.svgOff.y + m.oy + p.y * m.s) + 'px';
    st.width = (p.w * m.s) + 'px'; st.height = (p.h * m.s) + 'px';
  }

  /* ---------- beat clock (pure, SPEC §4.2) ---------- */
  // i = the current step (-1 while the read line is outside the steps); c = the li whose spec line the
  // caption shows (the first above the steps, the last below them)
  function clock(rec, y) {
    var t = rec.tops, N = t.length;
    if (!N || y < t[0]) return { T: 0, i: -1, c: 0 };
    if (y >= rec.stepsBottom) return { T: N, i: -1, c: N - 1 };
    var i = N - 1; while (i > 0 && t[i] > y) i--;
    var next = i + 1 < N ? t[i + 1] : rec.stepsBottom;
    return { T: clamp(i + (next > t[i] ? (y - t[i]) / (next - t[i]) : 0), 0, N), i: i, c: i };
  }
  function tsOf(rec, T) { return T * rec.beats / (rec.lis.length || rec.beats); } // li clock → scene beats
  function setActive(rec, i, cap) {
    if (i === rec.active && cap === rec.capIdx) return;
    if (i !== rec.active) rec.lis.forEach(function (li, k) {
      li.classList.toggle('on', k === i);
      if (k === i) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
    });
    rec.active = i; rec.capIdx = cap; rec.capOverride = null; updateCaption(rec);
  }
  function updateControls(rec, Ts) {
    rec.ctrls.forEach(function (c) {
      // never hide the control that has focus (focus would drop to <body>); its blur re-runs this
      var hid = c.from != null && Ts < c.from && c.b !== doc.activeElement;
      if (hid !== c.hid) { c.b.hidden = hid; c.hid = hid; }
    });
  }
  var railActive = -2;
  function updateRail(y) {
    var a = -1;
    recs.forEach(function (rec, k) { if (y >= rec.aTop && y < rec.aBottom) a = k; });
    if (a === railActive) return;
    railLinks.forEach(function (l, k) { if (k === a) l.setAttribute('aria-current', 'true'); else l.removeAttribute('aria-current'); });
    railActive = a;
  }

  /* ---------- hosts (SPEC §3.4, first match wins) ---------- */
  function staticHost(kind, b, sy) {
    return { kind: kind, ref: kind, ox: b.x, oy: b.y - sy, tx: b.w / 2, ty: b.h * FEET, k: b.w / B.size };
  }
  function pickHost(sy, y, story) {
    if (!entered) return null;
    if (footBox && footBox.w && footBox.y - sy < 0.8 * H) return staticHost('foot', footBox, sy);
    if (heroBox && heroBox.w && heroBox.y + heroBox.h - sy > 0.15 * H) return staticHost('hero', heroBox, sy);
    if (story) {
      var o = story.out, m = story.map;
      if (!o || !m) return null;
      if (o.el && story.elRect) { var r = story.elRect; return { kind: 'el', ref: o.el, rec: story, ox: r.left, oy: r.top, tx: r.width / 2, ty: 0, k: 1 }; }
      if (fin(o.x) && fin(o.y)) return { kind: 'stage', ref: story, rec: story, ox: m.X0, oy: m.Y0, tx: o.x * m.s, ty: o.y * m.s, k: 1 };
      return null;
    }
    if (railOn && expBox && y >= expBox.y && y < expBox.y + expBox.h && rows.length) {
      var row = hoverRow || focusRow, best = 1e9;
      if (!row) rowBoxes.forEach(function (b, k) { var d = Math.abs(b.y + b.h / 2 - y); if (d < best) { best = d; row = rows[k]; } });
      var rb = rowBoxes[rows.indexOf(row)];
      if (rb) return { kind: 'row', ref: row, ox: rb.x, oy: rb.y - sy, tx: -30, ty: 24, k: 1 };
    }
    // perch just above link 01 rather than on (24, 0.5·H), which is the middle of the list and would
    // cover links 02/03 and swallow their clicks (§10: Blip never covers text)
    if (railOn && railLinks.length) return { kind: 'rail', ref: 'rail', ox: 0, oy: 0, tx: 24, ty: railTop - 6, k: 1 };
    return null;
  }

  /* ---------- the loop (SPEC §4.3) ---------- */
  var raf = 0, lastFrame = 0;
  function kick() {
    if (raf || isRM() || doc.hidden) return;
    lastFrame = now();
    raf = requestAnimationFrame(frame);
  }

  function frame(t) {
    raf = 0;
    if (doc.hidden || isRM()) return;
    var dt = Math.min(Math.max((t - lastFrame) / 1000, 0.001), 1 / 30); lastFrame = t;
    var sy = win.scrollY, y = sy + readLine, busy = false, story = null;

    // 1. pure: clocks, visibility, which story holds the read line
    recs.forEach(function (rec) {
      var c = clock(rec, y);
      rec.T = c.T; rec.ci = c.i; rec.cc = c.c;
      rec.visible = rec.mounted && rec.top < sy + H && rec.bottom > sy;
      if (rec.mounted && y >= rec.top && y < rec.bottom) story = rec;
    });

    // 2. reads: one rect per visible stage, plus the host element a scene asked for
    recs.forEach(function (rec) {
      if (!rec.visible) return;
      var r = rec.svg.getBoundingClientRect();
      rec.rx = r.left - rec.shakeX; rec.ry = r.top; rec.rw = r.width; rec.rh = r.height;
      rec.elRect = rec === story && rec.out && rec.out.el ? rec.out.el.getBoundingClientRect() : null;
    });

    // 3. writes: rail, then inside figures (render, steps, controls, pan, shake)
    updateRail(y);
    recs.forEach(function (rec) {
      if (rec.mounted && rec.off === rec.visible) { rec.off = !rec.visible; rec.figure.classList.toggle('off', rec.off); }
      if (!rec.visible) { // a story you have left has no current step
        if (rec.mounted && rec.active >= 0) setActive(rec, -1, rec.active);
        return;
      }
      var Ts = tsOf(rec, rec.T);
      if (rec.force || Math.abs(Ts - rec.lastTs) > 0.0005 || rec.state.live) {
        safeRender(rec, Ts, t); rec.lastTs = Ts; rec.force = false;
      }
      if (rec.state.live) busy = true;
      rec.Ts = Ts;
      setActive(rec, rec.ci, rec.cc);
      updateControls(rec, Ts);
      rec.vbMoved = false;
      if (panTo(rec, dt)) busy = true;
      if (rec.shake) {
        var e = t - rec.shake.t0, dx = 0;
        if (e < rec.shake.dur) { dx = rec.shake.amp * Math.exp(-e / 80) * Math.sin(e * 0.12); busy = true; } else rec.shake = null;
        rec.shakeX = dx; rec.wrap.style.transform = dx ? 'translateX(' + dx.toFixed(2) + 'px)' : '';
      }
      rec.rx += rec.shakeX; // the art moves with the shake, so Blip does too
      mapRec(rec);
      rec.rx -= rec.shakeX;
      if (rec.vbMoved) rec.places.forEach(function (p) { placeOne(rec, p); });
    });

    // 4. Blip
    if (stepBlip(t, dt, sy, y, story)) busy = true;

    if (busy || t - lastScroll < 150 || t - lastPointer < 100) raf = requestAnimationFrame(frame);
  }

  function stepBlip(t, dt, sy, y, story) {
    var h = pickHost(sy, y, story);
    if (!h) {
      if (B.host) { btn.classList.add('gone'); B.host = null; }
      return false;
    }
    if (!B.host || B.host.kind !== h.kind || B.host.ref !== h.ref) {
      if (!B.host) { // (re)appearing: drop in from above the target, or from the hero entry point
        var f = B.enterFrom || { x: h.ox + h.tx, y: h.oy + h.ty - 60 };
        B.p.x = f.x - h.ox; B.p.y = f.y - h.oy; B.v.x = B.v.y = 0; B.enterFrom = null; B.travel = 0;
        B.k = h.k; btn.classList.remove('gone');
      } else { // keep the screen position, then crouch and hop
        B.p.x = B.screen.x - h.ox; B.p.y = B.screen.y - h.oy;
        B.crouchUntil = t + 80; B.hop = 420;
      }
    }
    B.host = h;

    var dx = h.tx - B.p.x, dy = h.ty - B.p.y;
    if (t >= B.freezeUntil) {
      if (B.hop && t >= B.crouchUntil) { B.v.y -= B.hop; B.hop = 0; }
      B.v.x += (170 * dx - 20 * B.v.x) * dt; B.v.y += (170 * dy - 20 * B.v.y) * dt; // semi-implicit Euler
      B.p.x += B.v.x * dt; B.p.y += B.v.y * dt;
      dx = h.tx - B.p.x; dy = h.ty - B.p.y;
      var speed = Math.hypot(B.v.x, B.v.y), dist = Math.hypot(dx, dy);
      B.travel += speed * dt;
      // landing: closest approach to the target after a real trip, arriving fast
      var approaching = B.v.x * dx + B.v.y * dy > 0;
      if (B.approach && !approaching && B.travel > 24 && dist < 12 && B.prevSpeed > 250) { B.wv += 5; B.travel = 0; }
      if (dist < 2 && B.travel > 24 && B.prevSpeed > 250) { B.wv += 5; B.travel = 0; }
      if (dist < 0.5 && speed < 0.5) B.travel = 0;
      B.approach = approaching; B.prevSpeed = speed;
      B.wv += (-420 * B.w - 14 * B.wv) * dt; B.w += B.wv * dt;
      B.k += (h.k - B.k) * (1 - Math.exp(-12 * dt));
    }
    var sp = Math.hypot(B.v.x, B.v.y);
    B.screen.x = h.ox + B.p.x; B.screen.y = h.oy + B.p.y;

    // pose from the host
    var o = h.rec ? h.rec.out || {} : {}, form = 'default', expr = 'open';
    if (h.rec) { form = o.form || 'default'; expr = o.expr || 'open'; }
    else if (h.kind === 'row' && h.ref.getAttribute('data-blip') === 'legs' && t < legsUntil) form = 'legs';
    if (t < B.exprUntil) expr = B.exprOver;
    if (form !== B.form) { btn.setAttribute('data-form', form); B.form = form; }
    if (expr !== B.expr) { btn.setAttribute('data-expr', expr); B.expr = expr; }
    var shiver = !!(h.rec && o.shiver);
    if (shiver !== B.shiver) { btn.classList.toggle('shiver', shiver); B.shiver = shiver; }
    var op = h.rec && fin(o.opacity) ? String(Math.round(clamp(o.opacity) * 100) / 100) : '';
    if (op !== B.op) { bSvg.style.opacity = op; B.op = op; }

    // squash + stretch + wobble, around the feet
    var s = clamp(1 + sp * 0.0007, 1, 1.4), scY = s * (1 - B.w), scX = (1 / s) * (1 + B.w);
    if (t < B.crouchUntil) scY *= 0.92;
    if (h.rec && fin(o.sy)) scY *= o.sy;
    if (form !== 'flat') { scX = clamp(scX, 0.55, 1.45); scY = clamp(scY, 0.55, 1.45); }
    var rot = h.rec && fin(o.rot) ? o.rot : 0;
    var sq = 'translate(32 58) rotate(' + rot.toFixed(2) + ') scale(' + scX.toFixed(3) + ' ' + scY.toFixed(3) + ') translate(-32 -58)';
    if (sq !== B.squash) { bSquash.setAttribute('transform', sq); B.squash = sq; }
    var px = B.size * B.k;
    btn.style.transform = 'translate3d(' + (B.screen.x - px / 2).toFixed(2) + 'px,' + (B.screen.y - px * FEET).toFixed(2) + 'px,0) scale(' + B.k.toFixed(4) + ')';

    // pupils: up to 2 units toward the look target
    var L = lookTarget(t, h, o, sy), pu = '0 0';
    if (L) {
      var ex = B.screen.x, ey = B.screen.y - px * (25 / 64), lx = L.x - ex, ly = L.y - ey, d = Math.hypot(lx, ly) || 1, m = Math.min(2, d / 30);
      pu = (lx / d * m).toFixed(1) + ' ' + (ly / d * m).toFixed(1);
    }
    if (pu !== B.pup) { pupils.forEach(function (c) { c.setAttribute('transform', 'translate(' + pu + ')'); }); B.pup = pu; }

    var settled = sp < 0.5 && Math.hypot(dx, dy) < 0.5 && Math.abs(B.w) < 0.001 && Math.abs(B.wv) < 0.01 && Math.abs(B.k - h.k) < 0.002 && !B.hop;
    return !settled || t < B.freezeUntil + 20 || t < B.crouchUntil + 20;
  }

  function lookTarget(t, h, o, sy) { // sy: the frame's scrollY (no layout reads after the frame's writes)
    if (t < B.lookUntil && B.lookOver) return B.lookOver(sy);
    var rec = h.rec, m = rec && rec.map;
    if (m && rec.tipVB) return { x: m.X0 + rec.tipVB.x * m.s, y: m.Y0 + rec.tipVB.y * m.s };
    if (o.look === 'camera') return null;
    if (m && o.look && fin(o.look.x)) return { x: m.X0 + o.look.x * m.s, y: m.Y0 + o.look.y * m.s };
    if (pointer && mqFine.matches) return pointer;
    return null;
  }

  /* ---------- reduced motion: static posters (SPEC §8) ---------- */
  function posterOf(rec) { var p = rec.scene.poster; return fin(p) ? p : fin(rec.state.poster) ? rec.state.poster : rec.beats; }
  function renderPoster(rec, withRmHook) {
    var P = posterOf(rec), N = rec.lis.length || rec.beats;
    if (!rec.rw) measureStage(rec);
    var o = safeRender(rec, P, now());
    rec.Ts = P; rec.lastTs = NaN;
    updateControls(rec, P);
    setActive(rec, -1, clamp(Math.floor(P * N / rec.beats), 0, N - 1)); // caption = the poster beat's spec line
    updateCaption(rec);
    panTo(rec, 0); mapRec(rec); rec.places.forEach(function (p) { placeOne(rec, p); });
    $$('.blip-rm', rec.svg).forEach(function (g) { g.parentNode.removeChild(g); });
    if (o && !o.el && fin(o.x) && fin(o.y)) { // static Blip, 44u tall, feet at (x, y)
      var g = el('g', { 'class': 'blip-rm', transform: 'translate(' + (o.x - 22) + ' ' + (o.y - 44 * FEET) + ') scale(' + (44 / 64) + ')' }, rec.svg);
      var form = FORMS.indexOf(o.form) >= 0 ? o.form : 'default';
      el('use', { href: '#blip-' + form, width: 64, height: 64 }, g);
      if (form !== 'flat') el('use', { href: '#blip-face', width: 64, height: 64 }, g);
    }
    if (rec.rmNodes) rec.rmNodes.forEach(function (n) { if (n.style) n.style.display = ''; });
    else if (withRmHook !== false && typeof rec.scene.rm === 'function') {
      var hosts = [rec.svg, rec.wrap, rec.panel, rec.figure], before = [];
      hosts.forEach(function (p) { before = before.concat(Array.prototype.slice.call(p.childNodes)); });
      try { rec.scene.rm(rec.state); } catch (e) { console.warn('[blip] rm() failed in #' + rec.id, e); }
      rec.rmNodes = [];
      hosts.forEach(function (p) {
        Array.prototype.forEach.call(p.childNodes, function (n) { if (before.indexOf(n) < 0 && !(n.classList && n.classList.contains('blip-rm'))) rec.rmNodes.push(n); });
      });
    }
  }

  function setMotion(on) {
    root.classList.toggle('rm', !on);
    save('motion', on === !mq('(prefers-reduced-motion: reduce)').matches ? null : on ? 'on' : 'off'); // only a choice that differs from the OS
    if (motionBtn) motionBtn.textContent = 'Motion: ' + (on ? 'on' : 'off');
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    B.host = null; btn.classList.add('gone'); btn.classList.remove('shiver'); B.shiver = false;
    recs.forEach(function (rec) {
      if (rec.wrap) rec.wrap.style.transform = '';
      rec.shake = null; rec.shakeX = 0; rec.force = true; rec.lastTs = NaN;
      if (on && rec.mounted) {
        $$('.blip-rm', rec.svg).forEach(function (g) { g.parentNode.removeChild(g); });
        (rec.rmNodes || []).forEach(function (n) { if (n.style) n.style.display = 'none'; });
        rec.active = -2; rec.capIdx = 0;
      }
    });
    measure(); // .rm changes layout (static figures, auto li heights), and re-renders posters when entering
    if (on) { entered = true; kick(); }
    announce(on ? 'Motion on' : 'Reduced motion on');
  }

  /* ---------- prefs (top nav), copy button, console line ---------- */
  var themeBtn = $('button.theme'), motionBtn = $('button.motion'), copyBtn = $('button.copy');
  if (themeBtn) {
    var themes = ['system', 'light', 'dark'];
    var cur = root.getAttribute('data-theme') || 'system';
    var showTheme = function () { themeBtn.textContent = 'Theme: ' + cur; };
    showTheme();
    themeBtn.addEventListener('click', function () {
      cur = themes[(themes.indexOf(cur) + 1) % 3];
      if (cur === 'system') root.removeAttribute('data-theme'); else root.setAttribute('data-theme', cur);
      save('theme', cur === 'system' ? null : cur);
      showTheme(); announce('Theme: ' + cur);
    });
  }
  if (motionBtn) {
    motionBtn.textContent = 'Motion: ' + (isRM() ? 'off' : 'on');
    motionBtn.addEventListener('click', function () { setMotion(isRM()); });
  }
  if (copyBtn && navigator.clipboard && navigator.clipboard.writeText) {
    copyBtn.hidden = false;
    var copyTimer = 0;
    copyBtn.addEventListener('click', function () {
      navigator.clipboard.writeText(EMAIL).then(function () {
        copyBtn.textContent = 'Copied'; announce('Email copied');
        clearTimeout(copyTimer); copyTimer = setTimeout(function () { copyBtn.textContent = 'Copy'; }, 2000);
      }, function () { /* clipboard refused; the mailto link still works */ });
    });
  }
  console.log('Blip says hi. Source is readable on purpose: github.com/ALIUD1/ALIUD1.github.io');

  /* ---------- input ---------- */
  btn.addEventListener('click', function () { // poke
    var h = B.host, rec = h && h.rec, res = null;
    if (!h || isRM()) return;
    if (rec && rec.scene.poke) { try { res = rec.scene.poke(rec.state); } catch (e) { console.warn('[blip] poke failed', e); } }
    if (res && res.caption) rec.api.caption(res.caption);
    if (res && res.impulse && rec && rec.map) {
      B.v.x += (res.impulse.x || 0) * rec.map.s * 6; B.v.y += (res.impulse.y || 0) * rec.map.s * 6 - 120;
    } else B.v.y -= 360;
    setExpr((res && res.expr) || 'happy', 600);
    if (rec) rec.force = true;
    kick();
  });
  win.addEventListener('scroll', function () {
    lastScroll = now();
    if (isRM()) updateRail(win.scrollY + readLine); else kick();
  }, { passive: true });
  win.addEventListener('pointermove', function (e) {
    if (e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
    pointer = { x: e.clientX, y: e.clientY }; lastPointer = now(); kick();
  }, { passive: true });
  rows.forEach(function (row) {
    row.addEventListener('pointerenter', function () {
      hoverRow = row;
      if (row.getAttribute('data-blip') === 'legs') { legsUntil = now() + 1200; setTimeout(kick, 1250); }
      kick();
    });
    row.addEventListener('pointerleave', function () { if (hoverRow === row) hoverRow = null; kick(); });
    row.addEventListener('focusin', function () { focusRow = row; kick(); });
    row.addEventListener('focusout', function () { if (focusRow === row) focusRow = null; kick(); });
  });
  var resizeTimer = 0;
  function onResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      if (win.innerWidth !== W || Math.abs(win.innerHeight - H) > 120) { measure(); recs.forEach(function (r) { r.force = true; }); kick(); }
    }, 80);
  }
  win.addEventListener('resize', onResize);
  if (win.ResizeObserver) { // content height changes (late fonts, images) shift every cached top
    var lastBodyH = 0;
    new ResizeObserver(function () {
      var h = doc.body.offsetHeight;
      if (Math.abs(h - lastBodyH) > 1) { lastBodyH = h; clearTimeout(resizeTimer); resizeTimer = setTimeout(function () { measure(); kick(); }, 80); }
    }).observe(doc.body);
  }
  doc.addEventListener('visibilitychange', function () { if (!doc.hidden) kick(); });

  /* ---------- boot ---------- */
  measure();
  // style.css enables smooth scrolling on html.loaded, so a fragment URL lands instantly first
  if (doc.readyState === 'complete') root.classList.add('loaded');
  else win.addEventListener('load', function () { setTimeout(function () { root.classList.add('loaded'); }, 0); });
  if ('IntersectionObserver' in win) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        io.unobserve(en.target);
        recs.forEach(function (rec) { if (rec.figure === en.target) mount(rec); });
      });
    }, { rootMargin: '100% 0px' });
    recs.forEach(function (rec) { io.observe(rec.figure); });
    // Keyboard users: the first Tab mounts every scene before focus moves, so each figure's controls
    // exist in tab order (lazy mounting alone let focus skip a figure that had not mounted yet).
    // An off-screen mount only builds the DOM; it renders when it becomes visible.
    doc.addEventListener('keydown', function onTab(e) {
      if (e.key !== 'Tab') return;
      doc.removeEventListener('keydown', onTab, true);
      recs.forEach(mount);
    }, true);
  } else recs.forEach(mount);

  // hero entry: wait for fonts (2 s cap), drop onto the i, look at "Alex", then at the cursor
  var fontsReady = doc.fonts && doc.fonts.ready ? doc.fonts.ready : Promise.resolve();
  var cueDone = false;
  Promise.race([fontsReady, new Promise(function (r) { setTimeout(r, 2000); })]).then(function () {
    measure();
    if (entered) return;
    entered = true; lastScroll = Math.max(lastScroll, now());
    if (isRM()) return;
    if (heroBox && heroBox.y + heroBox.h - win.scrollY > 0.15 * H) {
      B.enterFrom = { x: heroBox.x + heroBox.w / 2, y: -80 };
      // ~600 ms of drop, then ~600 ms looking at "Alex"; after that the cursor wins
      lookAt(function (sy) { return h1Box ? { x: h1Box.x + h1Box.w * 0.18, y: h1Box.y + h1Box.h * 0.5 - sy } : null; }, 1200);
    }
    setTimeout(cueCheck, 5000);
    kick();
  });
  function cueCheck() { // after 5 s without scrolling: look at the cue and hop once
    if (cueDone || isRM()) return;
    var idle = now() - lastScroll;
    if (idle < 5000) { setTimeout(cueCheck, 5020 - idle); return; }
    cueDone = true;
    if (!B.host || B.host.kind !== 'hero' || !cueBox || !cueBox.w) return;
    lookAt(function (sy) { return { x: cueBox.x + cueBox.w / 2, y: cueBox.y + cueBox.h / 2 - sy }; }, 1400);
    B.v.y -= 360; kick();
  }

  if (/[?&]check\b/.test(location.search)) setTimeout(runCheck, 0);
  win.__blip = { B: B, recs: recs, measure: measure, kick: kick, check: function () { return runCheck(); } };

  /* ---------- ?check: one runnable self-test (SPEC §11) ---------- */
  function runCheck() {
    var fails = 0;
    function fail(msg) { fails++; console.error('check: ' + msg); }
    function group(name, fn) { try { fn(); } catch (e) { fail(name + ' threw: ' + (e && e.message)); } }
    recs.forEach(mount); // scan scene-built text too

    group('structure', function () {
      var seen = {};
      recs.forEach(function (rec) {
        var a = rec.article, id = a.id, ds = a.getAttribute('data-scene');
        if (!id || seen[id]) fail('project id missing or duplicated: "' + id + '"'); seen[id] = 1;
        if (!$('h2', a)) fail('#' + id + ' has no h2');
        if (!$('.summary', a)) fail('#' + id + ' has no .summary');
        if (rec.lis.length < 2) fail('#' + id + ' has fewer than 2 steps');
        if (ds != null && !isScene(SCENES[ds])) fail('#' + id + ' data-scene="' + ds + '" does not resolve');
        else if (ds && ds !== 'generic' && SCENES[ds].beats && SCENES[ds].beats !== rec.lis.length) fail('#' + id + ' has ' + rec.lis.length + ' steps; scene "' + ds + '" expects ' + SCENES[ds].beats);
      });
      if (recs.length) { // the hand-written hero index mirrors the articles: same order, same names
        var ix = $$('nav.index a[href^="#"]');
        if (ix.length !== recs.length) fail('hero index has ' + ix.length + ' rows for ' + recs.length + ' projects');
        ix.forEach(function (a, i) {
          var rec = recs[i]; if (!rec) return;
          if (a.getAttribute('href') !== '#' + rec.id) fail('index row ' + (i + 1) + ' links ' + a.getAttribute('href') + '; article ' + (i + 1) + ' is #' + rec.id);
          var t = $('.t', a), h2 = $('h2', rec.article);
          if (t && h2 && t.textContent.trim() !== h2.textContent.trim()) fail('index row ' + (i + 1) + ' says "' + t.textContent.trim() + '"; the article says "' + h2.textContent.trim() + '"');
          var acc = a.parentNode.getAttribute('data-accent') || 'signal', aacc = rec.article.getAttribute('data-accent') || 'signal';
          if (acc !== aacc) fail('index row ' + (i + 1) + ' accent is ' + acc + '; the article is ' + aacc);
        });
      }
      if (!$('.topnav button.theme') || !$('.topnav button.motion')) fail('theme/motion buttons are not in the top nav');
      $$('.photos li:not([hidden]) img[alt=""]').forEach(function (img) { fail('published photo without alt text: ' + img.getAttribute('src')); });
    });

    group('forbidden phrases', function () {
      // The SPEC §11 lists, shipped only as hashes so this file never publishes the phrases it guards
      // against. Each token = phrase length (1 base-36 digit) + a 32-bit polynomial hash (base 0x01000193,
      // mod 2^32) of the lowercased phrase, in base 36. A failure names the phrase by its 1-based position
      // in that scope's SPEC §11 list. The patterns carry no private data, so they stay readable.
      var F = {
        '': '45pt3se 6b3zvhu 45fti3h 515glau4 51ga8ye0 616xmtv0 cn6r69h 8w72pjy 94996yb 91rlrblh 9vut1va 910x2is3 8198irat d1d3we15 h16k0k02 apmx8fi a1ylsmt9 89u0x97 7cwmexw 5qewgbq',
        'inference-server': '5bkv0bu 9v96s9o 61wr1cdc e35gqi3 e1juropk ag2dq11 31fvvzlw 8yynjfl ar01adw a18tg7vi',
        'socr-braingen': '41oekk7 41gnd7dg ejlleni 4l21c3f 4l21c3f 3qxyuvq c1rl6gp0',
        'claws': 'a1rqoqof h1p1hlwz a1s5q4jo 610yubk a1dpxomg blfs2yn 91xmumme',
        'noverwatch': '71sm5rmg b1r2q70b 719l3tj7 a19rfpqz anr8emq'
      };
      Object.keys(F).forEach(function (k) { F[k] = F[k].split(' '); });
      F[''] = F[''].concat([/\b172\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/, /\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}/,
        /manuscript[^.]{0,60}\b(published|submitted|accepted)\b/i, /\b(published|submitted|accepted)\b[^.]{0,60}manuscript/i]);
      F['socr-braingen'].push(/FID\s*[=:]?\s*\d/);

      // What gets scanned: text (hidden elements included), HTML comments, and the attributes that hold
      // words (not style or SVG geometry). Page-wide also scans link targets and the head (title, metas);
      // a project scope skips hrefs, since its own repo links are fine.
      var WORDS = /^(data-[\w-]+|aria-[\w-]+|title|alt|label|placeholder|content)$/, LINKS = /^(href|src|srcset|action)$/;
      function harvest(n, links, parts) {
        parts.push(n === root ? doc.body.textContent + '\n' + doc.title : n.textContent);
        var w = doc.createTreeWalker(n, 128 /* NodeFilter.SHOW_COMMENT */), c;
        while ((c = w.nextNode())) parts.push(c.nodeValue);
        [n].concat($$('*', n)).forEach(function (e) {
          for (var i = 0; i < e.attributes.length; i++) {
            var a = e.attributes[i];
            if (WORDS.test(a.name) || (links && LINKS.test(a.name))) parts.push(a.value);
          }
        });
        return parts;
      }
      var text = { '': harvest(root, true, []) };
      Object.keys(F).forEach(function (s) { var n = s && doc.getElementById(s); if (n) text[s] = harvest(n, false, []); });

      // Scene text that exists only at some T: render every mounted scene at T = 0, .5, …, beats and
      // harvest its figure each time; then put every scene back where the reader is.
      var freeze = B.freezeUntil;
      recs.forEach(function (rec) {
        if (!rec.mounted) return;
        for (var T = 0; T <= rec.beats + 1e-9; T += 0.5) {
          safeRender(rec, T, now());
          harvest(rec.figure, false, text['']);
          if (text[rec.id]) harvest(rec.figure, false, text[rec.id]);
        }
      });
      recs.forEach(function (rec) {
        if (!rec.mounted) return;
        rec.shake = null; rec.shakeX = 0; rec.wrap.style.transform = '';
        if (isRM()) { renderPoster(rec, false); return; }
        safeRender(rec, tsOf(rec, clock(rec, win.scrollY + readLine).T), now());
        rec.force = true; rec.lastTs = NaN;
      });
      B.freezeUntil = freeze; kick();

      Object.keys(text).forEach(function (scope) {
        var s = text[scope].join('\n'), low = s.toLowerCase(), byLen = {};
        F[scope].forEach(function (p, k) {
          if (p instanceof RegExp) { if (p.test(s)) fail('forbidden pattern ' + p + ' in ' + (scope ? '#' + scope : 'page')); return; }
          var L = parseInt(p.charAt(0), 36), h = parseInt(p.slice(1), 36), m = byLen[L] = byLen[L] || {};
          (m[h] = m[h] || []).push(k);
        });
        Object.keys(byLen).forEach(function (Ls) { // rolling hash over every window of each listed length
          var L = +Ls, want = byLen[Ls], P = 1, h = 0, i, n = low.length, hit;
          if (n < L) return;
          for (i = 1; i < L; i++) P = Math.imul(P, 0x01000193);
          for (i = 0; i < L; i++) h = (Math.imul(h, 0x01000193) + low.charCodeAt(i)) | 0;
          for (i = L; ; i++) {
            if ((hit = want[h >>> 0])) {
              hit.forEach(function (k) { fail('forbidden phrase #' + (k + 1) + ' of the SPEC §11 ' + (scope ? '#' + scope : 'global') + ' list'); });
              delete want[h >>> 0];
            }
            if (i >= n) break;
            h = (Math.imul((h - Math.imul(low.charCodeAt(i - L), P)) | 0, 0x01000193) + low.charCodeAt(i)) | 0;
          }
        });
      });
    });

    group('privacy', function () {
      (root.outerHTML.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g) || []).forEach(function (m) {
        if (m !== EMAIL) fail('unexpected email-shaped string: ' + m);
      });
      if ($$('a[href^="tel:" i]').length) fail('tel: link present');
      $$('a[href]').forEach(function (a) {
        if (/stilettocode|huggingface\.co\/spaces/i.test(a.getAttribute('href')) && !a.closest('[hidden]')) fail('visible private link: ' + a.getAttribute('href'));
      });
    });

    group('pending', function () {
      var p = $$('[data-confirm][hidden]').map(function (n) { return '· ' + n.getAttribute('data-confirm'); });
      console.info('check: ' + p.length + ' item(s) hidden until Alex confirms:\n' + p.join('\n'));
    });

    function sub(name, fn) { if (!recs.length) return; try { fn(); } catch (e) { fail(name + ': ' + (e && e.message)); } } // scene subs only where there are scenes
    var BRAIN = win.BRAIN;
    sub('batchSim full', function () {
      var s = SCENES.queue.batchSim();
      for (var i = 0; i < 8; i++) { s.click(i * 50); s.tick(i * 50 + 1); }
      if (!s.closed || s.closed.reason !== 'full' || s.closed.count !== 8) fail('batchSim: 8 clicks should close as full (8), got ' + JSON.stringify(s.closed));
    });
    sub('batchSim deadline', function () {
      var s = SCENES.queue.batchSim();
      s.click(0); s.click(100); s.click(200); s.tick(1100);
      if (s.closed) fail('batchSim closed before the 1,200 ms deadline');
      s.tick(1200); s.tick(1210);
      if (!s.closed || s.closed.reason !== 'deadline' || s.closed.count !== 3) fail('batchSim: 3 clicks + 1,200 ms should close as deadline (3), got ' + JSON.stringify(s.closed));
    });
    sub('synthMask bins', function () {
      var lobes = BRAIN.lobes(), bins = { S: [0.05, 0.12], M: [0.15, 0.35], L: [0.40, 0.60] };
      [1, 2, 3, 4].forEach(function (lobe) {
        var A0 = 0; for (var j = 0; j < lobes.length; j++) if (lobes[j] === lobe) A0++;
        Object.keys(bins).forEach(function (size) {
          for (var seed = 1; seed <= 10; seed++) {
            var r = BRAIN.synthMask(lobe, size, BRAIN.rng(seed)), m = r.mask || r, A = r.A || A0, area = 0, out = 0;
            for (var i = 0; i < m.length; i++) if (m[i]) { area++; if (lobes[i] !== lobe) out++; }
            var f = area / A, b = bins[size], tol = 1 / A;
            if (f < b[0] - tol || f > b[1] + tol || out) { fail('synthMask lobe ' + lobe + ' ' + size + ' seed ' + seed + ': area ' + f.toFixed(3) + ', ' + out + ' px outside the lobe'); return; }
          }
        });
      });
    });
    sub('alphaBar', function () {
      for (var t = 1; t < 1000; t++) if (!(BRAIN.alphaBar(t) < BRAIN.alphaBar(t - 1))) { fail('alphaBar not strictly decreasing at t=' + t); break; }
      if (!(BRAIN.alphaBar(995) < 1e-3)) fail('alphaBar(995) >= 1e-3');
      if (!(BRAIN.alphaBar(0) > 0.999)) fail('alphaBar(0) <= 0.999');
    });
    sub('same seed', function () {
      function same(a, b) { if (!a || !b || a.length !== b.length) return false; for (var i = 0; i < a.length; i++) if (a[i] !== b[i]) return false; return true; }
      if (!same(BRAIN.noise(48213), BRAIN.noise(48213))) fail('noise(seed) is not reproducible');
      var m1 = BRAIN.synthMask(1, 'M', BRAIN.rng(7)), m2 = BRAIN.synthMask(1, 'M', BRAIN.rng(7));
      if (!same(BRAIN.flair(BRAIN.slice(), m1.mask || m1), BRAIN.flair(BRAIN.slice(), m2.mask || m2))) fail('flair(seed) is not reproducible');
    });
    sub('generic layout', function () {
      for (var N = 2; N <= 9; N++) {
        var L = SCENES.generic.layout(N);
        if (!L || L.length !== N) { fail('generic.layout(' + N + ') returned ' + (L && L.length) + ' nodes'); continue; }
        L.forEach(function (a, i) {
          if (!(a.x >= 0 && a.y >= 0 && a.x + a.w <= VB_W && a.y + a.h <= VB_H)) fail('generic.layout(' + N + ') node ' + i + ' leaves the stage');
          L.forEach(function (b, j) { if (j > i && a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h) fail('generic.layout(' + N + ') nodes ' + i + ' and ' + j + ' overlap'); });
        });
      }
    });
    Object.keys(SCENES).forEach(function (name) {
      var sc = SCENES[name];
      if (!isScene(sc)) return;
      sub('render bounds (' + name + ')', function () {
        var article = $('article.project[data-scene="' + name + '"]') || (recs.filter(function (r) { return r.scene === sc; })[0] || recs[0] || {}).article;
        var box = el('div', { style: 'position:fixed;left:-10000px;top:0;width:800px;height:640px;visibility:hidden', 'aria-hidden': 'true' }, doc.body);
        var rec = { i: 0, id: 'check-' + name, article: article, figure: el('div', { 'class': 'figure' }, box), lis: $$('ol.steps > li', article), places: [], ctrls: [], svgOff: { x: 0, y: 0 } };
        var freeze = B.freezeUntil; // a scene's hitstop here must not freeze the real Blip
        try {
          buildFigure(rec, sc);
          var st = sc.setup(rec.api, rec.svg, article) || {}, beats = st.beats || sc.beats || clamp(rec.lis.length, 2, 9);
          for (var T = 0; T <= beats + 1e-9; T += 0.5) {
            var o = sc.render(st, T, now()) || {}, sp = o.span;
            if (sp && !(fin(sp[0]) && fin(sp[1]) && sp[0] >= 0 && sp[1] <= VB_W && sp[0] <= sp[1])) fail(name + '.render(T=' + T + ') span ' + sp + ' is not [x0, x1] inside 0..800');
            if (o.el && o.x == null) continue;
            if (!(fin(o.x) && fin(o.y) && o.x >= -100 && o.x <= 900 && o.y >= -200 && o.y <= 700)) { fail(name + '.render(T=' + T + ') Blip at ' + o.x + ',' + o.y); break; }
          }
          st.live = false;
        } finally { doc.body.removeChild(box); B.freezeUntil = freeze; }
      });
    });

    console.log('check: ' + fails + ' failures');
    return fails;
  }
})();
