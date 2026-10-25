# TakeAway - Packing Checklist 🎒

Applicazione web reattiva per la gestione delle checklist da viaggio, vacanza e trasferta.

Permette di organizzare e spuntare tutti gli oggetti da portare in viaggio, gestire più viaggi indipendenti (storico, partenze future), e salvare su database **SQLite** solo gli oggetti effettivamente valorizzati per ogni viaggio, ottimizzando lo spazio e mantenendo il catalogo sempre aggiornato.

---

## 🚀 Tecnologie & Stack

* **Backend**:
  * **NestJS** (TypeScript, ES Modules)
  * **TypeORM** con driver **better-sqlite3** (database SQLite locale e performante)
  * **Autenticazione OIDC (OpenID Connect)** tramite `jose` con PKCE, cookie `HttpOnly` sicuri e supporto token `Bearer`
  * **Bypass Locale Mock**: variabile `AUTH_MOCK_ENABLED=true` per sviluppare ed eseguire l'app in locale senza dover configurare un identity provider esterno
* **Frontend**:
  * **Angular** moderno (Signals, Standalone Components, Angular CDK, SCSS)
  * Layout responsive ottimizzato per smartphone, tablet e desktop
  * Filtri istantanei lato client (ricerca full-text, filtro per stato, filtro per stagione/trasporto, salto rapido tra sezioni)
  * Sincronizzazione immediata degli elementi cross-reference/marker (se un oggetto appartiene a più categorie, la modifica si riflette in tempo reale ovunque)
* **Produzione & Container**:
  * **Dockerfile multi-stage** (build frontend + build backend + runtime Node Slim con **Nginx** reverse proxy e **Supervisord**)
  * **docker-compose.yml** con volume persistente per SQLite (`takeaway.sqlite`)
  * Porta unificata `8080` (con reverse proxy `/api` e `/health` su porta interna `3000`)

---

## 📋 Struttura del Catalogo (estratta dall'ODT)

Il catalogo iniziale è stato popolato direttamente estraendo e normalizzando tutti gli elementi del documento `Checklist viaggi-vacanze-trasferte.odt`:

* **16 Sezioni / Categorie**:
  1. ✨ *Preparazione pre-partenza* (unghie, barba, doccia)
  2. 📄 *Documenti di viaggio* (carta d'identità valida per l'espatrio, patente, tessera sanitaria, passaporto, carte d'imbarco)
  3. 🎖️ *Tessere sconti & Extra* (CAI, Libera, Legambiente, Coop Alleanza 3.0)
  4. 🧢 *Abbigliamento - Accessori* (berretto con visiera/lana, occhiali da sole Ray-Ban/sport, guanti, sciarpa, cinture 4cm/3.5cm/3cm)
  5. 👕 *Abbigliamento - Busto* (giacche, k-way, camicie, polo, t-shirt, canottiere, sotto-felpe, felpe, pile, maglioni, pigiama)
  6. 👖 *Abbigliamento - Gambe* (jeans leggeri/pesanti, chino, tela, lino, bermuda, scarpe, sandali, ciabatte)
  7. 🧦 *Abbigliamento - Intimo* (magliette intime scollo tondo/V, trunk, calzini cotone/lana/tecnici, sacchetti)
  8. 💍 *Abbigliamento - Gioielli* (braccialetto Maserati con foto, braccialetto nero-argento, collanina capricorno)
  9. 🪥 *Cura personale* (spazzolino elettrico, rasoio, profumo, burro cacao, gocce capelli, regole per viaggi > 5 giorni)
  10. 🥪 *Alimenti & Spuntini* (pranzo al sacco, borracce termiche, snack, contenitori, sacchetti)
  11. 💊 *Medicine ed integratori* (antiacne, loniten, finasteride, carexidil, tachipirina, momentact, termometro)
  12. 🔌 *Accessori & Tech* (organizer cavi, Galaxy Watch 5, Buds 2 Pro, cavi, power bank, Kindle, hub HDMI)
  13. 🏔️ *Montagna* (scarponi, bastoncini, pantaloni tecnici Decathlon, pile CMP, ramponcini, anti-zecche, torcia frontale)
  14. 🏖️ *Mare & Spiaggia* (telo mare, protezioni solari, doposole, scarpe scoglio, costumi, kit snorkeling, tenda/ombrellone con punta in metallo)
  15. 🎲 *Giochi & Svago* (carte Uno, Unstable Unicorns, Taboo, Cocoridò, What Do You Meme?, palloni, bocce, racchettoni)
  16. 💼 *Lavoro* (badge, buoni pasto, computer, mouse, tappetino, cuffie, telefono)

* **Icone e Tag Climatici / Trasporto**:
  * ☀️ `estate` (Estate / caldo)
  * ❄️ `inverno` (Inverno / freddo)
  * 🌙 `sera` (Per la sera / notte)
  * ✈️ `aereo`
  * 🚆 `treno`
  * 🚢 `traghetto`
* **Stati dell'oggetto**:
  * ⬜ *Non selezionato / da considerare*
  * 🧳 *In valigia*
  * 👕 *Indossato alla partenza (+)*
  * 🚗 *In auto (Auris)*
  * ⚠️ *Da mettere all'ultimo (*)*
* **Ottimizzazione DB**:
  * Vengono salvati nella tabella `trip_item_states` solo gli oggetti che hanno uno stato valorizzato, quantità > 0 o note personalizzate. Gli elementi non selezionati non occupano alcuna riga nel database.

---

## 🛠️ Sviluppo Locale

### 1. Prerequisiti
* Node.js (v20+ o v22)
* npm (v10+)

### 2. Installazione delle dipendenze
Dalla cartella principale del progetto:
```bash
npm --prefix backend install
npm --prefix frontend install
```

### 3. Configurazione dell'ambiente
Il file `.env` è già configurato di default per lo sviluppo locale:
```env
NODE_ENV=development
PORT=3000
DB_PATH=./takeaway.sqlite
CORS_ALLOWED_ORIGINS=http://localhost:4200

# Modalità bypass locale (nessun provider OIDC esterno richiesto)
AUTH_MOCK_ENABLED=true
```

Se desideri collegare un provider OIDC reale (es. Keycloak, Authentik, PocketID, Authelia, Google):
```env
AUTH_MOCK_ENABLED=false
OIDC_ISSUER_URL=https://auth.example.com
OIDC_CLIENT_ID=takeaway
OIDC_CLIENT_SECRET=il-tuo-client-secret
OIDC_REDIRECT_URI=http://localhost:4200/api/auth/callback
OIDC_FRONTEND_REDIRECT_BASE_URL=http://localhost:4200
```

### 4. Avvio in locale
In due terminali separati (oppure tramite gli script root):

* **Backend**:
  ```bash
  npm run start:backend
  # oppure: npm --prefix backend run start:dev
  ```
  Il backend sarà attivo su `http://localhost:3000` (e mapperà le API su `/api`).

* **Frontend**:
  ```bash
  npm run start:frontend
  # oppure: npm --prefix frontend run start
  ```
  L'interfaccia Angular sarà disponibile su `http://localhost:4200` con proxy automatico delle chiamate `/api` verso `http://localhost:3000`.

### 5. Build di produzione
```bash
npm run build
```
Questo comando compilerà sia il frontend che il backend verificando la corretta generazione dei bundle.

---

## 🐳 Container Docker di Produzione

Per avviare l'intera applicazione in un unico container con Docker Compose:

```bash
docker compose up -d --build
```

L'applicazione sarà accessibile all'indirizzo `http://localhost:8080`.
Il database SQLite e le sue modifiche persistono nel volume docker `takeaway-backend-data`.

