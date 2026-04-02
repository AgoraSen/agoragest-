# GUIDA DEPLOY — Agorà Gestionale
# ================================================
# Tempo stimato: 30-45 minuti
# Costo: 0€/mese (con i piani gratuiti)

## PASSO 1 — Supabase (database + autenticazione)

1. Vai su https://supabase.com e crea un account gratuito
2. Clicca "New project"
   - Nome: agora-gestionale
   - Password database: scegli una password sicura (salvala!)
   - Regione: West EU (Ireland) — la più vicina all'Italia
3. Aspetta ~2 minuti che il progetto si avvii

4. Vai su "SQL Editor" (menu a sinistra)
5. Clicca "New query"
6. Copia e incolla tutto il contenuto di `supabase_schema.sql`
7. Clicca "Run" — dovresti vedere "Success"

8. Vai su Settings → API
9. Copia:
   - "Project URL" → es. https://abcxyz.supabase.co
   - "anon public" key → stringa lunga che inizia con eyJ...


## PASSO 2 — Configura le credenziali nel codice

1. Nella cartella del progetto, copia .env.example in .env.local:
   ```
   cp .env.example .env.local
   ```

2. Apri .env.local e inserisci le credenziali:
   ```
   REACT_APP_SUPABASE_URL=https://TUO-PROGETTO.supabase.co
   REACT_APP_SUPABASE_ANON_KEY=eyJ...la-tua-chiave...
   ```


## PASSO 3 — Netlify (hosting gratuito)

1. Vai su https://netlify.com e crea un account gratuito
2. Clicca "Add new site" → "Deploy manually"
3. Prima devi compilare il progetto:
   ```
   npm install
   npm run build
   ```
   Questo crea una cartella `build/`

4. Trascina la cartella `build/` nella finestra di Netlify
5. Netlify ti dà un URL tipo: https://amazing-name-123.netlify.app

6. Per aggiungere le variabili d'ambiente su Netlify:
   Site settings → Environment variables → Add variable
   - REACT_APP_SUPABASE_URL = https://TUO-PROGETTO.supabase.co
   - REACT_APP_SUPABASE_ANON_KEY = eyJ...

7. Ri-deploya dopo aver aggiunto le variabili


## PASSO 4 — Sottodominio personalizzato

Per usare gestionale.agora-senigallia.it (o il vostro dominio):

1. Su Netlify → Domain settings → Add custom domain
   Inserisci: gestionale.agora-senigallia.it

2. Netlify ti mostra un valore CNAME tipo:
   amazing-name-123.netlify.app

3. Vai dal vostro provider di dominio (Aruba, Register.it, ecc.)
   o dall'agenzia che gestisce il DNS
   e aggiungi:
   - Tipo: CNAME
   - Nome: gestionale
   - Valore: amazing-name-123.netlify.app

4. Aspetta 10-30 minuti per la propagazione DNS

5. Netlify configura HTTPS automaticamente (certificato gratuito Let's Encrypt)


## PASSO 5 — Primo utente amministratore

1. Su Supabase → Authentication → Users → Add user
   - Email: tua-email@agora.it
   - Password: scegli una password sicura
   - Confirm email: true (spunta questa)

2. Poi aggiorna il profilo nel SQL editor:
   ```sql
   UPDATE profiles
   SET ruolo = 'admin', nome = 'Mario', cognome = 'Rossi'
   WHERE email = 'tua-email@agora.it';
   ```

3. Accedi al gestionale con quelle credenziali

4. Dalla sezione "Utenti" crea gli altri operatori


## PASSO 6 — Importare i candidati esistenti

Puoi importare i 1001 candidati dal file OPAL direttamente su Supabase:

1. Vai su Supabase → Table Editor → candidati
2. Clicca "Import data" → CSV
3. Usa il file CSV esportato dal modulo CRM (che abbiamo già costruito)
   oppure prepara un CSV con colonne:
   nome, cognome, cf, email, tel, comune, stato, percorso

Oppure usa lo script Python (contatta Claude per generarlo).


## STRUTTURA FILE PROGETTO

agora-gestionale/
├── public/
│   └── index.html
├── src/
│   ├── lib/
│   │   └── supabase.js         ← configurazione database
│   ├── hooks/
│   │   └── useAuth.js          ← autenticazione e ruoli
│   ├── components/
│   │   └── Layout.jsx          ← sidebar e navigazione
│   ├── pages/
│   │   ├── Login.jsx           ← pagina di accesso
│   │   ├── Dashboard.jsx       ← home con KPI
│   │   ├── Candidati.jsx       ← CRM candidati
│   │   └── Utenti.jsx          ← gestione utenti (solo admin)
│   ├── App.jsx                 ← routing principale
│   └── index.jsx               ← entry point
├── .env.example                ← template credenziali
├── .env.local                  ← credenziali reali (NON caricare su git!)
├── netlify.toml                ← configurazione deploy
├── package.json
└── supabase_schema.sql         ← schema database completo


## PROSSIMI PASSI (moduli da completare)

I moduli Agenda, Corsi, Comunicazioni e Automazioni sono stati
costruiti come widget interattivi e vanno ora convertiti in
pagine React con integrazione Supabase. Ogni modulo segue
lo stesso pattern di Candidati.jsx.

Chiedi a Claude di completare uno specifico modulo quando sei
pronto — ogni sessione può affrontare un modulo alla volta.


## SUPPORTO

Per qualsiasi problema tecnico durante il deploy,
descrivi l'errore a Claude con il messaggio esatto
che appare e la fase in cui sei.
