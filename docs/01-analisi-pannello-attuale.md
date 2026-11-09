# ForGroups – Analisi del pannello di amministrazione attuale

> Rilevazione fatta navigando in sola lettura l'area riservata (`/userarea/`) con profilo **Amministratore**, novembre 2026.
> Nessun dato è stato modificato. In questo documento non sono riportati dati personali di clienti, utenti o agenti.

## 1. Cos'è ForGroups oggi

Marketplace B2B2C che mette in contatto **chi organizza gruppi** con **ristoranti e location** che hanno offerte dedicate ai gruppi.

| Lato domanda (organizzatori) | Lato offerta |
|---|---|
| Tour Operator, Aziende, Guide turistiche, Scuole, Università, Parrocchie, Associazioni, Wedding planner, Organizzatori di eventi, clienti privati | Ristoranti / location |

Modello di ricavo: **provvigione** sulle prenotazioni, fatturata mensilmente al ristorante ("NS Spettanze <mese>"), con fattura elettronica XML. Una rete di **agenti commerciali** riceve commissioni sul fatturato dei locali che gestisce.

### Numeri (al 09/11/2026)

| Voce | Valore |
|---|---|
| Attività registrate | 1.075 (di cui 432 ristoranti) |
| Prenotazioni totali | 9.967 |
| Valore prenotato | ≈ € 6,2 milioni |
| Coperti totali | ≈ 304.000 |
| Clienti in rubrica | 4.745 |
| Richieste informazioni | 344 |
| Agenti attivi | 6 |
| Concentrazione | Roma domina: i primi 11 ristoranti per fatturato sono quasi tutti romani |

## 2. Sito pubblico (www.forgroups.it)

- Ricerca per **servizio** (Pranzo, Cena, Aperitivo, Cooking class…) e per **città** (Roma, Firenze, Milano, Napoli, Venezia, Sorrento, Assisi…).
- Pagina SEO per ogni ristorante (`/r/ristoranti-per-gruppi-<citta>/<nome>.php`): descrizione, orari, servizi, pagamenti, elenco menu, mappa, ristoranti vicini.
- Azioni: **Richiedi info**, **Richiedi una prenotazione**, **Contattaci**.
- I prezzi dei menu sono visibili solo dopo il login ("Scopri l'offerta a te riservata").
- Registrazione divisa per profilo (Tour Operator, Azienda, Guida, Scuola, Università, Parrocchia, Associazione, Ristoratore).

## 3. Mappa del pannello di amministrazione

### 3.1 Struttura generale
- Header con nome utente, **campanella notifiche** (contatore) e logout.
- Menu laterale: Elenco Attività (Ristoranti / Tour Operator) · Prenotazioni · Provvigioni · Fatture · Comm.ni Agenti · Richieste · Utenti · Rubrica · Statistiche · Configurazioni · Assistenza.
- Home = elenco attività.

### 3.2 Attività (`attivita-lista.php`)
- Filtri: Tipo (11 tipologie), Stato (Attivo / Attesa / Non attivo), Città, Nome. Paginazione da 10 righe.
- Colonne: data iscrizione, nome, città, tipo, stato; icone per **Contratto** e **Scheda**.
- **Scheda Attività** (`attivita.php`), con molte form separate, ognuna con il proprio "Salva":
  - Stato e tipo attività
  - Indirizzo (provincia da menu a tendina)
  - Contatti
  - Link: permalink + pagina città
  - Dati di fatturazione, PEC, codice univoco, IBAN/SWIFT
  - Categorie (cucina, target) + categoria principale
  - Descrizione IT/EN, Orari IT/EN, Servizi IT/EN, Pagamenti IT/EN (testo libero)
  - Elimina attività
- **Contratto** (`attivita-contratto.php`): data stipula, agente assegnato, note.
- Schede aggiuntive per i ristoranti:
  - **Gallery**: immagine principale, galleria foto, video.
  - **Sale**: nome, descrizione, numero coperti.
  - **Servizi**: tipo servizio (Pranzo/Cena/…), sala, validità dal/al, ora inizio/fine, "prenotabile fino alle ore", durata pasto. Questo è di fatto il **calendario di disponibilità**.
  - **Menu**: nome, descrizione, prezzo p.p., coperti min/max, **coperti per omaggio** (gratuità capogruppo), posizione, prenotabile sì/no, servizi associati.
  - **Carta Menu**: piatti per categoria (Antipasto, Primo, Secondo, Contorno, Dessert, Bevande) da cui si compongono i menu personalizzati; ogni categoria ha anche i "Servizi Extra".

### 3.3 Prenotazioni (`prenotazioni.php`)
- Filtri: ristorante, cliente/operatore, intervallo date, stato (Confermate / In attesa / Non confermate).
- Totali in testa: numero prenotazioni, valore totale, coperti totali.
- Riga: data, ora, ristorante + città, cliente + operatore, coperti, importo (e p.p.), stato, metodo di pagamento, stato pagamento (Pagata / NonPagata); azioni **Voucher PDF** e **Dettaglio**.
- Esportazione XLS.
- **Nuova prenotazione**: prima scelta tra *Agenzia/Azienda* e *Cliente non registrato*, poi procedura guidata.
- **Dettaglio prenotazione**: numero e data, **log modifiche**, stato (modificabile), data, ora, tipo gruppo, provenienza, attività, sala, coperti, pagamento (metodo, scadenza, stato), prezzi (menu, extra menu, servizi extra, totale p.p.), dati cliente, riferimenti gruppo (nome, referente, telefono), **composizione menu** (obbligatoria per confermare), servizi extra, note, importo totale, download voucher.

