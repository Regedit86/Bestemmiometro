/* Bestemmiometro — promemoria giornaliero.
   Nota onesta: senza un server di push, iOS può mostrare la notifica solo
   quando l'app è aperta o è appena stata aperta. Per la sveglia automatica
   ogni sera si usa un'automazione "Comandi rapidi" (vedi README). */
(function (global) {
  'use strict';

  var CHECK_MS = 30000;
  var timer = null;

  var FRASI = [
    'Ehi, il Bestemmiometro è fermo. Sospetto insabbiamento.',
    'Nessuna bestemmia registrata oggi. Siete diventati santi?',
    'Ricordati di segnare le bestemmie di oggi 🤬',
    'Il conteggio di oggi è vuoto: qualcuno sta barando.',
    'Fine giornata: chi ha bestemmiato di più? Segnalo ora.',
    'La classifica ti aspetta. Registra i danni della tappa.'
  ];

  function supported() {
    return ('Notification' in global) && ('serviceWorker' in navigator);
  }

  function permission() {
    return supported() ? Notification.permission : 'unsupported';
  }

  function request() {
    if (!supported()) return Promise.resolve('unsupported');
    return Notification.requestPermission();
  }

  function todayKey(d) {
    d = d || new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function show(title, body) {
    if (permission() !== 'granted') return Promise.resolve(false);
    return navigator.serviceWorker.ready.then(function (reg) {
      return reg.showNotification(title, {
        body: body,
        icon: 'assets/icon-192.png',
        badge: 'assets/icon-192.png',
        tag: 'bestemmiometro-daily',
        renotify: true,
        data: { url: './' }
      }).then(function () { return true; });
    }).catch(function () { return false; });
  }

  function pick(list) { return list[Math.floor(Math.random() * list.length)]; }

  function entriesToday() {
    var start = new Date(); start.setHours(0, 0, 0, 0);
    var t = start.getTime();
    return Store.all('curses').filter(function (c) { return c.at >= t; }).length;
  }

  function due() {
    var s = Store.state.settings;
    if (!s.reminderEnabled) return false;
    if (s.lastReminderDate === todayKey()) return false;
    var parts = String(s.reminderTime || '21:00').split(':');
    var now = new Date();
    var mins = now.getHours() * 60 + now.getMinutes();
    var target = (parseInt(parts[0], 10) || 21) * 60 + (parseInt(parts[1], 10) || 0);
    return mins >= target;
  }

  function check() {
    if (!due()) return;
    var count = entriesToday();
    var body = count === 0 ? pick(FRASI) : 'Oggi siamo a ' + count + '. Manca qualcosa? Aggiorna il conteggio prima di dormire.';
    show('Bestemmiometro', body).then(function (ok) {
      if (ok) Store.setSettings({ lastReminderDate: todayKey() });
    });
  }

  function start() {
    stop();
    check();
    timer = setInterval(check, CHECK_MS);
  }

  function stop() {
    if (timer) clearInterval(timer);
    timer = null;
  }

  function test() {
    return show('Bestemmiometro', 'Notifica di prova: funziona 🎉').then(function (ok) {
      return ok;
    });
  }

  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) check();
  });

  global.Reminders = {
    supported: supported,
    permission: permission,
    request: request,
    start: start,
    stop: stop,
    test: test,
    check: check
  };
})(window);
