# UMTE Manager · UM TE1 Gallarate

Repository GitHub Pages del gestionale UMTE Manager. Condivide progetto Supabase e account di autenticazione con RA e Sezionatori; conserva tabelle applicative separate.

## Stato (05/11/2026)
- Il sito contiene **solo la pagina provvisoria di accesso**; NON la versione completa v0.10.6.
- Supabase ha ricevuto la **prima** tabella semplificata `umte_manager_members` tramite `supabase/01_accessi_manager.sql`.
- Per preparare il backend della versione completa eseguire **una sola volta** `supabase/02_upgrade_complete.sql` nel SQL Editor, **dopo un backup**. Questo script è compatibile con la tabella già creata.
- La funzione Edge `umte-manager-api` deve ancora essere distribuita e testata.
- Il pacchetto sorgente completo della v0.10.6 è stato recuperato, ma **non è ancora pubblico**: include riferimenti aziendali e personali da separare prima della pubblicazione.
- Non inserire presenze, nominativi, ferie, contatti o altri dati operativi nel repository pubblico.

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
