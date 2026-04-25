create table if not exists goals (
  id uuid primary key,
  title text not null,
  repo_full_name text not null,
  conversion_event text not null,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint goals_status_check
    check (status in ('draft', 'running', 'paused', 'completed', 'killed'))
);

create table if not exists experiments (
  id uuid primary key,
  goal_id uuid references goals(id) on delete cascade,
  name text not null,
  description text,
  repo_full_name text not null,
  conversion_event text not null,
  status text not null default 'draft',
  traffic_weight integer not null default 1,
  winner_variant_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint experiments_status_check
    check (status in ('draft', 'running', 'paused', 'completed', 'killed')),
  constraint experiments_traffic_weight_check
    check (traffic_weight > 0)
);

alter table experiments
  add column if not exists goal_id uuid references goals(id) on delete cascade;

alter table experiments
  add column if not exists traffic_weight integer not null default 1;

alter table experiments
  add column if not exists description text;

create table if not exists experiment_variants (
  id uuid primary key,
  experiment_id uuid not null references experiments(id) on delete cascade,
  name text not null,
  weight integer not null,
  status text not null default 'active',
  branch_name text,
  pull_request_number integer,
  pull_request_url text,
  created_at timestamptz not null default now(),
  constraint experiment_variants_status_check
    check (status in ('active', 'winner', 'loser', 'reverted')),
  constraint experiment_variants_weight_check
    check (weight > 0)
);

alter table experiment_variants
  add column if not exists pull_request_number integer;

alter table experiments
  drop constraint if exists experiments_winner_variant_fk;

alter table experiments
  add constraint experiments_winner_variant_fk
  foreign key (winner_variant_id) references experiment_variants(id);

create table if not exists experiment_events (
  id uuid primary key,
  experiment_id uuid not null references experiments(id) on delete cascade,
  variant_id uuid not null references experiment_variants(id) on delete cascade,
  visitor_id text not null,
  event_name text not null,
  url text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists experiment_events_lookup_idx
  on experiment_events (experiment_id, variant_id, event_name, visitor_id);

create index if not exists experiment_events_created_at_idx
  on experiment_events (created_at);

create table if not exists github_app_installations (
  installation_id bigint primary key,
  account_login text not null,
  target_type text not null,
  setup_action text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
