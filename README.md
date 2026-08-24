# 🤬 Bestemmiometro

Il contatore ufficiale delle bestemmie del roadtrip. Ogni tappa, ogni viaggiatore,
ogni frase celebre che verrà ricordata per sempre.

- **Admin** per configurare viaggiatori (foto, soprannome, ruolo, descrizione) e tappe
- **Inserimento manuale** con un tocco sulla faccia del colpevole, gravità da 😐 a 🔥
- **Bestemmia bonus**: tipo (creativa, composta, in dialetto, straniera, autogol) e
  stelle di fantasia, perché la creatività vale più della quantità
- **Istigazione, coppia e wireless**: chi provoca guadagna una stella, le combinate
  contano per due, e quella recitata a labiale vale come le altre
- **Frasi celebri** del giorno, per persona
- **Classifica** per tappa, per giornata e per tutto il viaggio, con albo d'oro,
  **classifica fantasia** e podio degli **istigatori**
- **Fine vacanza**: chiudi il viaggio, esporta il ricordo come **immagine** o **PDF**,
  e ritrova tutto in **Le bestemmie del passato**
- **Tema chiaro, scuro o automatico**, si sceglie in Admin
- **Promemoria serale** per non dimenticare di segnare i danni
- **Condivisione** pronta all'uso: l'app è già collegata al database, agli amici serve
  solo il codice viaggio
- Funziona **offline** in auto e sincronizza appena torna il segnale

Nessun framework, nessuna installazione, nessuna compilazione: sono file HTML, CSS e
JavaScript. Si pubblica e si usa **direttamente dall'iPhone**.

---

## 1. Metterla online (5 minuti, solo dal telefono)

Serve solo Safari.

1. Apri `github.com/Regedit86/Bestemmiometro` e fai il login.
2. **Settings** → **Pages** (GitHub Pages richiede che il repository sia pubblico,
   a meno di un piano a pagamento).
3. *Source*: **Deploy from a branch** → branch `claude/bestemmiometro-road-trip-app-xnaujs`
   (oppure `main`), cartella `/ (root)` → **Save**.
4. Dopo 1-2 minuti l'indirizzo compare in cima: **`https://regedit86.github.io/Bestemmiometro/`**

## 2. Installarla sull'iPhone

1. Apri il link con **Safari** (non Chrome: le notifiche funzionano solo da Safari).
2. **Condividi** → **Aggiungi alla schermata Home** → **Aggiungi**.
3. Apri il Bestemmiometro dall'icona: parte a schermo intero come una vera app.

Alla prima apertura l'app mostra da sola questi passaggi e chiede il codice viaggio.

## 3. Il database (una volta sola, per chi organizza)

URL e chiave pubblica del progetto Supabase sono **già dentro l'app**: gli amici non
devono configurare niente. Chi mette in piedi il progetto deve solo creare la tabella.

1. Su Supabase, apri **SQL Editor** → *New query*
2. Incolla il contenuto di [`supabase/schema.sql`](supabase/schema.sql) e premi **Run**
3. Se avevi già creato la tabella con la versione precedente, esegui anche
   [`supabase/migrazione-2.sql`](supabase/migrazione-2.sql): aggiunge i tipi `archives`
   e `feedback`. Senza quella riga il gioco funziona lo stesso, ma gli archivi di fine
   viaggio e i suggerimenti non vengono sincronizzati (l'app te lo segnala in Admin).

Per cambiare progetto Supabase: **Admin → Gruppo e sincronizzazione → Impostazioni
avanzate**. I valori scritti a mano hanno la precedenza e sopravvivono agli aggiornamenti.

## 4. Il codice viaggio

È la parola d'ordine del gruppo: **chi scrive lo stesso codice vede lo stesso conteggio**.
Si imposta in **Admin → Gruppo e sincronizzazione** (o alla prima apertura).

**Admin → Invita gli amici** offre due link:

- **Invita al viaggio** — contiene già il codice: loro toccano *Entra nel gruppo* e sono dentro
- **Condividi l'app** — senza codice, per quando il viaggio non è il tuo: se lo scelgono loro

L'app sincronizza da sola: all'apertura, quando torni sull'app e ogni 45 secondi mentre è
aperta. Senza campo continui a segnare e l'invio parte appena torna la linea (l'icona ☁︎•
in alto indica che c'è roba in coda).

## 5. Usarla durante il viaggio

- Tab **Oggi**: tocchi la faccia di chi ha bestemmiato, scegli com'è andata, la gravità,
  il tipo, le stelle, chi ha istigato, e **Registra**. Per le raffiche c'è **+5**.
- **💬 Frase celebre**: per salvare la perla del giorno.
- Tab **Tappe**: conteggio per tratta, riepilogo e accesso all'archivio.
- Tab **Classifica**: podio generale, fantasia, istigatori, bonus e albo d'oro.
- Tocca una persona per la sua scheda: statistiche, bonus migliori, frasi e storico.
- Il tasto ✕ nel diario cancella un inserimento sbagliato.

### Come si contano i punti

| Voce | Punti |
|---|---|
| Gravità (da 😐 Blanda a 🔥 Storica) | da 1 a 5 |
| 🎨 Creativa / 🪗 Dialetto / 🌍 Straniera | +2 |
| 🧱 Composta | +3 |
| 🙈 Autogol | +1 |
| ⭐ Bonus fantasia | +2 per stella |
| 👥 Coppia combinata | +2 (e conta per entrambi) |
| 📡 Wireless | +2 |
| 🎯 Istigata | +1 a chi la dice, ⭐ (2 pt di fantasia) a chi istiga |

Una 🧱 composta pesante da tre stelle vale 13 punti: più di cinque bestemmie classiche
urlate in fila. La **raffica +5** resta esclusa dai bonus, è quantità e non qualità.

- **Coppia**: una bestemmia costruita in due. Conta nel totale di entrambi e assegna a
  entrambi i punti pieni.
- **Wireless**: detta senza audio, solo con il labiale. Non la sente nessuno, ma tutti
  quelli che guardano la leggono benissimo.
- **Istigazione**: chi ha provocato entra nella classifica **Istigatori** e si porta a
  casa una stella; chi ha ceduto si prende il punto in più.

## 6. Fine vacanza

**Admin → Fine vacanza → 🏁 Chiudi il viaggio**: le statistiche vengono congelate in un
archivio permanente e il contatore riparte da zero (puoi tenere gli stessi viaggiatori).
Fallo quando tutti hanno sincronizzato, così nell'archivio finisce tutto.

Alla riapertura successiva l'app parte da una schermata dedicata con due sole strade:

- **Nuovo viaggio** — nome e codice nuovo, con *Crea e invita gli amici* che apre subito
  la condivisione del link. Se chiudendo non hai tenuto nessuno del gruppo precedente,
  subito dopo si apre la scheda per aggiungere il primo viaggiatore.
- **Area sviluppatore** — il link piccolo in fondo, per leggere i suggerimenti.

(*Più tardi* la fa sparire; si ritrova con **Admin → Fine vacanza → Apri un viaggio nuovo**.)

Da lì, e da **Le bestemmie del passato**, puoi:

- **📸 Immagine** — una locandina verticale con podio, punti, re della fantasia e la
  frase migliore, pronta da mandare su WhatsApp
- **📄 PDF** — il documento completo con classifica, bonus e frasi celebri: tocca
  *Salva come PDF* e usa il tasto Condividi dell'anteprima di stampa
- **💬 Testo** — il riassunto in caratteri, per chi vuole solo incollarlo in chat
- **♻️ Ricarica** — rimette in gioco un viaggio archiviato

## 7. Suggerimenti allo sviluppatore

In fondo alla sezione Admin c'è **Contatta lo sviluppatore** (il nome si cambia in
`assets/config.js`): chiunque può mandare un'idea, anche con il PIN attivo.

