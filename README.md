# ForGroups 2.0

Piattaforma per prenotare ristoranti per gruppi: tour operator, agenzie, scuole, parrocchie e aziende da una parte, ristoranti dall'altra, e lo staff ForGroups che coordina tutto.

L'analisi del vecchio pannello da cui siamo partiti è in [`docs/01-analisi-pannello-attuale.md`](docs/01-analisi-pannello-attuale.md).

## Cosa c'è

### Sito pubblico
- Ricerca per città, data, numero di persone e servizio, con **disponibilità reale** calcolata dalla capienza delle sale.
- Scheda ristorante con menu per gruppi, gratuità e servizi. I prezzi sono visibili solo alle agenzie registrate.
- Prenotazione in un minuto per le agenzie, con prezzo, gratuità e totale calcolati in tempo reale.
- Richiesta di preventivo per chi non è registrato. Le richieste arrivano nella pipeline dello staff.
- Registrazione di agenzie e ristoranti, con approvazione da parte dello staff.

### Pannello staff (`/admin`)
| Sezione | Cosa fa |
|---|---|
| **Oggi** | Le cose da fare adesso: richieste nuove, prenotazioni da far confermare, pagamenti da sollecitare, arrivi dei prossimi 3 giorni, registrazioni da approvare, andamento 12 mesi |
| **Ricerca ⌘K** | Trova qualsiasi prenotazione, ristorante, agenzia o richiesta scrivendo, da qualunque pagina |
| **Richieste** | Bacheca a colonne trascinabili: Nuove → In lavorazione → Preventivo inviato → Confermate / Perse. Ristoranti suggeriti in automatico (città, posti, budget, disponibilità sulla data), testo del preventivo pronto da inviare nella lingua del cliente, conversione in prenotazione con un clic |
| **Richiesta da email (AI)** | Incolli l'email del cliente, in qualsiasi lingua. Claude estrae data, persone, città, budget ed esigenze alimentari e prepara una bozza di risposta |
| **Prenotazioni** | Viste rapide (Prossime / Da confermare / Da incassare / Passate), filtri, totali, esportazione CSV per Excel |
| **Scheda prenotazione** | Stato, modifica, conversazione con cliente e ristorante (più note interne), importi e provvigione, link di pagamento, incassi manuali, storico completo delle modifiche, voucher stampabile |
| **Agenda** | I gruppi dei prossimi 14 giorni, giorno per giorno |
| **Ristoranti** | Una sola scheda con quattro schede interne: panoramica con mappa di occupazione delle sale, scheda pubblica, sale/servizi/menu, pagamenti e contratto (Stripe, provvigione, agente) |
| **Agenzie e clienti** | Storico, valore, ristoranti preferiti, utenti, approvazione |
| **Incassi e provvigioni** | Per mese: provvigioni già trattenute da Stripe e provvigioni da fatturare (pagamenti sul posto); CSV per il commercialista |
| **Agenti** | Rendiconto mensile automatico (quota della provvigione sui ristoranti seguiti), segna come pagata |
| **Statistiche** | Andamento, classifiche ristoranti, agenzie, città, tipo di cliente, conversione delle richieste |
| **Utenti e impostazioni** | Accessi, reset password, stato delle integrazioni |

### Portali esterni
- **Agenzie** (`/area`): prenotazioni con pagamento online, messaggi, voucher, preventivi ricevuti, profilo e colleghi.
- **Ristoratori** (`/ristoratore`), pensato per il telefono: conferma o rifiuto con un tocco, prossimi gruppi, gestione di sale, servizi, menu e chiusure, collegamento Stripe.
- **Agenti** (`/agente`): ristoranti seguiti e commissioni maturate.

## Pagamenti per conto terzi (Stripe Connect)

Modello "marketplace" con **destination charges**:

