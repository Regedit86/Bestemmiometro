/* Bestemmiometro — configurazione di fabbrica.
   URL e chiave pubblica del progetto Supabase sono già dentro l'app, così gli
   amici devono solo inserire il codice viaggio.

   Sono offuscati per non lasciarli in chiaro nel repository, ma va detto senza
   giri di parole: qualsiasi cosa finisca nel JavaScript di una pagina web è
   leggibile da chi ha voglia di guardare. Non è cifratura, è una zanzariera.
   Va bene comunque, perché questa è la chiave "publishable": è nata per stare
   nel browser e i dati sono protetti dalle policy RLS lato database. La chiave
   segreta (sb_secret_...) non deve MAI finire qui dentro. */
(function (global) {
  'use strict';

  var SALT = 'bestemmiometro-roadtrip';

  function reveal(b64) {
    try {
      var raw = atob(b64), out = '';
      for (var i = 0; i < raw.length; i++) {
        out += String.fromCharCode(raw.charCodeAt(i) ^ SALT.charCodeAt(i % SALT.length));
      }
      return out;
    } catch (e) {
      return '';
    }
  }

  global.Config = {
    supabase: {
      url: reveal('ChEHBBZXQkYcHhwOAwJZAhsTBhsZAxcLEgUQDEMeHB8MBxUBCgMRAA=='),
      key: reveal('EQcsBBAPAQAcBQQWHgpyQg1YIgQQPAAaFUY/SAsaEQMnDhshPnIqLg4zPRgRMg==')
    },
    // Gli archivi di fine viaggio stanno in un contenitore comune: così restano
    // consultabili anche quando il gruppo cambia codice viaggio.
    archiveTrip: reveal('PToSBgYFBB8GMjo='),

    // I suggerimenti stanno in un contenitore riservato, separato dai viaggi:
    // non vengono mai scaricati dall'app normale, solo dall'area sviluppatore.
    feedbackTrip: '__suggerimenti__',

    // PIN dell'area sviluppatore (in chiaro sarebbe leggibile: cambialo qui
    // se lo condividi per sbaglio). Vale solo per leggere i suggerimenti.
    developerCode: reveal('UFBDTFRc'),

    developer: 'Laoretti Brent.gani'
  };
})(window);