### 3.4 Provvigioni (`provvigioni.php`)
- Filtri: attività, mese. Esportazione XLS.
- Una provvigione per prenotazione (data, importo), modificabile via popup e collegata a prenotazione e fattura.
- Inserimento manuale con "Nuova Provvigione".

### 3.5 Fatture (`fatture.php`)
- Filtri: attività, mese, stato (Emesse / Accettate / Pagate / Rifiutate). Esportazione XLS.
- Generazione automatica mensile (es. creata il 4 del mese alle 05:00) con oggetto "NS Spettanze <mese>".
- Dettaglio: dati di fatturazione del ristorante, imponibile, IVA 22%, righe = provvigioni per prenotazione.
- Download **PDF** e **XML** (fattura elettronica SdI); creazione manuale; modifica / eliminazione.

### 3.6 Commissioni agenti (`commissioni-agenti.php`, `fatturato-agenti.php`)
- Rendiconto mensile per agente: fatturato, importo commissione, pagato SÌ/NO, note.
- Vista "Fatturato Agenti" per mese.

### 3.7 Richieste (`richieste.php`)
- Richieste informazioni / contatto dal sito pubblico: data, oggetto, tipo, cliente, stato (Aperta/Chiusa).
- Dettaglio: attività, **referer** (pagina di provenienza), cliente, email, telefono, lingua, testo.
- "Rispondi": la risposta chiude la richiesta.

### 3.8 Utenti (`utenti.php`)
- Tipologie: Amministratore, Operatore (TourOperator), Ristoratore, Agente.
- Scheda: stato, tipo utente, tipo attività, lingua (IT/EN), anagrafica, password.
- **Invita utente** + elenco **utenti invitati**.

### 3.9 Rubrica (`rubrica.php`)
- 4.745 clienti finali: nome, azienda, cellulare, email. Ricerca per nome/cellulare ed email.

### 3.10 Statistiche (`statistiche.php`)
- Classifiche di fatturato per: Ristoranti, Tour Operator, Operatori, Città, Agenti, Clienti, con filtro per intervallo date.

### 3.11 Configurazioni (`configurazioni.php`)
- Categorie attività (cucine e target)
- Città attività
- Tipologie gruppi (≈36: Adulti, Studenti, Pellegrini, Crocieristi, Matrimonio, Aziendale…)
- Tipologie servizi (≈17: Colazione, Pranzo, Cena, Cooking class, Tour guidato…)
- Metodi di pagamento (≈13: anticipato, sul posto, acconti di vario tipo, 30 gg data fattura…)
- Amministratori
- Agenti (con invito)

### 3.12 Assistenza (`assistenza.php`)
- Ticket aperti dagli utenti, con tipologia (Amministrazione, Prenotazione, Provvigioni, Fatture), attività, stato, conversazione con risposte.

### 3.13 Notifiche (`notifiche.php`)
- Flusso cronologico: "Prenotazione modificata", "Controlla pagamento prenotazione" (promemoria automatico giornaliero alle 12:00), con il comando "Segna tutte come lette".

## 4. Criticità rilevate (UX e dati)

1. **Menu a tendina con oltre 1.000 voci** (attività, clienti) in quasi tutti i filtri: lenti e inutilizzabili senza ricerca.
2. **Paginazione da 10 o 20 righe** su archivi molto grandi (108 pagine di attività, 499 di prenotazioni).
3. **Scheda attività frammentata** in tante form, ognuna con il proprio "Salva": è facile perdere modifiche.
4. **Contenuti IT/EN in testo libero** (orari, servizi, pagamenti) invece che dati strutturati: niente filtri, niente traduzioni automatiche, incoerenze.
5. **Notifiche rumorose**: ogni modifica genera una notifica, senza priorità né raggruppamento per prenotazione.
6. **Pagamenti verificati a mano** ("Controlla pagamento"), senza incasso online né riconciliazione.
7. **Provvigioni e commissioni agenti** gestite a mano (inserimento, "pagato SÌ/NO").
8. **Dati sporchi**: attività con tipo "invalid", duplicati (stesso locale registrato due volte con maiuscole diverse), città scritte in modi diversi ("Roma", "ROMA", "Rome").
9. **Richieste info** gestite come email isolate: nessuna pipeline commerciale (richiesta → preventivo → prenotazione) e nessun tracciamento della conversione.
10. **Statistiche** limitate a classifiche di fatturato: mancano trend, stagionalità, conversione, cancellazioni, tempi di risposta dei ristoranti.
11. **Nessuna vista calendario o capacità**: disponibilità e occupazione delle sale non si vedono a colpo d'occhio.
12. **Interfaccia desktop-only**, poco adatta a chi lavora da telefono (ristoratori, agenti sul campo).

## 5. Entità di dominio (base per il nuovo modello dati)

`Attività` (Ristorante | Organizzatore) → `Sala` → `Servizio` (fascia oraria + validità) → `Menu` (prezzo, min/max coperti, gratuità) → `CartaMenu` (categorie, piatti) ·
`Prenotazione` (attività, sala, servizio, menu composto, extra, coperti, tipo gruppo, pagamento, stato, log) ·
`Cliente` / `Utente` (ruoli: admin, operatore, ristoratore, agente) · `Contratto` (attività ↔ agente) ·
`Provvigione` (per prenotazione) → `Fattura` (mensile, XML SdI) · `CommissioneAgente` (rendiconto mensile) ·
`Richiesta` (lead dal sito) · `Ticket` (assistenza) · `Notifica` ·
Configurazioni: categorie, città, tipologie gruppo, tipologie servizio, metodi di pagamento.
