# Backup Supabase -> OneDrive (preparazione, NON ancora attivo)

Questa configurazione è volontariamente nel ramo `setup/onedrive-backup` e ha soltanto il trigger manuale. Non è stata eseguita una copia reale e non è prevista una pianificazione automatica finché non si completa la configurazione e un test di ripristino.

## Perimetro
Il progetto Supabase è condiviso con UMTE Manager, RA e Sezionatori. Il dump CLI di ruoli/schema/dati copre le parti esportabili di Postgres secondo i filtri Supabase; NON garantisce un backup completo di oggetti Storage, Edge Functions, segreti, configurazioni Auth e ogni schema gestito. Per questi componenti predisporre backup separati e test di restore.

## Segreti GitHub Actions da impostare (Settings > Secrets and variables > Actions)
- `SUPABASE_DB_URL`: URL connessione Postgres dal pannello Supabase, preferibilmente **session pooler** (runner GitHub IPv4), password URL-encoded, mai nel repository.
- `RCLONE_CONFIG_B64`: base64 dell'intero file `rclone.conf` configurato LOCALMENTE, con due remote: `onedrive` autenticato a OneDrive autorizzato e `umtecrypt` (type=crypt) che punta a una directory dedicata del remote OneDrive. Il file è segreto anche se base64.
- `RCLONE_CONFIG_PASS`: password della configurazione rclone protetta via `rclone config password`. Conservarla separatamente. La password di cifratura del remote crypt NON deve finire nel repository.

L'accesso alla cartella OneDrive deve essere limitato a persone autorizzate, con MFA e account dedicato. Non usare un account OneDrive aziendale senza le necessarie autorizzazioni.

## Collaudo e attivazione
1. Creare e autorizzare il remote OneDrive con `rclone config` sul proprio PC e aggiungere il remote `crypt` con nome `umtecrypt`.
2. Verificare localmente l'accesso in lettura e scrittura e l'effettiva cifratura dei file nel percorso remoto.
3. Configurare i tre segreti GitHub Actions, senza copiarli in chat.
4. Pubblicare/approvare il workflow in un ramo eseguibile e avviarlo **manualmente**.
5. Verificare che l'archivio si trovi in OneDrive, sia decifrabile solo con `umtecrypt` e che i dump siano recuperabili. Testare il ripristino su database separato, mai sulla produzione.
6. Solo dopo esito positivo, aggiungere `schedule` e le politiche di conservazione. Per le 02:00 locali italiane serve una gestione dell'ora legale; i cron UTC semplici variano con DST.
7. Verificare che alert, permessi e policy di conservazione siano conformi alle regole aziendali.

La procedura GitHub Actions non scrive file SQL nel repository e non carica artefatti GitHub. Ogni fallimento interrompe il job.
