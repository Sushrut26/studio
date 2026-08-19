-- Catalog Key Tracker schema.
-- Apply with:  psql "$DATABASE_URL" -f db/001_init.sql
-- Idempotent: safe to re-run.

create table if not exists imports (
  id           bigserial primary key,
  kind         text not null check (kind in ('jira_csv', 'catalog_csv', 'list_csv')),
  filename     text,
  row_count    int  not null default 0,
  ticket_count int  not null default 0,
  key_count    int  not null default 0,
  status       text not null default 'running' check (status in ('running', 'ok', 'error')),
  error        text,
  created_at   timestamptz not null default now()
);

create table if not exists keys (
  id            bigserial primary key,
  key_text      text not null unique,
  key_type      text not null check (key_type in ('catalog', 'app_group', 'unknown')),
  parent_key_id bigint references keys(id) on delete set null,
  org_id        text,
  country       text,
  segment       text,
  tail          text,
  first_seen_at timestamptz not null default now(),
  last_seen_at  timestamptz not null default now()
);

create table if not exists tickets (
  id              bigserial primary key,
  ticket_key      text not null unique,
  summary         text,
  status          text,
  issue_type      text,
  assignee        text,
  reporter        text,
  jira_created_at timestamptz,
  jira_updated_at timestamptz,
  raw             jsonb not null default '{}'::jsonb,
  import_id       bigint references imports(id) on delete set null,
  first_seen_at   timestamptz not null default now(),
  last_seen_at    timestamptz not null default now()
);

create table if not exists ticket_key_occurrences (
  id          bigserial primary key,
  ticket_id   bigint not null references tickets(id) on delete cascade,
  key_id      bigint not null references keys(id)    on delete cascade,
  column_name text not null,
  raw_match   text not null,
  unique (ticket_id, key_id, column_name, raw_match)
);

create table if not exists lists (
  id          bigserial primary key,
  name        text not null unique,
  description text,
  source      text not null default 'manual' check (source in ('manual', 'csv')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists list_items (
  id        bigserial primary key,
  list_id   bigint not null references lists(id) on delete cascade,
  key_id    bigint not null references keys(id)  on delete cascade,
  raw_input text,
  note      text,
  position  int,
  unique (list_id, key_id)
);

create index if not exists idx_occ_key    on ticket_key_occurrences (key_id);
create index if not exists idx_occ_ticket on ticket_key_occurrences (ticket_id);
create index if not exists idx_li_key     on list_items (key_id);
create index if not exists idx_li_list    on list_items (list_id);
create index if not exists idx_keys_parent on keys (parent_key_id);
create index if not exists idx_keys_type   on keys (key_type);
create index if not exists idx_keys_country on keys (country);
-- text_pattern_ops enables index use for prefix search: key_text like 'x%'
create index if not exists idx_keys_prefix on keys (key_text text_pattern_ops);
create index if not exists idx_tickets_created on tickets (jira_created_at desc nulls last);
