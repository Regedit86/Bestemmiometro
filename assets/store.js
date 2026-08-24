/* Bestemmiometro — livello dati.
   Tutto vive in localStorage. Con Supabase configurato i record vengono
   sincronizzati con gli altri telefoni (last-write-wins per singolo record). */
(function (global) {
  'use strict';

  var KEY = 'bestemmiometro:v1';
  // Dati di gioco: legati al codice viaggio, li vede solo chi è nel gruppo.
  var TRIP = ['travelers', 'stages', 'curses', 'quotes'];
  // Archivi di fine viaggio: contenitore comune, restano leggibili anche
  // quando il gruppo cambia codice viaggio.
  var SHARED = ['archives'];
  // Suggerimenti: contenitore riservato, scaricato solo dall'area sviluppatore.
  var PRIVATE = ['feedback'];
  var COLLECTIONS = TRIP.concat(SHARED);
  var ALL = COLLECTIONS.concat(PRIVATE);

  function factory() {
    var cfg = (global.Config && global.Config.supabase) || { url: '', key: '' };
    return { url: cfg.url || '', key: cfg.key || '', tripId: '' };
  }

  var defaults = {
    trip: { name: 'Bestemmiometro', subtitle: 'Roadtrip', startDate: '', endDate: '', pin: '' },
    travelers: [],
    stages: [],
    curses: [],
    quotes: [],
    archives: [],
    feedback: [],
    settings: {
      currentStageId: null,
      reminderEnabled: false,
      reminderTime: '21:00',
      lastReminderDate: '',
      supabase: { url: '', key: '', tripId: '' },
      lastSync: 0,
      lastSyncWarning: '',
      seenWelcome: false,
      unlocked: false,
      devUnlocked: false
    }
  };

  var state = null;
  var listeners = [];

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function uid() {
    if (global.crypto && global.crypto.randomUUID) return global.crypto.randomUUID();
    return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  }

  function load() {
    var raw = null;
    try { raw = global.localStorage.getItem(KEY); } catch (e) { raw = null; }
    var parsed = {};
    if (raw) {
      try { parsed = JSON.parse(raw) || {}; } catch (e) { parsed = {}; }
    }
    state = clone(defaults);
    state.settings.supabase = factory();
    if (parsed.trip) Object.assign(state.trip, parsed.trip);
    if (parsed.settings) {
      var sb = parsed.settings.supabase || {};
      Object.assign(state.settings, parsed.settings);
      // Di norma vincono URL e chiave di fabbrica, così un aggiornamento
      // dell'app corregge una configurazione vecchia. Se però qualcuno li ha
      // cambiati a mano nelle impostazioni avanzate, la sua scelta resta.
      var custom = !!(sb.custom && sb.url && sb.key);
      state.settings.supabase = {
        url: custom ? sb.url : (factory().url || sb.url || ''),
        key: custom ? sb.key : (factory().key || sb.key || ''),
        tripId: sb.tripId || '',
        custom: custom
      };
    }
    ALL.forEach(function (c) {
      if (Array.isArray(parsed[c])) state[c] = parsed[c];
    });
    // le sessioni protette non vengono ricordate tra un'apertura e l'altra
    state.settings.unlocked = false;
    state.settings.devUnlocked = false;
    return state;
  }

  function save() {
    try {
      global.localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {
      global.console && console.warn('Salvataggio fallito', e);
      notify('storage-full');
    }
  }

  function emit() { notify('change'); }

  function notify(event) {
    listeners.forEach(function (fn) { try { fn(state, event); } catch (e) {} });
  }

  function subscribe(fn) {
    listeners.push(fn);
    return function () { listeners = listeners.filter(function (f) { return f !== fn; }); };
  }

  /* ---------------- CRUD ---------------- */

  function all(collection) {
    return (state[collection] || []).filter(function (r) { return !r.deleted; });
  }

  function find(collection, id) {
    var hit = (state[collection] || []).filter(function (r) { return r.id === id; })[0];
    return hit && !hit.deleted ? hit : null;
  }

  function insert(collection, data, silent) {
    var now = Date.now();
    var record = Object.assign({}, data, {
      id: data.id || uid(),
      createdAt: data.createdAt || now,
      updatedAt: now,
      deleted: false,
      dirty: true
    });
    state[collection].push(record);
    save();
    if (!silent) emit();
    return record;
  }

  function update(collection, id, patch, silent) {
    var record = (state[collection] || []).filter(function (r) { return r.id === id; })[0];
    if (!record) return null;
    Object.assign(record, patch, { updatedAt: Date.now(), dirty: true });
    save();
    if (!silent) emit();
    return record;
  }

  function remove(collection, id, silent) {
    var record = (state[collection] || []).filter(function (r) { return r.id === id; })[0];
    if (!record) return false;
    record.deleted = true;
    record.updatedAt = Date.now();
    record.dirty = true;
    save();
    if (!silent) emit();
    return true;
  }

  function setTrip(patch) { Object.assign(state.trip, patch); save(); emit(); }
  function setSettings(patch) { Object.assign(state.settings, patch); save(); emit(); }
  function setSupabase(patch) { Object.assign(state.settings.supabase, patch); save(); emit(); }

  /* ---------------- Sincronizzazione ---------------- */

  function syncConfigured() {
    var s = state.settings.supabase;
    return !!(s.url && s.key && s.tripId);
  }

  function connected() {
    var s = state.settings.supabase;
    return !!(s.url && s.key);
  }

  function endpoint() {
    return state.settings.supabase.url.replace(/\/+$/, '') + '/rest/v1/bm_records';
  }

  function headers(extra) {
    var k = state.settings.supabase.key;
    return Object.assign({
      'apikey': k,
      'Authorization': 'Bearer ' + k,
      'Content-Type': 'application/json'
    }, extra || {});
  }

  function tripFor(kind) {
    var cfg = global.Config || {};
    if (PRIVATE.indexOf(kind) !== -1) return cfg.feedbackTrip || '__suggerimenti__';
    if (SHARED.indexOf(kind) !== -1) return cfg.archiveTrip || '__archivi__';
    return state.settings.supabase.tripId;
  }

  function toRow(kind, record) {
    var data = {};
    Object.keys(record).forEach(function (key) {
      if (key !== 'dirty' && key !== 'id' && key !== 'updatedAt' && key !== 'deleted') data[key] = record[key];
    });
    return {
      id: record.id,
      trip_id: tripFor(kind),
      kind: kind,
      data: data,
      updated_at: record.updatedAt,
      deleted: !!record.deleted
    };
  }

  function fromRow(row) {
    return Object.assign({}, row.data || {}, {
      id: row.id,
      updatedAt: Number(row.updated_at) || 0,
      deleted: !!row.deleted,
      dirty: false
    });
  }

  function postRows(rows) {
    return fetch(endpoint(), {
      method: 'POST',
      headers: headers({ 'Prefer': 'resolution=merge-duplicates,return=minimal' }),
      body: JSON.stringify(rows)
    }).then(function (res) {
      if (!res.ok) return res.text().then(function (t) { throw new Error('(' + res.status + ') ' + t.slice(0, 160)); });
      return rows.length;
    });
  }

  function markClean(kind, rows) {
    var sent = {};
    rows.forEach(function (r) { sent[r.id] = r.updated_at; });
    (state[kind] || []).forEach(function (r) {
      if (sent[r.id] === r.updatedAt) r.dirty = false;
    });
  }

  // Ogni tipo viaggia in una richiesta separata: se il database rifiuta una
  // categoria (per esempio un vincolo non ancora aggiornato) le altre passano.
  function push() {
    var groups = {};
    ALL.forEach(function (c) {
      (state[c] || []).forEach(function (r) {
        if (r.dirty) (groups[c] = groups[c] || []).push(toRow(c, r));
      });
    });
    var kinds = Object.keys(groups);
    if (!kinds.length) return Promise.resolve(0);

    var failures = [];
    return Promise.all(kinds.map(function (kind) {
      return postRows(groups[kind])
        .then(function () { markClean(kind, groups[kind]); })
        .catch(function (err) { failures.push(kind + ' ' + err.message); });
    })).then(function () {
      state.settings.lastSyncWarning = failures.join(' · ');
      if (failures.length === kinds.length) throw new Error(failures.join(' · '));
      return kinds.length - failures.length;
    });
  }

  function fetchTrip(tripId) {
    var url = endpoint() + '?select=*&trip_id=eq.' + encodeURIComponent(tripId);
    return fetch(url, { headers: headers() }).then(function (res) {
      if (!res.ok) return res.text().then(function (t) { throw new Error('Pull fallito (' + res.status + '): ' + t.slice(0, 160)); });
      return res.json();
    });
  }

  // Due contenitori: i dati del proprio viaggio e gli archivi comuni.
  function pull() {
    return Promise.all([
      fetchTrip(state.settings.supabase.tripId).then(function (rows) { return merge(rows, TRIP); }),
      fetchTrip(tripFor('archives')).then(function (rows) { return merge(rows, SHARED); })
    ]).then(function (counts) { return counts[0] + counts[1]; });
  }

  // I suggerimenti si scaricano solo su richiesta, dall'area sviluppatore.
  function pullFeedback() {
    if (!connected()) return Promise.resolve(0);
    return fetchTrip(tripFor('feedback')).then(function (rows) {
      var n = merge(rows, PRIVATE);
      save(); emit();
      return n;
    });
  }

  function merge(rows, allowed) {
    var merged = 0;
    rows.forEach(function (row) {
      if (allowed.indexOf(row.kind) === -1) return;
      var incoming = fromRow(row);
      var list = state[row.kind];
      var existing = list.filter(function (r) { return r.id === incoming.id; })[0];
      if (!existing) { list.push(incoming); merged++; return; }
      // il record locale non ancora inviato vince solo se è più recente
      if (incoming.updatedAt > (existing.updatedAt || 0)) {
        list[list.indexOf(existing)] = incoming;
        merged++;
      }
    });
    return merged;
  }

  var syncing = false;
  function sync() {
    if (!syncConfigured()) return Promise.resolve({ skipped: true });
    if (syncing) return Promise.resolve({ busy: true });
    syncing = true;
    notify('sync-start');
    return push()
      .then(pull)
      .then(function (merged) {
        state.settings.lastSync = Date.now();
        save(); notify('sync-done');
        return { merged: merged, warning: state.settings.lastSyncWarning };
      })
      .catch(function (err) {
        notify('sync-error');
        throw err;
      })
      .then(function (r) { syncing = false; return r; }, function (e) { syncing = false; throw e; });
  }

  function pendingCount() {
    var n = 0;
    ALL.forEach(function (c) { (state[c] || []).forEach(function (r) { if (r.dirty) n++; }); });
    return n;
  }

  /* ---------------- Import / Export ---------------- */

  function exportJSON() {
    var out = { version: 2, exportedAt: Date.now(), trip: state.trip };
    COLLECTIONS.forEach(function (c) { out[c] = state[c]; });
    return JSON.stringify(out, null, 2);
  }

  function importJSON(text) {
    var data = JSON.parse(text);
    if (data.trip) Object.assign(state.trip, data.trip);
    COLLECTIONS.forEach(function (c) {
      if (!Array.isArray(data[c])) return;
      data[c].forEach(function (incoming) {
        var list = state[c];
        var existing = list.filter(function (r) { return r.id === incoming.id; })[0];
        incoming.dirty = true;
        if (!existing) list.push(incoming);
        else if ((incoming.updatedAt || 0) >= (existing.updatedAt || 0)) list[list.indexOf(existing)] = incoming;
      });
    });
    save(); emit();
  }

  function reset() {
    try { global.localStorage.removeItem(KEY); } catch (e) {}
    load(); emit();
  }

  load();

  global.Store = {
    get state() { return state; },
    collections: COLLECTIONS,
    uid: uid,
    all: all,
    find: find,
    insert: insert,
    update: update,
    remove: remove,
    setTrip: setTrip,
    setSettings: setSettings,
    setSupabase: setSupabase,
    subscribe: subscribe,
    save: save,
    emit: emit,
    sync: sync,
    pullFeedback: pullFeedback,
    syncConfigured: syncConfigured,
    connected: connected,
    pendingCount: pendingCount,
    exportJSON: exportJSON,
    importJSON: importJSON,
    reset: reset
  };
})(window);
