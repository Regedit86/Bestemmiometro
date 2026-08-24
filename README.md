# 🤬 Bestemmiometro

Il contatore ufficiale delle bestemmie del roadtrip. Ogni tappa, ogni viaggiatore, ogni
frase celebre che verrà ricordata per sempre.

Nessun framework, nessuna compilazione, nessuno store: sono file HTML, CSS e JavaScript.
Si pubblica e si usa **direttamente dall'iPhone**, funziona **offline** in auto e
sincronizza da sola appena torna il segnale.

---

## Indice

1. [Cosa sa fare](#1-cosa-sa-fare)
2. [Metterla online](#2-metterla-online)
3. [Installarla sull'iPhone](#3-installarla-sulliphone)
4. [Il database, una volta sola](#4-il-database-una-volta-sola)
5. [Il codice viaggio e gli inviti](#5-il-codice-viaggio-e-gli-inviti)
6. [Usarla durante il viaggio](#6-usarla-durante-il-viaggio)
7. [Come si contano i punti](#7-come-si-contano-i-punti)
8. [Le notifiche](#8-le-notifiche)
9. [Fine vacanza, archivio ed export](#9-fine-vacanza-archivio-ed-export)
10. [Suggerimenti e area sviluppatore](#10-suggerimenti-e-area-sviluppatore)
11. [Aspetto, backup e altre impostazioni](#11-aspetto-backup-e-altre-impostazioni)
12. [Note oneste su sicurezza, privacy e limiti](#12-note-oneste-su-sicurezza-privacy-e-limiti)
13. [Com'è fatta dentro](#13-comè-fatta-dentro)

---

## 1. Cosa sa fare

**Registrare**
- Un tocco sulla faccia del colpevole, gravità da 😐 Blanda a 🔥 Storica
- **Tipo di bestemmia**: 🗿 Classica, 🎨 Creativa, 🧱 Composta, 🪗 Dialetto, 🌍 Straniera,
  🙈 Autogol — più è fantasiosa, più vale
- **Bonus fantasia**: da zero a tre ⭐ assegnate dal gruppo, 2 punti l'una
- **👥 Coppia combinata**: una bestemmia costruita in due, conta e paga per entrambi
- **📡 Wireless**: detta senza audio, solo col labiale — non la sente nessuno ma la
  leggono tutti
- **🎯 Istigazione**: chi ha provocato si porta a casa una stella, chi ha ceduto un punto
- **Raffica +5** per le sequenze, il tasto ✕ per correggere gli errori
- **💬 Frasi celebri**, attribuite alla persona giusta e raccolte per giornata

**Guardare**
- **Classifica** su tutto il viaggio, sulla tappa corrente o solo su oggi
- **Classifica fantasia**, che ignora i numeri e conta solo la creatività
- **Podio degli istigatori**, albo delle **bestemmie bonus**, riepilogo **per tipo**
- **Albo d'oro**: punti totali, gravità media, giornata peggiore, bestemmia record
- **Scheda personale** di ognuno: foto, soprannome, ruolo, descrizione, statistiche,
  media al giorno, migliori bonus, frasi e storico completo
- **Tappe** con conteggio per tratta e classifica interna

**Organizzare**
- **Admin** per viaggiatori (foto dalla fotocamera o dal rullino, soprannome, ruolo,
  descrizione, colore) e tappe (titolo, da → a, data, note)
- **PIN admin** facoltativo contro gli scherzi
- **Promemoria serale** per non dimenticare di segnare i danni
- **Tema** chiaro, scuro o automatico

**Chiudere e ricordare**
- **Fine vacanza**: il viaggio si congela in un archivio permanente
- Ricordo esportabile come **immagine** verticale per WhatsApp, **PDF** stampabile o
  **testo** da incollare in chat
- **Le bestemmie del passato**: tutti i viaggi chiusi, riconsultabili e ricaricabili

**Condividere**
- L'app è **già collegata al database**: agli amici serve solo il codice viaggio
- Link d'invito che porta dentro con un tocco, oppure link della sola app
- Sincronizzazione automatica, coda offline, risoluzione dei conflitti

---

## 2. Metterla online

Serve solo Safari, dal telefono.

1. Apri `github.com/Regedit86/Bestemmiometro` e fai il login
2. **Settings** → **Pages**
3. *Source*: **Deploy from a branch** → branch `main`, cartella `/ (root)` → **Save**
4. Dopo 1-2 minuti l'indirizzo compare in cima:
   **`https://regedit86.github.io/Bestemmiometro/`**

> GitHub Pages richiede che il repository sia **pubblico**, a meno di un piano a pagamento.
> Nel codice non c'è nessun segreto (vedi [nota 12](#12-note-oneste-su-sicurezza-privacy-e-limiti)).
> Se preferisci tenerlo privato, **Cloudflare Pages** pubblica anche repository privati
> gratis: *Connect to Git*, build command vuoto, output directory `/`.

## 3. Installarla sull'iPhone

1. Apri il link con **Safari** (non Chrome: le notifiche funzionano solo da Safari)
2. **Condividi** → **Aggiungi alla schermata Home** → **Aggiungi**
3. Aprila dall'icona: parte a schermo intero come una vera app

Alla prima apertura l'app mostra da sola questi passaggi e chiede il codice viaggio.
Il promemoria serale funziona **solo** da app installata: iOS non concede le notifiche
alle pagine aperte in Safari.

## 4. Il database, una volta sola

URL e chiave pubblica del progetto Supabase sono **già dentro l'app**: gli amici non
devono configurare niente. Chi mette in piedi il progetto deve solo creare la tabella.

1. Su Supabase: **SQL Editor** → *New query*
2. Incolla il contenuto di [`supabase/schema.sql`](supabase/schema.sql) → **Run**
3. Se avevi già creato la tabella con la primissima versione, esegui anche
   [`supabase/migrazione-2.sql`](supabase/migrazione-2.sql): sblocca i tipi `archives` e
   `feedback`. Senza quella riga il gioco funziona lo stesso, ma archivi di fine viaggio
   e suggerimenti non vengono sincronizzati — e l'app te lo segnala in Admin.

Per cambiare progetto Supabase: **Admin → Gruppo e sincronizzazione → Impostazioni
avanzate**. I valori scritti a mano hanno la precedenza e sopravvivono agli aggiornamenti
dell'app; quelli di fabbrica vengono invece riallineati a ogni aggiornamento.

## 5. Il codice viaggio e gli inviti

Il codice viaggio è la parola d'ordine del gruppo: **chi scrive lo stesso codice vede lo
stesso conteggio**. Si imposta alla prima apertura o in **Admin → Gruppo e
sincronizzazione**.

Alla prima apertura i due pulsanti fanno due cose diverse:

| Pulsante | Quando | Cosa fa |
|---|---|---|
| **Entra nel viaggio** | il codice te l'ha passato un amico | entra al primo tocco e scarica i dati del gruppo |
| **Crea questo codice** | il viaggio lo organizzi tu | controlla che il codice non sia già di un altro gruppo e, se è libero, ti porta dentro (se non ci sono viaggiatori apre subito la scheda per aggiungerli) |

**Admin → Invita gli amici** offre due link:

- **Invita al viaggio** — contiene già il codice: loro toccano *Entra nel gruppo* e sono dentro
- **Condividi l'app** — senza codice, per quando il viaggio non è il tuo: il codice lo scelgono loro

### Sincronizzazione

Parte da sola all'apertura, ogni volta che torni sull'app e ogni 45 secondi mentre è
aperta. Senza campo continui a segnare tutto: la coda parte appena torna la linea, e
l'icona **☁︎•** in alto indica che c'è roba in attesa (toccala per forzare l'invio).

Se due telefoni modificano la stessa cosa vince la modifica **più recente**. Le
cancellazioni si propagano. Ogni tipo di dato viaggia in una richiesta separata, così se
il database rifiuta una categoria le altre passano comunque.

## 6. Usarla durante il viaggio

- **Oggi** — tocchi la faccia di chi ha bestemmiato, scegli com'è andata (solo, coppia,
  wireless), la gravità, il tipo, le stelle, chi ha istigato, e **Registra**. Sotto, il
  diario della giornata e le frasi di oggi.
- **Tappe** — conteggio per tratta, dettaglio con classifica interna, riepilogo del
  viaggio e accesso all'archivio.
- **Classifica** — filtri *tutto il viaggio / tappa / oggi*, classifica generale,
  fantasia, istigatori, bonus, per tipo e albo d'oro.
- **Frasi** — tutte le perle, filtrabili per persona e raggruppate per giornata.
- **Admin** — configurazione, condivisione, tema, promemoria, fine vacanza, backup.

Tocca una persona in classifica per la sua scheda completa.

## 7. Come si contano i punti

| Voce | Punti |
|---|---|
| Gravità: 😐 Blanda → 🔥 Storica | da 1 a 5 |
| 🎨 Creativa · 🪗 Dialetto · 🌍 Straniera | +2 |
| 🧱 Composta | +3 |
| 🙈 Autogol | +1 |
| ⭐ Bonus fantasia | +2 per stella |
| 👥 Coppia combinata | +2, e conta per entrambi |
| 📡 Wireless | +2 |
| 🎯 Istigata | +1 a chi la dice, ⭐ (2 punti di fantasia) a chi istiga |

Una 🧱 composta pesante da tre stelle vale **13 punti**: più di cinque bestemmie classiche
urlate in fila. È voluto — premia la creatività, non il fiato.

La **raffica +5** resta esclusa dai bonus e viene registrata come classica: è quantità,
non qualità. Se potesse prendere i moltiplicatori, basterebbe quel tasto per far saltare
la classifica.

## 8. Le notifiche

**Admin → Promemoria**: attivi le notifiche e scegli l'orario (21:00 di default).

Va detto com'è: **senza un server, l'iPhone mostra la notifica quando l'app è aperta o è
appena stata aperta.** Per avere la sveglia automatica ogni sera bastano 30 secondi con
**Comandi rapidi**, già installata su iOS:

1. **Comandi rapidi** → **Automazione** → **+** → **Ora del giorno**
2. Scegli **21:00**, ripeti **Ogni giorno** → *Avanti*
3. **Nuovo comando rapido vuoto** → azione **Apri app** → **Bestemmiometro**
4. Disattiva *Chiedi prima di eseguire* → **Fine**

Alle 21 l'app si apre da sola e mostra la notifica col conteggio del giorno (con una
frase diversa ogni volta, se non avete segnato niente).

## 9. Fine vacanza, archivio ed export

**Admin → Fine vacanza → 🏁 Chiudi il viaggio**: le statistiche vengono congelate in un
archivio permanente e il contatore riparte da zero (puoi tenere gli stessi viaggiatori).
Fallo quando tutti hanno sincronizzato, così nell'archivio finisce tutto.

Subito dopo la conferma si apre la schermata del **prossimo viaggio**:

- **Nuovo viaggio** — il box dove scrivi il codice del prossimo gruppo (se è già usato
  da altri l'app te lo dice e non procede), con *Crea e invita gli amici* che apre subito
  la condivisione. Se chiudendo non hai tenuto nessuno del gruppo precedente, si apre
  direttamente la scheda per aggiungere il primo viaggiatore.
- **Area sviluppatore** — il link piccolo in fondo.

Se esci da quella schermata, per sbaglio o con *Più tardi*, non perdi niente: finché il
codice nuovo non esiste, in cima alla **home** resta il riquadro **🏁 Il viaggio è finito**
col pulsante per crearlo. *Più tardi* spegne solo l'apertura automatica, non il riquadro.
Si trova anche in **Admin → Fine vacanza → Apri un viaggio nuovo**.

### Il ricordo da condividere

Dall'archivio (e dal riepilogo del viaggio in corso):

- **📸 Immagine** — locandina verticale 1080×1920 con podio, punti, re della fantasia e
  la frase migliore, pronta per WhatsApp o le storie
- **📄 PDF** — documento completo con classifica, bonus e frasi celebri: tocca *Salva
  come PDF* e usa il tasto Condividi dell'anteprima di stampa
- **💬 Testo** — il riassunto in caratteri, per chi vuole solo incollarlo in chat
- **♻️ Ricarica** — rimette in gioco un viaggio archiviato

**Le bestemmie del passato** (tab Tappe, o Admin) elenca tutti i viaggi chiusi. Restano
visibili **anche quando il gruppo cambia codice viaggio**.

## 10. Suggerimenti e area sviluppatore

In fondo ad Admin c'è **Contatta lo sviluppatore** (il nome si cambia in
`assets/config.js`): chiunque può mandare un'idea, anche con il PIN admin attivo.

I messaggi **non passano dai viaggi**: finiscono in un contenitore riservato che l'app
normale non scarica mai. Si leggono solo nell'**Area sviluppatore** — link piccolo sotto
la scheda contatti e in fondo alla schermata di nuovo viaggio — protetta da un PIN suo,
diverso dal PIN admin e richiesto di nuovo a ogni riavvio (`developerCode` in
`assets/config.js`, offuscato come le altre chiavi).

### I tre contenitori

| Contenitore | Cosa contiene | Chi lo vede |
|---|---|---|
| `<codice viaggio>` | viaggiatori, tappe, bestemmie, frasi | solo chi ha quel codice |
| `__archivi__` | archivi di fine viaggio | tutti, anche cambiando codice viaggio |
| `__suggerimenti__` | messaggi allo sviluppatore | solo l'area sviluppatore, col PIN |

## 11. Aspetto, backup e altre impostazioni

- **Admin → Aspetto**: 🌙 Scuro (predefinito), ☀️ Chiaro, 📱 Automatico (segue iOS).
  La scelta resta salvata sul telefono di ciascuno.
- **Admin → Il viaggio**: nome dell'app, sottotitolo, date, PIN admin.
- **Admin → Dati**: **Esporta backup** in JSON, **Importa backup**, **Cancella tutto**
  (azzera solo questo telefono: i dati sul cloud restano).
- Le foto dei viaggiatori vengono ridotte automaticamente a 320 px (circa 8 KB), così
  l'app resta leggera anche con molte persone.

## 12. Note oneste su sicurezza, privacy e limiti

- L'app pubblicata è raggiungibile da chiunque abbia il link, come qualsiasi sito web.
- URL e chiave pubblica di Supabase stanno **nel codice, offuscati**. L'offuscamento
  **non è cifratura**: chi vuole guardare, guarda. Va bene comunque, perché quella è la
  chiave *publishable*, nata per stare nel browser, e i dati sono protetti dalle policy
  RLS del database. La chiave **segreta** non è nel codice e non deve mai finirci.
- Le policy RLS di questo progetto sono permissive: **chi ha la chiave e il codice
  viaggio può leggere e scrivere** le bestemmie di quel viaggio. Per un gioco tra amici
  va bene; non metteteci dentro niente di riservato.
- Il **PIN admin** e il **PIN sviluppatore** sono controllati dal telefono, non dal
  server: tengono le cose fuori dalla vista di chi usa l'app, non le mettono al sicuro.
  Anche i suggerimenti sono nascosti, non protetti.
- I progetti Supabase gratuiti **vanno in pausa dopo circa una settimana di inattività**:
  se l'app dà errore di sincronizzazione dopo una pausa lunga, basta un *Restore project*
  dal pannello Supabase.
- Le notifiche hanno il limite descritto al [punto 8](#8-le-notifiche).

## 13. Com'è fatta dentro

```
index.html                 struttura, navigazione, pannello a comparsa
assets/config.js           configurazione di fabbrica (URL, chiave, contenitori, PIN dev)
assets/store.js            dati, salvataggio locale, sincronizzazione Supabase
assets/notifications.js    promemoria giornaliero
assets/poster.js           immagine ricordo disegnata su canvas
assets/app.js              schermate, form, azioni, punteggi
assets/styles.css          temi chiaro/scuro, stile mobile-first, stile di stampa
sw.js                      service worker: funziona offline
manifest.webmanifest       installazione sulla schermata Home
supabase/schema.sql        tabella da creare su Supabase
supabase/migrazione-2.sql  aggiornamento per archivi e suggerimenti
```

I dati stanno in `localStorage` in sei collezioni: `travelers`, `stages`, `curses` e
`quotes` legate al codice viaggio, `archives` in comune, `feedback` riservata. Ogni
record porta `updatedAt` e un flag `dirty`: la sincronizzazione manda i record modificati
e, in caso di conflitto, vince la modifica più recente. Le cancellazioni sono logiche
(`deleted`), così si propagano anche loro.

### Come è stato verificato

Ogni funzione è stata provata pilotando l'app in Chromium con viewport iPhone: creazione
viaggiatori con foto, registrazione con tipo/bonus/coppia/wireless/istigazione, controllo
aritmetico dei punteggi, classifiche, chiusura e ricarica degli archivi, riepilogo
stampabile, generazione dell'immagine, temi, campi data e ora, PIN sviluppatore e
conservazione della posizione di scorrimento durante la sincronizzazione.

La sincronizzazione è stata verificata con più telefoni simulati contro un finto endpoint
PostgREST: propagazione nei due sensi, conflitti risolti a favore della modifica più
recente, cancellazioni propagate, modifiche fatte offline recuperate al ritorno della
rete, archivi visibili anche da chi ha un codice viaggio diverso, suggerimenti invisibili
a tutti gli altri, e comportamento corretto quando il database rifiuta una categoria.
