create extension if not exists pgcrypto;
create extension if not exists citext;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'integration_status') then
    create type public.integration_status as enum ('pending', 'active', 'error', 'inactive', 'deleted');
  end if;


  if exists (select 1 from pg_type where typname = 'integration_status') then
    begin
      alter type public.integration_status add value if not exists 'deleted';
    exception
      when duplicate_object then null;
    end;
  end if;

  if not exists (select 1 from pg_type where typname = 'integration_security_level') then
    create type public.integration_security_level as enum ('standard', 'high', 'strict');
  end if;
end $$;

create table if not exists public.client_integrations (
  id uuid primary key default gen_random_uuid(),
  company_id text not null default ('empresa_' || substring(replace(gen_random_uuid()::text, '-', '') from 1 for 20)) unique check (company_id ~ '^[A-Za-z0-9_-]{4,40}$'),
  company_name text not null check (length(trim(company_name)) >= 3),
  contact_email citext not null check (contact_email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  product text not null default 'n8n-evolution',
  n8n_endpoint text not null check (left(n8n_endpoint, 8) = 'https://'),
  evolution_endpoint text not null check (left(evolution_endpoint, 8) = 'https://'),
  security_level public.integration_security_level not null default 'strict',
  status public.integration_status not null default 'pending',
  last_sync_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);


alter table public.client_integrations
  drop constraint if exists client_integrations_contact_email_check;

alter table public.client_integrations
  add constraint client_integrations_contact_email_check
  check (contact_email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$');

alter table public.client_integrations
  alter column company_id set default ('empresa_' || substring(replace(gen_random_uuid()::text, '-', '') from 1 for 20));

create table if not exists public.integration_secrets (
  id uuid primary key default gen_random_uuid(),
  client_integration_id uuid not null references public.client_integrations(id) on delete cascade,
  provider text not null check (provider in ('n8n', 'evolution')),
  secret_key text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (client_integration_id, provider)
);

create table if not exists public.integration_sync_jobs (
  id bigint generated always as identity primary key,
  client_integration_id uuid not null references public.client_integrations(id) on delete cascade,
  trigger_source text not null default 'admin',
  status public.integration_status not null default 'pending',
  n8n_http_status int,
  evolution_http_status int,
  response_excerpt text,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create table if not exists public.integration_events (
  id bigint generated always as identity primary key,
  client_integration_id uuid references public.client_integrations(id) on delete set null,
  event_type text not null,
  source text not null,
  payload jsonb not null,
  ip_address inet,
  created_at timestamptz not null default now()
);

create index if not exists idx_client_integrations_company_id on public.client_integrations (company_id);
create index if not exists idx_client_integrations_status on public.client_integrations (status);
create index if not exists idx_client_integrations_created_at on public.client_integrations (created_at desc);
create index if not exists idx_events_client_id_created_at on public.integration_events (client_integration_id, created_at desc);
create index if not exists idx_events_event_type_created_at on public.integration_events (event_type, created_at desc);
create index if not exists idx_sync_jobs_client_id_started_at on public.integration_sync_jobs (client_integration_id, started_at desc);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_client_integrations_updated_at on public.client_integrations;
create trigger trg_client_integrations_updated_at
before update on public.client_integrations
for each row execute function public.set_updated_at();

drop trigger if exists trg_integration_secrets_updated_at on public.integration_secrets;
create trigger trg_integration_secrets_updated_at
before update on public.integration_secrets
for each row execute function public.set_updated_at();

alter table public.client_integrations enable row level security;
alter table public.integration_secrets enable row level security;
alter table public.integration_sync_jobs enable row level security;
alter table public.integration_events enable row level security;

drop policy if exists deny_all_client_integrations on public.client_integrations;
create policy deny_all_client_integrations on public.client_integrations
for all using (false) with check (false);

drop policy if exists deny_all_integration_secrets on public.integration_secrets;
create policy deny_all_integration_secrets on public.integration_secrets
for all using (false) with check (false);

drop policy if exists deny_all_integration_sync_jobs on public.integration_sync_jobs;
create policy deny_all_integration_sync_jobs on public.integration_sync_jobs
for all using (false) with check (false);

drop policy if exists deny_all_integration_events on public.integration_events;
create policy deny_all_integration_events on public.integration_events
for all using (false) with check (false);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'client_account_status') THEN
    CREATE TYPE public.client_account_status AS ENUM ('active', 'blocked');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.client_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id text NOT NULL REFERENCES public.client_integrations(company_id) ON DELETE CASCADE,
  username text NOT NULL CHECK (username ~ '^[a-z0-9._-]{3,40}$'),
  display_name text NOT NULL,
  password_hash text NOT NULL,
  status public.client_account_status NOT NULL DEFAULT 'active',
  last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, username)
);

CREATE INDEX IF NOT EXISTS idx_client_accounts_company ON public.client_accounts (company_id);
CREATE INDEX IF NOT EXISTS idx_client_accounts_status ON public.client_accounts (status);

DROP TRIGGER IF EXISTS trg_client_accounts_updated_at ON public.client_accounts;
CREATE TRIGGER trg_client_accounts_updated_at
BEFORE UPDATE ON public.client_accounts
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.client_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS deny_all_client_accounts ON public.client_accounts;
CREATE POLICY deny_all_client_accounts ON public.client_accounts
FOR ALL USING (false) WITH CHECK (false);
