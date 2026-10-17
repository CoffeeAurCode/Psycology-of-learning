/* The interactive study plan. Same scheduling rules as the series' plan.mjs:
   reviews first each day (10 min, 1/3/7/14 study days after a lesson ends), then new material;
   a day may overrun by 10 min to finish an item; parts are never shorter than 15 min. */
(function () {
  'use strict';
  var store = DLMCore.storage('psych-learning-build');
  var ITEMS = window.PLAN_ITEMS, MILES = window.PLAN_MILESTONES;
  var OFFS = [1, 3, 7, 14], REV = 10, MIN_PART = 15, OVERRUN = 10;
  var $ = function (id) { return document.getElementById(id); };
  var esc = DLMCore.escapeHtml;
  var label = function (id) { return id.replace(/^l(\d)-(\w+)$/, function (m, a, b) { return 'L' + a + '.' + b; }); };
  var fmt = function (m) { var h = Math.floor(m / 60), r = m % 60; return h + ' h ' + (r < 10 ? '0' : '') + r + ' min'; };
  var num = function (n) { return n.toLocaleString('en-GB'); };

  function dateFor(startIso, perWeek, n) {
    var d = new Date(startIso + 'T00:00:00Z'), count = -1;
    for (var guard = 0; guard < 4000; guard++) {
      var dow = (d.getUTCDay() + 6) % 7; // Monday = 0
      if (dow < perWeek && ++count === n) return d.toISOString().slice(0, 10);
      d.setUTCDate(d.getUTCDate() + 1);
    }
    return startIso;
  }
  function schedule(budget, perWeek, startIso) {
    var reviewsDue = {}, days = [], parts = {};
    var i = 0, rest = ITEMS[0].minutes, day = 0;
    var pending = function () { for (var k in reviewsDue) if (+k >= day) return true; return false; };
    while ((i < ITEMS.length || pending()) && day < 2000) {
      var rev = reviewsDue[day] || [];
      var left = budget - rev.length * REV;
      var work = [];
      while (i < ITEMS.length && left > 0 && left >= Math.min(rest, MIN_PART)) {
        var take = rest <= left + OVERRUN ? rest : Math.min(rest - MIN_PART, left);
        parts[ITEMS[i].id] = (parts[ITEMS[i].id] || 0) + 1;
        work.push({ it: ITEMS[i], take: take, part: parts[ITEMS[i].id] });
        rest -= take; left -= take;
        if (rest === 0) {
          if (ITEMS[i].kind === 'learn') OFFS.forEach(function (o) { (reviewsDue[day + o] = reviewsDue[day + o] || []).push(ITEMS[i].id); });
          i++;
          if (i < ITEMS.length) rest = ITEMS[i].minutes;
        }
      }
      days.push({ day: day, date: dateFor(startIso, perWeek, day), rev: rev.map(function (id) { return { id: id, n: 0 }; }), work: work, minutes: rev.length * REV + work.reduce(function (s, w) { return s + w.take; }, 0) });
      day++;
    }
    // number each lesson's reviews 1..4 and mark split items
    var seen = {};
    days.forEach(function (d) { d.rev.forEach(function (r) { seen[r.id] = (seen[r.id] || 0) + 1; r.n = seen[r.id]; }); });
    var split = {}; for (var k in parts) if (parts[k] > 1) split[k] = parts[k];
    return { days: days, split: split };
  }

  function cfg() { return { mpd: +$('mpd').value, dpw: +$('dpw').value, start: $('start').value || '2026-10-19' }; }
  function load() {
    var c = store.get('plan:cfg', null);
    if (c) { $('mpd').value = String(c.mpd); $('dpw').value = String(c.dpw); $('start').value = c.start; }
  }
  function niceDate(iso) { var d = new Date(iso + 'T00:00:00Z'); return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }); }
  function longDate(iso) { var d = new Date(iso + 'T00:00:00Z'); return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }); }
  function todayIso() { var t = new Date(); return new Date(Date.UTC(t.getFullYear(), t.getMonth(), t.getDate())).toISOString().slice(0, 10); }

  function render() {
    var c = cfg();
    store.set('plan:cfg', c);
    var s = schedule(c.mpd, c.dpw, c.start), days = s.days;
    var newMin = ITEMS.reduce(function (a, x) { return a + x.minutes; }, 0);
    var revCount = days.reduce(function (a, d) { return a + d.rev.length; }, 0);
    var last = days[days.length - 1];
    $('plan-title').textContent = days.length + ' study days to rebuilding it from memory';
    $('plan-lede').innerHTML = 'At <b>' + c.mpd + ' minutes a day, ' + c.dpw + ' days a week</b>, starting <b>' + longDate(c.start) + '</b>, you finish on <b>' + longDate(last.date) + '</b>. Change the pace below and everything on this page recomputes.';
    $('plan-stats').innerHTML = [
      [days.length, 'study days'], [last.date, 'finish date'], [fmt(newMin).replace(' min', ''), 'new material'],
      [revCount, 'spaced reviews'], [fmt(revCount * REV).replace(' min', ''), 'of review'], [fmt(newMin + revCount * REV).replace(' min', ''), 'in total']
    ].map(function (x) { return '<div class="stat"><div class="v">' + x[0] + '</div><div class="k">' + x[1] + '</div></div>'; }).join('');
    var lessonsMin = ITEMS.filter(function (x) { return x.kind === 'learn'; }).reduce(function (a, x) { return a + x.minutes; }, 0);
    var readMin = ITEMS.filter(function (x) { return x.kind === 'read'; }).reduce(function (a, x) { return a + x.minutes; }, 0);
    var nLessons = ITEMS.filter(function (x) { return x.kind === 'learn'; }).length, nRead = ITEMS.filter(function (x) { return x.kind === 'read'; }).length;
    $('mins-table').innerHTML = [
      ['Lessons (' + nLessons + ')', num(lessonsMin)], ['Setup', '30'], ['Outside reading (' + nRead + ' items)', num(readMin)], ['Mastery checkpoint', '195'],
      ['<b>New material</b>', '<b>' + num(newMin) + ' = ' + fmt(newMin) + '</b>'],
      ['Spaced reviews (' + nLessons + ' lessons × 4 × 10 min)', num(revCount * REV) + ' = ' + fmt(revCount * REV)],
      ['<b>Everything</b>', '<b>' + num(newMin + revCount * REV) + ' = ' + fmt(newMin + revCount * REV) + '</b>']
    ].map(function (r) { return '<tr><td>' + r[0] + '</td><td>' + r[1] + '</td></tr>'; }).join('');
    $('mile-table').innerHTML = MILES.map(function (m) {
      var lastDay = null; days.forEach(function (d) { if (d.work.some(function (w) { return w.it.level === m[0]; })) lastDay = d; });
      return '<tr><td><b>' + m[1] + '</b>' + (lastDay ? ' (day ' + (lastDay.day + 1) + ')' : '') + '</td><td>' + m[2] + '</td><td>' + m[3] + '</td></tr>';
    }).join('');
    var paces = [[60, 5], [90, 5], [120, 5], [120, 6], [180, 7]];
    if (!paces.some(function (p) { return p[0] === c.mpd && p[1] === c.dpw; })) paces.push([c.mpd, c.dpw]);
    $('pace-table').innerHTML = paces.map(function (p) {
      var d = schedule(p[0], p[1], c.start).days, mine = p[0] === c.mpd && p[1] === c.dpw;
      var r = d.reduce(function (a, x) { return a + x.rev.length; }, 0);
      var row = [p[0], p[1], d.length, d[d.length - 1].date, r].map(function (v) { return '<td>' + (mine ? '<b>' + v + '</b>' : v) + '</td>'; }).join('');
      return '<tr>' + row + '</tr>';
    }).join('');

    var t = todayIso(), lastLevel = '', html = '';
    days.forEach(function (d) {
      var lv = null; d.work.forEach(function (w) { if (!lv && w.it.level !== lastLevel) lv = w.it.level; });
      if (lv) { html += '<h3 class="plan-level">' + esc(lv) + '</h3>'; lastLevel = d.work[d.work.length - 1].it.level; }
      var rows = d.rev.map(function (r) {
        var key = 'rev:' + r.id + ':' + r.n;
        var l = SERIES.lessons.find(function (x) { return x.id === r.id; });
        return '<li><label><input type="checkbox" data-item="' + key + '"><span class="kind review">review</span><span class="it">' + label(r.id) + ' · review ' + r.n + ' of 4 · <a href="' + l.file + '#flashcards">cards</a> + <a href="' + l.file + '#from-memory">drill</a> · 10 min</span></label></li>';
      }).concat(d.work.map(function (w) {
        var parts = s.split[w.it.id];
        var key = w.it.id + (parts ? ':p' + w.part : '');
        var ext = /^https?:/.test(w.it.href);
        return '<li><label><input type="checkbox" data-item="' + key + '"><span class="kind ' + w.it.kind + '">' + (w.it.kind === 'learn' ? 'learn' : w.it.kind) + '</span><span class="it"><a href="' + w.it.href + '"' + (ext ? ' target="_blank" rel="noopener"' : '') + '>' + esc(w.it.title) + '</a>' + (parts ? ' <span class="part">(part ' + w.part + ' of ' + parts + ', ' + w.take + ' min)</span>' : ' <span class="part">· ' + w.take + ' min</span>') + '</span></label></li>';
      }));
      if (!rows.length) rows = ['<li><span class="part">A free day.</span></li>'];
      html += '<div class="day' + (d.date === t ? ' today' : '') + '" id="day-' + (d.day + 1) + '" data-date="' + d.date + '"><div class="dhead"><div class="dnum">Day ' + (d.day + 1) + '</div><div class="ddate">' + niceDate(d.date) + '</div></div><ul>' + rows.join('') + '</ul><div class="dmin">' + d.minutes + ' min</div></div>';
    });
    $('plan-days').innerHTML = html;
    document.querySelectorAll('#plan-days input[data-item]').forEach(function (cb) {
      var k = 'plan:tick:' + cb.getAttribute('data-item');
      cb.checked = !!store.get(k, false);
      cb.addEventListener('change', function () { store.set(k, cb.checked); });
    });
  }
  ['mpd', 'dpw', 'start'].forEach(function (id) { $(id).addEventListener('change', render); });
  $('plan-reset').addEventListener('click', function () { $('mpd').value = '90'; $('dpw').value = '5'; $('start').value = '2026-10-19'; render(); });
  $('jump-today').addEventListener('click', function () {
    var t = todayIso(), el = document.querySelector('.day.today') || Array.prototype.slice.call(document.querySelectorAll('.day')).find(function (d) { return d.getAttribute('data-date') >= t; });
    if (el) { el.scrollIntoView({ block: 'center' }); el.focus && el.setAttribute('tabindex', '-1'); el.focus(); }
  });
  $('clear-ticks').addEventListener('click', function () {
    document.querySelectorAll('#plan-days input[data-item]').forEach(function (cb) { cb.checked = false; store.remove('plan:tick:' + cb.getAttribute('data-item')); });
  });
  load(); render();
})();
