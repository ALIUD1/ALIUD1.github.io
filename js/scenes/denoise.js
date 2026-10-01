/* fig. 02 · SOCR BrainGen: "Blip becomes noise." SPEC §5.2.
   7 beats: pick → seed → anatomy → tumor → noise → denoise ×200 (--beat:3) → decode.
   The plate is a 128×128 canvas placed over the SVG; it is redrawn (putImageData) only when the
   displayed frame changes. Lobe tints live in a small overlay SVG on top of the canvas so all
   color stays in CSS classes. Every visual is a pure function of (settings, T). */
(function () {
  'use strict';
  var S = window.SCENES = window.SCENES || {};
  var BR = window.BRAIN;

  var G = 128, NPIX = G * G;
  var PLATE = { x: 256, y: 76, w: 288, h: 288 };          // canvas rect in viewBox units
  var PX = PLATE.w / G;                                     // viewBox units per slice pixel
  var LOBE_NAMES = ['', 'Frontal', 'Parietal', 'Temporal', 'Occipital'];
  var SIZE_WORDS = { S: 'small', M: 'moderate', L: 'large' };
  var STEPS = 200;

  /* ---- tiny write-if-changed helpers, so scrubbing is cheap and exactly reversible ---- */
  function setOp(n, v) {
    var s = v >= 0.999 ? '' : String(Math.round(Math.max(0, v) * 1000) / 1000);
    if (n._op !== s) { n._op = s; n.style.opacity = s; }
  }
  function setTf(n, s) { if (n._tf !== s) { n._tf = s; n.setAttribute('transform', s); } }
  function setTx(n, s) { if (n._tx !== s) { n._tx = s; n.textContent = s; } }
  function setAt(n, a, v) { v = String(v); if (n['_' + a] !== v) { n['_' + a] = v; n.setAttribute(a, v); } }

  /* One <path> per lobe, built from horizontal pixel runs, in 128-unit space. */
  function lobePath(L, lobe) {
    var d = '';
    for (var y = 0; y < G; y++) {
      for (var x = 0; x < G; x++) {
        if (L[y * G + x] !== lobe) continue;
        var x1 = x; while (x1 + 1 < G && L[y * G + x1 + 1] === lobe) x1++;
        d += 'M' + x + ' ' + y + 'h' + (x1 - x + 1) + 'v1h' + (x - x1 - 1) + 'z';
        x = x1;
      }
    }
    return d;
  }

  /* ---- static and default-settings data, memoized; filled during idle time after load (end of
     file) so the mount, an IntersectionObserver callback mid-scroll, stays a short task ---- */
  var memo = {};
  function lobePaths() {
    if (!memo.paths) { var L = BR.lobes(); memo.paths = [1, 2, 3, 4].map(function (lb) { return lobePath(L, lb); }); }
    return memo.paths;
  }
  /* the ghost slice at .3 as grey RGBA (the b2 plate), copied into the canvas buffer in one set() */
  function ghostRGBA() {
    if (!memo.ghost) {
      var s = BR.slice(), d = new Uint8ClampedArray(NPIX * 4);
      for (var i = 0, j = 0; i < NPIX; i++, j += 4) { d[j] = d[j + 1] = d[j + 2] = Math.round(s[i] * 0.3 * 255); d[j + 3] = 255; }
      memo.ghost = d;
    }
    return memo.ghost;
  }
  function maskFor(lobe, size, seed) { return BR.synthMask(lobe, size, BR.rng((seed ^ 0x5bd1e995) >>> 0)); } // "NumPy" stream
  var DEF = { lobe: 1, size: 'M', seed: 48213 };
  function defMask() { return memo.m || (memo.m = maskFor(DEF.lobe, DEF.size, DEF.seed)); }
  function defX0() {
    if (!memo.x0) { var m = defMask(); memo.x0 = BR.flair(BR.slice(), m.mask); memo.mv = BR.maskView(m.mask); }
    return memo.x0;
  }
  function defEps() { return memo.eps || (memo.eps = BR.noise(DEF.seed)); }             // "PyTorch" stream

  /* Diagonal hatching clipped to a box (the "held-out" bank card). */
  function hatch(x0, y0, x1, y1, gap) {
    var d = '';
    for (var c = x0 + y0 + gap; c < x1 + y1; c += gap) {
      var ax = Math.max(x0, c - y1), ay = c - ax, bx = Math.min(x1, c - y0), by = c - bx;
      d += 'M' + ax + ' ' + ay + 'L' + bx + ' ' + by;
    }
    return d;
  }

  /* Regenerate everything that depends on the settings. eps only changes with the seed. */
  function regen(st, reseed) {
    var m, isDef = st.lobe === DEF.lobe && st.size === DEF.size && st.seed === DEF.seed;
    if (isDef) { m = defMask(); st.x0 = defX0(); st.mv = memo.mv; }   // the arrays are never mutated
    else { m = maskFor(st.lobe, st.size, st.seed); st.x0 = BR.flair(st.slice, m.mask); st.mv = BR.maskView(m.mask); }
    st.m = m;
    if (reseed || !st.eps) st.eps = st.seed === DEF.seed ? defEps() : BR.noise(st.seed);
    var sx = m.seed % G, sy = (m.seed - sx) / G;
    st.lesionVB = { x: PLATE.x + (sx + 0.5) * PX, y: PLATE.y + (sy + 0.5) * PX };
    st.gen++;
    var seedStr = 'seed ' + st.seed;
    setTx(st.n.seed, seedStr);
    setTx(st.n.tagText, seedStr);
  }

  /* Fill the plate's pixel buffer for a frame key and blit it, but only when the key changes. */
  function paint(st, key) {
    var full = st.gen + '|' + key;
    if (st.drawn === full) return;
    st.drawn = full;
    var d = st.img.data, i, j, g;
    if (key.charAt(0) === 'n') {                                  // noise:t → the DDIM path at t
      BR.frame(st.x0, st.eps, +key.slice(6), d);
    } else if (key === 'mask') {                                  // tumor mask view: 0 / .5 / 1
      for (i = 0, j = 0; i < NPIX; i++, j += 4) { g = Math.round(st.mv[i] * 255); d[j] = d[j + 1] = d[j + 2] = g; d[j + 3] = 255; }
    } else {                                                      // ghost slice, optionally + n lesion px
      d.set(ghostRGBA());
      var n = key.charAt(0) === 'l' ? +key.slice(7) : 0, ord = st.m.order;
      for (i = 0; i < n; i++) { j = ord[i] * 4; g = Math.round(st.mv[ord[i]] * 255); d[j] = d[j + 1] = d[j + 2] = g; }
    }
    st.ctx.putImageData(st.img, 0, 0);
  }

  /* Reduced-motion strip: thumbnails at t = 995, 500 and 0 (SPEC §5.2). */
  var STRIP_T = [995, 500, 0];
  function paintStrip(st) {
    var sp = st.strip;
    if (!sp || sp.drawn === st.gen) return;
    sp.drawn = st.gen;
    var tmp = new Uint8ClampedArray(NPIX * 4), d = sp.img.data;
    STRIP_T.forEach(function (t, k) {
      BR.frame(st.x0, st.eps, t, tmp);
      for (var y = 0; y < G; y++) d.set(tmp.subarray(y * G * 4, (y + 1) * G * 4), (y * G * 3 + k * G) * 4);
    });
    sp.ctx.putImageData(sp.img, 0, 0);
  }

  /* Controls are rendered by core after setup; find them lazily. */
  function buttons(st) {
    if (st.btns && st.btns.length) return st.btns;
    st.btns = Array.prototype.slice.call(st.api.figure.querySelectorAll('.controls button[data-action]'));
    st.btns.forEach(function (b) {
      var a = b.getAttribute('data-action');
      if (a.indexOf('size:') === 0) b.setAttribute('aria-label', 'Size ' + a.slice(5));
      if (a === 'seed') b.setAttribute('aria-label', 'New seed');
    });
    return st.btns;
  }
  function btnFor(st, action) {
    var bs = buttons(st);
    for (var i = 0; i < bs.length; i++) if (bs[i].getAttribute('data-action') === action) return bs[i];
    return null;
  }
  /* Radio-style groups built from aria-pressed toggles: exactly one pressed per group. */
  function pressGroup(st, prefix, active) {
    buttons(st).forEach(function (b) {
      var a = b.getAttribute('data-action');
      if (a.indexOf(prefix) === 0) {
        var v = String(a === active);
        if (b.getAttribute('aria-pressed') !== v) b.setAttribute('aria-pressed', v);
      }
    });
  }

  /* Blip's b2–b4 spot, below the plate's lower-left corner. At SPEC's (230,385) the b4 hop's first
     stretch (eyes form) crossed the end of the "held-out real slice" label; from here it is past the
     label's right edge before it rises to the label's height. The bar and counter (x ≥ 256, from 4.5)
     appear only once Blip has left. */
  var REST = { x: 232, y: 424 };
  var PHONE = window.matchMedia ? window.matchMedia('(max-width: 959px)') : null;

  S.denoise = {
    beats: 7, poster: 7, pan: 'center',
    tag: 'fig. 0N · illustration: procedural slice, not model output, no patient data',

    setup: function (api, svg) {
      var el = api.el, n = {};
      var st = {
        api: api, live: false, lobe: 1, size: 'M', seed: 48213, view: 'flair', gen: 0, drawn: '', n: n,
        slice: BR.slice(),
        controls: [
          { label: 'Frontal', action: 'lobe:1', pressed: true },
          { label: 'Parietal', action: 'lobe:2', pressed: false },
          { label: 'Temporal', action: 'lobe:3', pressed: false },
          { label: 'Occipital', action: 'lobe:4', pressed: false },
          { label: 'S', action: 'size:S', pressed: false },
          { label: 'M', action: 'size:M', pressed: true },
          { label: 'L', action: 'size:L', pressed: false },
          { label: '↻ New seed', action: 'seed' },
          { label: 'FLAIR', action: 'view:flair', pressed: true, from: 6 },
          { label: 'Tumor Mask', action: 'view:mask', pressed: false, from: 6 }
        ]
      };
      var tagEl = api.figure.querySelector('.fig-tag');
      var tagText = tagEl ? tagEl.textContent : this.tag;
      /* b0: Blip stands on the active Lobe button; style.css reserves headroom above this row
         (desktop) so Blip never covers the caption line */
      var ctl = api.figure.querySelector('.controls');
      if (ctl) ctl.classList.add('hosts-blip');

      /* bank card: T1 from the held-out conditioning bank (hatched: deliberately not shown) */
      n.bank = el('g', {}, svg);
      n.bankEdge = api.path('M48 120H202Q210 120 210 128V282Q210 290 202 290H48Q40 290 40 282V128Q40 120 48 120Z', 'ln2', n.bank);
      n.bankFill = el('g', {}, n.bank);
      api.path(hatch(44, 124, 206, 286, 12), 'ln3 thin', n.bankFill);
      el('rect', { x: 101, y: 190, width: 48, height: 32, rx: 6, 'class': 'f-paper2' }, n.bankFill);
      api.text(125, 213, 'T1', 't-big t-mid-a', n.bankFill);
      api.text(125, 310, 'held-out real slice · not shown', 't-small t-mid-a c-ink2', n.bankFill);
      api.tip(n.bank, 'T1: anatomy from a held-out real slice, not shown here');

      /* the viewer plate (dark in both themes) and its decode flash */
      n.plate = el('rect', { x: 250, y: 70, width: 300, height: 300, rx: 8, 'class': 'f-viewer' }, svg);
      api.tip(n.plate, tagText);
      n.flash = el('rect', { x: 250, y: 70, width: 300, height: 300, rx: 8, 'class': 'lok thick' }, svg);

      /* seed label + the two traces it drives. The label is centered on SPEC's 250–334 run so it
         grows evenly with the larger phone type and the traces start clear of it at either size. */
      n.seedG = el('g', {}, svg);
      n.seed = api.text(292, 58, 'seed 48213', 't-label t-mid-a', n.seedG);
      api.tip(n.seedG, 'one integer seeds the mask (NumPy) and the starting noise (PyTorch)');
      n.tr1 = api.path('M234 52C184 52 125 72 125 114', 'ls', svg);
      n.tr2 = api.path('M350 52C384 52 404 52 404 68', 'ls', svg);
      n.tr1L = api.text(36, 82, 'NumPy → mask', 't-label c-signal', svg);
      n.tr2L = api.text(410, 38, 'PyTorch → noise', 't-label c-signal', svg);

      /* progress bar + counter. The counter sits under the bar, right-aligned to the plate edge:
         at (550,58) the PyTorch trace ran through it, and on phones it ran into the seed label. */
      n.barG = el('g', {}, svg);
      el('rect', { x: 256, y: 382, width: 288, height: 8, rx: 4, 'class': 'f-rule' }, n.barG);
      n.bar = el('rect', { x: 256, y: 382, width: 0, height: 8, rx: 4, 'class': 'f-ok' }, n.barG);
      n.counter = api.text(550, 408, '', 't-label t-end', svg);
      n.decode = api.text(400, 434, '[-1,1] → [0,1]', 't-label t-mid-a', svg);

      /* 9 channel cards: x, T1, mask, 6 lobe maps (back to front) */
      var cardTips = [
        'x: the noisy FLAIR channel being denoised',
        'T1: anatomy from a held-out real slice, not shown here',
        'mask: drawn from the atlas before denoising'
      ];
      var cardLbl = ['x', 'T1', 'm', '', '', '', '', '', 'lobes'];
      n.cards = [];
      for (var k = 0; k < 9; k++) {
        var cg = el('g', {}, svg);
        el('rect', { x: 590 + 18 * k, y: 110 + 4 * k, width: 44, height: 56, rx: 4, 'class': 'ln ' + (k > 2 ? 'f-paper2' : 'f-paper') }, cg);
        if (cardLbl[k]) api.text(594 + 18 * k, 126 + 4 * k, cardLbl[k], 't-small', cg);
        api.tip(cg, cardTips[k] || '6 lobe probability maps from the ICBM452 atlas');
        n.cards.push(cg);
      }
      n.dims = api.text(590, 224, '', 't-label', svg);
      n.dims2 = api.text(590, 242, '', 't-label c-ink2', svg);

      /* U-Net glyph: encoder down, decoder up, two skip connections */
      n.unet = el('g', {}, svg);
      var depth = [0, 1, 2, 1, 0];
      depth.forEach(function (dd, i) {
        el('rect', { x: 608 + 30 * i, y: 304 + 22 * dd, width: 22, height: 80 - 30 * dd, rx: 3, 'class': 'ln f-paper' }, n.unet);
      });
      api.path('M630 316H728', 'ln3 thin', n.unet);
      api.path('M660 340H698', 'ln3 thin', n.unet);
      api.tip(n.unet, '85,261,185 parameters, loaded strict=True plus a parameter-count check');
      // two lines under the glyph: one line outgrew the stage at phone type size and ran into the strip
      n.unetL = el('g', {}, svg);
      api.text(679, 410, 'U-Net', 't-label t-mid-a', n.unetL);
      api.text(679, 430, '85,261,185 params', 't-label t-mid-a', n.unetL);
      n.w1 = api.path('M680 250V298', 'ls', svg);
      n.w2 = api.path('M606 344C580 344 574 330 552 330', 'ls', svg);

      /* Blip's seed tag (b6): Blip stands on it at (624,60), right of the plate and of the PyTorch
         label (at SPEC's (560,60) Blip covered the end of the labels). Wide enough for phone type. */
      n.tag = el('g', {}, svg);
      el('rect', { x: 562, y: 62, width: 124, height: 24, rx: 5, 'class': 'ln f-paper' }, n.tag);
      n.tagText = api.text(624, 79, 'seed 48213', 't-label t-mid-a', n.tag);

      /* the plate canvas, placed over the plate */
      var wrap = svg.parentNode;
      st.cv = el('canvas', { width: G, height: G, 'aria-hidden': 'true' }, wrap);
      st.cv.style.imageRendering = 'pixelated';
      st.cv.style.borderRadius = '2px';
      api.tip(st.cv, tagText);
      api.place(st.cv, PLATE.x, PLATE.y, PLATE.w, PLATE.h);
      st.ctx = st.cv.getContext('2d');
      st.img = st.ctx.createImageData(G, G);

      /* lobe tints: overlay SVG in slice-pixel space, on top of the canvas */
      st.ov = el('svg', { viewBox: '0 0 128 128', preserveAspectRatio: 'none', 'aria-hidden': 'true', focusable: 'false', 'shape-rendering': 'crispEdges' }, wrap);
      st.ov.style.pointerEvents = 'none';
      api.place(st.ov, PLATE.x, PLATE.y, PLATE.w, PLATE.h);
      n.lobes = lobePaths().map(function (d) { return el('path', { d: d, 'class': 'f-signal' }, st.ov); });

      if (api.panel) { var note = el('p', {}, api.panel); note.textContent = "Showing 4 of the model's 6 lobes."; }
      // b0 hosts Blip on the Lobe button; this hook lets the stylesheet reserve headroom above the
      // row so Blip stands in empty space instead of on the caption line (SPEC §10)
      var row = api.figure.querySelector('.controls');
      if (row) row.classList.add('hosts-blip');

      regen(st, true);
      return st;
    },

    render: function (st, T) {
      var api = st.api, n = st.n, seg = api.seg, ease = api.easeOut;
      var b = Math.min(6, Math.floor(T)), u = T >= 7 ? 1 : T - b;
      var rm = api.rm(), N = st.m.N, k = -1, out;

      // scrolling back below T=6 resets the view to FLAIR
      if (T < 6 && st.view !== 'flair') { st.view = 'flair'; pressGroup(st, 'view:', 'view:flair'); }

      /* b1: seed label + traces */
      var sIn = T < 1 ? 0 : api.easeOutBack(seg(T, 1, 1.3));
      setOp(n.seedG, T < 1 ? 0 : 1);
      setTf(n.seedG, 'translate(292 52) scale(' + sIn.toFixed(3) + ') translate(-292 -52)');
      var r1 = seg(T, 1.3, 1.7), r2 = seg(T, 1.5, 1.9);
      api.reveal(n.tr1, r1); api.reveal(n.tr2, r2);
      setOp(n.tr1L, seg(T, 1.5, 1.7)); setOp(n.tr2L, seg(T, 1.7, 1.9));

      /* b2: bank card */
      api.reveal(n.bankEdge, seg(T, 2.2, 2.6));
      setOp(n.bankFill, seg(T, 2.5, 2.8));

      /* b3/b4: channel cards (8 conditioning, then x joins at the noise cut) */
      for (var c = 1; c < 9; c++) {
        var p = ease(seg(T, 3.5 + 0.04 * (c - 1), 3.7 + 0.04 * (c - 1)));
        setOp(n.cards[c], p);
        setTf(n.cards[c], 'translate(' + ((1 - p) * 40).toFixed(1) + ' 0)');
      }
      var xIn = ease(seg(T, 4.5, 4.65));
      setOp(n.cards[0], xIn);
      setTf(n.cards[0], 'translate(' + ((1 - xIn) * 40).toFixed(1) + ' 0)');
      var nine = T >= 4.5;
      setTx(n.dims, nine ? '1 × 9 × 256 × 256' : '1 × 8 × 256 × 256');
      setTx(n.dims2, nine ? 'x + conditioning' : 'conditioning');
      setOp(n.dims, seg(T, 3.8, 4)); setOp(n.dims2, seg(T, 3.8, 4));

      /* U-Net + wires (appear with the noise) */
      if (b === 5) k = Math.min(STEPS - 1, Math.floor(u * STEPS));
      var uIn = seg(T, 4.5, 4.9);
      setOp(n.unet, uIn * (k >= 0 && k % 2 ? 0.55 : 1));
      setOp(n.unetL, uIn);
      api.reveal(n.w1, seg(T, 4.6, 4.9)); api.reveal(n.w2, seg(T, 4.7, 5));

      /* counter + bar: step index ks (0..199) → t = 995 − 5·ks */
      var ks = T < 4.5 ? -1 : T < 5 ? 0 : T < 6 ? k : STEPS - 1;
      setOp(n.counter, ks < 0 ? 0 : 1); setOp(n.barG, ks < 0 ? 0 : 1);
      setTx(n.counter, ks < 0 ? '' : 't = ' + (995 - 5 * ks) + ' · step ' + (ks + 1) + '/' + STEPS);
      setAt(n.bar, 'width', ks < 0 ? 0 : (PLATE.w * (ks + 1) / STEPS).toFixed(2));

      /* b6: decode flash, label, Blip's seed tag */
      setOp(n.flash, T >= 6 && T < 7 ? 1 - seg(T, 6, 6.2) : 0);
      setOp(n.decode, seg(T, 6, 6.2));
      setAt(n.decode, 'y', rm ? 554 : 434);
      setOp(n.tag, seg(T, 6.1, 6.3));

      /* lobe tints: b2 one after another, b3 the chosen lobe at .2, gone at the noise cut */
      for (var L = 0; L < 4; L++) {
        var w = seg(u, 0.4 + 0.15 * L, 0.55 + 0.15 * L), wn = L < 3 ? seg(u, 0.55 + 0.15 * L, 0.7 + 0.15 * L) : 0;
        var end2 = L < 3 ? 0.15 : 0.35, o;
        if (b < 2) o = 0;
        else if (b === 2) o = 0.35 * w - 0.2 * wn;
        else if (T < 4.5) o = api.lerp(end2, L + 1 === st.lobe ? 0.2 : 0, seg(T, 3, 3.1));
        else o = 0;
        setOp(n.lobes[L], o);
      }

      /* the plate: which frame, and how visible */
      var key;
      if (T < 3) key = 'ghost';
      else if (T < 4) key = 'lesion:' + Math.round(ease(seg(u, 0.1, 0.8)) * N);
      else if (T < 4.5) key = 'lesion:' + N;
      else if (T < 5) key = 'noise:995';
      else if (T < 6) key = 'noise:' + (995 - 5 * k);
      else key = st.view === 'mask' ? 'mask' : 'noise:0';
      paint(st, key);
      setOp(st.cv, b < 2 ? 0 : b === 2 ? seg(u, 0, 0.4) : 1);
      if (rm) paintStrip(st);

      /* Blip */
      if (b === 0) {
        // phones: the button row sits right under the 2-line caption and has no headroom to spare (the
        // 58svh stage would shrink), so Blip waits on top of the plate and looks down at the Lobe button
        if (PHONE && PHONE.matches) out = { x: 400, y: 70, form: 'default', expr: 'open', look: { x: 400, y: 760 } };
        else out = { x: 400, y: 540, form: 'default', expr: 'open', el: btnFor(st, 'lobe:' + st.lobe) || undefined };
      } else if (b === 1) {
        // beside the seed label, not on top of it: at (250,40) a scaled-down stage put Blip over the fig. tag
        out = { x: 200, y: 62, form: 'default', expr: 'open', look: { x: 292, y: 52 } };
      } else if (b === 2) {
        out = { x: REST.x, y: REST.y, form: 'default', expr: 'open', look: { x: 400, y: 220 } };
      } else if (b === 3) {
        out = { x: REST.x, y: REST.y, form: 'default', expr: 'open', look: st.lesionVB };
      } else if (b === 4) {
        var h = api.easeInOut(seg(u, 0.4, 0.7));
        out = {
          x: api.lerp(REST.x, 400, h), y: api.lerp(REST.y, 230, h) - 70 * Math.sin(Math.PI * h),
          form: u < 0.4 ? 'default' : 'eyes', expr: u < 0.4 ? 'wide' : 'open', shiver: u < 0.4, look: 'camera'
        };
      } else if (b === 5) {
        out = { x: 400, y: 230, form: 'eyes', expr: k >= 80 ? 'happy' : 'open', opacity: 1 - seg(k, 90, 120) };
      } else {
        out = { x: 624, y: 60, form: 'default', expr: 'happy', look: 'camera' }; // on the seed tag, clear of the labels
      }
      // phones: what each beat needs in view (b1–b2 the seed, traces and bank; b3+ Blip's b3–b4 spot,
      // the plate, the cards and the U-Net labels), so the fixed center view no longer clips them
      if (b >= 1) out.span = b < 3 ? [36, 571] : [196, 796];   // 796: room for a wider fallback × in the card label
      return out;
    },

    action: function (st, name, btn) {
      var i = name.indexOf(':'), kind = i < 0 ? name : name.slice(0, i), val = name.slice(i + 1);
      if (kind === 'view') {
        st.view = val;
        pressGroup(st, 'view:', name);
        st.drawn = '';
        return { announce: val === 'mask' ? 'Tumor Mask view' : 'FLAIR view' };
      }
      if (kind === 'lobe') { st.lobe = +val; pressGroup(st, 'lobe:', name); regen(st, false); }
      else if (kind === 'size') { st.size = val; pressGroup(st, 'size:', name); regen(st, false); }
      else if (kind === 'seed') { st.seed = 10000 + Math.floor(Math.random() * 90000); regen(st, true); }
      return { announce: LOBE_NAMES[st.lobe] + ' lobe, ' + SIZE_WORDS[st.size] + ' tumor, seed ' + st.seed };
    },

    /* Reduced motion: under the poster, a strip of thumbnails at t = 995, 500 and 0. */
    rm: function (st) {
      var api = st.api, svg = api.stage, wrap = svg.parentNode;
      var cv = api.el('canvas', { width: G * 3, height: G, 'aria-hidden': 'true' }, wrap);
      cv.style.imageRendering = 'pixelated';
      api.place(cv, 256, 418, 288, 96);                  // SPEC's y 400, moved below the counter
      var ctx = cv.getContext('2d');
      st.strip = { cv: cv, ctx: ctx, img: ctx.createImageData(G * 3, G), drawn: -1 };
      STRIP_T.forEach(function (t, k) { api.text(304 + 96 * k, 532, 't = ' + t, 't-label t-mid-a', svg); });
      paintStrip(st);
    }
  };

  /* Idle warm-up, one short piece per callback (after lib.js's anatomy pieces, which queue first). */
  var warm = [lobePaths, ghostRGBA, defMask, defX0, defEps];
  var idle = window.requestIdleCallback
    ? function (fn) { window.requestIdleCallback(fn, { timeout: 4000 }); }
    : function (fn) { setTimeout(fn, 60); };
  function warmNext() { var fn = warm.shift(); if (fn) { fn(); if (warm.length) idle(warmNext); } }
  if (BR) idle(warmNext);
})();
