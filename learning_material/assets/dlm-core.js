/* ==========================================================================
   dlm-core.js: design-agnostic logic helpers for learning material
   --------------------------------------------------------------------------
   No CSS, no markup assumptions, no class names. Every page designs its own
   UI; this file only provides the fiddly logic that must be correct:
   storage, step control, code-to-lines highlighting, spaced repetition,
   study-plan scheduling, math rendering. Optional: write your own if you prefer.

   Classic script (works from file://). Exposes window.DLMCore.
   Also loadable in Node for testing: module.exports = DLMCore.
   ========================================================================== */
(function (root) {
  'use strict';

  var Core = {};

  /* ---------- storage (namespaced, never throws) ---------- */
  Core.storage = function (namespace) {
    var prefix = 'dlm:' + (namespace || 'default') + ':';
    function ls() { try { return root.localStorage; } catch (e) { return null; } }
    return {
      get: function (k, fallback) {
        try { var v = ls() && ls().getItem(prefix + k); return v == null ? fallback : JSON.parse(v); } catch (e) { return fallback; }
      },
      set: function (k, v) { try { ls() && ls().setItem(prefix + k, JSON.stringify(v)); } catch (e) { /* blocked: ignore */ } },
      remove: function (k) { try { ls() && ls().removeItem(prefix + k); } catch (e) { /* ignore */ } }
    };
  };

  /* ---------- small utilities ---------- */
  Core.escapeHtml = function (s) {
    return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  };

  // "1,3-5" -> {1:true,3:true,4:true,5:true}
  Core.parseRanges = function (spec) {
    var out = {};
    String(spec == null ? '' : spec).split(',').forEach(function (part) {
      part = part.trim(); if (!part) return;
      var m = part.split('-'), a = parseInt(m[0], 10), b = m.length > 1 ? parseInt(m[1], 10) : a;
      if (isNaN(a) || isNaN(b)) return;
      for (var i = Math.min(a, b); i <= Math.max(a, b); i++) out[i] = true;
    });
    return out;
  };

  // strip common indentation and surrounding blank lines (lets code sit indented inside HTML)
  Core.dedent = function (text) {
    var lines = String(text).replace(/\t/g, '    ').split('\n');
    while (lines.length && !lines[0].trim()) lines.shift();
    while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
    var min = Infinity;
    lines.forEach(function (l) { if (l.trim()) min = Math.min(min, l.match(/^ */)[0].length); });
    if (!isFinite(min)) min = 0;
    return lines.map(function (l) { return l.slice(min); }).join('\n');
  };

  Core.formatMinutes = function (mins) {
    mins = Math.round(mins);
    var h = Math.floor(mins / 60), m = mins % 60;
    return h ? h + ' h' + (m ? ' ' + m + ' min' : '') : m + ' min';
  };

  Core.prefersReducedMotion = function () {
    return !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches);
  };

  /* ---------- code: highlighted HTML split into per-line strings ----------
     Core.highlightLines(code, 'python') -> ['<span class="token keyword">def</span> f():', ...]
     Uses Prism if loaded (Prism token classes are yours to style), else escaped text.
     Spans that cross newlines are closed and reopened, so each line is valid HTML.     */
  var ALIAS = { js: 'javascript', ts: 'typescript', py: 'python', sh: 'bash', shell: 'bash', yml: 'yaml', html: 'markup', xml: 'markup', 'c++': 'cpp', rs: 'rust' };
  Core.splitHighlighted = function (html) {
    var lines = [], cur = '', open = [], re = /(<\/?span[^>]*>)|([^<]+)|(<)/g, m;
    while ((m = re.exec(html))) {
      if (m[1]) { if (m[1].charAt(1) === '/') open.pop(); else open.push(m[1]); cur += m[1]; continue; }
      var parts = (m[2] || m[3]).split('\n');
      for (var i = 0; i < parts.length; i++) {
        if (i > 0) { cur += open.map(function () { return '</span>'; }).join(''); lines.push(cur); cur = open.join(''); }
        cur += parts[i];
      }
    }
    lines.push(cur);
    return lines;
  };
  Core.highlightLines = function (code, lang) {
    lang = String(lang || '').toLowerCase(); lang = ALIAS[lang] || lang;
    var P = root.Prism, html;
    if (P && P.languages && P.languages[lang]) { try { html = P.highlight(code, P.languages[lang], lang); } catch (e) { html = null; } }
    return Core.splitHighlighted(html == null ? Core.escapeHtml(code) : html);
  };

  /* ---------- step controller (no UI) ----------
     var steps = Core.StepController({ count: 7, onStep: function (i, prev) { paint(i); }, interval: 1800 });
     steps.next(); steps.prev(); steps.go(3); steps.play(); steps.pause(); steps.toggle();
     steps.bindKeys(figureElement)  // ←/→, Home/End, Space when the element has focus
     onStep must set the whole visual state from i alone (steps can be jumped to directly).  */
  Core.StepController = function (opts) {
    var self = { index: -1, count: opts.count, playing: false }, timer = null, listeners = [];
    function emit(prev) {
      if (opts.onStep) opts.onStep(self.index, prev);
      listeners.forEach(function (fn) { fn(self.index, prev); });
    }
    self.onChange = function (fn) { listeners.push(fn); };
    self.go = function (i) {
      i = Math.max(0, Math.min(self.count - 1, i));
      if (i === self.index) return;
      var prev = self.index; self.index = i; emit(prev);
      if (i === self.count - 1) self.pause();
    };
    self.next = function () { self.go(self.index + 1); };
    self.prev = function () { self.go(self.index - 1); };
    self.restart = function () { self.pause(); self.go(0); };
    self.play = function () {
      if (self.playing) return;
      if (self.index >= self.count - 1) self.go(0);
      self.playing = true; emit(self.index);
      timer = setInterval(function () { self.go(self.index + 1); }, opts.interval || 1800);
    };
    self.pause = function () {
      if (timer) clearInterval(timer); timer = null;
      if (self.playing) { self.playing = false; emit(self.index); }
    };
    self.toggle = function () { self.playing ? self.pause() : self.play(); };
    self.bindKeys = function (el) {
      if (!el.hasAttribute('tabindex')) el.tabIndex = 0;
      el.addEventListener('keydown', function (e) {
        if (e.target.closest && e.target.closest('input, textarea, select, button')) return;
        var k = e.key;
        if (k === 'ArrowRight') { self.pause(); self.next(); }
        else if (k === 'ArrowLeft') { self.pause(); self.prev(); }
        else if (k === 'Home') { self.pause(); self.go(0); }
        else if (k === 'End') { self.pause(); self.go(self.count - 1); }
        else if (k === ' ') self.toggle();
        else return;
        e.preventDefault();
      });
    };
    self.go(opts.start || 0);
    return self;
  };

  /* ---------- spaced repetition (Leitner boxes) ----------
     var deck = Core.Deck('deck-l2-03', ['index-formula', 'load-factor'], Core.storage('kv-store'));
     deck.due()               -> card ids due now (never-seen cards are due)
     deck.grade(id, 'again' | 'hard' | 'good')
     deck.stats()             -> { total, due, learning, longTerm }                         */
  Core.BOX_DAYS = [0, 1, 3, 7, 16, 35];
  var DAY = 864e5;
  function startOfDay(t) { var d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); }
  Core.gradeCard = function (state, grade, now) {
    var s = { box: (state && state.box) || 0, due: (state && state.due) || 0 };
    if (grade === 'again') s.box = 0;
    else if (grade === 'hard') s.box = Math.max(1, s.box);
    else s.box = Math.min(Core.BOX_DAYS.length - 1, s.box + 1);
    s.due = startOfDay(now == null ? Date.now() : now) + Core.BOX_DAYS[s.box] * DAY;
    return s;
  };
  Core.Deck = function (deckId, cardIds, store) {
    store = store || Core.storage('default');
    function key(id) { return 'fc:' + deckId + ':' + id; }
    function state(id) { return store.get(key(id), { box: 0, due: 0 }); }
    return {
      state: state,
      due: function (now) { var t = now == null ? Date.now() : now; return cardIds.filter(function (id) { return state(id).due <= t; }); },
      grade: function (id, g, now) { var s = Core.gradeCard(state(id), g, now); store.set(key(id), s); return s; },
      stats: function (now) {
        var t = now == null ? Date.now() : now, out = { total: cardIds.length, due: 0, learning: 0, longTerm: 0 };
        cardIds.forEach(function (id) { var s = state(id); if (s.due <= t) out.due++; if (s.box >= 4) out.longTerm++; else if (s.box > 0) out.learning++; });
        return out;
      },
      reset: function () { cardIds.forEach(function (id) { store.remove(key(id)); }); }
    };
  };

  /* ---------- study plan scheduling ----------
     Core.schedulePlan(items, { minutesPerDay: 90, reviewMinutes: 10, reviewOffsets: [1,3,7,14] })
       items: [{ id, level, kind: 'learn'|'read'|'practice'|'checkpoint', title, href, minutes, review? }]
       -> days: [{ minutes, items: [{ id, baseId, kind, title, href, level, minutes, part, parts }] }]
     Rules: items keep their order; an item longer than a day is split into parts; each 'learn' item
     gets review items on study-day offsets after its last part; a day's reviews are placed first.
     Core.studyDates(n, '2026-09-17', 5) -> the calendar dates of n study days (5/week skips weekends). */
  Core.schedulePlan = function (items, cfg) {
    cfg = cfg || {};
    var cap = Math.max(15, cfg.minutesPerDay || 90), reviewMin = cfg.reviewMinutes || 10, offsets = cfg.reviewOffsets || [1, 3, 7, 14];
    var queue = [];
    items.forEach(function (it) {
      var kind = it.kind || 'learn', parts = Math.max(1, Math.ceil(it.minutes / cap));
      for (var p = 1; p <= parts; p++) {
        queue.push({ id: parts > 1 ? it.id + '#' + p : it.id, baseId: it.id, kind: kind, title: it.title, href: it.href, level: it.level,
          minutes: Math.round(it.minutes / parts), part: p, parts: parts, reviewAfter: p === parts && kind === 'learn' && it.review !== false });
      }
    });
    var days = [], pending = {}, d = 0;
    function hasPendingFrom(day) { for (var k in pending) if (+k >= day && pending[k].length) return true; return false; }
    while (queue.length || hasPendingFrom(d)) {
      var day = { minutes: 0, items: [] };
      (pending[d] || []).forEach(function (r) { day.items.push(r); day.minutes += r.minutes; });
      while (queue.length) {
        var fresh = day.items.some(function (x) { return x.kind !== 'review'; });
        if (fresh && day.minutes + queue[0].minutes > cap) break;
        var it = queue.shift(); day.items.push(it); day.minutes += it.minutes;
        if (it.reviewAfter) offsets.forEach(function (off, n) {
          (pending[d + off] = pending[d + off] || []).push({ id: it.baseId + '@review' + (n + 1), baseId: it.baseId, kind: 'review', title: it.title,
            href: it.href, level: it.level, minutes: reviewMin, part: n + 1, parts: offsets.length });
        });
        if (day.minutes >= cap) break;
      }
      days.push(day); d++;
      if (d > 3000) break;
    }
    return days;
  };
  var WEEKDAYS = { 1: [3], 2: [2, 5], 3: [1, 3, 5], 4: [1, 2, 4, 5], 5: [1, 2, 3, 4, 5], 6: [1, 2, 3, 4, 5, 6], 7: [0, 1, 2, 3, 4, 5, 6] };
  Core.studyDates = function (n, startIso, daysPerWeek) {
    var allowed = WEEKDAYS[daysPerWeek] || WEEKDAYS[5], out = [], d = new Date(startIso + 'T00:00:00'), guard = 0;
    while (out.length < n && guard++ < 20000) { if (allowed.indexOf(d.getDay()) >= 0) out.push(new Date(d)); d.setDate(d.getDate() + 1); }
    return out;
  };
  Core.planTotals = function (days) {
    var t = { days: days.length, minutes: 0, reviewMinutes: 0, reviews: 0 };
    days.forEach(function (day) { day.items.forEach(function (x) { t.minutes += x.minutes; if (x.kind === 'review') { t.reviews++; t.reviewMinutes += x.minutes; } }); });
    return t;
  };

  /* ---------- math ----------
     Core.renderMath(element) renders \( \), \[ \], $$ $$ with KaTeX auto-render if loaded.
     Skips pre, code, textarea and anything with class "no-math".                         */
  Core.renderMath = function (el) {
    if (typeof root.renderMathInElement !== 'function') return false;
    root.renderMathInElement(el || root.document.body, {
      delimiters: [{ left: '$$', right: '$$', display: true }, { left: '\\[', right: '\\]', display: true }, { left: '\\(', right: '\\)', display: false }],
      ignoredClasses: ['no-math'], throwOnError: false, strict: 'ignore'
    });
    return true;
  };

  root.DLMCore = Core;
  if (typeof module !== 'undefined' && module.exports) module.exports = Core;
})(typeof window !== 'undefined' ? window : globalThis);
