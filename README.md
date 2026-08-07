# 🤬 Bestemmiometro

Il contatore ufficiale delle bestemmie del roadtrip. Ogni tappa, ogni viaggiatore,
ogni frase celebre che verrà ricordata per sempre.

- **Admin** per configurare viaggiatori (foto, soprannome, ruolo, descrizione) e tappe
- **Inserimento manuale** con un tocco sulla faccia del colpevole, gravità da 😐 a 🔥
- **Frasi celebri** del giorno, per persona
- **Classifica** per tappa, per giornata e per tutto il viaggio, con albo d'oro
- **Promemoria serale** per non dimenticare di segnare i danni
- **Condivisione** con gli amici: tutti vedono lo stesso conteggio
- Funziona **offline** in auto e sincronizza appena torna il segnale

Nessun framework, nessuna installazione, nessuna compilazione: sono file HTML, CSS e
JavaScript. Si pubblica e si usa **direttamente dall'iPhone**.

---

## 1. Metterla online (5 minuti, solo dal telefono)

Serve solo Safari.

1. Apri `github.com/Regedit86/Bestemmiometro` e fai il login.
2. Tocca **Settings** (se non lo vedi, tocca i tre puntini in alto a destra).
3. Nel menu di sinistra scegli **Pages**.
4. In *Build and deployment* → *Source* scegli **Deploy from a branch**.
5. In *Branch* scegli il ramo `claude/bestemmiometro-road-trip-app-xnaujs`
   (oppure `main`, se hai già unito le modifiche), cartella `/ (root)`, poi **Save**.
6. Aspetta 1-2 minuti e ricarica: in cima comparirà l'indirizzo, tipo
   **`https://regedit86.github.io/Bestemmiometro/`**

Quello è il link dell'app. Fine: non serve altro.

## 2. Installarla sull'iPhone

1. Apri il link con **Safari** (non Chrome: le notifiche funzionano solo da Safari).
2. Tocca il pulsante **Condividi** in basso → **Aggiungi alla schermata Home**.
3. Apri il Bestemmiometro dall'icona: parte a schermo intero come una vera app.

> Questo passaggio non è facoltativo se vuoi le notifiche: iOS le concede solo alle
> app aggiunte alla schermata Home.

## 3. Configurare il viaggio

Nella tab **Admin**:

- **Viaggiatori** → *Aggiungi*: nome, soprannome, ruolo, descrizione, colore e foto
  (il tasto 📷 apre direttamente la fotocamera o le foto dell'iPhone; l'immagine viene
  ridotta automaticamente, quindi non appesantisce l'app).
- **Tappe** → *Aggiungi*: titolo, da / a, data, note. L'ultima tappa creata diventa
  quella attiva; puoi cambiarla dalla schermata **Oggi** o dal dettaglio della tappa.
- **Il viaggio**: nome dell'app, sottotitolo, date e un **PIN admin** facoltativo, così
  gli amici non ti smontano la configurazione per scherzo.

## 4. Usarla durante il viaggio

- Tab **Oggi**: tocchi la faccia di chi ha bestemmiato, scegli la gravità, aggiungi
  facoltativamente cosa è successo, **Registra**. Se è stata una raffica, c'è **+5**.
- **💬 Frase celebre**: per salvare la perla del giorno, attribuita alla persona giusta.
- Tab **Tappe**: conteggio per ogni tratta e riepilogo del viaggio.
- Tab **Classifica**: podio per tutto il viaggio / tappa corrente / oggi, gravità media,
  giornata peggiore e bestemmia record.
- Tocca una persona in classifica per la sua scheda: statistiche, frasi e storico.
- Sbagliato un inserimento? Il tasto ✕ nel diario lo cancella.

## 5. Condividere il conteggio con gli amici

Senza questo passaggio l'app funziona benissimo, ma ogni telefono ha il **suo** conteggio.
Per averne uno unico serve un database gratuito (Supabase). Anche questo si fa dal telefono.

1. Vai su **supabase.com** → *Start your project* → accedi con GitHub.
2. **New project**: dai un nome, scegli una password qualsiasi (non ti servirà) e la
   regione più vicina. Aspetta un paio di minuti che finisca di crearsi.
3. Menu **SQL Editor** → *New query*. Apri in un'altra scheda il file
   [`supabase/schema.sql`](supabase/schema.sql) di questo repository, copia tutto,
   incollalo e premi **Run**. Deve rispondere *Success*.
4. Menu **Project Settings** (l'ingranaggio) → **API**. Ti servono due valori:
   - **Project URL** (tipo `https://abcdefgh.supabase.co`)
   - **anon public** (una chiave lunghissima che inizia con `eyJ...`)
5. Torna nel Bestemmiometro → **Admin** → *Condivisione fra amici*: incolla URL e chiave,
   scegli un **codice viaggio** (es. `puglia2026`) e tocca **Salva e sincronizza**.
6. Tocca **📲 Invita gli amici**: parte un link via WhatsApp che contiene già tutta la
   configurazione. Loro lo aprono, toccano **Entra nel gruppo**, aggiungono l'app alla
   schermata Home e sono dentro.

Da quel momento l'app sincronizza da sola: all'apertura, ogni volta che torni sull'app e
ogni 45 secondi mentre è aperta. Se sei in galleria senza campo continui a segnare tutto:
appena torna la linea parte l'invio (l'icona ☁︎• in alto indica che c'è roba da spedire).

> **Nota onesta sulla privacy:** chiunque abbia quel link può leggere e scrivere le
> bestemmie del vostro viaggio. È un gioco fra amici, non metteteci dentro cose serie.

## 6. Le notifiche

In **Admin → Promemoria** attivi le notifiche e scegli l'orario (di default 21:00).

Va detto com'è: **senza un server, l'iPhone mostra la notifica quando l'app è aperta o è
appena stata aperta.** Per avere davvero la sveglia ogni sera bastano 30 secondi di setup
con l'app **Comandi rapidi** (già installata su iOS):

1. Apri **Comandi rapidi** → tab **Automazione** → **+** → **Ora del giorno**
2. Scegli **21:00**, ripeti **Ogni giorno** → *Avanti*
3. **Nuovo comando rapido vuoto** → cerca l'azione **Apri app** → scegli **Bestemmiometro**
4. Disattiva *Chiedi prima di eseguire* → **Fine**

Ogni sera alle 21 l'app si apre da sola e ti sbatte in faccia la notifica con il conteggio
del giorno (e una frase diversa ogni volta se non avete segnato niente).

Alternativa pigra: un promemoria giornaliero in **Promemoria** o una sveglia ricorrente.

## 7. Backup

**Admin → Dati** permette di esportare tutto in un file JSON e reimportarlo.
Fallo a fine viaggio, prima di cancellare qualcosa per sbaglio.

---

## Struttura del progetto

```
index.html                 struttura e navigazione
assets/styles.css          tema scuro mobile-first
assets/store.js            dati, salvataggio locale, sincronizzazione Supabase
assets/notifications.js    promemoria giornaliero
assets/app.js              schermate, form, azioni
sw.js                      service worker: funziona offline
manifest.webmanifest       installazione sulla schermata Home
supabase/schema.sql        tabella da creare su Supabase
```

I dati stanno in `localStorage` come quattro collezioni (`travelers`, `stages`, `curses`,
`quotes`). Ogni record porta `updatedAt` e un flag `dirty`: la sincronizzazione manda i
record modificati e, in caso di conflitto, vince la modifica più recente.
