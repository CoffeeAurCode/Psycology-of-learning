/* Coffee aur Code · study series — shared page behaviour.
   Classic script (works from file://). Needs dlm-core.js and series.js first. */
(function () {
  'use strict';
  var SLUG = 'psych-learning-build';
  var store = DLMCore.storage(SLUG);
  var reduced = DLMCore.prefersReducedMotion();
  var $ = function (sel, el) { return (el || document).querySelector(sel); };
  var $$ = function (sel, el) { return Array.prototype.slice.call((el || document).querySelectorAll(sel)); };
  var norm = function (s) { return String(s || '').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, '').toLowerCase(); };

  /* ------------------------------------------------------------ theme */
  function currentTheme() {
    var t = document.documentElement.getAttribute('data-theme');
    if (t) return t;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  $$('.theme-toggle').forEach(function (b) {
    var label = function () { b.setAttribute('aria-label', currentTheme() === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'); };
    label();
    b.addEventListener('click', function () {
      var next = currentTheme() === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      store.set('theme', next);
      label();
      document.dispatchEvent(new CustomEvent('themechange'));
    });
  });

  /* ------------------------------------------------------------ drawers */
  var lastFocus = null;
  function openDrawer(id) {
    var d = document.getElementById(id); if (!d) return;
    lastFocus = document.activeElement;
    d.classList.add('open');
    document.body.style.overflow = 'hidden';
    var f = d.querySelector('input, a[aria-current], button[data-close]');
    setTimeout(function () { (f || d).focus(); }, 30);
  }
  function closeDrawer(d) {
    d.classList.remove('open');
    document.body.style.overflow = '';
    if (lastFocus) lastFocus.focus();
  }
  $$('[data-open]').forEach(function (b) { b.addEventListener('click', function () { openDrawer(b.getAttribute('data-open')); }); });
  $$('.drawer').forEach(function (d) {
    $$('[data-close]', d).forEach(function (c) { c.addEventListener('click', function () { closeDrawer(d); }); });
    d.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeDrawer(d);
      if (e.key === 'Tab') { // keep focus inside
        var f = $$('a[href], button, input', d).filter(function (x) { return x.offsetParent !== null; });
        if (!f.length) return;
        if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
      }
    });
    $$('a[href^="#"]', d).forEach(function (a) { a.addEventListener('click', function () { closeDrawer(d); }); });
  });
  var ms = $('.menu-search');
  if (ms) ms.addEventListener('input', function () {
    var q = ms.value.trim().toLowerCase();
    $$('#menu .menu-list li').forEach(function (li) { li.style.display = !q || li.getAttribute('data-search').indexOf(q) >= 0 ? '' : 'none'; });
  });

  /* ------------------------------------------------------------ completion */
  function isDone(id) { return !!store.get('done:' + id, false); }
  function paintDone() {
    $$('[data-done]').forEach(function (t) { t.classList.toggle('on', isDone(t.getAttribute('data-done'))); t.setAttribute('aria-label', isDone(t.getAttribute('data-done')) ? 'completed' : ''); });
    $$('[data-complete]').forEach(function (b) {
      var on = isDone(b.getAttribute('data-complete'));
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      b.textContent = on ? '✓ Completed' : (b.classList.contains('primary') ? 'Mark lesson complete' : 'Mark complete');
    });
    document.dispatchEvent(new CustomEvent('progresschange'));
  }
  $$('[data-complete]').forEach(function (b) {
    b.addEventListener('click', function () {
      var id = b.getAttribute('data-complete');
      store.set('done:' + id, !isDone(id));
      paintDone();
    });
  });
  window.SeriesProgress = { isDone: isDone, paint: paintDone };
  paintDone();

  /* ------------------------------------------------------------ reading progress + scrollspy */
  var bar = $('.read-progress');
  var main = $('main.lesson');
  if (bar && main) {
    var tick = function () {
      var r = main.getBoundingClientRect();
      var total = r.height - window.innerHeight;
      var p = total > 0 ? Math.min(1, Math.max(0, -r.top / total)) : 0;
      bar.style.setProperty('--p', p.toFixed(3));
    };
    window.addEventListener('scroll', tick, { passive: true }); tick();
  }
  var secs = $$('section.lsec');
  if (secs.length && 'IntersectionObserver' in window) {
    var links = $$('.toc a[href^="#"], .toc-drawer a[href^="#"]');
    var setCurrent = function (id) { links.forEach(function (a) { a.setAttribute('aria-current', a.getAttribute('href') === '#' + id ? 'true' : 'false'); }); };
    var visible = {};
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { visible[e.target.id] = e.isIntersecting; });
      for (var i = 0; i < secs.length; i++) if (visible[secs[i].id]) { setCurrent(secs[i].id); break; }
    }, { rootMargin: '-80px 0px -60% 0px' });
    secs.forEach(function (s) { io.observe(s); });
  }

  /* ------------------------------------------------------------ code blocks */
  $$('.code').forEach(function (cb) {
    var copy = $('.copy', cb), src = $('.copy-src', cb);
    if (copy && src) copy.addEventListener('click', function () {
      var text = src.value;
      var done = function () { copy.textContent = 'Copied ✓'; setTimeout(function () { copy.textContent = 'Copy'; }, 1600); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, function () { fallbackCopy(text); done(); });
      else { fallbackCopy(text); done(); }
    });
    var more = $('.more', cb);
    if (more) more.addEventListener('click', function () {
      var on = cb.classList.toggle('expanded');
      more.setAttribute('aria-expanded', on ? 'true' : 'false');
      more.textContent = on ? 'Collapse' : 'Show all ' + $$('.ln', cb).length + ' lines';
      if (!on) cb.scrollIntoView({ block: 'nearest' });
    });
  });
  function fallbackCopy(text) {
    var t = document.createElement('textarea'); t.value = text; t.style.position = 'fixed'; t.style.opacity = '0';
    document.body.appendChild(t); t.select(); try { document.execCommand('copy'); } catch (e) { /* ignore */ } document.body.removeChild(t);
  }
  // line notes <-> code lines
  $$('.line-notes').forEach(function (ul) {
    var cb = document.getElementById(ul.getAttribute('data-for')); if (!cb) return;
    var lines = $$('.ln', cb), pre = $('pre', cb);
    var active = null;
    var mark = function (li, scroll) {
      lines.forEach(function (l) { l.classList.remove('hl'); });
      $$('li.active', ul).forEach(function (x) { x.classList.remove('active'); });
      if (!li) return;
      var ns = li.getAttribute('data-lines').split(',').map(Number);
      ns.forEach(function (n) { if (lines[n - 1]) lines[n - 1].classList.add('hl'); });
      li.classList.add('active');
      if (scroll && lines[ns[0] - 1]) {
        var ln = lines[ns[0] - 1];
        pre.scrollTop = Math.max(0, ln.offsetTop - pre.clientHeight / 3);
        var r = cb.getBoundingClientRect();
        if (r.bottom < 80 || r.top > window.innerHeight - 80) cb.scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' });
      }
    };
    $$('li.pairable', ul).forEach(function (li) {
      li.addEventListener('mouseenter', function () { if (!active) mark(li, false); });
      li.addEventListener('mouseleave', function () { if (!active) mark(null); else mark(active, false); });
      var act = function () { active = active === li ? null : li; mark(active, true); };
      li.addEventListener('click', function (e) { if (e.target.closest('a')) return; act(); });
      li.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); act(); } });
    });
  });

  /* ------------------------------------------------------------ figures */
  $$('.fig').forEach(function (fig) {
    var z = $('.fig-zoom', fig), svg = $('svg.dg', fig);
    if (z && svg) z.addEventListener('click', function () {
      var ov = document.createElement('div');
      ov.className = 'fig-zoomed'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-label', 'Enlarged figure');
      ov.innerHTML = '<button class="btn fig-close" type="button">Close ✕</button>';
      var c = svg.cloneNode(true); c.removeAttribute('id');
      ov.appendChild(c);
      var cap = $('figcaption', fig); if (cap) { var p = document.createElement('p'); p.className = 'takeaway'; p.innerHTML = cap.innerHTML; ov.appendChild(p); }
      document.body.appendChild(ov); document.body.style.overflow = 'hidden';
      var close = function () { ov.remove(); document.body.style.overflow = ''; z.focus(); };
      $('.fig-close', ov).addEventListener('click', close);
      ov.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
      $('.fig-close', ov).focus();
    });
  });
  if (!reduced && 'IntersectionObserver' in window) {
    var figs = $$('.fig');
    figs.forEach(function (fig) {
      $$('.dg-e', fig).forEach(function (p) { try { p.style.setProperty('--len', Math.ceil(p.getTotalLength()) + 1); } catch (e) { /* ignore */ } });
      fig.classList.add('reveal-ready');
    });
    var fio = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('revealed'); fio.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -15% 0px' });
    figs.forEach(function (f) { fio.observe(f); });
  }

  /* ------------------------------------------------------------ steppers (order tickets) */
  $$('.stepper').forEach(function (st) {
    var items = $$('.stepper-src > li', st);
    var body = $('.ticket-body', st), count = $('.count', st);
    var rail = $$('.rail button', st);
    var btn = function (k) { return $('[data-step="' + k + '"]', st); };
    var revealed = {};
    var prevFields = null;
    function paint(i) {
      var li = items[i];
      var main = $('.st-main', li), fs = $$('.st-f', li), pq = $('.st-pq', li), pa = $('.st-pa', li);
      var html = '<p class="step-main">' + main.innerHTML.replace(/^<span class="st-k">[^<]*<\/span>\s*/, '') + '</p>';
      var shown = revealed[i] || !pq;
      if (pq) {
        html += '<div class="predict"><span class="pl">Predict</span><span class="pq">' + pq.innerHTML + '</span>' +
          (shown ? (pa ? '<span class="pa">→ ' + pa.innerHTML + '</span>' : '') : '<button type="button" class="btn sm" data-predict>Reveal</button>') + '</div>';
      }
      if (fs.length) {
        html += '<dl class="ticket-fields"' + (shown ? '' : ' hidden') + '>' + fs.map(function (f, k) {
          var v = $('.st-fv', f).innerHTML;
          var changed = prevFields && prevFields[k] !== undefined && prevFields[k] !== v;
          return '<dt>' + $('.st-fk', f).innerHTML + '</dt><dd' + (changed && !reduced ? ' class="changed"' : '') + '>' + v + '</dd>';
        }).join('') + '</dl>';
        if (!shown) html += '<p class="ticket-hidden-note">The result is on the back of the ticket: make your guess, then reveal.</p>';
      }
      body.innerHTML = html;
      prevFields = fs.map(function (f) { return $('.st-fv', f).innerHTML; });
      var rb = $('[data-predict]', body);
      if (rb) rb.addEventListener('click', function () { revealed[i] = true; paint(i); var f = $('.ticket-fields', body); if (f) f.setAttribute('tabindex', '-1'); });
      count.textContent = (i + 1) + ' / ' + items.length;
      rail.forEach(function (b, k) { b.classList.toggle('done', k < i); if (k === i) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current'); });
      btn('prev').disabled = i === 0; btn('next').disabled = i === items.length - 1;
      var cur = rail[i]; if (cur && cur.parentNode.scrollWidth > cur.parentNode.clientWidth) cur.parentNode.scrollLeft = cur.offsetLeft - cur.parentNode.clientWidth / 2;
    }
    var ctl = DLMCore.StepController({
      count: items.length, interval: 3200,
      onStep: function (i, prev) {
        if (prev != null && i === prev + 1) revealed[prev] = true; // moving on answers the previous prediction
        if (prev == null || Math.abs(i - prev) !== 1) prevFields = null;
        paint(i);
      }
    });
    ctl.onChange && ctl.onChange(function () { var p = btn('play'); p.setAttribute('aria-pressed', ctl.playing ? 'true' : 'false'); p.textContent = ctl.playing ? 'Pause' : 'Play'; });
    btn('next').addEventListener('click', function () { ctl.pause(); ctl.next(); });
    btn('prev').addEventListener('click', function () { ctl.pause(); ctl.prev(); });
    btn('restart').addEventListener('click', function () { ctl.restart(); });
    btn('play').addEventListener('click', function () { if (reduced && !ctl.playing) { ctl.next(); return; } ctl.toggle(); var p = btn('play'); p.setAttribute('aria-pressed', ctl.playing ? 'true' : 'false'); p.textContent = ctl.playing ? 'Pause' : 'Play'; });
    rail.forEach(function (b, k) { b.addEventListener('click', function () { ctl.pause(); ctl.go(k); }); });
    ctl.bindKeys(st);
    paint(0);
  });

  /* ------------------------------------------------------------ quizzes */
  function quizState(id) { return store.get('quiz:' + id, null); }
  function scoreSection(sec) {
    if (!sec) return;
    var s = $('.quiz-score', sec); if (!s) return;
    var right = $$('.quiz', sec).filter(function (q) { var st = quizState(q.getAttribute('data-quiz')); return st && st.right; }).length;
    $('.qs-right', s).textContent = right;
  }
  $$('.quiz').forEach(function (q) {
    var id = q.getAttribute('data-quiz');
    var sec = q.closest('section');
    var fb = $('.quiz-fb', q), ans = $('.quiz-answer', q);
    var opts = $$('button.quiz-opt', q);
    function lock() {
      opts.forEach(function (o) { o.disabled = true; o.setAttribute('aria-disabled', 'true'); });
      var g = $('[data-giveup]', q); if (g) g.hidden = true;
    }
    function pick(o, silent) {
      var ok = o.hasAttribute('data-correct');
      o.classList.add(ok ? 'right' : 'wrong');
      $('.mark', o).textContent = ok ? '✓ correct' : '✗ not this';
      if (ok) {
        fb.className = 'quiz-fb ok'; fb.hidden = false;
        fb.innerHTML = '<span class="verdict">Correct.</span>';
        if (ans) ans.hidden = false;
        lock();
      } else {
        fb.className = 'quiz-fb no'; fb.hidden = false;
        fb.innerHTML = '<span class="verdict">Not quite.</span> Option ' + o.getAttribute('data-letter') + ' is a common trap. Think about why, then try another option.';
      }
      if (!silent) {
        var st = quizState(id) || { picks: [] };
        st.picks.push(o.getAttribute('data-letter'));
        if (ok) st.right = st.picks.length === 1; // right only if first try
        if (ok) st.done = true;
        store.set('quiz:' + id, st); scoreSection(sec);
      }
    }
    opts.forEach(function (o) { o.addEventListener('click', function () { if (!o.disabled && !o.classList.contains('wrong')) pick(o, false); }); });
    var give = $('[data-giveup]', q);
    if (give) give.addEventListener('click', function () {
      var c = $('[data-correct]', q); c.classList.add('right'); $('.mark', c).textContent = '✓ answer';
      ans.hidden = false; lock();
      var st = quizState(id) || { picks: [] }; st.done = true; st.right = false; store.set('quiz:' + id, st); scoreSection(sec);
    });
    // free response
    var rev = $('[data-reveal]', q), self = $('.self', q);
    if (rev) rev.addEventListener('click', function () {
      ans.hidden = false; rev.hidden = true; rev.setAttribute('aria-expanded', 'true'); if (self) self.hidden = false;
    });
    $$('[data-self]', q).forEach(function (b) {
      b.addEventListener('click', function () {
        var good = b.getAttribute('data-self') === 'good';
        store.set('quiz:' + id, { right: good, done: true, self: true });
        $$('[data-self]', q).forEach(function (x) { x.classList.remove('on-good', 'on-bad'); x.setAttribute('aria-pressed', 'false'); });
        b.classList.add(good ? 'on-good' : 'on-bad'); b.setAttribute('aria-pressed', 'true');
        scoreSection(sec);
      });
    });
    // restore
    var st = quizState(id);
    if (st) {
      if (opts.length && st.picks) st.picks.forEach(function (L) { var o = $('[data-letter="' + L + '"]', q); if (o) pick(o, true); });
      if (opts.length && st.done && !$('.quiz-opt.right', q)) { var c = $('[data-correct]', q); if (c) { c.classList.add('right'); $('.mark', c).textContent = '✓ answer'; ans.hidden = false; lock(); } }
      if (st.self) { ans.hidden = false; if (rev) rev.hidden = true; if (self) { self.hidden = false; var b = $('[data-self="' + (st.right ? 'good' : 'bad') + '"]', q); if (b) { b.classList.add(st.right ? 'on-good' : 'on-bad'); b.setAttribute('aria-pressed', 'true'); } } }
    }
  });
  $$('[data-quiz-reset]').forEach(function (b) {
    b.addEventListener('click', function () {
      var sec = b.closest('section');
      $$('.quiz', sec).forEach(function (q) { store.remove('quiz:' + q.getAttribute('data-quiz')); });
      location.reload();
    });
  });
  $$('section.lsec').forEach(scoreSection);

  /* ------------------------------------------------------------ cloze */
  $$('.cloze').forEach(function (cz) {
    var id = cz.getAttribute('data-cloze');
    var ins = $$('.cloze-in', cz);
    var saved = store.get('cloze:' + id, {});
    ins.forEach(function (inp, k) {
      if (saved[k]) inp.value = saved[k];
      inp.addEventListener('input', function () { inp.classList.remove('ok', 'no'); saved[k] = inp.value; store.set('cloze:' + id, saved); });
      inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); check(); } });
    });
    var score = $('.score', cz);
    function accepted(a) {
      return String(a).split(/\s+(?:or|\/)\s+|\s*\|\s*/).map(norm).concat([norm(a)]).filter(Boolean);
    }
    function check() {
      var right = 0;
      ins.forEach(function (inp) {
        var ok = accepted(inp.getAttribute('data-answer')).indexOf(norm(inp.value)) >= 0;
        inp.classList.toggle('ok', ok); inp.classList.toggle('no', !ok);
        inp.setAttribute('aria-invalid', ok ? 'false' : 'true');
        if (ok) right++;
      });
      score.textContent = right + ' / ' + ins.length + (right === ins.length ? ' · all right!' : '');
    }
    $('[data-cz="check"]', cz).addEventListener('click', check);
    $('[data-cz="show"]', cz).addEventListener('click', function () {
      ins.forEach(function (inp) { if (!inp.classList.contains('ok')) { inp.value = inp.getAttribute('data-answer'); inp.classList.remove('no'); inp.classList.add('shown'); } });
      score.textContent = 'Answers shown. Clear and try again tomorrow.';
    });
    $('[data-cz="clear"]', cz).addEventListener('click', function () {
      ins.forEach(function (inp) { inp.value = ''; inp.classList.remove('ok', 'no', 'shown'); });
      saved = {}; store.set('cloze:' + id, saved); score.textContent = '';
      if (ins[0]) ins[0].focus();
    });
  });

  /* ------------------------------------------------------------ drills + checklists */
  $$('.drill').forEach(function (d) {
    var id = d.getAttribute('data-drill');
    var ta = $('textarea', d), saved = $('.saved', d);
    ta.value = store.get('drill:' + id, '');
    var t = null;
    ta.addEventListener('input', function () {
      clearTimeout(t);
      t = setTimeout(function () { store.set('drill:' + id, ta.value); saved.textContent = 'Saved ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }, 350);
    });
    $('[data-drill-clear]', d).addEventListener('click', function () { ta.value = ''; store.set('drill:' + id, ''); saved.textContent = 'Cleared. Start again from a blank page.'; ta.focus(); });
  });
  $$('input[data-check]').forEach(function (c) {
    var k = 'check:' + c.getAttribute('data-check');
    c.checked = !!store.get(k, false);
    c.addEventListener('change', function () { store.set(k, c.checked); countLists(); });
  });
  function countLists() {
    $$('.checklist').forEach(function (ul) {
      var all = $$('input', ul), on = all.filter(function (c) { return c.checked; }).length;
      var h = ul.previousElementSibling;
      ul.setAttribute('aria-label', on + ' of ' + all.length + ' checked');
    });
  }
  countLists();

  /* ------------------------------------------------------------ flashcards */
  var GRADE = { again: 'Forgot', hard: 'Hard', good: 'Knew it' };
  $$('.deck').forEach(function (deckEl) {
    var deckId = deckEl.getAttribute('data-deck');
    var cards = $$('.deck-src > li', deckEl).map(function (li) { return { id: li.getAttribute('data-card'), q: $('.q', li).innerHTML, a: $('.a', li).innerHTML, src: li.getAttribute('data-src') || '' }; });
    var byId = {}; cards.forEach(function (c) { byId[c.id] = c; });
    var deck = DLMCore.Deck(deckId, cards.map(function (c) { return c.id; }), store);
    var ui = $('.deck-ui', deckEl);
    var mode = 'due', queue = [], shown = false, doneToday = 0, filter = '';
    var srcs = []; cards.forEach(function (c) { if (c.src && srcs.indexOf(c.src) < 0) srcs.push(c.src); });
    function inFilter(id) { return !filter || byId[id].src === filter; }
    function build() {
      queue = (mode === 'due' ? deck.due() : cards.map(function (c) { return c.id; })).filter(inFilter);
      doneToday = 0; shown = false; render();
    }
    function stats() {
      var s = deck.stats();
      var sel = srcs.length > 1 ? '<label class="deck-filter">Lesson <select data-filter><option value="">All ' + srcs.length + '</option>' + srcs.map(function (x) { return '<option' + (x === filter ? ' selected' : '') + '>' + x + '</option>'; }).join('') + '</select></label>' : '';
      return '<span>Cards <b>' + cards.length + '</b></span><span>Due today <b>' + s.due + '</b></span><span>Long-term <b>' + s.longTerm + '</b></span>' + sel + '<span class="sp"></span>' +
        '<button type="button" class="btn sm ghost" data-mode>' + (mode === 'due' ? 'Study all ' + cards.length : 'Only due cards') + '</button>';
    }
    function render() {
      var html = '<div class="deck-stats">' + stats() + '</div>';
      if (!queue.length) {
        var next = Infinity; cards.forEach(function (c) { var s = deck.state(c.id); if (s.due > Date.now()) next = Math.min(next, s.due); });
        var when = next === Infinity ? '' : new Date(next).toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'short' });
        html += '<div class="deck-stage"><div class="flashcard fc-empty"><div class="big">' + (doneToday ? 'Deck done for today.' : 'Nothing due right now.') + '</div><p>' + (when ? 'The next card comes back on <b>' + when + '</b>. ' : '') + 'Spaced review is what makes it stick: come back then, or study all cards now.</p><div><button type="button" class="btn sm" data-all>Study all ' + cards.length + ' now</button></div></div></div>';
      } else {
        var c = byId[queue[0]], st = deck.state(c.id);
        html += '<div class="deck-stage"><div class="flashcard" tabindex="0" aria-label="Flashcard. Press Enter or Space to reveal the answer."><div class="fc-meta"><span>Card ' + (cards.indexOf(c) + 1) + ' of ' + cards.length + (c.src ? ' · ' + c.src : '') + '</span><span class="box">' + (st.box ? 'Box ' + st.box : 'New') + ' · ' + queue.length + ' left</span></div>' +
          '<div class="fc-front">' + c.q + '</div><div class="fc-back"' + (shown ? '' : ' hidden') + '>' + c.a + '</div>' +
          '<div class="fc-actions">' + (shown
            ? '<button type="button" class="btn sm grade-forgot" data-g="again">Forgot</button><button type="button" class="btn sm grade-hard" data-g="hard">Hard</button><button type="button" class="btn sm grade-good" data-g="good">Knew it</button>'
            : '<button type="button" class="btn sm primary" data-show>Show answer</button><span class="kbd-hint" style="align-self:center;font-size:.8rem;color:var(--muted)">or press <kbd>Space</kbd></span>') + '</div></div></div>';
      }
      ui.innerHTML = html;
      var m = $('[data-mode]', ui); if (m) m.addEventListener('click', function () { mode = mode === 'due' ? 'all' : 'due'; build(); });
      var fsel = $('[data-filter]', ui); if (fsel) fsel.addEventListener('change', function () { filter = fsel.value; build(); var f2 = $('[data-filter]', ui); if (f2) f2.focus(); });
      var a = $('[data-all]', ui); if (a) a.addEventListener('click', function () { mode = 'all'; build(); });
      var sh = $('[data-show]', ui); if (sh) sh.addEventListener('click', reveal);
      $$('[data-g]', ui).forEach(function (b) { b.addEventListener('click', function () { grade(b.getAttribute('data-g')); }); });
      var card = $('.flashcard', ui);
      if (card && queue.length) card.addEventListener('keydown', function (e) {
        if (!shown && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); reveal(); }
        else if (shown && (e.key === '1' || e.key === '2' || e.key === '3')) grade(['again', 'hard', 'good'][+e.key - 1]);
      });
    }
    function reveal() { shown = true; render(); var b = $('[data-g="good"]', ui); if (b) b.focus(); }
    function grade(g) {
      var id = queue.shift();
      deck.grade(id, g);
      if (g === 'again') queue.splice(Math.min(queue.length, 3), 0, id); // forgot: see it again soon
      else doneToday++;
      shown = false; render();
      var c = $('.flashcard', ui); if (c) c.focus();
    }
    build();
  });

  /* ------------------------------------------------------------ external links open in a new tab */
  $$('a[href^="http"]').forEach(function (a) { a.target = '_blank'; a.rel = 'noopener'; });
})();
