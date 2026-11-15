/* 淘片介绍页 · 动画和互动
   1 橙色块：在各段的停靠位之间变形，不在停靠位时沿侧边刻度走
   2 滑动整理：手机里的照片可以真的滑
   3 飞行模式：开关和“先存一份”
   4 照片变 PDF：跟着滚动，四个角对四个角拉正
   5 结尾：橙色铺满，变黑，接标志
   每一帧只改 transform、opacity、clip-path 和路径，先读后写。 */
(function () {
  'use strict';
  var D = document, W = window, R = D.documentElement, T = W.TEXT || {};
  var mq = W.matchMedia ? W.matchMedia('(prefers-reduced-motion: reduce)') : null;
  var RM = !!(mq && mq.matches);
  if (mq && mq.addEventListener) mq.addEventListener('change', function () { location.reload(); });

  function $(s, c) { return (c || D).querySelector(s); }
  function $$(s, c) { return [].slice.call((c || D).querySelectorAll(s)); }
  function clamp(x, a, b) { a = a == null ? 0 : a; b = b == null ? 1 : b; return x < a ? a : x > b ? b : x; }
  function seg(t, a, b) { return clamp((t - a) / (b - a)); }
  function lerp(a, b, x) { return a + (b - a) * x; }
  function oc(x) { return 1 - Math.pow(1 - x, 3); }
  function io(x) { return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }
  function fmt(s, o) { return String(s).replace(/\{(\w+)\}/g, function (_, k) { return o[k]; }); }
  var IMG = (T.base || '') + 'assets/img/';
  function setT(el, s) { if (el && el.textContent !== s) el.textContent = s; }

  /* —— 进场：滚到了才浮现，每次滚动查一下位置 —— */
  var pend = $$('.rv');
  function reveal() {
    if (!pend.length) return;
    var lim = W.innerHeight * 0.94, rest = [], i;
    for (i = 0; i < pend.length; i++) { if (RM || pend[i].getBoundingClientRect().top < lim) pend[i].classList.add('in'); else rest.push(pend[i]); }
    pend = rest;
  }

  /* —— 形状：每个形状沿轮廓取同样多的点，都按同一个圆对齐，任意两个之间可以直接插值 —— */
  var N = 144;
  var SH = {
    tile: { d: 'M24 0H76A24 24 0 0 1 100 24V76A24 24 0 0 1 76 100H24A24 24 0 0 1 0 76V24A24 24 0 0 1 24 0Z', w: 100, h: 100 },
    circle: { d: 'M50 0A50 50 0 0 1 50 100A50 50 0 0 1 50 0Z', w: 100, h: 100 },
    plane: { d: 'M50 4C54 4 57 10 57 18L57 38 94 60 94 70 57 58 57 80 68 88 68 95 50 90 32 95 32 88 43 80 43 58 6 70 6 60 43 38 43 18C43 10 46 4 50 4Z', w: 100, h: 100 },
    cloud: { d: 'M26 64C12 64 2 54 2 42 2 31 10 22 21 21 24 9 35 2 47 2 60 2 71 11 74 23 88 24 98 33 98 44 98 55 89 64 76 64Z', w: 100, h: 66 },
    doc: { d: 'M14 0H84L124 40V142a14 14 0 0 1-14 14H14A14 14 0 0 1 0 142V14A14 14 0 0 1 14 0Z', w: 124, h: 156 }
  };
  var REF = [];
  (function () {
    var i, k, a;
    for (i = 0; i < N; i++) { a = -Math.PI / 2 + 2 * Math.PI * i / N; REF.push([Math.cos(a), Math.sin(a)]); }
    var NS = 'http://www.w3.org/2000/svg', svg = D.createElementNS(NS, 'svg');
    svg.setAttribute('width', '0'); svg.setAttribute('height', '0'); svg.style.position = 'absolute';
    D.body.appendChild(svg);
    for (k in SH) {
      var s = SH[k], p = D.createElementNS(NS, 'path'), pts = [], area = 0, L, q, j, best = 0, bd = 1e18, sc, d, dx, dy;
      p.setAttribute('d', s.d); svg.appendChild(p); L = p.getTotalLength();
      for (i = 0; i < N; i++) { q = p.getPointAtLength(L * i / N); pts.push([q.x, q.y]); }
      for (i = 0; i < N; i++) { j = (i + 1) % N; area += pts[i][0] * pts[j][1] - pts[j][0] * pts[i][1]; }
      if (area < 0) pts.reverse();
      sc = 2 / Math.max(s.w, s.h);
      for (j = 0; j < N; j++) {
        d = 0;
        for (i = 0; i < N; i += 4) {
          q = pts[(i + j) % N]; dx = (q[0] - s.w / 2) * sc - REF[i][0]; dy = (q[1] - s.h / 2) * sc - REF[i][1]; d += dx * dx + dy * dy;
        }
        if (d < bd) { bd = d; best = j; }
      }
      s.p = pts.map(function (_, i2) { return pts[(i2 + best) % N]; });
    }
    D.body.removeChild(svg);
  })();
  function fit(k, r) {
    var s = SH[k], m = Math.min(r.width / s.w, r.height / s.h), ox = r.left + (r.width - s.w * m) / 2, oy = r.top + (r.height - s.h * m) / 2;
    return s.p.map(function (q) { return [ox + q[0] * m, oy + q[1] * m]; });
  }
  function dotAt(x, y, r) { return REF.map(function (q) { return [x + q[0] * r, y + q[1] * r]; }); }
  function mix(A, B, e) { return A.map(function (p, i) { return [lerp(p[0], B[i][0], e), lerp(p[1], B[i][1], e)]; }); }
  function pathD(P) { var s = 'M', i; for (i = 0; i < P.length; i++) s += (i ? 'L' : '') + P[i][0].toFixed(1) + ' ' + P[i][1].toFixed(1); return s + 'Z'; }

  var AN = $$('.anchor').map(function (el) {
    var s = SH[el.getAttribute('data-shape')];
    el.insertAdjacentHTML('afterbegin', '<svg viewBox="0 0 ' + s.w + ' ' + s.h + '" aria-hidden="true"><path d="' + s.d + '"/></svg>');
    return { el: el, k: el.getAttribute('data-shape'), id: el.id };
  });
  var FX = !RM && AN.length > 1;
  if (FX) R.classList.add('fx'); else AN.forEach(function (a) { a.el.classList.add('on'); });

  var fxp = $('#fxp'), rail = $('#rail'), bar = $('#bar'), hero = $('#top'), pdfSec = $('#s4'), endSec = $('#end');
  var secs = $$('[data-n]'), ticks = [];
  secs.forEach(function (s) { var i = D.createElement('i'); i.innerHTML = '<b>' + s.getAttribute('data-n') + '</b>'; rail.appendChild(i); ticks.push(i); });

  var vw = 0, vh = 0, docH = 1, heroH = 600, railX = 0, railTop = 0, railLen = 0, sceneS = 1, docked = -2, queued = false;

  /* —— 照片变 PDF —— */
  var scene = $('#scene'), sceneBox = $('#sceneBox'), scr = $('#scScreen'), photo = $('#scPhoto'), ceil = $('#scCeil'), heads = $('#scHeads');
  var c1 = $('#scC1'), c2 = $('#scC2'), pgs = $$('.pg', scene), texts = $$('.pdf-t'), stepEls = $$('#steps i');
  var L1 = $('#scL1'), L2 = $('#scL2'), L3 = $('#scL3'), lbCeil = $('#lbCeil'), lbScr = $('#lbScr'), lbHead = $('#lbHead'), lbSkew = $('#lbSkew'), deg = $('#deg'), scN = $('#scN'), chips = $('#scChips');
  var Q0 = [[76, 136], [288, 116], [296, 222], [70, 230]], Q1 = [[55, 150], [305, 150], [305, 300], [55, 300]], Q9 = [[42, 104], [318, 104], [318, 268], [42, 268]];
  var TW = [[0, 0.25], [0.25, 0.65], [0.65, 0.85], [0.85, 1.01]], lastPdf = -1, lastStep = -1;
  /* 把 w×h 的平面贴到任意四个角上（左上、右上、右下、左下） */
  function quadM(w, h, q) {
    var x0 = q[0][0], y0 = q[0][1], x1 = q[1][0], y1 = q[1][1], x2 = q[2][0], y2 = q[2][1], x3 = q[3][0], y3 = q[3][1];
    var dx1 = x1 - x2, dx2 = x3 - x2, sx = x0 - x1 + x2 - x3, dy1 = y1 - y2, dy2 = y3 - y2, sy = y0 - y1 + y2 - y3;
    var den = dx1 * dy2 - dx2 * dy1, g = (sx * dy2 - dx2 * sy) / den, k = (dx1 * sy - sx * dy1) / den;
    var a = x1 - x0 + g * x1, b = x3 - x0 + k * x3, d = y1 - y0 + g * y1, e = y3 - y0 + k * y3;
    return 'matrix3d(' + [a / w, d / w, 0, g / w, b / h, e / h, 0, k / h, 0, 0, 1, 0, x0, y0, 0, 1].map(function (v) { return +v.toFixed(6); }).join(',') + ')';
  }
  function cornerD(q, leg) {
    var d = '', i, p, t, u;
    function arm(p, t) { var dx = t[0] - p[0], dy = t[1] - p[1], l = Math.sqrt(dx * dx + dy * dy), m = Math.min(leg, l / 2); return [p[0] + dx / l * m, p[1] + dy / l * m]; }
    for (i = 0; i < 4; i++) {
      p = q[i]; t = arm(p, q[(i + 3) % 4]); u = arm(p, q[(i + 1) % 4]);
      d += 'M' + t[0].toFixed(1) + ' ' + t[1].toFixed(1) + 'L' + p[0].toFixed(1) + ' ' + p[1].toFixed(1) + 'L' + u[0].toFixed(1) + ' ' + u[1].toFixed(1);
    }
    return d;
  }
  function show(el, o, dy) { el.style.opacity = o; if (dy != null) el.style.transform = 'translate3d(0,' + dy.toFixed(1) + 'px,0)'; }
  function drawPdf(p) {
    if (!scene || p === lastPdf) return; lastPdf = p;
    var a = oc(seg(p, 0.07, 0.2)), b = io(seg(p, 0.27, 0.43)), bf = seg(p, 0.37, 0.47), c = io(seg(p, 0.48, 0.64)), e = io(seg(p, 0.84, 0.94));
    var q = [], cq = [], i;
    for (i = 0; i < 4; i++) { q[i] = [lerp(Q0[i][0], Q1[i][0], c), lerp(Q0[i][1], Q1[i][1], c)]; cq[i] = [lerp(Q9[i][0], q[i][0], a), lerp(Q9[i][1], q[i][1], a)]; }
    var co = seg(p, 0.05, 0.09) * (1 - seg(p, 0.68, 0.74)), cd = co > 0 ? cornerD(cq, lerp(36, 22, a)) : '';
    c1.setAttribute('d', cd); c2.setAttribute('d', cd); c1.style.opacity = c2.style.opacity = co;
    scr.style.transform = quadM(250, 150, q);
    scr.style.setProperty('--ring', bf.toFixed(3));
    photo.style.opacity = 1 - bf;
    ceil.setAttribute('transform', 'translate(0 ' + (-34 * b).toFixed(1) + ')'); ceil.setAttribute('stroke-opacity', b.toFixed(2)); ceil.style.opacity = 1 - bf;
    heads.setAttribute('transform', 'translate(0 ' + (40 * b).toFixed(1) + ')'); heads.setAttribute('stroke-opacity', b.toFixed(2)); heads.style.opacity = 1 - bf;
    var o1 = seg(p, 0.12, 0.17) * (1 - bf), o2 = seg(p, 0.15, 0.2) * (1 - seg(p, 0.5, 0.56)), o3 = seg(p, 0.18, 0.23) * (1 - bf), o4 = seg(p, 0.46, 0.5) * (1 - seg(p, 0.68, 0.72));
    L1.style.opacity = o1; L2.style.opacity = o2; L3.style.opacity = o3;
    show(lbCeil, o1, lerp(8, 0, o1) - 34 * b * 0.5); show(lbScr, o2, lerp(8, 0, o2)); show(lbHead, o3, lerp(-8, 0, o3) + 40 * b * 0.5); show(lbSkew, o4, lerp(8, 0, o4));
    setT(deg, fmt(T.deskew || '{a}°', { a: (Math.atan2(q[1][1] - q[0][1], q[1][0] - q[0][0]) * 180 / Math.PI).toFixed(1) }));
    for (i = 0; i < pgs.length; i++) {
      var j = pgs.length - i, t0 = 0.66 + 0.045 * (j - 1), di = oc(seg(p, t0, t0 + 0.12)), ox = j * lerp(11, 6, e), oy = j * lerp(10, 5, e);
      pgs[i].style.opacity = seg(p, t0, t0 + 0.03);
      pgs[i].style.transform = 'translate3d(' + lerp(150, ox, di).toFixed(1) + 'px,' + lerp(70, oy, di).toFixed(1) + 'px,0) rotate(' + lerp(14, 0, di).toFixed(2) + 'deg)';
    }
    show(scN, seg(p, 0.8, 0.84), null);
    var oc5 = seg(p, 0.9, 0.96); show(chips, oc5, lerp(10, 0, oc(oc5)));
    var step = 0;
    if (RM) return;
    for (i = 0; i < texts.length; i++) {
      var tin = i ? seg(p, TW[i][0], TW[i][0] + 0.035) : 1, tout = i < texts.length - 1 ? seg(p, TW[i][1] - 0.035, TW[i][1]) : 0;
      show(texts[i], tin * (1 - tout), lerp(18, 0, oc(tin)) - 14 * tout);
      texts[i].style.visibility = tin * (1 - tout) > 0.01 ? 'visible' : 'hidden';
      if (p >= TW[i][0]) step = i;
    }
    if (step !== lastStep) { lastStep = step; stepEls.forEach(function (el, k) { el.classList.toggle('on', k <= step); }); }
  }

  /* —— 结尾 —— */
  var endOr = $('#endOr'), endBk = $('#endBk'), endLine = $('#endLine'), endLogo = $('#endLogo'), lastEnd = -1;
  function clip(el, r) { var v = 'circle(' + r.toFixed(1) + 'px at 50% 50%)'; el.style.webkitClipPath = v; el.style.clipPath = v; }
  function drawEnd(p) {
    if (p === lastEnd) return; lastEnd = p;
    var Rm = Math.sqrt(vw * vw + vh * vh) / 2 + 6;
    clip(endOr, p <= 0 ? 0 : lerp(7, Rm, io(seg(p, 0.03, 0.36))));
    clip(endBk, lerp(0, Rm, io(seg(p, 0.55, 0.82))));
    var lo = seg(p, 0.26, 0.36) * (1 - seg(p, 0.52, 0.6)); show(endLine, lo, lerp(22, 0, oc(seg(p, 0.26, 0.4))));
    var go = seg(p, 0.78, 0.92); show(endLogo, go, lerp(26, 0, oc(go))); endLogo.classList.toggle('live', go > 0.5);
  }

  /* —— 橙色块：去哪个停靠位由滚动位置决定；飞过去的过程按时间走，不会停在半路 —— */
  var want = -2, flying = false, flyFrom = null, flyVia = false, flyT0 = 0, flyDur = 0, lastP = null;
  function cen(P) { var x = 0, y = 0, i; for (i = 0; i < P.length; i++) { x += P[i][0]; y += P[i][1]; } return [x / P.length, y / P.length]; }
  function rad(P, c) { var s = 0, i, dx, dy; for (i = 0; i < P.length; i++) { dx = P[i][0] - c[0]; dy = P[i][1] - c[1]; s += dx * dx + dy * dy; } return Math.sqrt(s / P.length); }
  function morph(rc, pdfP, endP, y, now) {
    var n = AN.length, k, cy, w = -1, P = null, to, t;
    for (k = 0; k < n; k++) {
      cy = rc[k].top + rc[k].height / 2;
      if (k === 0 || (AN[k].id === 'a-doc' ? pdfP >= 0.86 : cy < vh * 0.9)) w = (k === n - 1 || cy > vh * 0.1) ? k : -1;
    }
    function node(i) { return i < 0 ? dotAt(railX, railTop + railLen * clamp(y / Math.max(1, docH - vh)), vw >= 900 ? 6 : 5) : fit(AN[i].k, rc[i]); }
    if (want === -2) want = w;
    else if (w !== want) {
      flyFrom = lastP || node(want); flyVia = w >= 0 && want >= 0 && !flying;
      want = w; flyT0 = now; flyDur = w < 0 ? 420 : flyVia ? 820 : 640; flying = true;
    }
    to = node(want);
    if (flying) {
      t = clamp((now - flyT0) / flyDur);
      if (flyVia) {
        /* 两个复杂形状之间：先收成圆，再变成下一个 */
        var ca = cen(flyFrom), cb = cen(to), mid = dotAt((ca[0] + cb[0]) / 2, (ca[1] + cb[1]) / 2, Math.sqrt(rad(flyFrom, ca) * rad(to, cb)) * 0.8);
        P = t < 0.5 ? mix(flyFrom, mid, io(t * 2)) : mix(mid, to, io(t * 2 - 1));
      } else P = mix(flyFrom, to, io(t));
      if (t >= 1) { flying = false; P = null; } else ask();
    }
    if (!flying && want < 0) P = to;
    lastP = P;
    if (P) { fxp.setAttribute('d', pathD(P)); fxp.style.display = ''; } else fxp.style.display = 'none';
    var at = !flying && want >= 0 ? want : -1;
    if (at !== docked) { docked = at; AN.forEach(function (a, i) { a.el.classList.toggle('on', i === at); }); }
    rail.classList.toggle('off', endP > 0.2);
  }

  function layout() {
    vw = R.clientWidth; vh = W.innerHeight; docH = R.scrollHeight; heroH = hero ? hero.offsetHeight : 600;
    var rr = rail.getBoundingClientRect(); railX = rr.left + rr.width / 2; railTop = rr.top; railLen = rr.height;
    var y = W.pageYOffset;
    secs.forEach(function (s, i) { ticks[i].style.top = (clamp((s.getBoundingClientRect().top + y) / Math.max(1, docH - vh)) * 100).toFixed(2) + '%'; });
    if (sceneBox && scene) {
      sceneS = Math.min(sceneBox.clientWidth / 360, sceneBox.clientHeight / 400, 1.5);
      if (sceneS > 0) scene.style.transform = 'scale(' + sceneS.toFixed(3) + ')';
    }
    lastPdf = lastEnd = -1;
    update();
  }
  function update() {
    queued = false;
    var y = W.pageYOffset, rc = FX ? AN.map(function (a) { return a.el.getBoundingClientRect(); }) : null;
    var pr = pdfSec.getBoundingClientRect(), er = endSec.getBoundingClientRect();
    var pdfP = clamp(-pr.top / Math.max(1, pr.height - vh)), endP = clamp(-er.top / Math.max(1, er.height - vh));
    bar.classList.toggle('show', y > heroH * 0.7 && (!FX || endP < 0.25));
    reveal();
    if (RM) { drawPdf(1); return; }
    drawPdf(pdfP);
    if (FX) { drawEnd(endP); morph(rc, pdfP, endP, y, W.performance.now()); }
  }
  function ask() { if (!queued) { queued = true; W.requestAnimationFrame(update); } }
  W.addEventListener('scroll', ask, { passive: true });
  W.addEventListener('resize', layout);
  W.addEventListener('load', layout);
  W.addEventListener('orientationchange', function () { setTimeout(layout, 300); });
  layout(); setTimeout(layout, 700);

  /* —— 滑动整理 —— */
  (function () {
    var el = $('#deck'); if (!el) return;
    var PH = T.photos || [], order = [], trash = [], kept = 0, favs = {}, busy = false, top = null, under = null;
    var thumbs = $('#thumbs'), nTrash = $('#nTrash'), nKeep = $('#nKeep'), nFav = $('#nFav'), nLeft = $('#nLeft'), back = $('#back');
    var done = $('.deck-done', el), dur = RM ? 0 : 330;
    setT($('#again'), T.again);
    function reset() { order = PH.map(function (_, i) { return i; }); trash = []; kept = 0; favs = {}; build(); }
    function mk(i) {
      var c = D.createElement('div'); c.className = 'card' + (favs[i] ? ' fav' : '');
      c.innerHTML = '<img decoding="sync" draggable="false" src="' + IMG + 'p-' + PH[i][0] + '.jpg" alt="' + PH[i][1] + '"><span class="h">♥</span><span class="m m-fav">' + T.fav + '</span><span class="m m-keep">' + T.keep + '</span><span class="m m-del">' + T.del + '</span>';
      return c;
    }
    function build() {
      $$('.card', el).forEach(function (c) { el.removeChild(c); });
      top = under = null;
      if (order.length > 1) { under = mk(order[1]); under.classList.add('under'); el.insertBefore(under, done); }
      if (order.length) { top = mk(order[0]); el.insertBefore(top, done); }
      el.classList.toggle('done', !order.length);
      sync();
    }
    function sync() {
      var f = 0, k;
      for (k in favs) if (favs[k] && trash.indexOf(+k) < 0) f++;
      setT(nTrash, String(trash.length)); setT(nKeep, String(kept)); setT(nFav, String(f)); setT(nLeft, String(order.length));
      back.disabled = !trash.length;
      thumbs.innerHTML = trash.length ? trash.map(function (i) { return '<img src="' + IMG + 'p-' + PH[i][0] + '.jpg" alt="' + PH[i][1] + '">'; }).join('') : '<span class="empty">' + T.empty + '</span>';
      setT($('#doneT'), T.doneT); setT($('#doneS'), fmt(T.doneS, { k: kept, f: f, t: trash.length }));
    }
    function stopHint() { el.classList.remove('hint'); el.setAttribute('data-used', '1'); }
    function settle() { if (top) { top.style.transform = ''; top.style.removeProperty('--del'); top.style.removeProperty('--fav'); } }
    function act(type) {
      if (busy || !top) return;
      stopHint();
      var c = top, i = order[0];
      if (type === 'fav') { favs[i] = !favs[i]; c.classList.toggle('fav', !!favs[i]); settle(); sync(); return; }
      if ((type === 'next' || type === 'prev') && order.length < 2) { settle(); return; }
      busy = true;
      if (type === 'prev') {
        order.unshift(order.pop()); build(); top.classList.add('in-left'); void top.offsetWidth; top.classList.remove('in-left');
        setTimeout(function () { busy = false; }, dur); return;
      }
      if (type === 'del') { order.shift(); trash.push(i); c.classList.add('go-del'); }
      else if (type === 'keep') { order.shift(); kept++; c.classList.add('go-keep'); }
      else { order.push(order.shift()); c.classList.add('go-left'); }
      c.style.transform = '';
      if (under) under.classList.remove('under');
      sync();
      setTimeout(function () { build(); busy = false; }, dur);
    }
    var pid = null, sx = 0, sy = 0, dx = 0, dy = 0, axis = null, t0 = 0;
    el.addEventListener('pointerdown', function (e) {
      if (busy || !top || pid !== null || (e.button && e.button > 0) || (e.target.closest && e.target.closest('.deck-done'))) return;
      pid = e.pointerId; sx = e.clientX; sy = e.clientY; dx = dy = 0; axis = null; t0 = Date.now();
      try { el.setPointerCapture(pid); } catch (_) { }
      top.classList.add('drag'); stopHint();
    });
    el.addEventListener('pointermove', function (e) {
      if (e.pointerId !== pid || !top) return;
      dx = e.clientX - sx; dy = e.clientY - sy;
      if (!axis) { if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return; axis = Math.abs(dy) >= Math.abs(dx) ? 'y' : 'x'; }
      var x = axis === 'x' ? dx : 0, y = axis === 'y' ? (dy < 0 ? dy : dy * 0.5) : 0;
      top.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0) rotate(' + (x * 0.03).toFixed(2) + 'deg)';
      top.style.setProperty('--del', clamp(-dy / 80).toFixed(2));
      top.style.setProperty('--fav', axis === 'y' ? clamp(dy / 70).toFixed(2) : '0');
    });
    function up(e) {
      if (e.pointerId !== pid) return;
      pid = null; if (!top) return;
      top.classList.remove('drag');
      var fast = Date.now() - t0 < 260, lim = fast ? 28 : 64;
      if (e.type === 'pointercancel' || !axis) settle();
      else if (axis === 'y' && dy < -lim) act('del');
      else if (axis === 'y' && dy > lim) act('fav');
      else if (axis === 'x' && dx < -lim) act('next');
      else if (axis === 'x' && dx > lim) act('prev');
      else settle();
    }
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
    function flash(b) { b.classList.remove('fl'); void b.offsetWidth; b.classList.add('fl'); }
    $('#hitK').addEventListener('click', function () { flash(this); act('keep'); });
    $('#hitD').addEventListener('click', function () { flash(this); act('del'); });
    back.addEventListener('click', function () {
      if (busy || !trash.length) return;
      order = trash.concat(order); trash = []; build();
      if (top && !RM) { top.classList.add('in-top'); void top.offsetWidth; top.classList.remove('in-top'); }
    });
    $('#again').addEventListener('click', reset);
    reset();
    if (!RM && 'IntersectionObserver' in W) new IntersectionObserver(function (es, ob) {
      es.forEach(function (e) { if (e.isIntersecting) { if (!el.getAttribute('data-used')) el.classList.add('hint'); ob.disconnect(); } });
    }, { threshold: 0.6 }).observe(el);
  })();

  /* —— 清理那一排手机：橙色取景框跟着当前这台 —— */
  (function () {
    var box = $('#shots'); if (!box) return;
    var items = $$('.shot', box), pg = $$('#pager i'), cur = 0, wait = false, timer = null, hover = false;
    function on(i) { if (i === cur) return; cur = i; items.forEach(function (el, j) { el.classList.toggle('on', j === i); }); pg.forEach(function (el, j) { el.classList.toggle('on', j === i); }); }
    box.addEventListener('scroll', function () {
      if (wait) return; wait = true;
      W.requestAnimationFrame(function () {
        wait = false;
        var b = box.getBoundingClientRect(), mid = b.left + b.width / 2, best = 0, bd = 1e9;
        items.forEach(function (el, j) { var r = el.getBoundingClientRect(), d = Math.abs(r.left + r.width / 2 - mid); if (d < bd) { bd = d; best = j; } });
        on(best);
      });
    }, { passive: true });
    items.forEach(function (el, j) { el.addEventListener('mouseenter', function () { hover = true; on(j); }); el.addEventListener('mouseleave', function () { hover = false; }); });
    if (!RM && 'IntersectionObserver' in W) new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        clearInterval(timer);
        if (e.isIntersecting && W.innerWidth >= 900) timer = setInterval(function () { if (!hover) on((cur + 1) % items.length); }, 2600);
      });
    }, { threshold: 0.4 }).observe(box);
  })();

  /* —— 飞行模式 —— */
  (function () {
    var box = $('#off'); if (!box) return;
    var phs = $$('.ph', box), sw = $('#air'), btn = $('#cache'), line = $('#offLine'), net = $('#net'), cnt = $('#offN'), ct = $('#cacheT');
    var air = false, n = 0, busy = false, timers = [], used = false, total = phs.length;
    function render() {
      box.classList.toggle('air', air); sw.setAttribute('aria-checked', air ? 'true' : 'false');
      setT(net, air ? T.offline : T.online);
      phs.forEach(function (p, i) {
        var got = i < n; p.classList.toggle('blur', air && !got); p.classList.toggle('got', got);
        setT($('.t', p), got ? T.saved : air ? T.blurry : T.inCloud);
      });
      setT(cnt, fmt(T.count, { n: n }));
      btn.disabled = air || busy || n >= total; setT(ct, n >= total ? T.cacheOk : air ? T.cacheNo : T.cache);
      setT(line, air ? (n >= total ? T.l3 : T.l1) : (n > 0 || busy ? T.l2 : T.l0));
    }
    function later(f, ms) { timers.push(setTimeout(f, ms)); }
    function stopAuto() { used = true; busy = false; timers.forEach(clearTimeout); timers = []; }
    function run(cb) {
      if (busy || air || n >= total) return;
      busy = true; render();
      (function step() { n++; if (n >= total) busy = false; render(); if (n < total) later(step, RM ? 0 : 230); else if (cb) cb(); })();
    }
    sw.addEventListener('click', function () { stopAuto(); air = !air; render(); });
    btn.addEventListener('click', function () { stopAuto(); run(); });
    render();
    if (!RM && 'IntersectionObserver' in W) new IntersectionObserver(function (es, ob) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return; ob.disconnect(); if (used) return;
        later(function () { air = true; render(); }, 900);
        later(function () { air = false; render(); }, 3300);
        later(function () { run(function () { later(function () { air = true; render(); }, 900); }); }, 4100);
      });
    }, { threshold: 0.55 }).observe(box);
  })();
})();

/* 第一屏底部的“往下滑”提示：滑一下就收起，不再出来；点它往下翻大半屏 */
(function () {
  var el = document.getElementById('scrollhint'); if (!el) return;
  var R = document.documentElement;
  function y() { return window.pageYOffset || R.scrollTop || 0; }
  if (y() > 24 || R.scrollHeight <= window.innerHeight + 40) { el.hidden = true; return; }
  function on() { if (y() > 24) { el.classList.add('gone'); window.removeEventListener('scroll', on); setTimeout(function () { el.hidden = true; }, 450); } }
  window.addEventListener('scroll', on, { passive: true });
  el.addEventListener('click', function () {
    var rm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollBy({ top: Math.round(window.innerHeight * 0.8), behavior: rm ? 'auto' : 'smooth' });
  });
})();
