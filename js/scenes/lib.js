/* Brain-image library for fig. 02 (SOCR BrainGen). SPEC §5.2.
   Pure functions on a 128×128 grid, row-major (index = y*128 + x).
   Everything here is procedural: a toy axial slice, toy lobes, a toy lesion and the cosine
   noise schedule. It is an illustration of the method, not model output and not patient data. */
(function () {
  'use strict';
  window.SCENES = window.SCENES || {};

  var G = 128, NPIX = G * G, CX = 64, CY = 66;

  /* mulberry32: tiny seeded PRNG → function returning [0,1) */
  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* Normalized ellipse radius of the head outline; the head narrows slightly toward the front. */
  function rx(y) { return 44 * (1 - 0.06 * Math.max(0, (CY - y) / 54)); }
  function radius(x, y) {
    var dx = (x - CX) / rx(y), dy = (y - CY) / 54;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /* Ventricles: two tall ellipses at (57,64) and (71,64), radii (4.5,15), rotated ∓18°.
     The rotation's cos/sin are constants, so they are computed once, not twice per pixel. */
  function rot(deg) { var a = deg * Math.PI / 180; return [Math.cos(a), Math.sin(a)]; }
  var VL = rot(-18), VR = rot(18);
  function inEllipse(x, y, cx, cy, ax, ay, cs) {
    var dx = x - cx, dy = y - cy, c = cs[0], s = cs[1];
    var u = dx * c + dy * s, v = -dx * s + dy * c;
    return (u * u) / (ax * ax) + (v * v) / (ay * ay) <= 1;
  }
  function inVentricle(x, y) {
    if (x < 42 || x > 86 || y < 49 || y > 79) return false; // outside both ellipses' 15 px reach
    return inEllipse(x, y, 57, 64, 4.5, 15, VL) || inEllipse(x, y, 71, 64, 4.5, 15, VR);
  }

  function segDist(px, py, ax, ay, bx, by) {
    var vx = bx - ax, vy = by - ay, l = vx * vx + vy * vy;
    var t = l ? Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vy) / l)) : 0;
    var qx = ax + t * vx - px, qy = ay + t * vy - py;
    return Math.sqrt(qx * qx + qy * qy);
  }

  /* 3×3 box blur with clamped edges (taps summed row by row, left to right). */
  function blur(src) {
    var out = new Float32Array(NPIX), M = G - 1;
    for (var y = 0; y < G; y++) {
      var a = (y > 0 ? y - 1 : 0) * G, b = y * G, c = (y < M ? y + 1 : M) * G;
      for (var x = 0; x < G; x++) {
        var l = x > 0 ? x - 1 : 0, r = x < M ? x + 1 : M;
        out[b + x] = (src[a + l] + src[a + x] + src[a + r] +
                      src[b + l] + src[b + x] + src[b + r] +
                      src[c + l] + src[c + x] + src[c + r]) / 9;
      }
    }
    return out;
  }

  /* slice(): the anatomy, memoized (callers must not mutate it). */
  var sliceMemo = null;
  function slice() {
    if (sliceMemo) return sliceMemo;
    // 30 radial sulci with jittered angles and depths (fixed seed, so the anatomy never changes),
    // each rasterized over its own bounding box: a pixel is sulcus when it lies within 0.6 px of one
    var r0 = rng(452), sul = new Uint8Array(NPIX);
    for (var k = 0; k < 30; k++) {
      var phi = 2 * Math.PI * (k + 0.5 + (r0() - 0.5) * 0.6) / 30, rEnd = 0.78 + 0.06 * r0();
      var c = Math.cos(phi), s = Math.sin(phi);
      var y1 = CY + 54 * s, y2 = CY + rEnd * 54 * s, x1 = CX + rx(y1) * c, x2 = CX + rEnd * rx(y2) * c;
      var xa = Math.max(0, Math.floor(Math.min(x1, x2)) - 1), xb = Math.min(G - 1, Math.ceil(Math.max(x1, x2)) + 1);
      var ya = Math.max(0, Math.floor(Math.min(y1, y2)) - 1), yb = Math.min(G - 1, Math.ceil(Math.max(y1, y2)) + 1);
      for (var sy = ya; sy <= yb; sy++) {
        for (var sx = xa; sx <= xb; sx++) if (segDist(sx, sy, x1, y1, x2, y2) < 0.6) sul[sy * G + sx] = 1;
      }
    }
    var img = new Float32Array(NPIX);
    for (var y = 0; y < G; y++) {
      var ry = rx(y), dy = (y - CY) / 54, dy2 = dy * dy, mid = y < 46 || y > 92;
      for (var x = 0; x < G; x++) {
        var dx = (x - CX) / ry, r = Math.sqrt(dx * dx + dy2), i = y * G + x, v;
        if (r > 1.13) v = 0;              // outside
        else if (r > 1.06) v = 0.42;      // scalp
        else if (r > 1.0) v = 0.06;       // gap
        else {
          v = r > 0.84 ? 0.66 : 0.46;     // cortex : white matter
          if (sul[i]) v = 0.12;           // sulcus
          if (mid && Math.abs(x - CX) < 0.8) v = 0.12; // midline
          if (inVentricle(x, y)) v = 0.08;
        }
        img[i] = v;
      }
    }
    sliceMemo = blur(blur(img));
    return sliceMemo;
  }

  /* lobes(): 0 none, 1 frontal, 2 parietal, 3 temporal, 4 occipital. Memoized. */
  var lobeMemo = null;
  function lobes() {
    if (lobeMemo) return lobeMemo;
    var L = new Uint8Array(NPIX);
    for (var y = 0; y < G; y++) {
      for (var x = 0; x < G; x++) {
        if (radius(x, y) > 1.0 || inVentricle(x, y)) continue;
        L[y * G + x] = y < 54 ? 1 : y >= 96 ? 4 : Math.abs(x - CX) >= 30 ? 3 : 2;
      }
    }
    lobeMemo = L;
    return L;
  }

  /* lobeSets(lobe): the lobe's pixels and its candidates (the lobe minus a 2 px border: pixels
     whose whole 5×5 neighbourhood is the same lobe). They depend only on the lobe, so memoized. */
  var setMemo = {};
  function lobeSets(lobe) {
    if (setMemo[lobe]) return setMemo[lobe];
    var L = lobes(), px = [], cand = [], inCand = new Uint8Array(NPIX);
    for (var i = 0; i < NPIX; i++) if (L[i] === lobe) px.push(i);
    px.forEach(function (p) {
      var x = p % G, y = (p - x) / G;
      for (var j = -2; j <= 2; j++) for (var k = -2; k <= 2; k++) {
        var xx = x + k, yy = y + j;
        if (xx < 0 || yy < 0 || xx >= G || yy >= G || L[yy * G + xx] !== lobe) return;
      }
      cand.push(p);
      inCand[p] = 1;
    });
    return (setMemo[lobe] = { px: px, cand: cand, inCand: inCand });
  }

  /* Smoothed value noise: a 9×9 lattice (8×8 cells of 16 px), smoothstep-interpolated. */
  function valueNoise8x8(rand) {
    var lat = new Float32Array(81), out = new Float32Array(NPIX);
    for (var i = 0; i < 81; i++) lat[i] = rand();
    for (var y = 0; y < G; y++) {
      var gy = y / 16, iy = Math.min(7, Math.floor(gy)), fy = gy - iy;
      fy = fy * fy * (3 - 2 * fy);
      for (var x = 0; x < G; x++) {
        var gx = x / 16, ix = Math.min(7, Math.floor(gx)), fx = gx - ix;
        fx = fx * fx * (3 - 2 * fx);
        var a = lat[iy * 9 + ix], b = lat[iy * 9 + ix + 1], c = lat[(iy + 1) * 9 + ix], d = lat[(iy + 1) * 9 + ix + 1];
        out[y * G + x] = (a + (b - a) * fx) + ((c + (d - c) * fx) - (a + (b - a) * fx)) * fy;
      }
    }
    return out;
  }

  var BINS = { S: [0.05, 0.12], M: [0.15, 0.35], L: [0.40, 0.60] };

  /* synthMask(lobe, size, rand) → {mask, order, N, A}
     mask: Uint8Array, 0 background, 2 edema, 3 core. order: lesion pixel indices, best score first.
     N = round(frac·A) where A = lobe pixel count and frac is drawn from the size bin. */
  function synthMask(lobe, size, rand) {
    var bin = BINS[size] || BINS.M, sets = lobeSets(lobe);
    var lobePx = sets.px, cand = sets.cand, inCand = sets.inCand, A = lobePx.length;

    var frac = bin[0] + (bin[1] - bin[0]) * rand();
    var N = Math.round(frac * A);
    var seedPx = lobePx[Math.floor(rand() * A)], sx = seedPx % G, sy = (seedPx - sx) / G;
    var sigma = Math.sqrt(N / Math.PI) * 1.1, s2 = 2 * sigma * sigma;
    var vn = valueNoise8x8(rand);

    function score(p) {
      var x = p % G, y = (p - x) / G, d2 = (x - sx) * (x - sx) + (y - sy) * (y - sy);
      return Math.exp(-d2 / s2) * (0.6 + 0.4 * vn[p]);
    }
    // a 2 px border can leave a thin lobe short of the large bin; border pixels then rank after every candidate
    var pool = cand.length >= N ? cand : lobePx;
    var scored = pool.map(function (p) { return { p: p, s: score(p) - (inCand[p] ? 0 : 2) }; });
    scored.sort(function (a, b) { return b.s - a.s || a.p - b.p; });

    var mask = new Uint8Array(NPIX), order = new Int32Array(N), nCore = Math.round(0.3 * N);
    for (var n = 0; n < N; n++) {
      order[n] = scored[n].p;
      mask[scored[n].p] = n < nCore ? 3 : 2;
    }
    return { mask: mask, order: order, N: N, A: A, seed: seedPx };
  }

  /* flair(slice, mask): edema = max(img, .86), core = .78, then one blur pass → x0 in [0,1]. */
  function flair(img, mask) {
    var x0 = new Float32Array(NPIX);
    for (var i = 0; i < NPIX; i++) x0[i] = mask[i] === 3 ? 0.78 : mask[i] === 2 ? Math.max(img[i], 0.86) : img[i];
    return blur(x0);
  }

  /* maskView(mask): background 0, edema .5, core 1. */
  function maskView(mask) {
    var v = new Float32Array(NPIX);
    for (var i = 0; i < NPIX; i++) v[i] = mask[i] === 3 ? 1 : mask[i] === 2 ? 0.5 : 0;
    return v;
  }

  /* Cosine schedule, s = .008: ᾱ(t) = f(t)/f(0), f(t) = cos²(((t/1000 + s)/(1 + s))·π/2). */
  function f(t) { var c = Math.cos(((t / 1000 + 0.008) / 1.008) * Math.PI / 2); return c * c; }
  var F0 = f(0);
  function alphaBar(t) { return f(t) / F0; }

  /* noise(seed): standard normal ε per pixel, Box-Muller on mulberry32(seed). */
  function noise(seed) {
    var r = rng(seed), out = new Float32Array(NPIX);
    for (var i = 0; i < NPIX; i += 2) {
      var u1 = 1 - r(), u2 = r(), m = Math.sqrt(-2 * Math.log(u1)), a = 2 * Math.PI * u2;
      out[i] = m * Math.cos(a);
      out[i + 1] = m * Math.sin(a);
    }
    return out;
  }

  /* frame(x0, eps, t, out): v = √ᾱ·(2·x0 − 1) + √(1−ᾱ)·ε, shown as clamp((v+1)/2)·255, grey RGBA.
     With η = 0 and a perfect noise estimate this is exactly DDIM's path. Returns out. */
  function frame(x0, eps, t, out) {
    var ab = alphaBar(t), a = Math.sqrt(ab), b = Math.sqrt(Math.max(0, 1 - ab));
    for (var i = 0, j = 0; i < NPIX; i++, j += 4) {
      var v = (a * (2 * x0[i] - 1) + b * eps[i] + 1) / 2;
      var g = v <= 0 ? 0 : v >= 1 ? 255 : Math.round(v * 255);
      out[j] = out[j + 1] = out[j + 2] = g;
      out[j + 3] = 255;
    }
    return out;
  }

  window.BRAIN = {
    G: G, rng: rng, slice: slice, lobes: lobes, synthMask: synthMask, flair: flair,
    maskView: maskView, alphaBar: alphaBar, noise: noise, frame: frame
  };

  /* Fill the memos during idle time, one short piece per callback, so the fig. 02 mount (an
     IntersectionObserver callback that fires mid-scroll) never pays for the anatomy. */
  var warm = [slice, lobes, lobeSets.bind(null, 1), lobeSets.bind(null, 2), lobeSets.bind(null, 3), lobeSets.bind(null, 4)];
  var idle = window.requestIdleCallback
    ? function (fn) { window.requestIdleCallback(fn, { timeout: 3000 }); }
    : function (fn) { setTimeout(fn, 50); };
  function warmNext() { var fn = warm.shift(); if (fn) { fn(); if (warm.length) idle(warmNext); } }
  idle(warmNext);
})();
