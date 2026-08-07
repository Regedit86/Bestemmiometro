/* Bestemmiometro — interfaccia e logica di navigazione. */
(function () {
  'use strict';

  var view = document.getElementById('view');
  var sheet = document.getElementById('sheet');
  var sheetBody = document.getElementById('sheetBody');
  var toastEl = document.getElementById('toast');

  var SEVERITIES = [
    { v: 1, emo: '😐', lb: 'Blanda' },
    { v: 2, emo: '😠', lb: 'Classica' },
    { v: 3, emo: '🤬', lb: 'Robusta' },
    { v: 4, emo: '☄️', lb: 'Pesante' },
    { v: 5, emo: '🔥', lb: 'Storica' }
  ];

  // Tipo di bestemmia: più è fantasiosa, più punti bonus vale.
  var TYPES = [
    { v: 'classica', emo: '🗿', lb: 'Classica', bonus: 0, desc: 'Il grande classico, senza sforzo' },
    { v: 'creativa', emo: '🎨', lb: 'Creativa', bonus: 2, desc: 'Accostamento mai sentito prima' },
    { v: 'composta', emo: '🧱', lb: 'Composta', bonus: 3, desc: 'Costruzione lunga e articolata' },
    { v: 'dialetto', emo: '🪗', lb: 'Dialetto', bonus: 2, desc: 'Sapore locale certificato' },
    { v: 'straniera', emo: '🌍', lb: 'Straniera', bonus: 2, desc: 'Internazionale, con accento' },
    { v: 'autogol', emo: '🙈', lb: 'Autogol', bonus: 1, desc: 'Involontaria, ma memorabile' }
  ];

  var BONUS_LABELS = ['Niente', 'Carina', 'Notevole', 'Capolavoro'];

  var COLORS = ['#ff4d3d', '#ffb020', '#35d07f', '#4aa8ff', '#b07cff', '#ff6fae', '#3ad0c8', '#e0e4ec'];

  /* ---------------- utilità ---------------- */

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.hidden = false;
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { toastEl.hidden = true; }, 2600);
  }

  function startOfDay(d) { var x = new Date(d); x.setHours(0, 0, 0, 0); return x.getTime(); }
  function todayStart() { return startOfDay(new Date()); }

  function dayKey(ts) {
    var d = new Date(ts);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function fmtDate(value) {
    if (!value) return '';
    var d = typeof value === 'number' ? new Date(value) : new Date(value + 'T00:00:00');
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'long' });
  }

  function fmtTime(ts) {
    return new Date(ts).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  }

  function initials(name) {
    var parts = String(name || '?').trim().split(/\s+/);
    return ((parts[0] || '?')[0] + (parts[1] ? parts[1][0] : '')).toUpperCase();
  }

  function avatar(t, cls) {
    var c = 'avatar' + (cls ? ' ' + cls : '');
    if (t && t.photo) return '<img class="' + c + '" src="' + esc(t.photo) + '" alt="' + esc(t.name) + '">';
    return '<div class="' + c + '" style="color:' + esc((t && t.color) || '#98a1b5') + '">' + esc(initials(t && t.name)) + '</div>';
  }

  function b64enc(obj) {
    return btoa(unescape(encodeURIComponent(JSON.stringify(obj))));
  }
  function b64dec(str) {
    return JSON.parse(decodeURIComponent(escape(atob(str))));
  }

  function severityOf(v) {
    return SEVERITIES.filter(function (s) { return s.v === Number(v); })[0] || SEVERITIES[1];
  }

  function typeOf(v) {
    return TYPES.filter(function (t) { return t.v === v; })[0] || TYPES[0];
  }

  // Punti bonus: quelli del tipo più due per ogni stella di fantasia assegnata.
  function bonusPoints(c) {
    return typeOf(c.type).bonus + (Number(c.bonus) || 0) * 2;
  }

  // Punteggio totale: la gravità pesa, ma la fantasia paga di più.
  function points(c) {
    return (Number(c.severity) || 1) + bonusPoints(c);
  }

  function isBonus(c) { return bonusPoints(c) > 0; }

  function stars(n) {
    n = Number(n) || 0;
    return n ? new Array(n + 1).join('⭐') : '';
  }

  /* ---------------- selettori dati ---------------- */

  function travelers() {
    return Store.all('travelers').sort(function (a, b) { return (a.name || '').localeCompare(b.name || ''); });
  }

  function stages() {
    return Store.all('stages').sort(function (a, b) {
      var da = a.date || '', db = b.date || '';
      if (da && db && da !== db) return da < db ? -1 : 1;
      return (a.createdAt || 0) - (b.createdAt || 0);
    });
  }

  function curses(filter) {
    var list = Store.all('curses').slice().sort(function (a, b) { return b.at - a.at; });
    if (!filter) return list;
    if (filter.stageId) list = list.filter(function (c) { return c.stageId === filter.stageId; });
    if (filter.travelerId) list = list.filter(function (c) { return c.travelerId === filter.travelerId; });
    if (filter.since) list = list.filter(function (c) { return c.at >= filter.since; });
    return list;
  }

  function quotes(filter) {
    var list = Store.all('quotes').slice().sort(function (a, b) { return b.at - a.at; });
    if (filter && filter.travelerId) list = list.filter(function (q) { return q.travelerId === filter.travelerId; });
    if (filter && filter.stageId) list = list.filter(function (q) { return q.stageId === filter.stageId; });
    return list;
  }

  function currentStage() {
    var id = Store.state.settings.currentStageId;
    return (id && Store.find('stages', id)) || stages()[stages().length - 1] || null;
  }

  function countsBy(list) {
    var map = {};
    list.forEach(function (c) { map[c.travelerId] = (map[c.travelerId] || 0) + 1; });
    return map;
  }

  function ranking(list) {
    var map = countsBy(list);
    return travelers().map(function (t) {
      var mine = list.filter(function (c) { return c.travelerId === t.id; });
      return {
        traveler: t,
        count: map[t.id] || 0,
        points: mine.reduce(function (a, c) { return a + points(c); }, 0),
        fantasy: mine.reduce(function (a, c) { return a + bonusPoints(c); }, 0),
        bonusCount: mine.filter(isBonus).length
      };
    }).sort(function (a, b) { return b.count - a.count || b.points - a.points; });
  }

  // Classifica della fantasia: conta solo quello che le bestemmie bonus hanno fruttato.
  function fantasyRanking(list) {
    return ranking(list)
      .filter(function (r) { return r.fantasy > 0; })
      .sort(function (a, b) { return b.fantasy - a.fantasy || b.bonusCount - a.bonusCount; });
  }

  function bestBonus(list, limit) {
    return list.filter(isBonus)
      .sort(function (a, b) { return bonusPoints(b) - bonusPoints(a) || b.at - a.at; })
      .slice(0, limit || 5);
  }

  /* ---------------- router ---------------- */

  function parseHash() {
    var raw = location.hash.replace(/^#/, '') || '/';
    var qi = raw.indexOf('?');
    var path = qi === -1 ? raw : raw.slice(0, qi);
    var query = {};
    if (qi !== -1) {
      raw.slice(qi + 1).split('&').forEach(function (pair) {
        if (!pair) return;
        var kv = pair.split('=');
        query[decodeURIComponent(kv[0])] = decodeURIComponent(kv.slice(1).join('=') || '');
      });
    }
    return { path: path, parts: path.split('/').filter(Boolean), query: query };
  }

  function render() {
    var route = parseHash();
    var head = route.parts[0] || '';
    var html;

    switch (head) {
      case '': html = viewHome(); break;
      case 'tappe': html = viewStages(); break;
      case 'classifica': html = viewLeaderboard(route.query); break;
      case 'frasi': html = viewQuotes(route.query); break;
      case 'admin': html = viewAdmin(); break;
      case 'persona': html = viewPerson(route.parts[1]); break;
      case 'join': html = viewJoin(route.query); break;
      default: html = viewHome();
    }

    view.innerHTML = html;
    window.scrollTo(0, 0);
    syncTabs('/' + head);
    paintHeader();
  }

  function syncTabs(path) {
    Array.prototype.forEach.call(document.querySelectorAll('.tabbar a'), function (a) {
      a.classList.toggle('active', a.getAttribute('data-tab') === path);
    });
  }

  function paintHeader() {
    document.getElementById('tripName').textContent = Store.state.trip.name || 'Bestemmiometro';
    var st = currentStage();
    var sub = Store.state.trip.subtitle || 'Roadtrip';
    document.getElementById('tripSubtitle').textContent = st ? sub + ' · ' + st.title : sub;
    var icon = document.getElementById('syncIcon');
    if (!Store.syncConfigured()) icon.textContent = '⚙︎';
    else icon.textContent = Store.pendingCount() ? '☁︎•' : '☁︎';
  }

  /* ---------------- vista: Oggi ---------------- */

  function viewHome() {
    var people = travelers();
    if (!people.length) return onboarding();

    var stage = currentStage();
    var today = curses({ since: todayStart() });
    var stageList = stage ? curses({ stageId: stage.id }) : [];
    var total = Store.all('curses').length;
    var counts = countsBy(today);

    var out = '';

    out += '<div class="section">';
    out += '<div class="hero">';
    out += '<div class="hero-label">Bestemmie di oggi</div>';
    out += '<div class="hero-count">' + today.length + '</div>';
    out += '<div class="hero-sub">' + (stage ? esc(stage.title) : 'Nessuna tappa attiva') + '</div>';
    var bonusToday = today.filter(isBonus);
    if (today.length) {
      out += '<div class="hero-sub" style="margin-top:6px">' + today.reduce(function (a, c) { return a + points(c); }, 0) + ' punti';
      out += bonusToday.length ? ' · <span style="color:var(--accent-2)">' + bonusToday.length + ' bonus fantasia ⭐</span>' : ' · nessuna bonus, che tristezza';
      out += '</div>';
    }
    out += '<div class="hero-stats">';
    out += '<div><b>' + stageList.length + '</b><span>Tappa</span></div>';
    out += '<div><b>' + total + '</b><span>Viaggio</span></div>';
    out += '<div><b>' + (leaderToday(today) || '—') + '</b><span>In testa</span></div>';
    out += '</div></div></div>';

    if (stages().length > 1) {
      out += '<div class="section">';
      out += '<div class="section-title">Tappa attiva</div>';
      out += '<div class="chips">';
      stages().forEach(function (s) {
        out += '<button class="chip' + (stage && s.id === stage.id ? ' active' : '') + '" data-action="set-stage" data-id="' + esc(s.id) + '">' + esc(s.title) + '</button>';
      });
      out += '</div></div>';
    }

    out += '<div class="section">';
    out += '<div class="section-title">Tocca chi ha bestemmiato <span class="muted">oggi</span></div>';
    out += '<div class="people-grid">';
    people.forEach(function (t) {
      out += '<button class="person-card" data-action="quick-add" data-id="' + esc(t.id) + '">';
      out += avatar(t);
      out += '<div><div class="name">' + esc(t.name) + '</div>';
      if (t.nickname) out += '<div class="nick">' + esc(t.nickname) + '</div>';
      out += '</div>';
      out += '<div class="count" style="color:' + esc(t.color || '#eef1f7') + '">' + (counts[t.id] || 0) + '</div>';
      out += '</button>';
    });
    out += '</div>';
    out += '<div class="btn-row"><button class="btn ghost" data-action="add-quote">💬 Frase celebre</button></div>';
    out += '</div>';

    out += '<div class="section">';
    out += '<div class="section-title">Diario di oggi</div>';
    if (!today.length) {
      out += '<div class="empty">Ancora niente. Giornata sospettosamente tranquilla.</div>';
    } else {
      out += '<div class="list">' + today.map(curseRow).join('') + '</div>';
    }
    out += '</div>';

    var qToday = quotes().filter(function (q) { return q.at >= todayStart(); });
    if (qToday.length) {
      out += '<div class="section"><div class="section-title">Frasi di oggi</div><div class="list">';
      out += qToday.map(quoteRow).join('');
      out += '</div></div>';
    }

    return out;
  }

  function leaderToday(list) {
    var r = ranking(list);
    if (!r.length || !r[0].count) return '';
    return esc(String(r[0].traveler.name).trim().split(/\s+/)[0]);
  }

  function curseRow(c) {
    var t = Store.find('travelers', c.travelerId);
    var s = severityOf(c.severity);
    var ty = typeOf(c.type);
    var stage = c.stageId ? Store.find('stages', c.stageId) : null;
    var out = '<div class="list-item timeline-item">';
    out += avatar(t, 'sm');
    out += '<div class="body">';
    out += '<div class="meta"><strong style="color:var(--text)">' + esc(t ? t.name : 'Sconosciuto') + '</strong> · ' + s.emo + ' ' + esc(s.lb) + ' · ' + fmtTime(c.at) + (stage ? ' · ' + esc(stage.title) : '') + '</div>';
    if (c.text) out += '<p>' + esc(c.text) + '</p>';
    if (isBonus(c)) {
      out += '<div style="margin-top:6px"><span class="badge hot">' + ty.emo + ' ' + esc(ty.lb) + ' · +' + bonusPoints(c) + ' pt</span>';
      if (Number(c.bonus)) out += ' <span class="badge">' + stars(c.bonus) + ' ' + esc(BONUS_LABELS[c.bonus]) + '</span>';
      out += '</div>';
    }
    out += '</div>';
    out += '<button class="icon-btn" data-action="delete-curse" data-id="' + esc(c.id) + '" aria-label="Elimina">✕</button>';
    out += '</div>';
    return out;
  }

  function quoteRow(q) {
    var t = Store.find('travelers', q.travelerId);
    var out = '<div class="quote">';
    out += '<p>“' + esc(q.text) + '”</p>';
    out += '<footer><span>— ' + esc(t ? (t.nickname || t.name) : 'Ignoto') + ' · ' + fmtDate(q.at) + '</span>';
    out += '<button class="btn small ghost" data-action="delete-quote" data-id="' + esc(q.id) + '">Elimina</button></footer>';
    out += '</div>';
    return out;
  }

  function onboarding() {
    var out = '<div class="section"><div class="card center">';
    out += '<div style="font-size:46px">🤬</div>';
    out += '<h2 style="margin:6px 0 4px">Benvenuto nel Bestemmiometro</h2>';
    out += '<p class="muted" style="margin-top:0">Prima di partire aggiungi i viaggiatori e le tappe del roadtrip. Poi basterà toccare una faccia per registrare il misfatto.</p>';
    out += '<div class="btn-row"><button class="btn primary" data-action="edit-traveler">Aggiungi viaggiatore</button></div>';
    out += '<div class="btn-row"><button class="btn ghost" data-action="edit-stage">Aggiungi tappa</button></div>';
    out += '</div></div>';
    return out;
  }

  /* ---------------- vista: Tappe ---------------- */

  function viewStages() {
    var list = stages();
    var out = '<div class="section">';
    out += '<div class="section-title">Tappe del viaggio <button data-action="edit-stage">+ Nuova</button></div>';
    if (!list.length) {
      out += '<div class="empty">Nessuna tappa. Aggiungi la prima per iniziare a contare.</div>';
    } else {
      var cur = currentStage();
      out += '<div class="list">';
      list.forEach(function (s) {
        var n = curses({ stageId: s.id }).length;
        var q = quotes({ stageId: s.id }).length;
        out += '<div class="list-item">';
        out += '<div class="grow"><strong>' + esc(s.title) + (cur && cur.id === s.id ? ' <span class="badge live">attiva</span>' : '') + '</strong>';
        var meta = [];
        if (s.date) meta.push(fmtDate(s.date));
        if (s.from || s.to) meta.push(esc([s.from, s.to].filter(Boolean).join(' → ')));
        if (q) meta.push(q + ' frasi');
        out += '<small>' + (meta.join(' · ') || 'Nessun dettaglio') + '</small></div>';
        out += '<div class="trail"><b style="font-size:20px;color:var(--accent)">' + n + '</b></div>';
        out += '<button class="icon-btn" data-action="stage-detail" data-id="' + esc(s.id) + '">›</button>';
        out += '</div>';
      });
      out += '</div>';
    }
    out += '</div>';

    if (list.length) {
      out += '<div class="section"><div class="section-title">Riepilogo</div><div class="card">';
      var all = Store.all('curses');
      var days = {};
      all.forEach(function (c) { days[dayKey(c.at)] = (days[dayKey(c.at)] || 0) + 1; });
      var dayCount = Object.keys(days).length || 1;
      out += statRow('Totale bestemmie', all.length);
      out += statRow('Giorni registrati', dayCount);
      out += statRow('Media al giorno', (all.length / dayCount).toFixed(1));
      out += statRow('Frasi celebri', Store.all('quotes').length);
      out += '</div></div>';
    }
    return out;
  }

  function statRow(label, value) {
    return '<div class="switch-row"><div class="lbl">' + esc(label) + '</div><b>' + esc(value) + '</b></div>';
  }

  /* ---------------- vista: Classifica ---------------- */

  function viewLeaderboard(query) {
    var scope = query.scope || 'sempre';
    var stage = currentStage();
    var list;
    if (scope === 'oggi') list = curses({ since: todayStart() });
    else if (scope === 'tappa' && stage) list = curses({ stageId: stage.id });
    else list = Store.all('curses');

    var out = '<div class="section"><div class="chips">';
    [['sempre', 'Tutto il viaggio'], ['tappa', stage ? stage.title : 'Tappa'], ['oggi', 'Oggi']].forEach(function (o) {
      out += '<a class="chip' + (scope === o[0] ? ' active' : '') + '" href="#/classifica?scope=' + o[0] + '">' + esc(o[1]) + '</a>';
    });
    out += '</div></div>';

    var rank = ranking(list);
    var max = rank.length ? Math.max.apply(null, rank.map(function (r) { return r.count; })) : 0;

    out += '<div class="section"><div class="section-title">Classifica</div>';
    if (!rank.length || !max) {
      out += '<div class="empty">Nessuna bestemmia in questo periodo. Incredibile.</div>';
    } else {
      out += '<div class="list">';
      rank.forEach(function (r, i) {
        var medal = i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : '';
        out += '<a class="list-item" href="#/persona/' + esc(r.traveler.id) + '">';
        out += '<div class="rank ' + medal + '">' + (i + 1) + '</div>';
        out += avatar(r.traveler, 'sm');
        out += '<div class="grow"><strong>' + esc(r.traveler.name) + '</strong>';
        out += '<div class="bar"><i style="width:' + (max ? Math.round(r.count / max * 100) : 0) + '%;background:' + esc(r.traveler.color || '#ff4d3d') + '"></i></div></div>';
        out += '<div class="trail"><b style="font-size:19px;color:var(--text)">' + r.count + '</b><br>' + r.points + ' pt</div>';
        out += '</a>';
      });
      out += '</div>';
    }
    out += '</div>';

    var fantasy = fantasyRanking(list);
    out += '<div class="section"><div class="section-title">Classifica fantasia <span class="muted">solo bonus</span></div>';
    if (!fantasy.length) {
      out += '<div class="empty">Nessuna bestemmia bonus. Finora solo roba da manuale.</div>';
    } else {
      var maxF = fantasy[0].fantasy;
      out += '<div class="list">';
      fantasy.forEach(function (r, i) {
        var medal = i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : '';
        out += '<a class="list-item" href="#/persona/' + esc(r.traveler.id) + '">';
        out += '<div class="rank ' + medal + '">' + (i + 1) + '</div>';
        out += avatar(r.traveler, 'sm');
        out += '<div class="grow"><strong>' + esc(r.traveler.name) + '</strong>';
        out += '<div class="bar"><i style="width:' + Math.round(r.fantasy / maxF * 100) + '%;background:var(--accent-2)"></i></div></div>';
        out += '<div class="trail"><b style="font-size:19px;color:var(--accent-2)">' + r.fantasy + '</b><br>' + r.bonusCount + ' bonus</div>';
        out += '</a>';
      });
      out += '</div>';
    }
    out += '</div>';

    var bonuses = bestBonus(list, 5);
    if (bonuses.length) {
      out += '<div class="section"><div class="section-title">Le bestemmie bonus</div><div class="list">';
      bonuses.forEach(function (c) {
        var bt = Store.find('travelers', c.travelerId);
        var ty = typeOf(c.type);
        out += '<div class="quote">';
        out += '<p>' + (c.text ? '“' + esc(c.text) + '”' : ty.emo + ' ' + esc(ty.desc)) + '</p>';
        out += '<footer><span>— ' + esc(bt ? bt.name : 'Ignoto') + ' · ' + ty.emo + ' ' + esc(ty.lb) + ' ' + stars(c.bonus) + '</span>';
        out += '<span class="badge hot">+' + bonusPoints(c) + ' pt</span></footer>';
        out += '</div>';
      });
      out += '</div></div>';
    }

    var byType = TYPES.map(function (ty) {
      return { ty: ty, n: list.filter(function (c) { return typeOf(c.type).v === ty.v; }).length };
    }).filter(function (x) { return x.n; }).sort(function (a, b) { return b.n - a.n; });
    if (byType.length > 1) {
      out += '<div class="section"><div class="section-title">Per tipo</div><div class="card">';
      byType.forEach(function (x) { out += statRow(x.ty.emo + '  ' + x.ty.lb, x.n); });
      out += '</div></div>';
    }

    out += '<div class="section"><div class="section-title">Albo d\'oro</div>';
    out += '<div class="card">';
    var worstDay = bestDay(list);
    var hardest = list.slice().sort(function (a, b) { return (b.severity || 0) - (a.severity || 0) || b.at - a.at; })[0];
    out += statRow('Totale nel periodo', list.length);
    out += statRow('Punti totali', list.reduce(function (a, c) { return a + points(c); }, 0));
    out += statRow('Bestemmie bonus', list.filter(isBonus).length);
    out += statRow('Gravità media', list.length ? (list.reduce(function (a, c) { return a + (Number(c.severity) || 1); }, 0) / list.length).toFixed(1) : '—');
    out += statRow('Giornata peggiore', worstDay ? fmtDate(worstDay.ts) + ' (' + worstDay.n + ')' : '—');
    if (hardest) {
      var ht = Store.find('travelers', hardest.travelerId);
      out += statRow('Bestemmia record', severityOf(hardest.severity).emo + ' ' + (ht ? ht.name : '—'));
    }
    out += '</div></div>';
    return out;
  }

  function bestDay(list) {
    var days = {};
    list.forEach(function (c) {
      var k = dayKey(c.at);
      if (!days[k]) days[k] = { n: 0, ts: startOfDay(c.at) };
      days[k].n++;
    });
    var best = null;
    Object.keys(days).forEach(function (k) { if (!best || days[k].n > best.n) best = days[k]; });
    return best;
  }

  /* ---------------- vista: Frasi ---------------- */

  function viewQuotes(query) {
    var who = query.chi || '';
    var list = quotes(who ? { travelerId: who } : null);
    var out = '<div class="section">';
    out += '<div class="section-title">Frasi celebri <button data-action="add-quote">+ Nuova</button></div>';
    if (travelers().length) {
      out += '<div class="chips">';
      out += '<a class="chip' + (!who ? ' active' : '') + '" href="#/frasi">Tutti</a>';
      travelers().forEach(function (t) {
        out += '<a class="chip' + (who === t.id ? ' active' : '') + '" href="#/frasi?chi=' + esc(t.id) + '">' + esc(t.nickname || t.name) + '</a>';
      });
      out += '</div>';
    }
    out += '</div>';

    out += '<div class="section">';
    if (!list.length) {
      out += '<div class="empty">Nessuna frase registrata. Eppure ne dicono di cose.</div>';
    } else {
      var byDay = {};
      list.forEach(function (q) { (byDay[dayKey(q.at)] = byDay[dayKey(q.at)] || []).push(q); });
      Object.keys(byDay).sort().reverse().forEach(function (k) {
        out += '<div class="section-title" style="margin-top:16px">' + fmtDate(byDay[k][0].at) + '</div>';
        out += '<div class="list">' + byDay[k].map(quoteRow).join('') + '</div>';
      });
    }
    out += '</div>';
    return out;
  }

  /* ---------------- vista: Persona ---------------- */

  function viewPerson(id) {
    var t = Store.find('travelers', id);
    if (!t) return '<div class="empty">Viaggiatore non trovato.</div>';

    var mine = curses({ travelerId: t.id });
    var myQuotes = quotes({ travelerId: t.id });
    var days = {};
    mine.forEach(function (c) { days[dayKey(c.at)] = (days[dayKey(c.at)] || 0) + 1; });
    var dayCount = Object.keys(days).length || 1;
    var rank = ranking(Store.all('curses'));
    var pos = rank.map(function (r) { return r.traveler.id; }).indexOf(t.id) + 1;

    var out = '<div class="section"><div class="card center">';
    out += '<div style="display:flex;justify-content:center;margin-bottom:10px">' + avatar(t, 'lg') + '</div>';
    out += '<h2 style="margin:0">' + esc(t.name) + '</h2>';
    if (t.nickname) out += '<div class="muted">detto “' + esc(t.nickname) + '”</div>';
    if (t.role) out += '<div class="badge" style="margin-top:8px">' + esc(t.role) + '</div>';
    if (t.bio) out += '<p style="margin:12px 0 0;font-size:14px">' + esc(t.bio) + '</p>';
    var myFantasy = mine.reduce(function (a, c) { return a + bonusPoints(c); }, 0);
    out += '<div class="hero-stats" style="margin-top:16px">';
    out += '<div><b>' + mine.length + '</b><span>Totali</span></div>';
    out += '<div><b>' + mine.reduce(function (a, c) { return a + points(c); }, 0) + '</b><span>Punti</span></div>';
    out += '<div><b style="color:var(--accent-2)">' + myFantasy + '</b><span>Fantasia</span></div>';
    out += '<div><b>' + (pos || '—') + '°</b><span>Classifica</span></div>';
    out += '</div>';
    out += '<div class="muted" style="font-size:12px;margin-top:8px">' + (mine.length / dayCount).toFixed(1) + ' al giorno su ' + dayCount + (dayCount === 1 ? ' giorno' : ' giorni') + '</div>';
    out += '<div class="btn-row"><button class="btn primary" data-action="quick-add" data-id="' + esc(t.id) + '">+ Bestemmia</button>';
    out += '<button class="btn ghost" data-action="add-quote" data-id="' + esc(t.id) + '">💬 Frase</button></div>';
    out += '</div></div>';

    var myBonus = bestBonus(mine, 3);
    if (myBonus.length) {
      out += '<div class="section"><div class="section-title">Le sue bonus</div><div class="list">';
      myBonus.forEach(function (c) {
        var ty = typeOf(c.type);
        out += '<div class="quote"><p>' + (c.text ? '“' + esc(c.text) + '”' : ty.emo + ' ' + esc(ty.desc)) + '</p>';
        out += '<footer><span>' + ty.emo + ' ' + esc(ty.lb) + ' ' + stars(c.bonus) + ' · ' + fmtDate(c.at) + '</span><span class="badge hot">+' + bonusPoints(c) + ' pt</span></footer></div>';
      });
      out += '</div></div>';
    }

    out += '<div class="section"><div class="section-title">Le sue frasi celebri</div>';
    out += myQuotes.length ? '<div class="list">' + myQuotes.map(quoteRow).join('') + '</div>'
      : '<div class="empty">Nessuna perla registrata.</div>';
    out += '</div>';

    out += '<div class="section"><div class="section-title">Ultime bestemmie</div>';
    out += mine.length ? '<div class="list">' + mine.slice(0, 25).map(curseRow).join('') + '</div>'
      : '<div class="empty">Fedina pulita, per ora.</div>';
    out += '</div>';
    return out;
  }

  /* ---------------- vista: Admin ---------------- */

  function viewAdmin() {
    var s = Store.state;
    if (s.trip.pin && !s.settings.unlocked) {
      var out = '<div class="section"><div class="card">';
      out += '<h2 style="margin-top:0">Zona admin</h2>';
      out += '<p class="muted">Inserisci il PIN per configurare viaggiatori e tappe.</p>';
      out += '<div class="field"><label>PIN</label><input type="password" inputmode="numeric" id="pinInput" placeholder="••••"></div>';
      out += '<button class="btn primary" data-action="unlock">Sblocca</button>';
      out += '</div></div>';
      return out;
    }

    var out = '';

    out += '<div class="section"><div class="section-title">Viaggiatori <button data-action="edit-traveler">+ Aggiungi</button></div>';
    var list = travelers();
    if (!list.length) out += '<div class="empty">Nessun viaggiatore. Aggiungi almeno una vittima.</div>';
    else {
      out += '<div class="list">';
      list.forEach(function (t) {
        out += '<div class="list-item">' + avatar(t, 'sm');
        out += '<div class="grow"><strong>' + esc(t.name) + '</strong><small>' + esc(t.nickname || t.role || 'Nessun soprannome') + '</small></div>';
        out += '<button class="btn small ghost" data-action="edit-traveler" data-id="' + esc(t.id) + '">Modifica</button></div>';
      });
      out += '</div>';
    }
    out += '</div>';

    out += '<div class="section"><div class="section-title">Tappe <button data-action="edit-stage">+ Aggiungi</button></div>';
    var st = stages();
    if (!st.length) out += '<div class="empty">Nessuna tappa configurata.</div>';
    else {
      out += '<div class="list">';
      st.forEach(function (x) {
        out += '<div class="list-item"><div class="grow"><strong>' + esc(x.title) + '</strong><small>' + esc([fmtDate(x.date), [x.from, x.to].filter(Boolean).join(' → ')].filter(Boolean).join(' · ') || '—') + '</small></div>';
        out += '<button class="btn small ghost" data-action="edit-stage" data-id="' + esc(x.id) + '">Modifica</button></div>';
      });
      out += '</div>';
    }
    out += '</div>';

    out += '<div class="section"><div class="section-title">Il viaggio</div><div class="card">';
    out += '<div class="field"><label>Nome dell\'app</label><input type="text" id="tripNameInput" value="' + esc(s.trip.name) + '"></div>';
    out += '<div class="field"><label>Sottotitolo</label><input type="text" id="tripSubInput" value="' + esc(s.trip.subtitle) + '" placeholder="Es. Puglia 2026"></div>';
    out += '<div class="row-2"><div class="field"><label>Inizio</label><input type="date" id="tripStart" value="' + esc(s.trip.startDate) + '"></div>';
    out += '<div class="field"><label>Fine</label><input type="date" id="tripEnd" value="' + esc(s.trip.endDate) + '"></div></div>';
    out += '<div class="field"><label>PIN admin (opzionale)</label><input type="text" inputmode="numeric" id="tripPin" value="' + esc(s.trip.pin) + '" placeholder="Vuoto = nessun PIN"><div class="hint">Serve solo a evitare che gli amici cancellino tutto per scherzo: non è una protezione seria.</div></div>';
    out += '<button class="btn primary" data-action="save-trip">Salva</button>';
    out += '</div></div>';

    out += '<div class="section"><div class="section-title">Promemoria</div><div class="card">';
    out += '<div class="switch-row"><div class="lbl">Notifiche giornaliere<small>Stato: ' + esc(permLabel()) + '</small></div>';
    out += '<button class="btn small ' + (s.settings.reminderEnabled ? 'ghost' : 'primary') + '" data-action="toggle-reminder">' + (s.settings.reminderEnabled ? 'Disattiva' : 'Attiva') + '</button></div>';
    out += '<div class="field" style="margin-top:14px"><label>Orario della sveglia</label><input type="time" id="reminderTime" value="' + esc(s.settings.reminderTime) + '"></div>';
    out += '<div class="btn-row"><button class="btn ghost" data-action="save-reminder">Salva orario</button><button class="btn ghost" data-action="test-reminder">Prova notifica</button></div>';
    out += '<div class="hint" style="margin-top:12px">iPhone consegna la notifica quando l\'app è aperta o è stata aperta da poco. Per la sveglia automatica ogni sera crea un\'automazione in <b>Comandi rapidi</b> che apre il Bestemmiometro all\'orario scelto: le istruzioni sono nel README.</div>';
    out += '</div></div>';

    out += '<div class="section"><div class="section-title">Condivisione fra amici</div><div class="card">';
    out += '<p class="muted" style="margin-top:0;font-size:14px">Senza questi campi l\'app funziona lo stesso, ma i dati restano solo su questo telefono. Con Supabase (gratis) tutti vedono lo stesso conteggio in tempo reale.</p>';
    out += '<div class="field"><label>URL progetto Supabase</label><input type="text" id="sbUrl" value="' + esc(s.settings.supabase.url) + '" placeholder="https://xxxx.supabase.co" autocapitalize="off" autocorrect="off"></div>';
    out += '<div class="field"><label>Chiave anon (public)</label><input type="text" id="sbKey" value="' + esc(s.settings.supabase.key) + '" placeholder="eyJhbGciOi..." autocapitalize="off" autocorrect="off"></div>';
    out += '<div class="field"><label>Codice viaggio</label><input type="text" id="sbTrip" value="' + esc(s.settings.supabase.tripId) + '" placeholder="es. puglia2026" autocapitalize="off" autocorrect="off"><div class="hint">Uguale per tutto il gruppo. Cambialo per iniziare un viaggio nuovo.</div></div>';
    out += '<div class="btn-row"><button class="btn primary" data-action="save-sync">Salva e sincronizza</button></div>';
    if (Store.syncConfigured()) {
      out += '<div class="btn-row"><button class="btn ghost" data-action="invite">📲 Invita gli amici</button></div>';
      out += '<div class="hint" style="margin-top:10px">In attesa di invio: ' + Store.pendingCount() + ' modifiche.</div>';
    }
    out += '</div></div>';

    out += '<div class="section"><div class="section-title">Dati</div><div class="card stack">';
    out += '<button class="btn ghost" data-action="export">⬇︎ Esporta backup</button>';
    out += '<button class="btn ghost" data-action="import">⬆︎ Importa backup</button>';
    out += '<button class="btn danger" data-action="reset">Cancella tutto</button>';
    out += '</div></div>';

    return out;
  }

  function permLabel() {
    var p = Reminders.permission();
    if (p === 'granted') return 'autorizzate';
    if (p === 'denied') return 'bloccate da iOS, riattivale nelle impostazioni';
    if (p === 'unsupported') return 'non disponibili in questo browser';
    return 'da autorizzare';
  }

  /* ---------------- vista: Join ---------------- */

  function viewJoin(query) {
    var cfg = null;
    try { cfg = query.c ? b64dec(query.c) : null; } catch (e) { cfg = null; }
    var out = '<div class="section"><div class="card center">';
    if (!cfg || !cfg.u || !cfg.k || !cfg.t) {
      out += '<h2>Invito non valido</h2><p class="muted">Chiedi all\'organizzatore di rimandarti il link.</p>';
    } else {
      out += '<div style="font-size:44px">🤝</div>';
      out += '<h2 style="margin:6px 0">Unisciti al viaggio</h2>';
      out += '<p class="muted">' + esc(cfg.n || 'Bestemmiometro') + ' · codice <b>' + esc(cfg.t) + '</b></p>';
      out += '<button class="btn primary" data-action="join-confirm" data-cfg="' + esc(query.c) + '">Entra nel gruppo</button>';
    }
    out += '</div></div>';
    return out;
  }

  /* ---------------- sheet ---------------- */

  function openSheet(html) {
    sheetBody.innerHTML = html;
    sheet.hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function closeSheet() {
    sheet.hidden = true;
    sheetBody.innerHTML = '';
    document.body.style.overflow = '';
  }

  function sheetQuickAdd(travelerId) {
    var t = Store.find('travelers', travelerId);
    if (!t) return;
    var stage = currentStage();
    var out = '<h3 class="sheet-title">' + esc(t.name) + ' ha bestemmiato</h3>';
    out += '<p class="sheet-sub">' + (stage ? esc(stage.title) : 'Nessuna tappa attiva') + ' · ' + fmtTime(Date.now()) + '</p>';
    out += '<div class="field"><label>Gravità</label><div class="severity" id="sevPicker">';
    SEVERITIES.forEach(function (s) {
      out += '<button type="button" data-sev="' + s.v + '"' + (s.v === 2 ? ' class="active"' : '') + '><span class="emo">' + s.emo + '</span><span class="lb">' + s.lb + '</span></button>';
    });
    out += '</div></div>';

    out += '<div class="field"><label>Tipo di bestemmia</label><div class="types" id="typePicker">';
    TYPES.forEach(function (ty) {
      out += '<button type="button"' + (ty.v === 'classica' ? ' class="active"' : '') + ' data-type="' + ty.v + '">';
      out += '<span class="emo">' + ty.emo + '</span><span class="lb">' + esc(ty.lb) + (ty.bonus ? ' <span class="bn">+' + ty.bonus + '</span>' : '') + '</span></button>';
    });
    out += '</div><div class="hint" id="typeHint">' + esc(TYPES[0].desc) + '</div></div>';

    out += '<div class="field"><label>Bonus fantasia</label><div class="severity" id="bonusPicker">';
    [0, 1, 2, 3].forEach(function (n) {
      out += '<button type="button" data-bonus="' + n + '"' + (n === 0 ? ' class="active"' : '') + '>';
      out += '<span class="emo">' + (n ? stars(n) : '—') + '</span><span class="lb">' + esc(BONUS_LABELS[n]) + '</span></button>';
    });
    out += '</div><div class="hint">Ogni stella vale 2 punti in più: la fantasia conta più della gravità.</div></div>';

    out += '<div class="field"><label>Cosa è successo (facoltativo)</label><input type="text" id="curseText" placeholder="Es. rotonda sbagliata a Foggia"></div>';
    out += '<button class="btn primary" data-action="save-curse" data-id="' + esc(t.id) + '">Registra</button>';
    out += '<div class="btn-row"><button class="btn ghost" data-action="save-curse-x5" data-id="' + esc(t.id) + '">Raffica: +5 classiche</button></div>';
    openSheet(out);

    pickerBehaviour('sevPicker', 'data-sev');
    pickerBehaviour('bonusPicker', 'data-bonus');
    pickerBehaviour('typePicker', 'data-type', function (btn) {
      document.getElementById('typeHint').textContent = typeOf(btn.getAttribute('data-type')).desc;
    });
  }

  // Selettore a scelta singola: un solo figlio resta "active".
  function pickerBehaviour(id, attr, onPick) {
    var picker = document.getElementById(id);
    if (!picker) return;
    picker.addEventListener('click', function (e) {
      var btn = e.target.closest('button[' + attr + ']');
      if (!btn) return;
      Array.prototype.forEach.call(picker.children, function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      if (onPick) onPick(btn);
    });
  }

  function selectedSeverity() {
    var active = document.querySelector('#sevPicker button.active');
    return active ? Number(active.getAttribute('data-sev')) : 2;
  }

  function selectedType() {
    var active = document.querySelector('#typePicker button.active');
    return active ? active.getAttribute('data-type') : 'classica';
  }

  function selectedBonus() {
    var active = document.querySelector('#bonusPicker button.active');
    return active ? Number(active.getAttribute('data-bonus')) : 0;
  }

  function sheetQuote(travelerId) {
    var list = travelers();
    if (!list.length) { toast('Aggiungi prima un viaggiatore'); return; }
    var out = '<h3 class="sheet-title">Frase celebre</h3>';
    out += '<p class="sheet-sub">Le perle che verranno ricordate per sempre.</p>';
    out += '<div class="field"><label>Chi l\'ha detta</label><select id="quoteWho">';
    list.forEach(function (t) {
      out += '<option value="' + esc(t.id) + '"' + (t.id === travelerId ? ' selected' : '') + '>' + esc(t.name) + '</option>';
    });
    out += '</select></div>';
    out += '<div class="field"><label>La frase</label><textarea id="quoteText" placeholder="“Fidati, la scorciatoia la conosco”"></textarea></div>';
    out += '<button class="btn primary" data-action="save-quote">Salva nella storia</button>';
    openSheet(out);
  }

  function sheetTraveler(id) {
    var t = id ? Store.find('travelers', id) : null;
    var out = '<h3 class="sheet-title">' + (t ? 'Modifica viaggiatore' : 'Nuovo viaggiatore') + '</h3>';
    out += '<div class="photo-picker">';
    out += '<div id="photoPreview">' + avatar(t, 'lg') + '</div>';
    out += '<div class="actions">';
    out += '<button class="btn small ghost" data-action="pick-photo">📷 Foto</button>';
    if (t && t.photo) out += '<button class="btn small ghost" data-action="clear-photo">Rimuovi</button>';
    out += '</div></div>';
    out += '<input type="file" id="photoInput" accept="image/*" hidden>';
    out += '<input type="hidden" id="photoData" value="' + esc(t && t.photo ? t.photo : '') + '">';
    out += '<div class="field"><label>Nome</label><input type="text" id="tvName" value="' + esc(t ? t.name : '') + '" placeholder="Marco"></div>';
    out += '<div class="field"><label>Soprannome</label><input type="text" id="tvNick" value="' + esc(t ? t.nickname : '') + '" placeholder="Il Navigatore"></div>';
    out += '<div class="field"><label>Ruolo nel viaggio</label><input type="text" id="tvRole" value="' + esc(t ? t.role : '') + '" placeholder="Autista ufficiale"></div>';
    out += '<div class="field"><label>Descrizione</label><textarea id="tvBio" placeholder="Due parole sul personaggio">' + esc(t ? t.bio : '') + '</textarea></div>';
    out += '<div class="field"><label>Colore</label><div class="chips" id="colorPicker">';
    COLORS.forEach(function (c) {
      var active = t && t.color === c;
      out += '<button type="button" class="chip' + (active ? ' active' : '') + '" data-color="' + c + '" style="background:' + c + ';border-color:' + c + ';width:44px">&nbsp;</button>';
    });
    out += '</div></div>';
    out += '<button class="btn primary" data-action="save-traveler" data-id="' + esc(id || '') + '">Salva</button>';
    if (t) out += '<div class="btn-row"><button class="btn danger" data-action="delete-traveler" data-id="' + esc(t.id) + '">Elimina viaggiatore</button></div>';
    openSheet(out);

    var picker = document.getElementById('colorPicker');
    picker.addEventListener('click', function (e) {
      var btn = e.target.closest('button[data-color]');
      if (!btn) return;
      Array.prototype.forEach.call(picker.children, function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
    });

    document.getElementById('photoInput').addEventListener('change', function (e) {
      var file = e.target.files && e.target.files[0];
      if (!file) return;
      resizeImage(file, 320).then(function (dataUrl) {
        document.getElementById('photoData').value = dataUrl;
        document.getElementById('photoPreview').innerHTML = '<img class="avatar lg" src="' + dataUrl + '" alt="">';
      }).catch(function () { toast('Foto non caricata'); });
    });
  }

  function sheetStage(id) {
    var s = id ? Store.find('stages', id) : null;
    var out = '<h3 class="sheet-title">' + (s ? 'Modifica tappa' : 'Nuova tappa') + '</h3>';
    out += '<div class="field"><label>Titolo</label><input type="text" id="stTitle" value="' + esc(s ? s.title : '') + '" placeholder="Giorno 1 — Verso il mare"></div>';
    out += '<div class="row-2"><div class="field"><label>Da</label><input type="text" id="stFrom" value="' + esc(s ? s.from : '') + '" placeholder="Milano"></div>';
    out += '<div class="field"><label>A</label><input type="text" id="stTo" value="' + esc(s ? s.to : '') + '" placeholder="Bologna"></div></div>';
    out += '<div class="field"><label>Data</label><input type="date" id="stDate" value="' + esc(s ? s.date : '') + '"></div>';
    out += '<div class="field"><label>Note</label><textarea id="stNotes" placeholder="Tappe, soste, disastri previsti">' + esc(s ? s.notes : '') + '</textarea></div>';
    out += '<button class="btn primary" data-action="save-stage" data-id="' + esc(id || '') + '">Salva</button>';
    if (s) out += '<div class="btn-row"><button class="btn danger" data-action="delete-stage" data-id="' + esc(s.id) + '">Elimina tappa</button></div>';
    openSheet(out);
  }

  function sheetStageDetail(id) {
    var s = Store.find('stages', id);
    if (!s) return;
    var list = curses({ stageId: s.id });
    var rank = ranking(list).filter(function (r) { return r.count; });
    var out = '<h3 class="sheet-title">' + esc(s.title) + '</h3>';
    out += '<p class="sheet-sub">' + esc([fmtDate(s.date), [s.from, s.to].filter(Boolean).join(' → ')].filter(Boolean).join(' · ') || 'Nessun dettaglio') + '</p>';
    if (s.notes) out += '<p style="font-size:14px">' + esc(s.notes) + '</p>';
    out += '<div class="hero-stats" style="margin:6px 0 16px"><div><b>' + list.length + '</b><span>Bestemmie</span></div><div><b>' + quotes({ stageId: s.id }).length + '</b><span>Frasi</span></div></div>';
    if (rank.length) {
      out += '<div class="list">';
      rank.forEach(function (r, i) {
        out += '<div class="list-item"><div class="rank">' + (i + 1) + '</div>' + avatar(r.traveler, 'sm');
        out += '<div class="grow"><strong>' + esc(r.traveler.name) + '</strong></div><div class="trail"><b>' + r.count + '</b></div></div>';
      });
      out += '</div>';
    } else {
      out += '<div class="empty">Tappa senza peccati registrati.</div>';
    }
    out += '<div class="btn-row"><button class="btn ghost" data-action="set-stage" data-id="' + esc(s.id) + '">Rendi tappa attiva</button>';
    out += '<button class="btn ghost" data-action="edit-stage" data-id="' + esc(s.id) + '">Modifica</button></div>';
    openSheet(out);
  }

  function resizeImage(file, size) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onerror = reject;
      reader.onload = function () {
        var img = new Image();
        img.onerror = reject;
        img.onload = function () {
          var side = Math.min(img.width, img.height);
          var canvas = document.createElement('canvas');
          canvas.width = size; canvas.height = size;
          var ctx = canvas.getContext('2d');
          ctx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, size, size);
          resolve(canvas.toDataURL('image/jpeg', 0.78));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  /* ---------------- azioni ---------------- */

  var actions = {
    'close-sheet': closeSheet,

    'quick-add': function (el) { sheetQuickAdd(el.getAttribute('data-id')); },

    'save-curse': function (el) { saveCurse(el.getAttribute('data-id'), 1); },
    'save-curse-x5': function (el) { saveCurse(el.getAttribute('data-id'), 5); },

    'delete-curse': function (el) {
      if (!confirm('Cancellare questa bestemmia dal registro?')) return;
      Store.remove('curses', el.getAttribute('data-id'));
      toast('Eliminata');
      scheduleSync();
    },

    'add-quote': function (el) { sheetQuote(el.getAttribute('data-id')); },

    'save-quote': function () {
      var who = document.getElementById('quoteWho').value;
      var text = document.getElementById('quoteText').value.trim();
      if (!text) { toast('Scrivi la frase'); return; }
      var stage = currentStage();
      Store.insert('quotes', { travelerId: who, stageId: stage ? stage.id : null, text: text, at: Date.now() });
      closeSheet();
      toast('Frase salvata nella storia 💬');
      scheduleSync();
    },

    'delete-quote': function (el) {
      if (!confirm('Eliminare questa frase?')) return;
      Store.remove('quotes', el.getAttribute('data-id'));
      scheduleSync();
    },

    'edit-traveler': function (el) { sheetTraveler(el.getAttribute('data-id')); },

    'pick-photo': function () { document.getElementById('photoInput').click(); },

    'clear-photo': function () {
      document.getElementById('photoData').value = '';
      document.getElementById('photoPreview').innerHTML = '<div class="avatar lg">?</div>';
    },

    'save-traveler': function (el) {
      var id = el.getAttribute('data-id');
      var name = document.getElementById('tvName').value.trim();
      if (!name) { toast('Serve almeno il nome'); return; }
      var activeColor = document.querySelector('#colorPicker button.active');
      var data = {
        name: name,
        nickname: document.getElementById('tvNick').value.trim(),
        role: document.getElementById('tvRole').value.trim(),
        bio: document.getElementById('tvBio').value.trim(),
        photo: document.getElementById('photoData').value,
        color: activeColor ? activeColor.getAttribute('data-color') : COLORS[Store.all('travelers').length % COLORS.length]
      };
      if (id) Store.update('travelers', id, data);
      else Store.insert('travelers', data);
      closeSheet();
      toast('Viaggiatore salvato');
      scheduleSync();
    },

    'delete-traveler': function (el) {
      if (!confirm('Eliminare il viaggiatore? Le sue bestemmie restano nel registro.')) return;
      Store.remove('travelers', el.getAttribute('data-id'));
      closeSheet();
      scheduleSync();
    },

    'edit-stage': function (el) { sheetStage(el.getAttribute('data-id')); },

    'save-stage': function (el) {
      var id = el.getAttribute('data-id');
      var title = document.getElementById('stTitle').value.trim();
      if (!title) { toast('Serve un titolo'); return; }
      var data = {
        title: title,
        from: document.getElementById('stFrom').value.trim(),
        to: document.getElementById('stTo').value.trim(),
        date: document.getElementById('stDate').value,
        notes: document.getElementById('stNotes').value.trim()
      };
      var rec = id ? Store.update('stages', id, data) : Store.insert('stages', data);
      if (!id) Store.setSettings({ currentStageId: rec.id });
      closeSheet();
      toast('Tappa salvata');
      scheduleSync();
    },

    'delete-stage': function (el) {
      if (!confirm('Eliminare la tappa? Le bestemmie registrate restano.')) return;
      var id = el.getAttribute('data-id');
      Store.remove('stages', id);
      if (Store.state.settings.currentStageId === id) Store.setSettings({ currentStageId: null });
      closeSheet();
      scheduleSync();
    },

    'stage-detail': function (el) { sheetStageDetail(el.getAttribute('data-id')); },

    'set-stage': function (el) {
      Store.setSettings({ currentStageId: el.getAttribute('data-id') });
      closeSheet();
      toast('Tappa attiva aggiornata');
    },

    'unlock': function () {
      var pin = document.getElementById('pinInput').value.trim();
      if (pin !== Store.state.trip.pin) { toast('PIN sbagliato'); return; }
      Store.setSettings({ unlocked: true });
    },

    'save-trip': function () {
      Store.setTrip({
        name: document.getElementById('tripNameInput').value.trim() || 'Bestemmiometro',
        subtitle: document.getElementById('tripSubInput').value.trim(),
        startDate: document.getElementById('tripStart').value,
        endDate: document.getElementById('tripEnd').value,
        pin: document.getElementById('tripPin').value.trim()
      });
      toast('Impostazioni salvate');
    },

    'toggle-reminder': function () {
      var on = !Store.state.settings.reminderEnabled;
      if (!on) {
        Store.setSettings({ reminderEnabled: false });
        Reminders.stop();
        toast('Promemoria disattivato');
        return;
      }
      Reminders.request().then(function (perm) {
        if (perm !== 'granted') {
          toast('iOS non ha dato il permesso. Aggiungi prima l\'app alla schermata Home.');
          Store.emit();
          return;
        }
        Store.setSettings({ reminderEnabled: true });
        Reminders.start();
        toast('Promemoria attivo 🔔');
      });
    },

    'save-reminder': function () {
      Store.setSettings({ reminderTime: document.getElementById('reminderTime').value || '21:00', lastReminderDate: '' });
      if (Store.state.settings.reminderEnabled) Reminders.start();
      toast('Orario salvato');
    },

    'test-reminder': function () {
      Reminders.request().then(function () {
        return Reminders.test();
      }).then(function (ok) {
        toast(ok ? 'Notifica inviata' : 'Notifiche non disponibili: apri l\'app dalla schermata Home');
      });
    },

    'save-sync': function () {
      Store.setSupabase({
        url: document.getElementById('sbUrl').value.trim(),
        key: document.getElementById('sbKey').value.trim(),
        tripId: document.getElementById('sbTrip').value.trim()
      });
      if (!Store.syncConfigured()) { toast('Compila tutti e tre i campi'); return; }
      markAllDirty();
      doSync(true);
    },

    'sync-now': function () {
      if (!Store.syncConfigured()) { location.hash = '#/admin'; toast('Configura prima la condivisione'); return; }
      doSync(true);
    },

    'invite': function () {
      var s = Store.state.settings.supabase;
      var payload = b64enc({ u: s.url, k: s.key, t: s.tripId, n: Store.state.trip.name });
      var link = location.origin + location.pathname + '#/join?c=' + payload;
      var text = 'Entra nel Bestemmiometro del viaggio 🤬 ' + link;
      if (navigator.share) navigator.share({ title: 'Bestemmiometro', text: text }).catch(function () {});
      else copy(link);
    },

    'join-confirm': function (el) {
      var cfg = b64dec(el.getAttribute('data-cfg'));
      Store.setSupabase({ url: cfg.u, key: cfg.k, tripId: cfg.t });
      if (cfg.n) Store.setTrip({ name: cfg.n });
      doSync(true).then(function () { location.hash = '#/'; });
    },

    'export': function () {
      var data = Store.exportJSON();
      var blob = new Blob([data], { type: 'application/json' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'bestemmiometro-' + dayKey(Date.now()) + '.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    },

    'import': function () {
      var input = document.createElement('input');
      input.type = 'file';
      input.accept = 'application/json,.json';
      input.addEventListener('change', function () {
        var file = input.files && input.files[0];
        if (!file) return;
        var reader = new FileReader();
        reader.onload = function () {
          try {
            Store.importJSON(String(reader.result));
            toast('Backup importato');
            scheduleSync();
          } catch (e) {
            toast('File non valido');
          }
        };
        reader.readAsText(file);
      });
      input.click();
    },

    'reset': function () {
      if (!confirm('Cancellare TUTTI i dati su questo telefono? Se la condivisione è attiva, i dati sul cloud restano.')) return;
      Store.reset();
      location.hash = '#/';
      toast('Tutto azzerato');
    }
  };

  function saveCurse(travelerId, times) {
    var sev = selectedSeverity();
    var textEl = document.getElementById('curseText');
    var text = textEl ? textEl.value.trim() : '';
    // Una raffica è quantità, non qualità: niente tipo esotico né bonus.
    var raffica = times > 1;
    var type = raffica ? 'classica' : selectedType();
    var bonus = raffica ? 0 : selectedBonus();
    var stage = currentStage();
    for (var i = 0; i < times; i++) {
      Store.insert('curses', {
        travelerId: travelerId,
        stageId: stage ? stage.id : null,
        severity: sev,
        type: type,
        bonus: bonus,
        text: i === 0 ? text : '',
        at: Date.now() + i
      });
    }
    closeSheet();
    var t = Store.find('travelers', travelerId);
    var gained = points({ severity: sev, type: type, bonus: bonus }) * times;
    var extra = bonusPoints({ type: type, bonus: bonus });
    toast((t ? t.name : 'Registrato') + ': +' + times + ' ' + severityOf(sev).emo + ' · ' + gained + ' pt' + (extra ? ' ' + typeOf(type).emo + ' bonus!' : ''));
    scheduleSync();
  }

  function copy(text) {
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(function () { toast('Link copiato'); });
    else toast(text);
  }

  function markAllDirty() {
    ['travelers', 'stages', 'curses', 'quotes'].forEach(function (c) {
      Store.state[c].forEach(function (r) { r.dirty = true; });
    });
    Store.save();
  }

  /* ---------------- sync ---------------- */

  var syncTimer = null;
  function scheduleSync() {
    if (!Store.syncConfigured()) return;
    clearTimeout(syncTimer);
    syncTimer = setTimeout(function () { doSync(false); }, 1200);
  }

  function doSync(loud) {
    var icon = document.getElementById('syncIcon');
    icon.classList.add('spinning');
    return Store.sync().then(function (res) {
      icon.classList.remove('spinning');
      if (loud) toast(res.skipped ? 'Condivisione non configurata' : 'Sincronizzato ☁︎');
      Store.emit();
    }).catch(function (err) {
      icon.classList.remove('spinning');
      if (loud) toast('Sincronizzazione fallita: controlla URL e chiave');
      console.warn(err);
    });
  }

  /* ---------------- avvio ---------------- */

  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-action]');
    if (!el) return;
    var name = el.getAttribute('data-action');
    if (!actions[name]) return;
    e.preventDefault();
    actions[name](el);
  });

  window.addEventListener('hashchange', render);

  var renderQueued = false;
  Store.subscribe(function (_, event) {
    if (event === 'sync-start') return;
    if (renderQueued) return;
    renderQueued = true;
    requestAnimationFrame(function () { renderQueued = false; render(); });
  });

  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) doSync(false);
  });

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(function () {});
  }

  render();
  if (Store.state.settings.reminderEnabled) Reminders.start();
  if (Store.syncConfigured()) doSync(false);
  setInterval(function () { if (!document.hidden) doSync(false); }, 45000);
})();
