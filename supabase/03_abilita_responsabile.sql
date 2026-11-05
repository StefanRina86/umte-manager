-- PASSAGGIO 4 - attivazione del SOLO account del responsabile.
-- 1. Supabase > Authentication > Users: trova il TUO account (stessa email di RA).
-- 2. Verifica email e copia l'UUID dell'account (NON l'UUID del progetto).
-- 3. Sostituisci INSERISCI_UUID_VERIFICATO con quell'UUID.
-- 4. Esegui lo script nel SQL Editor del progetto Supabase già in uso.
-- 5. La query deve RESTITUIRE ESATTAMENTE UNA RIGA con role=owner e enabled=true.
-- Se non restituisce righe, FERMA LA PROCEDURA: UUID errato.
-- NON pubblicare qui l'UUID, la tua email o una password.
begin;
insert into public.umte_manager_members(user_id,email,name,role,enabled)
select id,
       email,
       coalesce(nullif(raw_user_meta_data->>'full_name',''),email),
       'owner',
       true
from auth.users
where id = 'INSERISCI_UUID_VERIFICATO'::uuid
on conflict(user_id)
do update set
  role = 'owner',
  enabled = true
returning user_id, email, role, enabled;
commit;