I messaggi **non passano dai viaggi**: finiscono in un contenitore riservato che l'app
normale non scarica mai. Si leggono solo nell'**Area sviluppatore** — il link piccolo
sotto la scheda contatti e in fondo alla schermata di nuovo viaggio — protetta da un PIN
suo, diverso dal PIN admin e richiesto di nuovo a ogni riavvio
(`developerCode` in `assets/config.js`, offuscato come le altre chiavi).

Va detto chiaramente: sono nascosti, non cifrati. Chi conosce la chiave pubblica dell'app
potrebbe leggerli. Per raccogliere idee sul viaggio va benissimo, per informazioni serie no.

### I tre contenitori

| Contenitore | Cosa contiene | Chi lo vede |
|---|---|---|
| `<codice viaggio>` | viaggiatori, tappe, bestemmie, frasi | solo chi ha quel codice |
| `__archivi__` | archivi di fine viaggio | tutti, anche cambiando codice viaggio |
| `__suggerimenti__` | messaggi allo sviluppatore | solo l'area sviluppatore, col codice |

Gli archivi stanno in comune apposta: quando il gruppo apre un viaggio nuovo con un
codice nuovo, **Le bestemmie del passato** continua a mostrare quelli vecchi.

## 8. Aspetto

**Admin → Aspetto**: scuro (predefinito), chiaro, oppure automatico, che segue
l'impostazione di iOS. La scelta resta salvata sul telefono di ciascuno.

## 9. Backup

**Admin → Dati** esporta tutto in un file JSON e lo reimporta. Fallo a fine viaggio.

---

## Note oneste su sicurezza e privacy

- L'app pubblicata è raggiungibile da chiunque abbia il link, come qualsiasi sito.
- URL e chiave pubblica Supabase sono dentro il codice, offuscati. **L'offuscamento non è
  cifratura**: chi vuole guardare, guarda. Va bene comunque, perché quella chiave è nata
  per stare nel browser ed è protetta dalle policy RLS. La chiave *segreta* non è nel
  repository e non deve mai finirci.
- Chi ha il link d'invito può leggere e scrivere le bestemmie del viaggio. È un gioco fra
  amici: non metteteci dentro altro.
- Il **PIN admin** evita gli scherzi, non è una protezione seria: è controllato dal
  telefono, non dal server. Lo stesso vale per il codice dell'area sviluppatore: tiene
  la posta fuori dalla vista di chi usa l'app, non la mette al sicuro.

## Struttura del progetto

```
index.html                   struttura e navigazione
assets/styles.css            tema scuro mobile-first + foglio di stampa
assets/config.js             URL e chiave Supabase di fabbrica (offuscati)
assets/store.js              dati, salvataggio locale, sincronizzazione
assets/notifications.js      promemoria giornaliero
assets/poster.js             immagine ricordo disegnata su canvas
assets/app.js                schermate, form, azioni
sw.js                        service worker: funziona offline
manifest.webmanifest         installazione sulla schermata Home
supabase/schema.sql          tabella da creare su Supabase
supabase/migrazione-2.sql    aggiornamento per archivi e suggerimenti
```

I dati stanno in `localStorage` in sei collezioni (`travelers`, `stages`, `curses`,
`quotes` legate al codice viaggio, `archives` in comune, `feedback` riservata). Ogni record porta `updatedAt` e un flag `dirty`: la
sincronizzazione manda i record modificati, tipo per tipo, e in caso di conflitto vince la
modifica più recente. Se il database rifiuta una categoria, le altre passano lo stesso.
