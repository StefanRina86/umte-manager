# UMTE Manager · UM TE1 Gallarate

## Stato verificato al 08/11/2026

- L'applicazione completa v0.12.0 è pubblicata come frontend GitHub Pages (il deploy reale e l'operatività di Supabase devono comunque essere verificati in una sessione autorizzata).
- La gestione dei conflitti è conservativa: salvataggi simultanei su sezioni diverse e su rapportini diversi con ID univoco vengono riconciliati dopo rilettura del server; modifiche allo stesso record rimangono bloccate. Dopo una riconciliazione è obbligatorio aggiornare la pagina.
- Test sintetici: 10 rapportini indipendenti salvati simultaneamente, sovrascrittura dello stesso rapportino bloccata. Test unitari in `tests/save-concurrency.test.cjs`.
- Non è stata certificata una simultaneità reale di 10 utenti, né verificato il ripristino su Supabase live.
- Il codice API sicuro rimane nel pacchetto **privato**, non in questo repository pubblico. Nessun archivio con nominativi o turni deve essere pubblicato.
- Problemi aperti: [#1 conflitti su ulteriori moduli](https://github.com/StefanRina86/umte-manager/issues/1), [#2 sicurezza backend in produzione](https://github.com/StefanRina86/umte-manager/issues/2).

La sezione storica del 05/11/2026 sotto descrive lo stato precedente alla prima pubblicazione; non è più lo stato attuale.


Repository GitHub Pages del gestionale UMTE Manager. Condivide progetto Supabase e account di autenticazione con RA e Sezionatori; conserva tabelle applicative separate.

## Stato aggiornato (08/11/2026)
- L'applicazione completa è pubblicata su GitHub Pages e l'archivio è stato inizializzato dall'utente su Supabase.
- Le modifiche mobili sono pubblicate; non equivalgono ancora a una verifica visiva live su Safari/Chrome con accesso autenticato.
- Concorrenza: retry conservativo delle revisioni, fusione per record **soltanto** per i rapportini e le segnalazioni indipendenti con ID; le altre sezioni bloccano i conflitti.
- La suite di regressione sulla concorrenza contiene 10 casi, eseguiti in ambiente sintetico. Il collaudo multiutente live resta aperto.
- È disponibile una revisione dell'API Edge verificata offline, ma il deploy e la configurazione effettiva del progetto Supabase devono essere verificati prima dell'uso generalizzato.
- L'uso di servizi esterni per dati aziendali richiede l'autorizzazione aziendale.
- **Mai pubblicare** backup JSON, presenze, nominativi, ferie, informazioni personali, token o chiavi amministrative nel repository pubblico.

## GitHub Pages
Settings → Pages → Deploy from a branch → main → /(root).

Indirizzo previsto: https://stefanrina86.github.io/umte-manager/ (solo dopo l'esito riuscito del deploy). L'effettiva disponibilità del sito va verificata dal browser.

## Supabase, aggiornamento database
1. Fare un backup del progetto esistente.
2. Aprire SQL Editor nel progetto che usano già RA e Sezionatori.
3. Eseguire `supabase/02_upgrade_complete.sql`, che estende in modo compatibile la tabella di accesso, attiva i permessi server e crea stato, backup, audit.
4. Gli account non vengono autorizzati automaticamente: individuare l'UUID esatto del responsabile in Authentication → Users.
5. Abilitare esplicitamente l'UUID del responsabile come `owner` tramite SQL, poi distribuire e testare la funzione dedicata.
6. Solo dopo test su Supabase si potrà distribuire il frontend v0.10.6 e importare l'archivio con backup privato.

**Non distribuire il pacchetto privato di baseline su GitHub**, nemmeno nella cartella docs.

La pagina provvisoria attuale usa lo schema di test. Dopo l'upgrade completo del database, il login non sarà utilizzabile finché la nuova interfaccia e la funzione Edge non saranno installate.

## Aggiornamento codice 8 novembre 2026 (backend da completare)

La visualizzazione mobile è già stata aggiornata sul sito con schede giornaliere, filtri adattivi, tabelle scorrevoli e modali adatte agli smartphone. Sono presenti nel repository anche i componenti pronti per:
- mantenimento unico per tutte le abilitazioni Energia `MI.EN.*` dei singoli partecipanti, escludendo `MI.OPC.*`;
- vista personali turni e attività limitata a nucleo/squadra;
- modifica rapportini da parte del compilatore, CUM, Specialisti e amministrativi;
- aggiornamento dei cataloghi di formazione senza duplicare il mantenimento per ogni abilitazione.

**Attenzione: questi tre ultimi punti sono sospesi finché non viene distribuito l'aggiornamento della funzione Supabase `umte-manager-api`.** Il frontend attiva tali funzioni soltanto quando il server restituisce gli appositi flag di capacità. Non aggiornare le scadenze reali prima del collaudo.

Il database attuale non richiede un nuovo import di anagrafiche o turni. Conservare il backup prima di modificare la funzione Edge. Mai pubblicare su GitHub i file di archivio JSON o dati del personale.