1. Ogni ristorante collega il proprio account Stripe dalla scheda **Pagamenti**: dati aziendali, IBAN e documento vengono raccolti da Stripe. Gli account sono creati con Accounts v2, dashboard Express e configurazione `recipient`.
2. Dopo la conferma del ristorante, l'agenzia paga con Stripe Checkout (carta, Apple/Google Pay, bonifico istantaneo…). Può pagare l'intero importo o un acconto.
3. ForGroups trattiene la provvigione (`application_fee_amount`), che viene incassata per prima, già con l'acconto. Il resto va **direttamente sul conto del ristorante**.
4. Il **webhook** `/api/stripe/webhook` aggiorna prenotazione e storico. È idempotente e verifica la firma.

Le prenotazioni pagate sul posto restano supportate: la provvigione finisce in "Da fatturare" nella sezione Incassi.

### Configurare Stripe
1. Crea l'account Stripe ForGroups e attiva **Connect** (profilo piattaforma: marketplace).
2. Crea una **restricted key** con permessi in scrittura su Checkout Sessions, Accounts (v2), Account Links e Login Links, e permessi in lettura su Events. Mettila in `STRIPE_SECRET_KEY`.
3. In Webhook aggiungi l'endpoint `https://<dominio>/api/stripe/webhook` con gli eventi `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed` e `checkout.session.expired`. Copia il segreto in `STRIPE_WEBHOOK_SECRET`.
4. Per i test usa una **sandbox** Stripe e le carte di prova.

> ⚖️ Con le destination charges ForGroups è il "merchant of record" dell'incasso. Prima di andare live va verificato con il commercialista l'inquadramento fiscale: mandato all'incasso per conto dei ristoranti, fatturazione delle provvigioni.

## Tecnologia
- **Next.js 16** (App Router, Server Actions) + **React 19** + **TypeScript**
- **Tailwind CSS 4** con un sistema grafico basato sui colori del marchio (antracite e ambra)
- **PostgreSQL** + **Prisma**
- **Stripe** (Connect, Checkout, webhook) · **Claude** (Anthropic) per l'estrazione delle richieste
- Autenticazione propria con password bcrypt e sessione firmata in cookie httpOnly. I permessi sono verificati sul server in ogni pagina e azione.

## Avvio in locale
```bash
cp .env.example .env        # compila DATABASE_URL e SESSION_SECRET
npm install
npx prisma migrate dev      # crea le tabelle
npm run db:seed             # dati dimostrativi (inventati)
npm run dev                 # http://localhost:3000
```

Account dimostrativi (password `forgroups2026`):
| Ruolo | Email |
|---|---|
| Staff | carmine@ · federico@ · roberta@ · marco@forgroups.demo |
| Agenzia | agenzia@forgroups.demo |
| Ristoratore | ristorante1@forgroups.demo |
| Agente | agente1@forgroups.demo |

Controlli: `npm run typecheck` · `npm run lint` · `npm run build`

## Messa online (consigliata)
- **App**: Hostinger *Node.js Web App* (piani Business/Cloud) oppure un VPS Hostinger. Si collega il repository GitHub e ogni push pubblica in automatico. Comando di build: `npm run build`; avvio: `npm start`.
- **Database**: PostgreSQL gestito in UE (es. Neon o Supabase, regione Francoforte), oppure PostgreSQL sul VPS Hostinger. All'avvio esegui `npm run db:deploy`.
- Imposta le variabili di `.env.example` nel pannello di hosting.

## Prossimi passi
1. **Migrazione dati dal vecchio sistema** (Aruba): importare attività, utenti, prenotazioni e rubrica dagli export XLS del vecchio pannello, mantenendo numerazione e storico.
2. **Notifiche email e WhatsApp**: nuova prenotazione al ristorante, conferma e link di pagamento all'agenzia, solleciti automatici. Serve un servizio di invio (es. Postmark, Brevo).
3. **Fatture elettroniche delle provvigioni**: generazione automatica e invio a SdI tramite un intermediario (es. Fatture in Cloud o Aruba API).
4. Versione inglese del portale agenzie e delle schede ristorante.
5. Caricamento foto direttamente dal pannello (oggi tramite URL).
