-- Bestemmiometro — migrazione 2 (archivi di fine viaggio e suggerimenti).
-- Da eseguire UNA VOLTA nell'SQL Editor di Supabase, se hai già creato la
-- tabella con il primo script. Se parti da zero usa direttamente schema.sql.
--
-- Il vincolo originale accettava solo i quattro tipi di gioco: senza questa
-- modifica gli archivi e i suggerimenti verrebbero rifiutati dal database
-- (l'app continua comunque a funzionare, ma non li sincronizza).

alter table public.bm_records drop constraint if exists bm_records_kind_check;

alter table public.bm_records
  add constraint bm_records_kind_check
  check (kind in ('travelers', 'stages', 'curses', 'quotes', 'archives', 'feedback'));
