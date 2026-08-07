/* Bestemmiometro — livello dati.
   Tutto vive in localStorage. Se configuri Supabase, i record vengono
   sincronizzati con gli altri telefoni (last-write-wins per singolo record). */
(function (global) {
  'use strict';

  var KEY = 'bestemmiometro:v1';
  var COLLECTIONS = ['travelers', 'stages', 'curses', 'quotes'];

  var defaults = {
    trip: { name: 'Bestemmiometro', subtitle: 'Roadtrip', startDate: '', endDate: '', pin: '' },
    travelers: [],
    stages: [],
    curses: [],
    quotes: [],
    settings: {
      currentStageId: null,
      reminderEnabled: false,
      reminderTime: '21:00',
      lastReminderDate: '',
      supabase: { url: '', key: '', tripId: '' },
      unlocked: false
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
    if (parsed.trip) Object.assign(state.trip, parsed.trip);
    if (parsed.settings) {
      Object.assign(state.settings, parsed.settings);
      Object.assign(state.settings.supabase, (parsed.settings.supabase || {}));
    }
    COLLECTIONS.forEach(function (c) {
      if (Array.isArray(parsed[c])) state[c] = parsed[c];
    });
    // la sessione admin non viene ricordata tra un'apertura e l'altra
    state.settings.unlocked = false;
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

  function emit() { listeners.forEach(function (fn) { try { fn(state); } catch (e) {} }); }

  function notify(event) {
    listeners.forEach(function (fn) { try { fn(state, event); } catch (e) {} });
  }

  function subscribe(fn) { listeners.push(fn); return function () { listeners = listeners.filter(function (f) { return f !== fn; }); }; }

  /* ---------------- CRUD ---------------- */

  function all(collection) {
    return (state[collection] || []).filter(function (r) { return !r.deleted; });
  }

  function find(collection, id) {
    var hit = (state[collection] || []).filter(function (r) { return r.id === id; })[0];
    return hit && !hit.deleted ? hit : null;
  }

  function insert(collection, data) {
    var now = Date.now();
    var record = Object.assign({}, data, {
      id: data.id || uid(),
      createdAt: data.createdAt || now,
      updatedAt: now,
      deleted: false,
      dirty: true
    });
    state[collection].push(record);
    save(); emit();
    return record;
  }

  function update(collection, id, patch) {
    var record = (state[collection] || []).filter(function (r) { return r.id === id; })[0];
    if (!record) return null;
    Object.assign(record, patch, { updatedAt: Date.now(), dirty: true });
    save(); emit();
    return record;
  }

  function remove(collection, id) {
    var record = (state[collection] || []).filter(function (r) { return r.id === id; })[0];
    if (!record) return false;
    record.deleted = true;
    record.updatedAt = Date.now();
    record.dirty = true;
    save(); emit();
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

  function toRow(kind, record) {
    var data = {};
    Object.keys(record).forEach(function (key) {
      if (key !== 'dirty' && key !== 'id' && key !== 'updatedAt' && key !== 'deleted') data[key] = record[key];
    });
    return {
      id: record.id,
      trip_id: state.settings.supabase.tripId,
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

  function push() {
    var rows = [];
    COLLECTIONS.forEach(function (c) {
      (state[c] || []).forEach(function (r) { if (r.dirty) rows.push(toRow(c, r)); });
    });
    if (!rows.length) return Promise.resolve(0);
    return fetch(endpoint(), {
      method: 'POST',
      headers: headers({ 'Prefer': 'resolution=merge-duplicates,return=minimal' }),
      body: JSON.stringify(rows)
    }).then(function (res) {
      if (!res.ok) return res.text().then(function (t) { throw new Error('Push fallito (' + res.status + '): ' + t); });
      // marca come puliti solo i record effettivamente inviati
      var sent = {};
      rows.forEach(function (r) { sent[r.id] = r.updated_at; });
      COLLECTIONS.forEach(function (c) {
        (state[c] || []).forEach(function (r) {
          if (sent[r.id] === r.updatedAt) r.dirty = false;
        });
      });
      return rows.length;
    });
  }

  function pull() {
    var url = endpoint() + '?select=*&trip_id=eq.' + encodeURIComponent(state.settings.supabase.tripId);
    return fetch(url, { headers: headers() }).then(function (res) {
      if (!res.ok) return res.text().then(function (t) { throw new Error('Pull fallito (' + res.status + '): ' + t); });
      return res.json();
    }).then(function (rows) {
      var merged = 0;
      rows.forEach(function (row) {
        if (COLLECTIONS.indexOf(row.kind) === -1) return;
        var incoming = fromRow(row);
        var list = state[row.kind];
        var existing = list.filter(function (r) { return r.id === incoming.id; })[0];
        if (!existing) { list.push(incoming); merged++; return; }
        // il record locale non ancora inviato vince solo se è più recente
        if (incoming.updatedAt > (existing.updatedAt || 0)) {
          var idx = list.indexOf(existing);
          list[idx] = incoming;
          merged++;
        }
      });
      return merged;
    });
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
        return { merged: merged };
      })
      .catch(function (err) {
        notify('sync-error');
        throw err;
      })
      .then(function (r) { syncing = false; return r; }, function (e) { syncing = false; throw e; });
  }

  function pendingCount() {
    var n = 0;
    COLLECTIONS.forEach(function (c) { (state[c] || []).forEach(function (r) { if (r.dirty) n++; }); });
    return n;
  }

  /* ---------------- Import / Export ---------------- */

  function exportJSON() {
    return JSON.stringify({ version: 1, exportedAt: Date.now(), trip: state.trip, travelers: state.travelers, stages: state.stages, curses: state.curses, quotes: state.quotes }, null, 2);
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
    syncConfigured: syncConfigured,
    pendingCount: pendingCount,
    exportJSON: exportJSON,
    importJSON: importJSON,
    reset: reset
  };
})(window);
