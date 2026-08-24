-- Bestemmiometro — tabella unica per la sincronizzazione fra telefoni.
-- Da incollare nell'SQL Editor di Supabase e premere "Run".

create table if not exists public.bm_records (
  id          text primary key,
  trip_id     text        not null,
  kind        text        not null check (kind in ('travelers', 'stages', 'curses', 'quotes', 'archives', 'feedback')),
  data        jsonb       not null default '{}'::jsonb,
  updated_at  bigint      not null default 0,
  deleted     boolean     not null default false,
  synced_at   timestamptz not null default now()
);

create index if not exists bm_records_trip_idx on public.bm_records (trip_id, kind);

alter table public.bm_records enable row level security;

-- Attenzione: chiunque abbia il link d'invito (URL + chiave anon) può leggere e
-- scrivere i record del viaggio. Per un gioco fra amici va bene; non metterci
-- dentro nulla di riservato.
drop policy if exists "bestemmiometro lettura" on public.bm_records;
create policy "bestemmiometro lettura"
  on public.bm_records for select
  to anon, authenticated
  using (true);

drop policy if exists "bestemmiometro inserimento" on public.bm_records;
create policy "bestemmiometro inserimento"
  on public.bm_records for insert
  to anon, authenticated
  with check (true);

drop policy if exists "bestemmiometro aggiornamento" on public.bm_records;
create policy "bestemmiometro aggiornamento"
  on public.bm_records for update
  to anon, authenticated
  using (true)
  with check (true);

grant select, insert, update on public.bm_records to anon, authenticated;
