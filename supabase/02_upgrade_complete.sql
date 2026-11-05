-- UMTE Manager v0.10.6 - estensione compatibile con
-- public.umte_manager_members creato durante il passaggio iniziale.
-- Eseguire nel SQL Editor dello STESSO progetto Supabase già in uso.
-- Non modifica alcuna tabella di RA/Sezionatori/MDO e non abilita utenti automaticamente.
-- Prima eseguire il backup del progetto.
begin;
create table if not exists public.umte_manager_members (
 user_id uuid primary key references auth.users(id) on delete cascade,
 email text not null, name text not null, role text not null default 'pending'
 check(role in ('owner','specialist','administrative','chief','preposto','viewer','pending')),
 person_id text, enabled boolean not null default false
);
-- Compatibilità con lo schema minimale del passaggio 2.
alter table public.umte_manager_members
  add column if not exists email text,
  add column if not exists name text,
  add column if not exists person_id text,
  add column if not exists enabled boolean not null default false;
alter table public.umte_manager_members drop constraint if exists umte_manager_members_role_check;
update public.umte_manager_members m
set email=coalesce(nullif(m.email,''),u.email,''),
    name=coalesce(nullif(m.name,''),u.raw_user_meta_data->>'full_name',u.email,'')
from auth.users u where u.id=m.user_id;
-- Nessuno eredita i privilegi del prototipo in automatico.
update public.umte_manager_members
set role='pending',enabled=false
where role not in ('owner','specialist','administrative','chief','preposto','viewer','pending');
update public.umte_manager_members set email=coalesce(email,''),name=coalesce(name,'');
alter table public.umte_manager_members
  alter column role set default 'pending',
  alter column email set not null,
  alter column name set not null;
alter table public.umte_manager_members
  add constraint umte_manager_members_role_check
  check (role in ('owner','specialist','administrative','chief','preposto','viewer','pending'));
create table if not exists public.umte_manager_state (
 id integer primary key check(id=1), revision bigint not null default 1,
 data jsonb not null, baseline jsonb not null, updated_at timestamptz not null default now(),
 updated_by uuid references auth.users(id)
);
create table if not exists public.umte_manager_backups (
 id bigint generated always as identity primary key, revision bigint not null,
 data jsonb not null, created_at timestamptz not null default now()
);
create table if not exists public.umte_manager_audit (
 id bigint generated always as identity primary key, user_id uuid references auth.users(id),
 action text not null, detail jsonb, created_at timestamptz not null default now()
);
alter table public.umte_manager_members enable row level security;
alter table public.umte_manager_state enable row level security;
alter table public.umte_manager_backups enable row level security;
alter table public.umte_manager_audit enable row level security;
revoke all on public.umte_manager_members,public.umte_manager_state,public.umte_manager_backups,public.umte_manager_audit from anon,authenticated;
-- Il precedente accesso diretto di test viene disattivato.
drop policy if exists manager_members_read_self on public.umte_manager_members;
grant all on public.umte_manager_members,public.umte_manager_state,public.umte_manager_backups,public.umte_manager_audit to service_role;
grant usage,select on sequence public.umte_manager_backups_id_seq,public.umte_manager_audit_id_seq to service_role;
create or replace function public.umte_manager_save(p_revision bigint,p_data jsonb,p_user uuid,p_keys jsonb)
returns bigint language plpgsql security definer set search_path=public as $$
declare previous public.umte_manager_state%rowtype;
begin
 select * into previous from public.umte_manager_state where id=1 for update;
 if not found or previous.revision<>p_revision then raise exception 'REVISION_CONFLICT'; end if;
 insert into public.umte_manager_backups(revision,data) values(previous.revision,previous.data);
 update public.umte_manager_state set data=p_data,revision=revision+1,updated_at=now(),updated_by=p_user where id=1;
 insert into public.umte_manager_audit(user_id,action,detail) values(p_user,'state.patch',p_keys);
 return previous.revision+1;
end $$;
revoke all on function public.umte_manager_save(bigint,jsonb,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.umte_manager_save(bigint,jsonb,uuid,jsonb) to service_role;
commit;
-- L'account responsabile va abilitato esplicitamente dopo averne verificato email/UUID.
-- Nessuna modifica alle tabelle umte_profiles, RA, Sezionatori o MDO.
