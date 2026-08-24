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

  // Come è stata prodotta: da solo, in due, oppure senza dire una parola.
  var MODES = [
    { v: 'solo', emo: '🎤', lb: 'Solo', bonus: 0, desc: 'Una persona, un misfatto' },
    { v: 'coppia', emo: '👥', lb: 'Coppia', bonus: 2, desc: 'Combinata: uno costruisce, l\'altro completa. Punti a entrambi.' },
    { v: 'wireless', emo: '📡', lb: 'Wireless', bonus: 2, desc: 'Solo labiale, senza voce: non la sente nessuno ma la leggono tutti.' }
  ];

  var BONUS_LABELS = ['Niente', 'Carina', 'Notevole', 'Capolavoro'];
  var INSTIGATION_POINT = 1;   // a chi la dice
  var INSTIGATION_STARS = 1;   // a chi istiga

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
    toast._t = setTimeout(function () { toastEl.hidden = true; }, 2800);
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

  function b64enc(obj) { return btoa(unescape(encodeURIComponent(JSON.stringify(obj)))); }
  function b64dec(str) { return JSON.parse(decodeURIComponent(escape(atob(str)))); }

  function severityOf(v) { return SEVERITIES.filter(function (s) { return s.v === Number(v); })[0] || SEVERITIES[1]; }
  function typeOf(v) { return TYPES.filter(function (t) { return t.v === v; })[0] || TYPES[0]; }
  function modeOf(v) { return MODES.filter(function (m) { return m.v === v; })[0] || MODES[0]; }

  function stars(n) {
    n = Number(n) || 0;
    return n ? new Array(n + 1).join('⭐') : '';
  }

  // Punti bonus di una bestemmia: tipo + stelle + modalità + istigazione.
  function bonusPoints(c) {
    return typeOf(c.type).bonus
      + (Number(c.bonus) || 0) * 2
      + modeOf(c.mode).bonus
      + (c.instigatorId ? INSTIGATION_POINT : 0);
  }

  function points(c) { return (Number(c.severity) || 1) + bonusPoints(c); }
  function isBonus(c) { return bonusPoints(c) > 0; }

  // Chi si prende il conteggio: in coppia contano entrambi.
  function participants(c) {
    var ids = [c.travelerId];
    if (c.mode === 'coppia' && c.partnerId && c.partnerId !== c.travelerId) ids.push(c.partnerId);
    return ids;
  }

  function isAlive(r) { return r && !r.deleted; }

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
    if (filter.travelerId) list = list.filter(function (c) { return participants(c).indexOf(filter.travelerId) !== -1; });
    if (filter.since) list = list.filter(function (c) { return c.at >= filter.since; });
    return list;
  }

  function quotes(filter) {
    var list = Store.all('quotes').slice().sort(function (a, b) { return b.at - a.at; });
    if (filter && filter.travelerId) list = list.filter(function (q) { return q.travelerId === filter.travelerId; });
    if (filter && filter.stageId) list = list.filter(function (q) { return q.stageId === filter.stageId; });
    return list;
  }

  function archives() {
    return Store.all('archives').slice().sort(function (a, b) { return (b.closedAt || 0) - (a.closedAt || 0); });
  }

  function currentStage() {
    var id = Store.state.settings.currentStageId;
    var list = stages();
    return (id && Store.find('stages', id)) || list[list.length - 1] || null;
  }

  function countsBy(list) {
    var map = {};
    list.forEach(function (c) {
      participants(c).forEach(function (id) { map[id] = (map[id] || 0) + 1; });
    });
    return map;
  }

  // Classifica calcolabile su qualsiasi insieme di dati (viaggio in corso o archivio).
  function rankingIn(people, list) {
    var map = countsBy(list);
    return people.map(function (t) {
      var mine = list.filter(function (c) { return participants(c).indexOf(t.id) !== -1; });
      var instigated = list.filter(function (c) { return c.instigatorId === t.id; });
      return {
        traveler: t,
        count: map[t.id] || 0,
        points: mine.reduce(function (a, c) { return a + points(c); }, 0) + instigated.length * INSTIGATION_STARS * 2,
        fantasy: mine.reduce(function (a, c) { return a + bonusPoints(c); }, 0) + instigated.length * INSTIGATION_STARS * 2,
        bonusCount: mine.filter(isBonus).length,
        instigations: instigated.length
      };
    }).sort(function (a, b) { return b.count - a.count || b.points - a.points; });
  }

  function ranking(list) { return rankingIn(travelers(), list); }

  function fantasyRanking(list, people) {
    return rankingIn(people || travelers(), list)
      .filter(function (r) { return r.fantasy > 0; })
      .sort(function (a, b) { return b.fantasy - a.fantasy || b.bonusCount - a.bonusCount; });
  }

  function bestBonus(list, limit) {
    return list.filter(isBonus)
      .sort(function (a, b) { return bonusPoints(b) - bonusPoints(a) || b.at - a.at; })
      .slice(0, limit || 5);
  }

  function nameOf(id, people) {
    var t = (people || travelers()).filter(function (x) { return x.id === id; })[0];
    return t ? t.name : '';
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
    return { path: path, key: raw, parts: path.split('/').filter(Boolean), query: query };
  }

  var lastKey = null;
  var lastHTML = '';

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
      case 'benvenuto': html = viewWelcome(); break;
      case 'passato': html = route.parts[1] ? viewArchive(route.parts[1]) : viewPast(); break;
      case 'riepilogo': html = viewSummary(route.parts[1]); break;
      case 'sviluppatore': html = viewDeveloper(); break;
      default: html = viewHome();
    }

    // La sincronizzazione automatica non deve far saltare la lettura: si tocca
    // il DOM solo se il contenuto è cambiato davvero, e la posizione si
    // azzera soltanto quando si cambia schermata.
    var samePage = route.key === lastKey;
    if (html !== lastHTML) {
      var y = window.scrollY;
      view.innerHTML = html;
      lastHTML = html;
      if (samePage) window.scrollTo(0, y);
    }
    if (!samePage) {
      window.scrollTo(0, 0);
      lastKey = route.key;
    }

    syncTabs('/' + head);
    paintHeader();
  }

  function syncTabs(path) {
    Array.prototype.forEach.call(document.querySelectorAll('.tabbar a'), function (a) {
      a.classList.toggle('active', a.getAttribute('data-tab') === path);
    });
  }

  function paintHeader() {
    var name = Store.state.trip.name || 'Bestemmiometro';
    var st = currentStage();
    var sub = Store.state.trip.subtitle || 'Roadtrip';
    var subtitle = st ? sub + ' · ' + st.title : sub;
    var icon = !Store.syncConfigured() ? '⚙︎' : (Store.pendingCount() ? '☁︎•' : '☁︎');
    var el;
    if ((el = document.getElementById('tripName')).textContent !== name) el.textContent = name;
    if ((el = document.getElementById('tripSubtitle')).textContent !== subtitle) el.textContent = subtitle;
    if ((el = document.getElementById('syncIcon')).textContent !== icon) el.textContent = icon;
  }

  function isStandalone() {
    return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true;
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
    var md = modeOf(c.mode);
    var stage = c.stageId ? Store.find('stages', c.stageId) : null;
    var partner = c.mode === 'coppia' && c.partnerId ? Store.find('travelers', c.partnerId) : null;
    var instigator = c.instigatorId ? Store.find('travelers', c.instigatorId) : null;

    var who = esc(t ? t.name : 'Sconosciuto') + (partner ? ' <span class="muted">+</span> ' + esc(partner.name) : '');
    var out = '<div class="list-item timeline-item">';
    out += avatar(t, 'sm');
    out += '<div class="body">';
    out += '<div class="meta"><strong style="color:var(--text)">' + who + '</strong> · ' + s.emo + ' ' + esc(s.lb) + ' · ' + fmtTime(c.at) + (stage ? ' · ' + esc(stage.title) : '') + '</div>';
    if (c.text) out += '<p>' + esc(c.text) + '</p>';
    var badges = [];
    if (c.mode && c.mode !== 'solo') badges.push('<span class="badge live">' + md.emo + ' ' + esc(md.lb) + '</span>');
    if (isBonus(c)) badges.push('<span class="badge hot">' + ty.emo + ' ' + esc(ty.lb) + ' · +' + bonusPoints(c) + ' pt</span>');
    if (Number(c.bonus)) badges.push('<span class="badge">' + stars(c.bonus) + ' ' + esc(BONUS_LABELS[c.bonus]) + '</span>');
    if (instigator) badges.push('<span class="badge">🎯 istigata da ' + esc(instigator.name) + '</span>');
    if (badges.length) out += '<div style="margin-top:6px">' + badges.join(' ') + '</div>';
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
    if (archives().length) out += '<div class="btn-row"><a class="btn ghost" href="#/passato">🗄 Le bestemmie del passato</a></div>';
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
      out += '</div>';
      out += '<div class="btn-row"><a class="btn ghost" href="#/riepilogo">📄 Riepilogo del viaggio</a></div>';
      out += '</div>';
    }

    out += '<div class="section"><div class="btn-row"><a class="btn ghost" href="#/passato">🗄 Le bestemmie del passato' + (archives().length ? ' (' + archives().length + ')' : '') + '</a></div></div>';
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

    var instigators = ranking(list).filter(function (r) { return r.instigations; })
      .sort(function (a, b) { return b.instigations - a.instigations; });
    if (instigators.length) {
      out += '<div class="section"><div class="section-title">Istigatori <span class="muted">🎯</span></div><div class="list">';
      instigators.forEach(function (r) {
        out += '<a class="list-item" href="#/persona/' + esc(r.traveler.id) + '">' + avatar(r.traveler, 'sm');
        out += '<div class="grow"><strong>' + esc(r.traveler.name) + '</strong><small>ha fatto bestemmiare gli altri</small></div>';
        out += '<div class="trail"><b style="font-size:19px;color:var(--accent-2)">' + r.instigations + '</b><br>' + stars(1) + '</div></a>';
      });
      out += '</div></div>';
    }

    var bonuses = bestBonus(list, 5);
    if (bonuses.length) {
      out += '<div class="section"><div class="section-title">Le bestemmie bonus</div><div class="list">';
      bonuses.forEach(function (c) { out += bonusCard(c); });
      out += '</div></div>';
    }

    var byType = TYPES.map(function (ty) {
      return { ty: ty, n: list.filter(function (c) { return typeOf(c.type).v === ty.v; }).length };
    }).filter(function (x) { return x.n; }).sort(function (a, b) { return b.n - a.n; });
    if (byType.length > 1) {
      out += '<div class="section"><div class="section-title">Per tipo</div><div class="card">';
      byType.forEach(function (x) { out += statRow(x.ty.emo + '  ' + x.ty.lb, x.n); });
      var byMode = MODES.slice(1).map(function (m) {
        return { m: m, n: list.filter(function (c) { return c.mode === m.v; }).length };
      }).filter(function (x) { return x.n; });
      byMode.forEach(function (x) { out += statRow(x.m.emo + '  ' + x.m.lb, x.n); });
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
      out += statRow('Bestemmia record', severityOf(hardest.severity).emo + ' ' + (nameOf(hardest.travelerId) || '—'));
    }
    out += '</div></div>';
    return out;
  }

  function bonusCard(c) {
    var bt = Store.find('travelers', c.travelerId);
    var ty = typeOf(c.type);
    var md = modeOf(c.mode);
    var out = '<div class="quote">';
    out += '<p>' + (c.text ? '“' + esc(c.text) + '”' : ty.emo + ' ' + esc(ty.desc)) + '</p>';
    out += '<footer><span>— ' + esc(bt ? bt.name : 'Ignoto') + ' · ' + ty.emo + ' ' + esc(ty.lb) + ' ' + stars(c.bonus);
    if (c.mode && c.mode !== 'solo') out += ' · ' + md.emo + ' ' + esc(md.lb);
    out += '</span><span class="badge hot">+' + bonusPoints(c) + ' pt</span></footer>';
    out += '</div>';
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
    var instigated = Store.all('curses').filter(function (c) { return c.instigatorId === t.id; });
    var days = {};
    mine.forEach(function (c) { days[dayKey(c.at)] = (days[dayKey(c.at)] || 0) + 1; });
    var dayCount = Object.keys(days).length || 1;
    var rank = ranking(Store.all('curses'));
    var mineRank = rank.filter(function (r) { return r.traveler.id === t.id; })[0];
    var pos = rank.map(function (r) { return r.traveler.id; }).indexOf(t.id) + 1;

    var out = '<div class="section"><div class="card center">';
    out += '<div style="display:flex;justify-content:center;margin-bottom:10px">' + avatar(t, 'lg') + '</div>';
    out += '<h2 style="margin:0">' + esc(t.name) + '</h2>';
    if (t.nickname) out += '<div class="muted">detto “' + esc(t.nickname) + '”</div>';
    if (t.role) out += '<div class="badge" style="margin-top:8px">' + esc(t.role) + '</div>';
    if (t.bio) out += '<p style="margin:12px 0 0;font-size:14px">' + esc(t.bio) + '</p>';
    out += '<div class="hero-stats" style="margin-top:16px">';
    out += '<div><b>' + mine.length + '</b><span>Totali</span></div>';
    out += '<div><b>' + (mineRank ? mineRank.points : 0) + '</b><span>Punti</span></div>';
    out += '<div><b style="color:var(--accent-2)">' + (mineRank ? mineRank.fantasy : 0) + '</b><span>Fantasia</span></div>';
    out += '<div><b>' + (pos || '—') + '°</b><span>Classifica</span></div>';
    out += '</div>';
    out += '<div class="muted" style="font-size:12px;margin-top:8px">' + (mine.length / dayCount).toFixed(1) + ' al giorno su ' + dayCount + (dayCount === 1 ? ' giorno' : ' giorni');
    if (instigated.length) out += ' · 🎯 ha istigato ' + instigated.length + (instigated.length === 1 ? ' volta' : ' volte');
    out += '</div>';
    out += '<div class="btn-row"><button class="btn primary" data-action="quick-add" data-id="' + esc(t.id) + '">+ Bestemmia</button>';
    out += '<button class="btn ghost" data-action="add-quote" data-id="' + esc(t.id) + '">💬 Frase</button></div>';
    out += '</div></div>';

    var myBonus = bestBonus(mine, 3);
    if (myBonus.length) {
      out += '<div class="section"><div class="section-title">Le sue bonus</div><div class="list">';
      myBonus.forEach(function (c) { out += bonusCard(c); });
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

  /* ---------------- vista: Benvenuto / installazione ---------------- */

  function installSteps() {
    var out = '<ol class="steps">';
    out += '<li>Tocca il pulsante <b>Condividi</b> di Safari (il quadrato con la freccia in su, in fondo allo schermo)</li>';
    out += '<li>Scorri e scegli <b>Aggiungi alla schermata Home</b></li>';
    out += '<li>Conferma con <b>Aggiungi</b>: comparirà l\'icona del Bestemmiometro</li>';
    out += '<li>D\'ora in poi apri l\'app da lì: si vede meglio e può mandarti le notifiche</li>';
    out += '</ol>';
    return out;
  }

  function viewWelcome() {
    var s = Store.state.settings;
    var out = '<div class="section"><div class="card center">';
    out += '<div style="font-size:52px">🤬</div>';
    out += '<h2 style="margin:6px 0 4px">Il Bestemmiometro</h2>';
    out += '<p class="muted" style="margin-top:0">Il contatore ufficiale delle bestemmie del roadtrip. Tocca la faccia del colpevole, scegli gravità e fantasia, e lascia parlare la classifica.</p>';
    out += '</div></div>';

    out += '<div class="section"><div class="section-title">1. Installa l\'app</div><div class="card">';
    if (isStandalone()) {
      out += '<p style="margin:0"><span class="badge live">fatto</span> Stai già usando l\'app installata. Perfetto.</p>';
    } else {
      out += '<p class="muted" style="margin-top:0;font-size:14px">Non si scarica da nessuno store: si aggiunge alla schermata Home in tre tocchi.</p>';
      out += installSteps();
    }
    out += '</div></div>';

    out += '<div class="section"><div class="section-title">2. Entra nel viaggio</div><div class="card">';
    out += '<p class="muted" style="margin-top:0;font-size:14px">Il codice viaggio è la parola d\'ordine del gruppo: chi scrive lo stesso codice vede lo stesso conteggio. Fattelo dare da chi organizza, o creane uno nuovo e passalo agli altri.</p>';
    out += '<div class="field"><label>Codice viaggio</label><input type="text" id="welcomeTrip" value="' + esc(s.supabase.tripId) + '" placeholder="es. puglia2026" autocapitalize="off" autocorrect="off" spellcheck="false"></div>';
    out += '<div class="btn-row"><button class="btn primary" data-action="welcome-join">Entra</button>';
    out += '<button class="btn ghost" data-action="welcome-new">Crea codice</button></div>';
    out += '</div></div>';

    out += '<div class="section"><div class="btn-row"><button class="btn ghost" data-action="welcome-done">Ho capito, si comincia →</button></div></div>';
    return out;
  }

  function viewJoin(query) {
    var cfg = null;
    try { cfg = query.c ? b64dec(query.c) : null; } catch (e) { cfg = null; }
    var out = '<div class="section"><div class="card center">';
    if (!cfg || !cfg.t) {
      out += '<h2>Invito non valido</h2><p class="muted">Chiedi all\'organizzatore di rimandarti il link, oppure entra scrivendo il codice viaggio a mano.</p>';
      out += '<div class="btn-row"><a class="btn primary" href="#/benvenuto">Inserisci il codice</a></div>';
    } else {
      out += '<div style="font-size:44px">🤝</div>';
      out += '<h2 style="margin:6px 0">Unisciti al viaggio</h2>';
      out += '<p class="muted">' + esc(cfg.n || 'Bestemmiometro') + ' · codice <b>' + esc(cfg.t) + '</b></p>';
      out += '<button class="btn primary" data-action="join-confirm" data-cfg="' + esc(query.c) + '">Entra nel gruppo</button>';
    }
    out += '</div></div>';
    return out;
  }

  /* ---------------- vista: archivio ---------------- */

  function snapshotOf(archive) {
    var s = (archive && archive.snapshot) || {};
    return {
      trip: s.trip || {},
      travelers: (s.travelers || []).filter(isAlive),
      stages: (s.stages || []).filter(isAlive),
      curses: (s.curses || []).filter(isAlive),
      quotes: (s.quotes || []).filter(isAlive)
    };
  }

  function viewPast() {
    var list = archives();
    var out = '<div class="section"><div class="section-title">Le bestemmie del passato</div>';
    out += '<p class="muted" style="font-size:14px;margin-top:0">I viaggi chiusi restano qui per sempre. Puoi rileggerli, scaricarne il riepilogo o ricaricarli per continuare a giocare.</p>';
    if (!list.length) {
      out += '<div class="empty">Nessun viaggio archiviato. Quando la vacanza finisce, chiudila dalla zona Admin e finirà qui.</div>';
    } else {
      out += '<div class="list">';
      list.forEach(function (a) {
        var snap = snapshotOf(a);
        out += '<a class="list-item" href="#/passato/' + esc(a.id) + '">';
        out += '<div class="grow"><strong>' + esc(a.name) + '</strong><small>' + esc(a.subtitle || '') + (a.subtitle ? ' · ' : '') + 'chiuso il ' + fmtDate(a.closedAt) + '</small></div>';
        out += '<div class="trail"><b style="font-size:20px;color:var(--accent)">' + snap.curses.length + '</b><br>' + snap.travelers.length + ' persone</div>';
        out += '<span class="icon-btn">›</span></a>';
      });
      out += '</div>';
    }
    out += '</div>';
    return out;
  }

  function viewArchive(id) {
    var a = Store.find('archives', id);
    if (!a) return '<div class="empty">Archivio non trovato.</div>';
    var snap = snapshotOf(a);
    var rank = rankingIn(snap.travelers, snap.curses);
    var fant = fantasyRanking(snap.curses, snap.travelers);

    var out = '<div class="section"><div class="card center">';
    out += '<div style="font-size:40px">🗄</div>';
    out += '<h2 style="margin:6px 0 2px">' + esc(a.name) + '</h2>';
    out += '<div class="muted">' + esc(a.subtitle || '') + '</div>';
    out += '<div class="muted" style="font-size:12px;margin-top:4px">chiuso il ' + fmtDate(a.closedAt) + '</div>';
    out += '<div class="hero-stats" style="margin-top:16px">';
    out += '<div><b>' + snap.curses.length + '</b><span>Bestemmie</span></div>';
    out += '<div><b>' + snap.curses.reduce(function (x, c) { return x + points(c); }, 0) + '</b><span>Punti</span></div>';
    out += '<div><b>' + snap.quotes.length + '</b><span>Frasi</span></div>';
    out += '</div></div></div>';

    out += '<div class="section"><div class="btn-row">';
    out += '<button class="btn primary" data-action="poster" data-id="' + esc(a.id) + '">📸 Immagine</button>';
    out += '<a class="btn ghost" href="#/riepilogo/' + esc(a.id) + '">📄 PDF</a>';
    out += '</div><div class="btn-row">';
    out += '<button class="btn ghost" data-action="share-text" data-id="' + esc(a.id) + '">💬 Testo</button>';
    out += '<button class="btn ghost" data-action="restore-archive" data-id="' + esc(a.id) + '">♻️ Ricarica</button>';
    out += '</div></div>';

    if (rank.length && rank[0].count) {
      out += '<div class="section"><div class="section-title">Classifica finale</div><div class="list">';
      rank.filter(function (r) { return r.count; }).forEach(function (r, i) {
        var medal = i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : '';
        out += '<div class="list-item"><div class="rank ' + medal + '">' + (i + 1) + '</div>' + avatar(r.traveler, 'sm');
        out += '<div class="grow"><strong>' + esc(r.traveler.name) + '</strong></div>';
        out += '<div class="trail"><b style="font-size:19px;color:var(--text)">' + r.count + '</b><br>' + r.points + ' pt</div></div>';
      });
      out += '</div></div>';
    }

    if (fant.length) {
      out += '<div class="section"><div class="section-title">Re della fantasia</div><div class="list">';
      fant.slice(0, 3).forEach(function (r, i) {
        out += '<div class="list-item"><div class="rank">' + (i + 1) + '</div>' + avatar(r.traveler, 'sm');
        out += '<div class="grow"><strong>' + esc(r.traveler.name) + '</strong></div>';
        out += '<div class="trail"><b style="color:var(--accent-2)">' + r.fantasy + '</b></div></div>';
      });
      out += '</div></div>';
    }

    if (snap.quotes.length) {
      out += '<div class="section"><div class="section-title">Frasi celebri</div><div class="list">';
      snap.quotes.slice(0, 12).forEach(function (q) {
        out += '<div class="quote"><p>“' + esc(q.text) + '”</p><footer><span>— ' + esc(nameOf(q.travelerId, snap.travelers) || 'Ignoto') + ' · ' + fmtDate(q.at) + '</span></footer></div>';
      });
      out += '</div></div>';
    }

    out += '<div class="section"><div class="btn-row"><button class="btn danger" data-action="delete-archive" data-id="' + esc(a.id) + '">Elimina archivio</button></div></div>';
    return out;
  }

  /* ---------------- vista: riepilogo stampabile ---------------- */

  function summaryFrom(src, meta) {
    var trav = src.travelers, list = src.curses, quo = src.quotes;
    var rank = rankingIn(trav, list).filter(function (r) { return r.count; });
    var fant = fantasyRanking(list, trav);
    var days = {};
    list.forEach(function (c) { days[dayKey(c.at)] = true; });
    var dayCount = Object.keys(days).length;
    var top = bestBonus(list, 1)[0];
    var bestQuote = null;
    if (top && top.text) bestQuote = { text: top.text, author: nameOf(top.travelerId, trav) };
    else if (quo.length) bestQuote = { text: quo[0].text, author: nameOf(quo[0].travelerId, trav) };

    return {
      title: meta.title,
      subtitle: meta.subtitle,
      period: meta.period,
      total: list.length,
      totalPoints: list.reduce(function (a, c) { return a + points(c); }, 0),
      days: dayCount,
      bonusCount: list.filter(isBonus).length,
      quotesCount: quo.length,
      stages: src.stages.length,
      rank: rank,
      fantasy: fant,
      bonuses: bestBonus(list, 5),
      quotes: quo,
      worstDay: bestDay(list),
      bestQuote: bestQuote,
      travelers: trav,
      curses: list
    };
  }

  function currentSummary() {
    return summaryFrom({
      travelers: travelers(), stages: stages(), curses: Store.all('curses'), quotes: quotes()
    }, {
      title: Store.state.trip.name || 'Il viaggio',
      subtitle: Store.state.trip.subtitle || '',
      period: periodLabel(Store.state.trip.startDate, Store.state.trip.endDate)
    });
  }

  function archiveSummary(a) {
    var snap = snapshotOf(a);
    return summaryFrom(snap, {
      title: a.name,
      subtitle: a.subtitle || '',
      period: periodLabel(snap.trip.startDate, snap.trip.endDate) || ('chiuso il ' + fmtDate(a.closedAt))
    });
  }

  function periodLabel(from, to) {
    if (from && to) return fmtDate(from) + ' – ' + fmtDate(to);
    return fmtDate(from || to || '');
  }

  function viewSummary(archiveId) {
    var s, backHref;
    if (archiveId) {
      var a = Store.find('archives', archiveId);
      if (!a) return '<div class="empty">Archivio non trovato.</div>';
      s = archiveSummary(a);
      backHref = '#/passato/' + a.id;
    } else {
      s = currentSummary();
      backHref = '#/tappe';
    }

    var out = '<div class="no-print" style="margin-bottom:16px"><div class="btn-row">';
    out += '<button class="btn primary" data-action="print">🖨 Salva come PDF</button>';
    out += '<button class="btn ghost" data-action="poster" data-id="' + esc(archiveId || '') + '">📸 Immagine</button>';
    out += '</div><div class="btn-row"><a class="btn ghost" href="' + backHref + '">← Indietro</a></div>';
    out += '<div class="hint">Su iPhone: tocca "Salva come PDF", poi il tasto Condividi nell\'anteprima di stampa per salvarlo o mandarlo su WhatsApp.</div></div>';

    out += '<article class="paper">';
    out += '<header class="paper-head"><div class="paper-kicker">Bestemmiometro</div>';
    out += '<h1>' + esc(s.title) + '</h1>';
    if (s.subtitle) out += '<div class="paper-sub">' + esc(s.subtitle) + '</div>';
    if (s.period) out += '<div class="paper-sub">' + esc(s.period) + '</div>';
    out += '</header>';

    out += '<div class="paper-grid">';
    out += paperStat(s.total, 'Bestemmie');
    out += paperStat(s.totalPoints, 'Punti');
    out += paperStat(s.bonusCount, 'Bonus');
    out += paperStat(s.days, s.days === 1 ? 'Giorno' : 'Giorni');
    out += paperStat(s.quotesCount, 'Frasi');
    out += paperStat(s.stages, 'Tappe');
    out += '</div>';

    if (s.rank.length) {
      out += '<h2 class="paper-h2">Classifica finale</h2><table class="paper-table">';
      out += '<thead><tr><th>#</th><th>Viaggiatore</th><th>Bestemmie</th><th>Punti</th><th>Fantasia</th></tr></thead><tbody>';
      s.rank.forEach(function (r, i) {
        out += '<tr><td>' + (i + 1) + '</td><td>' + esc(r.traveler.name) + '</td><td>' + r.count + '</td><td>' + r.points + '</td><td>' + r.fantasy + '</td></tr>';
      });
      out += '</tbody></table>';
    }

    if (s.bonuses.length) {
      out += '<h2 class="paper-h2">Le bestemmie bonus</h2><ul class="paper-list">';
      s.bonuses.forEach(function (c) {
        var ty = typeOf(c.type);
        out += '<li><b>' + esc(nameOf(c.travelerId, s.travelers) || 'Ignoto') + '</b> — ' + ty.emo + ' ' + esc(ty.lb) + ' ' + stars(c.bonus) + ' (+' + bonusPoints(c) + ' pt)';
        if (c.text) out += '<br><i>“' + esc(c.text) + '”</i>';
        out += '</li>';
      });
      out += '</ul>';
    }

    if (s.quotes.length) {
      out += '<h2 class="paper-h2">Frasi celebri</h2><ul class="paper-list">';
      s.quotes.slice(0, 20).forEach(function (q) {
        out += '<li><i>“' + esc(q.text) + '”</i><br><span class="muted">— ' + esc(nameOf(q.travelerId, s.travelers) || 'Ignoto') + ', ' + fmtDate(q.at) + '</span></li>';
      });
      out += '</ul>';
    }

    out += '<footer class="paper-foot">Documento generato dal Bestemmiometro · ' + fmtDate(Date.now()) + '</footer>';
    out += '</article>';
    return out;
  }

  function paperStat(value, label) {
    return '<div class="paper-stat"><b>' + esc(value) + '</b><span>' + esc(label) + '</span></div>';
  }

  /* ---------------- vista: Admin ---------------- */

  function viewAdmin() {
    var s = Store.state;
    var locked = s.trip.pin && !s.settings.unlocked;
    var out = '';

    if (locked) {
      out += '<div class="section"><div class="card">';
      out += '<h2 style="margin-top:0">Zona admin</h2>';
      out += '<p class="muted">Inserisci il PIN per configurare viaggiatori e tappe.</p>';
      out += '<div class="field"><label>PIN</label><input type="password" inputmode="numeric" id="pinInput" placeholder="••••"></div>';
      out += '<button class="btn primary" data-action="unlock">Sblocca</button>';
      out += '</div></div>';
      out += sectionContact();
      return out;
    }

    if (!isStandalone()) {
      out += '<div class="section"><div class="card">';
      out += '<div class="section-title" style="margin-bottom:8px">Installa l\'app</div>';
      out += '<p class="muted" style="margin-top:0;font-size:14px">Stai usando il Bestemmiometro dentro Safari. Aggiungilo alla schermata Home: si vede meglio e può mandare le notifiche.</p>';
      out += '<div class="btn-row"><a class="btn ghost" href="#/benvenuto">Vedi come si fa</a></div>';
      out += '</div></div>';
    }

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

    out += '<div class="section"><div class="section-title">Gruppo e sincronizzazione</div><div class="card">';
    out += '<div class="switch-row"><div class="lbl">Connessione al database<small>' + (Store.connected() ? 'già configurata nell\'app' : 'mancante') + '</small></div>';
    out += '<span class="badge ' + (Store.connected() ? 'live' : '') + '">' + (Store.connected() ? 'pronta' : 'assente') + '</span></div>';
    out += '<div class="field" style="margin-top:14px"><label>Codice viaggio</label><input type="text" id="sbTrip" value="' + esc(s.settings.supabase.tripId) + '" placeholder="es. puglia2026" autocapitalize="off" autocorrect="off" spellcheck="false"><div class="hint">Uguale per tutto il gruppo. Cambialo per iniziare un viaggio nuovo.</div></div>';
    out += '<div class="btn-row"><button class="btn primary" data-action="save-sync">Salva e sincronizza</button></div>';
    out += '<div class="btn-row"><button class="btn ghost" data-action="invite">📲 Invita gli amici</button></div>';
    out += '<div class="hint" style="margin-top:10px">In attesa di invio: ' + Store.pendingCount() + ' modifiche.';
    if (s.settings.lastSyncWarning) out += '<br><b style="color:var(--accent)">Attenzione:</b> ' + esc(s.settings.lastSyncWarning);
    out += '</div>';
    out += '<details style="margin-top:12px"><summary class="muted" style="font-size:13px">Impostazioni avanzate del database</summary>';
    out += '<div class="field" style="margin-top:12px"><label>URL progetto</label><input type="text" id="sbUrl" value="' + esc(s.settings.supabase.url) + '" autocapitalize="off" autocorrect="off" spellcheck="false"></div>';
    out += '<div class="field"><label>Chiave pubblica</label><input type="text" id="sbKey" value="' + esc(s.settings.supabase.key) + '" autocapitalize="off" autocorrect="off" spellcheck="false"><div class="hint">Già impostati nell\'app: toccali solo se cambi progetto Supabase.</div></div>';
    out += '</details>';
    out += '</div></div>';

    out += '<div class="section"><div class="section-title">Promemoria</div><div class="card">';
    out += '<div class="switch-row"><div class="lbl">Notifiche giornaliere<small>Stato: ' + esc(permLabel()) + '</small></div>';
    out += '<button class="btn small ' + (s.settings.reminderEnabled ? 'ghost' : 'primary') + '" data-action="toggle-reminder">' + (s.settings.reminderEnabled ? 'Disattiva' : 'Attiva') + '</button></div>';
    out += '<div class="field" style="margin-top:14px"><label>Orario della sveglia</label><input type="time" id="reminderTime" value="' + esc(s.settings.reminderTime) + '"></div>';
    out += '<div class="btn-row"><button class="btn ghost" data-action="save-reminder">Salva orario</button><button class="btn ghost" data-action="test-reminder">Prova notifica</button></div>';
    out += '<div class="hint" style="margin-top:12px">iPhone consegna la notifica quando l\'app è aperta o è stata aperta da poco. Per la sveglia automatica ogni sera crea un\'automazione in <b>Comandi rapidi</b> che apre il Bestemmiometro all\'orario scelto.</div>';
    out += '</div></div>';

    out += '<div class="section"><div class="section-title">Fine vacanza</div><div class="card">';
    out += '<p class="muted" style="margin-top:0;font-size:14px">Quando il viaggio è finito, chiudilo: le statistiche vengono congelate in un archivio consultabile per sempre e il contatore riparte da zero per la prossima avventura.</p>';
    out += '<div class="btn-row"><button class="btn primary" data-action="close-trip">🏁 Chiudi il viaggio</button></div>';
    out += '<div class="btn-row"><a class="btn ghost" href="#/riepilogo">📄 Riepilogo</a><a class="btn ghost" href="#/passato">🗄 Archivio</a></div>';
    out += '</div></div>';

    out += '<div class="section"><div class="section-title">Dati</div><div class="card stack">';
    out += '<button class="btn ghost" data-action="export">⬇︎ Esporta backup</button>';
    out += '<button class="btn ghost" data-action="import">⬆︎ Importa backup</button>';
    out += '<button class="btn danger" data-action="reset">Cancella tutto</button>';
    out += '</div></div>';

    out += sectionContact();
    return out;
  }

  function sectionContact() {
    var dev = (window.Config && Config.developer) || 'lo sviluppatore';
    var out = '<div class="section"><div class="section-title">Contatta ' + esc(dev) + '</div><div class="card">';
    out += '<p class="muted" style="margin-top:0;font-size:14px">Un\'idea, una categoria che manca, qualcosa che non funziona? Scrivilo qui: arriva direttamente a chi sviluppa l\'app.</p>';
    out += '<div class="btn-row"><button class="btn ghost" data-action="feedback">💡 Manda un suggerimento</button></div>';
    out += '<div class="center" style="margin-top:12px"><a class="muted" style="font-size:12px" href="#/sviluppatore">Area sviluppatore</a></div>';
    out += '</div></div>';
    return out;
  }

  function viewDeveloper() {
    var dev = (window.Config && Config.developer) || 'lo sviluppatore';
    if (!Store.state.settings.devUnlocked) {
      var gate = '<div class="section"><div class="card">';
      gate += '<h2 style="margin-top:0">Area sviluppatore</h2>';
      gate += '<p class="muted">Riservata a ' + esc(dev) + ': qui arrivano i suggerimenti mandati dall\'app.</p>';
      gate += '<div class="field"><label>Codice</label><input type="password" id="devCode" placeholder="••••••" autocapitalize="off" autocorrect="off" spellcheck="false"></div>';
      gate += '<button class="btn primary" data-action="dev-unlock">Entra</button>';
      gate += '<div class="btn-row"><a class="btn ghost" href="#/admin">← Torna indietro</a></div>';
      gate += '</div></div>';
      return gate;
    }

    var list = Store.all('feedback').slice().sort(function (a, b) { return b.at - a.at; });
    var out = '<div class="section"><div class="section-title">Suggerimenti ricevuti <button data-action="load-feedback">Aggiorna</button></div>';
    if (!list.length) {
      out += '<div class="empty">Nessun suggerimento scaricato. Tocca "Aggiorna" per controllare.</div>';
    } else {
      out += '<div class="list">';
      list.forEach(function (f) {
        out += '<div class="quote"><p>' + esc(f.text) + '</p>';
        out += '<footer><span>— ' + esc(f.from || 'anonimo') + ' · ' + fmtDate(f.at) + (f.tripName ? ' · ' + esc(f.tripName) : '') + '</span>';
        out += '<button class="btn small ghost" data-action="delete-feedback" data-id="' + esc(f.id) + '">Elimina</button></footer></div>';
      });
      out += '</div>';
    }
    out += '<div class="hint" style="margin-top:10px">I suggerimenti stanno in un contenitore separato dai viaggi: nessun gruppo li scarica insieme alle proprie bestemmie. Detto onestamente, però, sono nascosti e non cifrati: chi conosce la chiave pubblica dell\'app potrebbe leggerli.</div>';
    out += '<div class="btn-row"><a class="btn ghost" href="#/admin">← Torna all\'Admin</a></div>';
    out += '</div>';
    return out;
  }

  function permLabel() {
    var p = Reminders.permission();
    if (p === 'granted') return 'autorizzate';
    if (p === 'denied') return 'bloccate da iOS, riattivale nelle impostazioni';
    if (p === 'unsupported') return 'non disponibili in questo browser';
    return 'da autorizzare';
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

  function peopleOptions(exceptId, selectedId, emptyLabel) {
    var out = '';
    if (emptyLabel) out += '<option value="">' + esc(emptyLabel) + '</option>';
    travelers().forEach(function (t) {
      if (t.id === exceptId) return;
      out += '<option value="' + esc(t.id) + '"' + (t.id === selectedId ? ' selected' : '') + '>' + esc(t.name) + '</option>';
    });
    return out;
  }

  function sheetQuickAdd(travelerId) {
    var t = Store.find('travelers', travelerId);
    if (!t) return;
    var stage = currentStage();
    var others = travelers().filter(function (x) { return x.id !== t.id; });

    var out = '<h3 class="sheet-title">' + esc(t.name) + ' ha bestemmiato</h3>';
    out += '<p class="sheet-sub">' + (stage ? esc(stage.title) : 'Nessuna tappa attiva') + ' · ' + fmtTime(Date.now()) + '</p>';

    out += '<div class="field"><label>Com\'è andata</label><div class="types" id="modePicker">';
    MODES.forEach(function (m) {
      var disabled = m.v === 'coppia' && !others.length;
      out += '<button type="button"' + (m.v === 'solo' ? ' class="active"' : '') + ' data-mode="' + m.v + '"' + (disabled ? ' disabled style="opacity:.4"' : '') + '>';
      out += '<span class="emo">' + m.emo + '</span><span class="lb">' + esc(m.lb) + (m.bonus ? ' <span class="bn">+' + m.bonus + '</span>' : '') + '</span></button>';
    });
    out += '</div><div class="hint" id="modeHint">' + esc(MODES[0].desc) + '</div></div>';

    out += '<div class="field" id="partnerField" hidden><label>In coppia con</label><select id="partnerSelect">' + peopleOptions(t.id, null, null) + '</select>';
    out += '<div class="hint">La bestemmia conta per tutti e due e il bonus va a entrambi.</div></div>';

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

    if (others.length) {
      out += '<div class="field"><label>Istigata da</label><select id="instigatorSelect">' + peopleOptions(t.id, null, 'Nessuno, colpa sua') + '</select>';
      out += '<div class="hint">Chi ha provocato si prende ' + stars(INSTIGATION_STARS) + ' (2 pt di fantasia), a chi l\'ha detta va +' + INSTIGATION_POINT + ' punto.</div></div>';
    }

    out += '<div class="field"><label>Cosa è successo (facoltativo)</label><input type="text" id="curseText" placeholder="Es. rotonda sbagliata a Foggia"></div>';
    out += '<button class="btn primary" data-action="save-curse" data-id="' + esc(t.id) + '">Registra</button>';
    out += '<div class="btn-row"><button class="btn ghost" data-action="save-curse-x5" data-id="' + esc(t.id) + '">Raffica: +5 classiche</button></div>';
    openSheet(out);

    pickerBehaviour('sevPicker', 'data-sev');
    pickerBehaviour('bonusPicker', 'data-bonus');
    pickerBehaviour('typePicker', 'data-type', function (btn) {
      document.getElementById('typeHint').textContent = typeOf(btn.getAttribute('data-type')).desc;
    });
    pickerBehaviour('modePicker', 'data-mode', function (btn) {
      var mode = btn.getAttribute('data-mode');
      document.getElementById('modeHint').textContent = modeOf(mode).desc;
      document.getElementById('partnerField').hidden = mode !== 'coppia';
      var textEl = document.getElementById('curseText');
      textEl.placeholder = mode === 'wireless'
        ? 'Es. labiale perfetto al terzo autovelox'
        : 'Es. rotonda sbagliata a Foggia';
    });
  }

  // Selettore a scelta singola: un solo figlio resta "active".
  function pickerBehaviour(id, attr, onPick) {
    var picker = document.getElementById(id);
    if (!picker) return;
    picker.addEventListener('click', function (e) {
      var btn = e.target.closest('button[' + attr + ']');
      if (!btn || btn.disabled) return;
      Array.prototype.forEach.call(picker.children, function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      if (onPick) onPick(btn);
    });
  }

  function pickedValue(pickerId, attr, fallback) {
    var active = document.querySelector('#' + pickerId + ' button.active');
    return active ? active.getAttribute(attr) : fallback;
  }

  function sheetQuote(travelerId) {
    var list = travelers();
    if (!list.length) { toast('Aggiungi prima un viaggiatore'); return; }
    var out = '<h3 class="sheet-title">Frase celebre</h3>';
    out += '<p class="sheet-sub">Le perle che verranno ricordate per sempre.</p>';
    out += '<div class="field"><label>Chi l\'ha detta</label><select id="quoteWho">' + peopleOptions(null, travelerId, null) + '</select></div>';
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

  function sheetInvite() {
    var s = Store.state.settings.supabase;
    var out = '<h3 class="sheet-title">Invita gli amici</h3>';
    out += '<p class="sheet-sub">L\'app è già collegata al database: agli altri basta il link.</p>';
    if (s.tripId) {
      out += '<div class="card" style="margin-bottom:12px"><div class="lbl">Con il codice del viaggio</div>';
      out += '<p class="muted" style="font-size:13px">Entrano diretti in <b>' + esc(s.tripId) + '</b> e vedono subito il vostro conteggio.</p>';
      out += '<button class="btn primary" data-action="invite-trip">📲 Invita a “' + esc(Store.state.trip.name) + '”</button></div>';
    } else {
      out += '<div class="empty" style="margin-bottom:12px">Non hai ancora un codice viaggio: impostalo per poter invitare al tuo gruppo.</div>';
    }
    out += '<div class="card"><div class="lbl">Solo l\'app, senza codice</div>';
    out += '<p class="muted" style="font-size:13px">Per quando il viaggio non è il tuo: la installano e scelgono loro il codice del gruppo.</p>';
    out += '<button class="btn ghost" data-action="invite-app">🔗 Condividi l\'app</button></div>';
    openSheet(out);
  }

  function sheetCloseTrip() {
    var s = Store.state;
    var total = Store.all('curses').length;
    var out = '<h3 class="sheet-title">🏁 Chiudi il viaggio</h3>';
    out += '<p class="sheet-sub">Congela ' + total + (total === 1 ? ' bestemmia' : ' bestemmie') + ', ' + Store.all('quotes').length + ' frasi e ' + stages().length + ' tappe in un archivio permanente. Poi il contatore riparte da zero.</p>';
    out += '<div class="field"><label>Nome dell\'archivio</label><input type="text" id="closeName" value="' + esc(s.trip.name || 'Il viaggio') + '"></div>';
    out += '<div class="field"><label>Sottotitolo</label><input type="text" id="closeSub" value="' + esc(s.trip.subtitle || '') + '" placeholder="Es. Puglia 2026"></div>';
    out += '<div class="switch-row"><div class="lbl">Mantieni i viaggiatori<small>Stessa compagnia al prossimo giro</small></div>';
    out += '<input type="checkbox" id="keepPeople" checked style="width:22px;height:22px"></div>';
    out += '<div class="hint" style="margin:12px 0">Prima di chiudere, assicurati che tutti abbiano sincronizzato: le bestemmie non ancora inviate resterebbero fuori dall\'archivio.</div>';
    out += '<button class="btn primary" data-action="confirm-close">Chiudi e archivia</button>';
    openSheet(out);
  }

  function sheetFeedback() {
    var dev = (window.Config && Config.developer) || 'lo sviluppatore';
    var out = '<h3 class="sheet-title">Scrivi a ' + esc(dev) + '</h3>';
    out += '<p class="sheet-sub">Idee, categorie mancanti, cose rotte: tutto utile.</p>';
    out += '<div class="field"><label>Il tuo nome (facoltativo)</label><input type="text" id="fbFrom" placeholder="Come ti chiami"></div>';
    out += '<div class="field"><label>Il messaggio</label><textarea id="fbText" placeholder="Mi piacerebbe che..." style="min-height:130px"></textarea></div>';
    out += '<button class="btn primary" data-action="send-feedback">Invia</button>';
    out += '<div class="hint" style="margin-top:10px">Il messaggio viene inviato al database dell\'app. Non raccoglie nient\'altro: né posizione, né contatti.</div>';
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

  /* ---------------- chiusura e archivio ---------------- */

  function closeTrip(name, subtitle, keepPeople) {
    var snapshot = {
      trip: JSON.parse(JSON.stringify(Store.state.trip)),
      travelers: travelers().map(function (r) { return JSON.parse(JSON.stringify(r)); }),
      stages: stages().map(function (r) { return JSON.parse(JSON.stringify(r)); }),
      curses: Store.all('curses').map(function (r) { return JSON.parse(JSON.stringify(r)); }),
      quotes: quotes().map(function (r) { return JSON.parse(JSON.stringify(r)); })
    };
    var archive = Store.insert('archives', {
      name: name || Store.state.trip.name || 'Viaggio',
      subtitle: subtitle || '',
      closedAt: Date.now(),
      tripCode: Store.state.settings.supabase.tripId,
      snapshot: snapshot
    }, true);

    ['curses', 'quotes', 'stages'].forEach(function (c) {
      Store.all(c).forEach(function (r) { Store.remove(c, r.id, true); });
    });
    if (!keepPeople) {
      Store.all('travelers').forEach(function (r) { Store.remove('travelers', r.id, true); });
    }
    Store.setSettings({ currentStageId: null });
    Store.save();
    Store.emit();
    return archive;
  }

  function restoreArchive(id) {
    var a = Store.find('archives', id);
    if (!a) return false;
    var snap = snapshotOf(a);
    ['travelers', 'stages', 'curses', 'quotes'].forEach(function (c) {
      (snap[c] || []).forEach(function (rec) {
        var copy = JSON.parse(JSON.stringify(rec));
        delete copy.dirty;
        copy.deleted = false;
        if (Store.state[c].filter(function (r) { return r.id === copy.id; })[0]) {
          Store.update(c, copy.id, copy, true);
        } else {
          Store.insert(c, copy, true);
        }
      });
    });
    if (snap.trip && snap.trip.name) Store.setTrip({ name: snap.trip.name, subtitle: snap.trip.subtitle || '', startDate: snap.trip.startDate || '', endDate: snap.trip.endDate || '' });
    Store.save();
    Store.emit();
    return true;
  }

  function summaryText(s) {
    var lines = [];
    lines.push('🤬 ' + s.title + (s.subtitle ? ' — ' + s.subtitle : ''));
    if (s.period) lines.push(s.period);
    lines.push('');
    lines.push(s.total + ' bestemmie · ' + s.totalPoints + ' punti · ' + s.bonusCount + ' bonus');
    lines.push('');
    lines.push('🏆 Classifica');
    s.rank.slice(0, 5).forEach(function (r, i) {
      lines.push((i + 1) + '. ' + r.traveler.name + ' — ' + r.count + ' (' + r.points + ' pt)');
    });
    if (s.fantasy.length) {
      lines.push('');
      lines.push('🎨 Re della fantasia: ' + s.fantasy[0].traveler.name + ' (' + s.fantasy[0].fantasy + ' pt)');
    }
    if (s.bestQuote) {
      lines.push('');
      lines.push('💬 “' + s.bestQuote.text + '” — ' + s.bestQuote.author);
    }
    lines.push('');
    lines.push('— Bestemmiometro');
    return lines.join('\n');
  }

  function posterData(s) {
    return {
      title: s.title,
      period: s.period || s.subtitle,
      total: s.total,
      stats: [
        { value: s.totalPoints, label: 'punti' },
        { value: s.bonusCount, label: 'bonus' },
        { value: s.days, label: s.days === 1 ? 'giorno' : 'giorni' }
      ],
      podium: s.rank.slice(0, 3).map(function (r) {
        return { name: r.traveler.name, count: r.count, points: r.points, photo: r.traveler.photo, color: r.traveler.color };
      }),
      fantasyName: s.fantasy.length ? s.fantasy[0].traveler.name : '',
      fantasyPoints: s.fantasy.length ? s.fantasy[0].fantasy : 0,
      bestQuote: s.bestQuote,
      footer: 'Bestemmiometro · il contatore ufficiale del roadtrip'
    };
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
      var urlEl = document.getElementById('sbUrl');
      var keyEl = document.getElementById('sbKey');
      var patch = { tripId: document.getElementById('sbTrip').value.trim() };
      if (urlEl) patch.url = urlEl.value.trim();
      if (keyEl) patch.key = keyEl.value.trim();
      // Segna la configurazione come personalizzata solo se differisce da
      // quella di fabbrica, così sopravvive ai riavvii senza essere riscritta.
      var fab = (window.Config && Config.supabase) || {};
      patch.custom = !!(patch.url && patch.key && (patch.url !== fab.url || patch.key !== fab.key));
      Store.setSupabase(patch);
      if (!Store.syncConfigured()) { toast('Serve almeno il codice viaggio'); return; }
      markAllDirty();
      doSync(true);
    },

    'sync-now': function () {
      if (!Store.syncConfigured()) { location.hash = '#/admin'; toast('Imposta prima il codice viaggio'); return; }
      doSync(true);
    },

    'invite': function () { sheetInvite(); },

    'invite-trip': function () {
      var s = Store.state.settings.supabase;
      var payload = b64enc({ t: s.tripId, n: Store.state.trip.name });
      var link = appUrl() + '#/join?c=' + payload;
      shareLink('Entra nel Bestemmiometro del viaggio 🤬\n\n' + link, link);
    },

    'invite-app': function () {
      var link = appUrl() + '#/benvenuto';
      shareLink('Il Bestemmiometro: il contatore ufficiale delle bestemmie del viaggio 🤬\n\n' + link, link);
    },

    'join-confirm': function (el) {
      var cfg = b64dec(el.getAttribute('data-cfg'));
      var patch = { tripId: cfg.t };
      if (cfg.u) patch.url = cfg.u;
      if (cfg.k) patch.key = cfg.k;
      Store.setSupabase(patch);
      if (cfg.n) Store.setTrip({ name: cfg.n });
      doSync(true).then(function () {
        location.hash = Store.state.settings.seenWelcome ? '#/' : '#/benvenuto';
      });
    },

    'welcome-join': function () {
      var code = document.getElementById('welcomeTrip').value.trim();
      if (!code) { toast('Scrivi il codice viaggio'); return; }
      Store.setSupabase({ tripId: code });
      doSync(true);
    },

    'welcome-new': function () {
      var code = 'viaggio-' + Math.random().toString(36).slice(2, 7);
      document.getElementById('welcomeTrip').value = code;
      Store.setSupabase({ tripId: code });
      toast('Codice creato: passalo agli amici');
    },

    'welcome-done': function () {
      Store.setSettings({ seenWelcome: true });
      location.hash = '#/';
    },

    'print': function () { window.print(); },

    'poster': function (el) {
      var id = el.getAttribute('data-id');
      var s = id ? archiveSummary(Store.find('archives', id)) : currentSummary();
      if (!s.total) { toast('Non c\'è ancora niente da celebrare'); return; }
      toast('Preparo l\'immagine…');
      Poster.build(posterData(s)).then(function (canvas) {
        return Poster.share(canvas, 'bestemmiometro-' + dayKey(Date.now()) + '.png', summaryText(s));
      }).then(function (how) {
        toast(how === 'shared' ? 'Immagine condivisa 📸' : how === 'annullato' ? 'Annullato' : 'Immagine salvata');
      }).catch(function (err) {
        console.warn(err);
        toast('Non sono riuscito a creare l\'immagine');
      });
    },

    'share-text': function (el) {
      var id = el.getAttribute('data-id');
      var s = id ? archiveSummary(Store.find('archives', id)) : currentSummary();
      var text = summaryText(s);
      if (navigator.share) navigator.share({ text: text }).catch(function () {});
      else copy(text);
    },

    'close-trip': function () {
      if (!Store.all('curses').length && !Store.all('quotes').length) { toast('Non c\'è niente da archiviare'); return; }
      sheetCloseTrip();
    },

    'confirm-close': function () {
      var name = document.getElementById('closeName').value.trim();
      var sub = document.getElementById('closeSub').value.trim();
      var keep = document.getElementById('keepPeople').checked;
      if (!confirm('Chiudere il viaggio e azzerare il contatore? L\'archivio resta consultabile.')) return;
      var archive = closeTrip(name, sub, keep);
      closeSheet();
      toast('Viaggio archiviato 🏁');
      scheduleSync();
      location.hash = '#/passato/' + archive.id;
    },

    'restore-archive': function (el) {
      var id = el.getAttribute('data-id');
      var busy = Store.all('curses').length || Store.all('quotes').length;
      if (busy && !confirm('C\'è un viaggio in corso: i dati archiviati verranno aggiunti a quelli attuali. Continuare?')) return;
      if (!busy && !confirm('Ricaricare questo viaggio nel contatore attivo?')) return;
      if (restoreArchive(id)) {
        toast('Viaggio ricaricato ♻️');
        scheduleSync();
        location.hash = '#/';
      }
    },

    'delete-archive': function (el) {
      if (!confirm('Eliminare definitivamente questo archivio?')) return;
      Store.remove('archives', el.getAttribute('data-id'));
      location.hash = '#/passato';
      scheduleSync();
    },

    'feedback': function () { sheetFeedback(); },

    'dev-unlock': function () {
      var code = document.getElementById('devCode').value.trim();
      var expected = (window.Config && Config.developerCode) || '';
      if (!expected || code !== expected) { toast('Codice sbagliato'); return; }
      Store.setSettings({ devUnlocked: true });
      actions['load-feedback']();
    },

    'send-feedback': function () {
      var text = document.getElementById('fbText').value.trim();
      if (!text) { toast('Scrivi il messaggio'); return; }
      Store.insert('feedback', {
        text: text,
        from: document.getElementById('fbFrom').value.trim(),
        tripName: Store.state.trip.name,
        at: Date.now()
      });
      closeSheet();
      toast('Grazie! Suggerimento inviato 💡');
      doSync(false);
    },

    'load-feedback': function () {
      if (!Store.connected()) { toast('Database non configurato'); return; }
      toast('Scarico i suggerimenti…');
      Store.pullFeedback().then(function (n) {
        toast(n ? n + ' nuovi suggerimenti' : 'Nessuna novità');
      }).catch(function (err) {
        console.warn(err);
        toast('Non sono riuscito a scaricarli');
      });
    },

    'delete-feedback': function (el) {
      if (!confirm('Eliminare questo suggerimento?')) return;
      Store.remove('feedback', el.getAttribute('data-id'));
      doSync(false);
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

  function appUrl() {
    return location.origin + location.pathname;
  }

  function shareLink(text, link) {
    if (navigator.share) navigator.share({ title: 'Bestemmiometro', text: text }).catch(function () {});
    else copy(link);
  }

  function saveCurse(travelerId, times) {
    var sev = Number(pickedValue('sevPicker', 'data-sev', 2));
    var textEl = document.getElementById('curseText');
    var text = textEl ? textEl.value.trim() : '';
    // Una raffica è quantità, non qualità: niente tipo esotico né bonus.
    var raffica = times > 1;
    var type = raffica ? 'classica' : pickedValue('typePicker', 'data-type', 'classica');
    var bonus = raffica ? 0 : Number(pickedValue('bonusPicker', 'data-bonus', 0));
    var mode = raffica ? 'solo' : pickedValue('modePicker', 'data-mode', 'solo');
    var partnerEl = document.getElementById('partnerSelect');
    var instigatorEl = document.getElementById('instigatorSelect');
    var partnerId = (!raffica && mode === 'coppia' && partnerEl) ? partnerEl.value : '';
    var instigatorId = (!raffica && instigatorEl) ? instigatorEl.value : '';
    if (mode === 'coppia' && !partnerId) { toast('Scegli il complice'); return; }
    if (instigatorId === travelerId) instigatorId = '';

    var stage = currentStage();
    for (var i = 0; i < times; i++) {
      Store.insert('curses', {
        travelerId: travelerId,
        partnerId: partnerId || null,
        instigatorId: instigatorId || null,
        stageId: stage ? stage.id : null,
        severity: sev,
        type: type,
        bonus: bonus,
        mode: mode,
        text: i === 0 ? text : '',
        at: Date.now() + i
      });
    }
    closeSheet();
    var t = Store.find('travelers', travelerId);
    var model = { severity: sev, type: type, bonus: bonus, mode: mode, instigatorId: instigatorId };
    var gained = points(model) * times;
    var msg = (t ? t.name : 'Registrato') + ': +' + times + ' ' + severityOf(sev).emo + ' · ' + gained + ' pt';
    if (mode === 'coppia' && partnerId) msg += ' 👥 con ' + (Store.find('travelers', partnerId) || {}).name;
    if (instigatorId) msg += ' · 🎯 ' + stars(INSTIGATION_STARS) + ' a ' + (Store.find('travelers', instigatorId) || {}).name;
    toast(msg);
    scheduleSync();
  }

  function copy(text) {
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(function () { toast('Copiato negli appunti'); });
    else toast(text);
  }

  function markAllDirty() {
    Store.collections.forEach(function (c) {
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
      if (loud) toast(res.skipped ? 'Codice viaggio mancante' : res.warning ? 'Sincronizzato con avvisi' : 'Sincronizzato ☁︎');
      Store.emit();
    }).catch(function (err) {
      icon.classList.remove('spinning');
      if (loud) toast('Sincronizzazione fallita: controlla la connessione');
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

  if (!Store.state.settings.seenWelcome && !location.hash.replace(/^#\/?/, '')) {
    location.hash = '#/benvenuto';
  }

  render();
  if (Store.state.settings.reminderEnabled) Reminders.start();
  if (Store.syncConfigured()) doSync(false);
  setInterval(function () { if (!document.hidden) doSync(false); }, 45000);
})();
