-- UMTE Manager: solo anagrafica abilitazioni, separata da RA e Sezionatori.
-- Da eseguire una volta nel SQL Editor del progetto Supabase UMTE già esistente.
-- NON inserire qui password, chiavi amministrative o dati del personale in repository pubblico.
create table if not exists public.umte_manager_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('cum', 'specialista', 'ct', 'amministrativo')),
  nucleo text check (nucleo is null or nucleo in ('Gallarate', 'Arona', 'Domodossola', 'Laveno')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.umte_manager_members enable row level security;
revoke all on public.umte_manager_members from anon;
grant select on public.umte_manager_members to authenticated;
drop policy if exists "manager_members_read_self" on public.umte_manager_members;
create policy "manager_members_read_self"
  on public.umte_manager_members for select to authenticated
  using ((select auth.uid()) = user_id);
-- Nessuna policy INSERT/UPDATE/DELETE lato client: solo amministratore Supabase.
-- Esempio di inserimento da SQL Editor (NON eseguire senza conoscere lo user_id):
-- insert into public.umte_manager_members(user_id, role, nucleo)
-- values ('UUID_UTENTE_AUTENTICATO'::uuid, 'cum', 'Gallarate')
-- on conflict (user_id) do update set role=excluded.role, nucleo=excluded.nucleo, active=true;
--
-- ATTENZIONE: questa tabella abilita solo l'accesso iniziale.
-- Lo schema dei dati di turni/presenze/verbali va definito dopo aver recuperato
-- il codice sorgente completo v0.10.6, con RLS specifiche per ciascun modulo.
