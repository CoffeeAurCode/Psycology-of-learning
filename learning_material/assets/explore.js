/* Explorables: small interactive figures that use the app's real formulas.
   Each <div class="explorable" data-x="name"> is filled by EX[name](el). Classic script, works offline. */
(function () {
  'use strict';
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var lerp = function (x, a, b, c, d) { return c + (clamp(x, Math.min(a, b), Math.max(a, b)) - a) / (b - a) * (d - c); };
  var f = function (n, d) { return (Math.round(n * Math.pow(10, d)) / Math.pow(10, d)).toFixed(d); };
  var css = function (name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); };
  function slider(id, label, min, max, step, value, unit) {
    return '<label class="ex-slider" for="' + id + '"><span class="ex-l">' + label + '</span><input type="range" id="' + id + '" min="' + min + '" max="' + max + '" step="' + step + '" value="' + value + '"><output for="' + id + '" class="ex-v"></output>' + (unit ? '<span class="ex-u">' + unit + '</span>' : '') + '</label>';
  }
  var uid = 0;
  var EX = {};

  /* L2.08a — the swipe card: offset x and release velocity -> tilt, stamps and the decision */
  EX.swipe = function (el) {
    var a = 'ex' + (++uid), b = 'ex' + (++uid);
    el.innerHTML = '<div class="ex-head"><span class="ex-tag">Try it</span>Drag the sliders: the card uses exactly these mappings.</div>' +
      '<div class="ex-body ex-swipe"><div class="ex-stage" aria-hidden="true"><div class="ex-line l"></div><div class="ex-line r"></div><div class="ex-card"><span class="st good">GOT IT</span><span class="st bad">AGAIN</span><span class="q">Q 304</span></div></div>' +
      '<div class="ex-ctl">' + slider(a, 'Drag offset x', -260, 260, 1, 75, 'px') + slider(b, 'Release speed', 0, 1500, 10, 0, 'px/s') +
      '<dl class="ex-read"><dt>rotate</dt><dd data-r="rot"></dd><dt>“GOT IT” opacity</dt><dd data-r="good"></dd><dt>“AGAIN” opacity</dt><dd data-r="bad"></dd><dt>On release</dt><dd data-r="dec"></dd></dl></div></div>';
    var xs = el.querySelector('#' + a), vs = el.querySelector('#' + b), card = el.querySelector('.ex-card');
    function draw() {
      var x = +xs.value, v = +vs.value * (x < 0 ? -1 : 1);
      var rot = lerp(x, -220, 220, -14, 14), good = lerp(x, 30, 120, 0, 1), bad = lerp(x, -120, -30, 1, 0);
      card.style.transform = 'translateX(' + (x * 0.45) + 'px) rotate(' + rot + 'deg)';
      card.querySelector('.good').style.opacity = good; card.querySelector('.bad').style.opacity = bad;
      xs.nextElementSibling.textContent = x; vs.nextElementSibling.textContent = vs.value;
      el.querySelector('[data-r=rot]').textContent = f(rot, 1) + '°';
      el.querySelector('[data-r=good]').textContent = f(good, 2);
      el.querySelector('[data-r=bad]').textContent = f(bad, 2);
      var dec = (x > 110 || v > 650) ? 'swipe right → “known”' : (x < -110 || v < -650) ? 'swipe left → “again”' : 'spring back to the middle';
      var why = Math.abs(x) > 110 ? '|x| > 110 px' : Math.abs(v) > 650 ? 'speed > 650 px/s' : 'below both thresholds';
      el.querySelector('[data-r=dec]').innerHTML = '<b>' + dec + '</b> <span class="ex-why">(' + why + ')</span>';
    }
    xs.addEventListener('input', draw); vs.addEventListener('input', draw); draw();
  };

  /* L2.10c — deck height: the real rules of styles.css + responsive.css, applied in file order (insets 0) */
  EX.deck = function (el) {
    var a = 'ex' + (++uid), b = 'ex' + (++uid);
    el.innerHTML = '<div class="ex-head"><span class="ex-tag">Try it</span>Pick a viewport. Every block that matches is applied in file order; the last one that sets the deck wins.</div>' +
      '<div class="ex-body"><div class="ex-stage ex-phone-stage" aria-hidden="true"><div class="ex-phone"><div class="ex-chrome top"></div><div class="ex-deck"></div><div class="ex-chrome bot"></div></div></div>' +
      '<div class="ex-ctl">' + slider(a, 'Viewport width W', 280, 1440, 1, 390, 'px') + slider(b, 'Visible height H (100dvh)', 340, 1100, 1, 664, 'px') +
      '<div class="ex-presets" role="group" aria-label="Device presets"></div>' +
      '<dl class="ex-read"><dt>Blocks that match</dt><dd data-r="blocks"></dd><dt>Deck rule that wins</dt><dd data-r="rule"></dd><dt>Deck height</dt><dd data-r="h"></dd></dl></div></div>';
    var ws = el.querySelector('#' + a), hs = el.querySelector('#' + b);
    var presets = [['Pixel 7', 412, 839], ['iPhone 13', 390, 664], ['iPhone SE 1', 320, 568], ['Galaxy S9+', 320, 658], ['iPhone 13 landscape', 750, 342], ['iPad Mini', 768, 1024], ['Laptop', 1366, 768]];
    var pr = el.querySelector('.ex-presets');
    presets.forEach(function (p) { var bt = document.createElement('button'); bt.type = 'button'; bt.className = 'btn sm'; bt.textContent = p[0]; bt.addEventListener('click', function () { ws.value = p[1]; hs.value = p[2]; draw(); }); pr.appendChild(bt); });
    function draw() {
      var W = +ws.value, H = +hs.value, land = W > H, blocks = [], rule = '', h;
      h = clamp(H - 440, 340, 540); rule = 'base: clamp(340, H − 440, 540)';
      if (W <= 360) blocks.push('S (≤ 360 wide)');
      if (W <= 639 && H <= 760) { blocks.push('Sh (short phone)'); h = Math.max(236, H - 424); rule = 'Sh: max(236, H − 424)'; }
      if (H <= 520 && land) { blocks.push('L (landscape)'); h = 330; rule = 'L: 330'; }
      if (W >= 640) { blocks.push('T (≥ 640 wide)'); h = clamp(H - 440, 420, 520); rule = 'T: clamp(420, H − 440, 520)'; }
      if (W >= 1024) { blocks.push('R (≥ 1024, side rail)'); h = 500; rule = 'R: 500'; }
      if (W <= 639 && H <= 620) { blocks.push('VS (very short)'); h = Math.max(220, H - 334); rule = 'VS: max(220, H − 334)'; }
      ws.nextElementSibling.textContent = W; hs.nextElementSibling.textContent = H;
      el.querySelector('[data-r=blocks]').textContent = blocks.length ? blocks.join(', ') : 'none (base rule only)';
      el.querySelector('[data-r=rule]').textContent = rule;
      el.querySelector('[data-r=h]').innerHTML = '<b>' + h + ' px</b>' + (h > H - 120 ? ' <span class="ex-why">(taller than the room left: the page scrolls)</span>' : '');
      var ph = el.querySelector('.ex-phone'), sc = 190 / Math.max(H, W * 0.6);
      ph.style.width = Math.round(Math.min(W, 1100) * sc) + 'px'; ph.style.height = Math.round(H * sc) + 'px';
      el.querySelector('.ex-deck').style.height = Math.round(h * sc) + 'px';
    }
    ws.addEventListener('input', draw); hs.addEventListener('input', draw); draw();
  };

  /* L3.02 — coverage of 130 questions by k random tests of T distinct questions (exact inclusion–exclusion) */
  function lnC(n, k) { if (k < 0 || k > n) return -Infinity; var s = 0; for (var i = 1; i <= k; i++) s += Math.log(n - k + i) - Math.log(i); return s; }
  function pAll(N, T, k) { var p = 0; for (var j = 0; j <= N - T; j++) { var t = lnC(N, j) + k * (lnC(N - j, T) - lnC(N, T)); if (isFinite(t)) p += (j % 2 ? -1 : 1) * Math.exp(t); } return Math.max(0, Math.min(1, p)); }
  EX.coverage = function (el) {
    var a = 'ex' + (++uid), b = 'ex' + (++uid);
    el.innerHTML = '<div class="ex-head"><span class="ex-tag">Try it</span>How many ranked tests until you have seen every question? Change the test size too.</div>' +
      '<div class="ex-body"><div><svg class="ex-chart" viewBox="0 0 360 220" role="img" aria-label="Probability of having seen all questions after k tests"><g class="plot"></g></svg></div>' +
      '<div class="ex-ctl">' + slider(a, 'Tests taken k', 1, 12, 1, 5, '') + slider(b, 'Questions per test T', 40, 130, 5, 100, 'of 130') +
      '<dl class="ex-read"><dt>P(a question is in one test)</dt><dd data-r="p"></dd><dt>Expected never seen</dt><dd data-r="e"></dd><dt>P(all 130 seen)</dt><dd data-r="all"></dd></dl></div></div>';
    var ks = el.querySelector('#' + a), ts = el.querySelector('#' + b), g = el.querySelector('.plot');
    function draw() {
      var k = +ks.value, T = +ts.value, N = 130;
      ks.nextElementSibling.textContent = k; ts.nextElementSibling.textContent = T;
      el.querySelector('[data-r=p]').textContent = f(T / N, 3);
      el.querySelector('[data-r=e]').textContent = f(N * Math.pow((N - T) / N, k), 3);
      el.querySelector('[data-r=all]').innerHTML = '<b>' + f(pAll(N, T, k), 3) + '</b>';
      var x0 = 40, x1 = 345, y0 = 190, y1 = 15, X = function (kk) { return x0 + (kk - 1) / 11 * (x1 - x0); }, Y = function (p) { return y0 - p * (y0 - y1); };
      var s = '<line class="ax" x1="' + x0 + '" y1="' + y0 + '" x2="' + x1 + '" y2="' + y0 + '"/><line class="ax" x1="' + x0 + '" y1="' + y0 + '" x2="' + x0 + '" y2="' + y1 + '"/>';
      [0.5, 0.9].forEach(function (p) { s += '<line class="grid" x1="' + x0 + '" x2="' + x1 + '" y1="' + Y(p) + '" y2="' + Y(p) + '"/><text x="' + (x0 - 6) + '" y="' + (Y(p) + 4) + '" text-anchor="end">' + p + '</text>'; });
      s += '<text x="' + (x0 - 6) + '" y="' + (y1 + 4) + '" text-anchor="end">1</text><text x="' + (x0 - 6) + '" y="' + (y0 + 4) + '" text-anchor="end">0</text>';
      var d = '';
      for (var kk = 1; kk <= 12; kk++) { d += (kk === 1 ? 'M' : 'L') + X(kk).toFixed(1) + ',' + Y(pAll(N, T, kk)).toFixed(1); if (kk % 2 === 1 || kk === 12) s += '<text x="' + X(kk) + '" y="' + (y0 + 17) + '" text-anchor="middle">' + kk + '</text>'; }
      s += '<path class="curve" d="' + d + '"/><circle class="pt" r="5" cx="' + X(k) + '" cy="' + Y(pAll(N, T, k)) + '"/>';
      s += '<text x="' + ((x0 + x1) / 2) + '" y="' + (y0 + 30) + '" text-anchor="middle">tests taken k</text>';
      g.innerHTML = s;
    }
    ks.addEventListener('input', draw); ts.addEventListener('input', draw); draw();
  };

  /* L3.03 — a Motion spring (mass 1) flipping the card 0° → 180°: zeta, overshoot, settling, and the 90°/270° face rule */
  function springAt(k, c, t) { // fraction of the travel done at time t, released from rest
    var w = Math.sqrt(k), z = c / (2 * w);
    if (z < 1) { var wd = w * Math.sqrt(1 - z * z); return 1 - Math.exp(-z * w * t) * (Math.cos(wd * t) + z / Math.sqrt(1 - z * z) * Math.sin(wd * t)); }
    if (z === 1) return 1 - Math.exp(-w * t) * (1 + w * t);
    var s = w * Math.sqrt(z * z - 1), r1 = -z * w + s, r2 = -z * w - s;
    return 1 - (r2 * Math.exp(r1 * t) - r1 * Math.exp(r2 * t)) / (r2 - r1);
  }
  EX.spring = function (el) {
    var a = 'ex' + (++uid), b = 'ex' + (++uid);
    el.innerHTML = '<div class="ex-head"><span class="ex-tag">Try it</span>Tune the flip spring. The curve is the card’s angle over time; the face rule breaks if it leaves the safe band.</div>' +
      '<div class="ex-body"><div><svg class="ex-chart" viewBox="0 0 360 240" role="img" aria-label="Card angle over time for the chosen spring"><g class="plot"></g></svg></div>' +
      '<div class="ex-ctl">' + slider(a, 'Stiffness k', 100, 600, 10, 260, '') + slider(b, 'Damping c', 2, 50, 0.5, 26, '') +
      '<div class="ex-presets" role="group" aria-label="Springs from the app"></div>' +
      '<dl class="ex-read"><dt>ζ = c / (2√k)</dt><dd data-r="z"></dd><dt>ω₀ = √k</dt><dd data-r="w"></dd><dt>Overshoot</dt><dd data-r="os"></dd><dt>First peak</dt><dd data-r="pk"></dd><dt>Settles (≈ 2%)</dt><dd data-r="ts"></dd><dt>Display</dt><dd data-r="v"></dd></dl></div></div>';
    var ks = el.querySelector('#' + a), cs = el.querySelector('#' + b), g = el.querySelector('.plot');
    var presets = [['Card flip', 260, 26], ['Tab pill', 520, 40], ['Podium', 200, 20], ['Mascot', 260, 14], ['Limit', 260, 6.95], ['Damping 5', 260, 5]];
    var pr = el.querySelector('.ex-presets');
    presets.forEach(function (p) { var bt = document.createElement('button'); bt.type = 'button'; bt.className = 'btn sm'; bt.textContent = p[0]; bt.addEventListener('click', function () { ks.value = p[1]; cs.value = p[2]; draw(p[2]); }); pr.appendChild(bt); });
    function draw(cExact) {
      var k = +ks.value, c = typeof cExact === 'number' ? cExact : +cs.value, w = Math.sqrt(k), z = c / (2 * w);
      ks.nextElementSibling.textContent = k; cs.nextElementSibling.textContent = c;
      var os = z < 1 ? Math.exp(-z * Math.PI / Math.sqrt(1 - z * z)) : 0, peak = 180 * (1 + os), reb = 180 * (1 - os * os);
      el.querySelector('[data-r=z]').textContent = f(z, 3) + (z < 1 ? ' (underdamped)' : z === 1 ? ' (critical)' : ' (overdamped)');
      el.querySelector('[data-r=w]').textContent = f(w, 1) + ' rad/s';
      el.querySelector('[data-r=os]').textContent = f(os * 100, 2) + '%';
      el.querySelector('[data-r=pk]').textContent = z < 1 ? f(peak, 1) + '° at ' + f(Math.PI / (w * Math.sqrt(1 - z * z)), 2) + ' s' : 'none (no overshoot)';
      el.querySelector('[data-r=ts]').textContent = f(4 / (z * w), 2) + ' s';
      var v = peak <= 270 ? '<b class="ex-pass ok">correct throughout</b>' : reb < 90 ? '<b class="ex-pass no">mirrored, then flashes the question</b>' : '<b class="ex-pass no">mirrored answer above 270°</b>';
      el.querySelector('[data-r=v]').innerHTML = v;
      var x0 = 44, x1 = 348, y0 = 205, y1 = 12, T = 1.2, A = 320;
      var X = function (t) { return x0 + t / T * (x1 - x0); }, Y = function (deg) { return y0 - deg / A * (y0 - y1); };
      var s = '<rect class="band" x="' + x0 + '" y="' + y1 + '" width="' + (x1 - x0) + '" height="' + (Y(270) - y1) + '"/>';
      s += '<line class="ax" x1="' + x0 + '" y1="' + y0 + '" x2="' + x1 + '" y2="' + y0 + '"/><line class="ax" x1="' + x0 + '" y1="' + y0 + '" x2="' + x0 + '" y2="' + y1 + '"/>';
      [90, 180, 270].forEach(function (d) { s += '<line class="' + (d === 180 ? 'grid' : 'ref') + '" x1="' + x0 + '" x2="' + x1 + '" y1="' + Y(d) + '" y2="' + Y(d) + '"/><text x="' + (x0 - 6) + '" y="' + (Y(d) + 4) + '" text-anchor="end">' + d + '°</text>'; });
      s += '<text x="' + (x0 - 6) + '" y="' + (y0 + 4) + '" text-anchor="end">0°</text>';
      s += '<text x="' + (x1 - 4) + '" y="' + (Y(270) - 7) + '" text-anchor="end">mirrored zone</text><text x="' + (x1 - 4) + '" y="' + (Y(90) - 7) + '" text-anchor="end">face swap at 90°</text>';
      var d = '';
      for (var i = 0; i <= 240; i++) { var t = i / 240 * T, ang = Math.min(A, 180 * springAt(k, c, t)); d += (i ? 'L' : 'M') + X(t).toFixed(1) + ',' + Y(Math.max(-20, ang)).toFixed(1); }
      s += '<path class="curve" d="' + d + '"/>';
      if (z < 1) { var tp = Math.PI / (w * Math.sqrt(1 - z * z)); if (tp <= T) s += '<circle class="pt" r="4.5" cx="' + X(tp).toFixed(1) + '" cy="' + Y(Math.min(A, peak)).toFixed(1) + '"/>'; }
      [0, 0.4, 0.8, 1.2].forEach(function (t) { s += '<text x="' + X(t) + '" y="' + (y0 + 17) + '" text-anchor="middle">' + t + ' s</text>'; });
      g.innerHTML = s;
    }
    ks.addEventListener('input', draw); cs.addEventListener('input', draw); draw();
  };

  /* L3.04 — WCAG 2 contrast of a text colour on a (possibly translucent) background */
  function hexRgb(h) { h = String(h).trim().replace(/^#/, ''); if (h.length === 3) h = h.replace(/./g, '$&$&'); if (!/^[0-9a-f]{6}$/i.test(h)) return null; return [0, 2, 4].map(function (i) { return parseInt(h.slice(i, i + 2), 16); }); }
  function rgbHex(c) { return '#' + c.map(function (v) { return ('0' + Math.round(v).toString(16)).slice(-2); }).join(''); }
  function lum(c) { var l = c.map(function (v) { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * l[0] + 0.7152 * l[1] + 0.0722 * l[2]; }
  EX.contrast = function (el) {
    var ids = [1, 2, 3, 4].map(function () { return 'ex' + (++uid); });
    var field = function (id, label, val) { return '<label class="ex-slider" for="' + id + '"><span class="ex-l">' + label + '</span><input class="ex-input" id="' + id + '" value="' + val + '" spellcheck="false" autocomplete="off" maxlength="7"><input type="color" value="' + val + '" aria-label="' + label + ' picker" tabindex="-1" style="width:40px;height:34px;border:0;background:none;padding:0"></label>'; };
    el.innerHTML = '<div class="ex-head"><span class="ex-tag">Try it</span>Type any two colours, or make the background translucent over something darker.</div>' +
      '<div class="ex-body"><div class="ex-swatch" data-r="sw"><span>Tap to flip back<small>16 px regular: needs 4.5 : 1</small></span><span style="font-size:1.6rem;font-weight:800;margin-top:6px">Again<small>24 px bold: needs 3 : 1</small></span></div>' +
      '<div class="ex-ctl">' + field(ids[0], 'Text colour', '#d7262f') + field(ids[1], 'Background colour', '#fbe3e1') +
      slider(ids[2], 'Background opacity α', 0.5, 1, 0.01, 1, '') + field(ids[3], 'Behind the background (used when α < 1)', '#120f0e') +
      '<div class="ex-presets" role="group" aria-label="Pairs from the lesson"></div>' +
      '<dl class="ex-read"><dt>L text</dt><dd data-r="lt"></dd><dt>Painted background</dt><dd data-r="pb"></dd><dt>Contrast</dt><dd data-r="cr"></dd><dt>AA normal text</dt><dd data-r="n"></dd><dt>AA large text, icons</dt><dd data-r="lg"></dd></dl></div></div>';
    var fg = el.querySelector('#' + ids[0]), bg = el.querySelector('#' + ids[1]), al = el.querySelector('#' + ids[2]), be = el.querySelector('#' + ids[3]);
    [fg, bg, be].forEach(function (inp) {
      var pick = inp.nextElementSibling;
      inp.addEventListener('input', function () { if (hexRgb(inp.value)) pick.value = rgbHex(hexRgb(inp.value)); draw(); });
      pick.addEventListener('input', function () { inp.value = pick.value; draw(); });
    });
    al.addEventListener('input', draw);
    var presets = [['“Again”, before', '#d7262f', '#fbe3e1', 1], ['“Again”, after', '#b81f28', '#fbe3e1', 1], ['Brand red on cream', '#d7262f', '#f6f0e6', 1],
      ['Tab label, 86% bar over hero', '#6f6359', '#fffdf9', 0.86], ['Fixed: --tab-ink, 95% bar', '#574c43', '#fffdf9', 0.95], ['Card hint, before', '#7a6e63', '#120f0e', 1]];
    var pr = el.querySelector('.ex-presets');
    presets.forEach(function (p) { var bt = document.createElement('button'); bt.type = 'button'; bt.className = 'btn sm'; bt.textContent = p[0]; bt.addEventListener('click', function () { fg.value = p[1]; bg.value = p[2]; al.value = p[3]; be.value = '#120f0e'; [fg, bg, be].forEach(function (i) { i.nextElementSibling.value = i.value; }); draw(); }); pr.appendChild(bt); });
    function draw() {
      var a = +al.value; al.nextElementSibling.textContent = f(a, 2);
      var F = hexRgb(fg.value), B = hexRgb(bg.value), H = hexRgb(be.value) || [0, 0, 0];
      fg.setAttribute('aria-invalid', !F); bg.setAttribute('aria-invalid', !B);
      if (!F || !B) { el.querySelector('[data-r=cr]').textContent = 'enter colours as #rrggbb'; return; }
      var P = B.map(function (v, i) { return Math.round(a * v + (1 - a) * H[i]); });
      var lt = lum(F), lb = lum(P), r = (Math.max(lt, lb) + 0.05) / (Math.min(lt, lb) + 0.05);
      var sw = el.querySelector('[data-r=sw]'); sw.style.background = rgbHex(P); sw.style.color = rgbHex(F);
      el.querySelector('[data-r=lt]').textContent = f(lt, 3);
      el.querySelector('[data-r=pb]').textContent = rgbHex(P) + ' · L ' + f(lb, 3);
      el.querySelector('[data-r=cr]').innerHTML = '<b>' + f(r, 2) + ' : 1</b>';
      var pf = function (ok) { return '<b class="ex-pass ' + (ok ? 'ok">pass' : 'no">fail') + '</b>'; };
      el.querySelector('[data-r=n]').innerHTML = pf(r >= 4.5); el.querySelector('[data-r=lg]').innerHTML = pf(r >= 3);
    }
    draw();
  };

  /* L3.06 — PKCE S256: verifier -> SHA-256 -> base64 -> base64url, with the avalanche effect */
  function sha256(bytes) { // FIPS 180-4, synchronous, returns Uint8Array(32)
    var K = [0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2];
    var H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
    var n = bytes.length, len = ((n + 9 + 63) >> 6) << 6, m = new Uint8Array(len); m.set(bytes); m[n] = 0x80;
    var bits = n * 8; m[len - 4] = bits >>> 24; m[len - 3] = bits >>> 16; m[len - 2] = bits >>> 8; m[len - 1] = bits; m[len - 5] = Math.floor(bits / 4294967296);
    var w = new Array(64), ror = function (x, k) { return (x >>> k) | (x << (32 - k)); };
    for (var o = 0; o < len; o += 64) {
      for (var i = 0; i < 16; i++) w[i] = (m[o + 4 * i] << 24) | (m[o + 4 * i + 1] << 16) | (m[o + 4 * i + 2] << 8) | m[o + 4 * i + 3];
      for (i = 16; i < 64; i++) { var s0 = ror(w[i - 15], 7) ^ ror(w[i - 15], 18) ^ (w[i - 15] >>> 3), s1 = ror(w[i - 2], 17) ^ ror(w[i - 2], 19) ^ (w[i - 2] >>> 10); w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0; }
      var a = H[0], b = H[1], c = H[2], d = H[3], e = H[4], f2 = H[5], g = H[6], h = H[7];
      for (i = 0; i < 64; i++) {
        var t1 = (h + (ror(e, 6) ^ ror(e, 11) ^ ror(e, 25)) + ((e & f2) ^ (~e & g)) + K[i] + w[i]) | 0;
        var t2 = ((ror(a, 2) ^ ror(a, 13) ^ ror(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) | 0;
        h = g; g = f2; f2 = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
      }
      H = [H[0] + a, H[1] + b, H[2] + c, H[3] + d, H[4] + e, H[5] + f2, H[6] + g, H[7] + h].map(function (x) { return x | 0; });
    }
    var out = new Uint8Array(32); H.forEach(function (x, j) { out[4 * j] = x >>> 24; out[4 * j + 1] = x >>> 16; out[4 * j + 2] = x >>> 8; out[4 * j + 3] = x; }); return out;
  }
  EX.pkce = function (el) {
    var id = 'ex' + (++uid);
    var esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;'); };
    el.innerHTML = '<div class="ex-head"><span class="ex-tag">Try it</span>Edit the verifier: change one character and watch about half of the hash bits flip.</div>' +
      '<div class="ex-body" style="grid-template-columns:minmax(0,1fr)"><div class="ex-ctl">' +
      '<label class="ex-slider" for="' + id + '"><span class="ex-l">Code verifier v <span class="ex-why" data-r="vl"></span></span><textarea class="ex-input" id="' + id + '" rows="3" spellcheck="false" style="resize:vertical;grid-column:1/-1;word-break:break-all"></textarea></label>' +
      '<div class="ex-presets"><button type="button" class="btn sm" data-a="ex">Lesson example (a3f1 × 28)</button><button type="button" class="btn sm" data-a="rnd">New random verifier (like supabase-js)</button><button type="button" class="btn sm" data-a="one">Change one character</button></div>' +
      '<dl class="ex-read" style="grid-template-columns:auto minmax(0,1fr)"><dt>SHA-256 (hex, 32 bytes)</dt><dd data-r="hex" style="word-break:break-all"></dd><dt>base64</dt><dd data-r="b64" style="word-break:break-all"></dd><dt>base64url = challenge c</dt><dd data-r="c" style="word-break:break-all"></dd><dt>Length of c</dt><dd data-r="len"></dd><dt>Bits flipped vs previous</dt><dd data-r="flip"></dd></dl></div></div>';
    var ta = el.querySelector('#' + id), prev = null;
    var ex = 'a3f1'.repeat(28);
    function rnd() { var a = new Uint32Array(56); (window.crypto || {}).getRandomValues ? crypto.getRandomValues(a) : a.forEach(function (_, i) { a[i] = Math.random() * 4294967296; }); return Array.prototype.map.call(a, function (d) { return ('0' + d.toString(16)).slice(-2); }).join(''); }
    el.querySelector('[data-a=ex]').addEventListener('click', function () { ta.value = ex; draw(); });
    el.querySelector('[data-a=rnd]').addEventListener('click', function () { ta.value = rnd(); draw(); });
    el.querySelector('[data-a=one]').addEventListener('click', function () { var v = ta.value || ex, i = Math.floor(Math.random() * v.length), ch = v[i] === 'a' ? 'b' : 'a'; ta.value = v.slice(0, i) + ch + v.slice(i + 1); draw(); });
    ta.addEventListener('input', draw);
    function draw() {
      var v = ta.value, bytes = new TextEncoder().encode(v), dg = sha256(bytes);
      var hex = Array.prototype.map.call(dg, function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
      var b64 = btoa(String.fromCharCode.apply(null, dg)), c = b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      var ok = /^[A-Za-z0-9\-._~]{43,128}$/.test(v);
      el.querySelector('[data-r=vl]').textContent = '(' + v.length + ' chars' + (ok ? ', valid' : ', RFC 7636 wants 43–128 of A–Z a–z 0–9 - . _ ~') + ')';
      el.querySelector('[data-r=hex]').textContent = hex;
      el.querySelector('[data-r=b64]').innerHTML = esc(b64).replace(/[+\/=]/g, '<mark>$&</mark>');
      el.querySelector('[data-r=c]').innerHTML = '<b>' + esc(c).replace(/[-_]/g, '<mark>$&</mark>') + '</b>';
      el.querySelector('[data-r=len]').textContent = c.length + ' characters (⌈256 ÷ 6⌉ = 43)';
      if (prev && prev.v !== v) { var n = 0; for (var i = 0; i < 32; i++) { var x = dg[i] ^ prev.dg[i]; while (x) { n += x & 1; x >>= 1; } } el.querySelector('[data-r=flip]').innerHTML = '<b>' + n + '</b> of 256 <span class="ex-why">(about 128 expected)</span>'; }
      else if (!prev) el.querySelector('[data-r=flip]').textContent = '— change the verifier to compare';
      prev = { v: v, dg: dg };
    }
    ta.value = ex; draw();
  };

  document.querySelectorAll('.explorable[data-x]').forEach(function (el) {
    var fn = EX[el.getAttribute('data-x')];
    if (fn) { try { fn(el); } catch (e) { el.textContent = 'This interactive figure could not start: ' + e.message; } }
  });
  window.EXPLORE = EX;
})();
