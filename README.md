# UMTE Manager · UM TE1 Gallarate

Repository GitHub Pages del gestionale UMTE Manager. Condivide **il progetto Supabase e gli account di autenticazione** con gli applicativi RA e Sezionatori, ma **non deve condividere le rispettive tabelle applicative**.

## Stato reale (05/11/2026)

- ✅ Repository creato e collegato alla configurazione pubblicabile Supabase già utilizzata da RA.
- ✅ Pagina di accesso predisposta per PC e smartphone, senza registrazione libera.
- ✅ Script SQL per autorizzazioni specifiche di UMTE Manager, separate da RA e Sezionatori.
- ⏳ La **versione completa v0.10.6 non è ancora migrata**. La pagina `index.html` attuale serve solo a verificare la pubblicazione e le credenziali, non è il gestionale operativo.
- ⏳ Pubblicazione GitHub Pages e applicazione dello script SQL da completare.

## Pubblicazione (una sola volta)

1. Su GitHub aprire **Settings → Pages** di questo repository.
2. In **Build and deployment** scegliere **Deploy from a branch**.
3. Selezionare branch **main**, directory **/(root)**, poi **Save**.
4. Il sito sarà all'indirizzo `https://stefanrina86.github.io/umte-manager/` (dopo la pubblicazione).
5. Nel progetto Supabase già in uso per RA e Sezionatori, aprire **SQL Editor** ed eseguire `supabase/01_accessi_manager.sql`.
6. Da Supabase **Authentication → Users**, individuare gli UUID degli utenti già esistenti. Abilitare **solo** i soggetti autorizzati nella tabella `public.umte_manager_members`, assegnando ruolo e nucleo. Non inserire gli UUID o gli indirizzi email degli utenti in GitHub.
7. Verificare l'accesso con un account autorizzato e uno non autorizzato. I dati della versione v0.10.6 **non** sono ancora caricati.

## Separazione e sicurezza

- Il file `config.js` contiene solo URL e **chiave publishable** per il client. **Mai** pubblicare la chiave `service_role`, i token amministrativi, le password o i file riservati.
- Un repository pubblico non è un archivio di presenze, ferie, verbali, nominativi, telefoni, abilitazioni o documenti aziendali.
- Prima di distribuire l'app completa servono autorizzazioni RLS a livello di record, storico modifiche, sincronizzazione tra utenti e collaudo PC/mobile.
- Lo script attuale crea **solo l'anagrafica di autorizzazione**. Non è un database completo dei moduli gestionali.
- La versione ChatGPT v0.10.6 e questa infrastruttura sono due applicazioni distinte finché non viene trasferito il codice sorgente completo. Non copiarne automaticamente i dati in repository.

## File

- `index.html`: pagina di accesso/stato migrazione
- `config.js`: configurazione client Supabase (chiave pubblicabile)
- `supabase/01_accessi_manager.sql`: abilitazioni autonome UMTE Manager
- `.nojekyll`: pubblicazione statica GitHub Pages

Prossimo passo tecnico: recuperare l'**export sorgente completo della v0.10.6**, controllare che non incorpori dati riservati e solo allora integrare le funzioni gestionali nel sito.
