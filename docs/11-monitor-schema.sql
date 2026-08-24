-- ============================================================
-- Esquema para el panel de salud multi-proyecto
-- Proyecto Supabase: jqzdtbxsehjyyyxukyaj (el mismo que ya tiene
-- la tabla "clients" — este esquema asume que es tu base central
-- de agencia, no la de un cliente individual)
-- ============================================================

-- Proyectos que administrás (uno por cliente/sitio)
create table if not exists public.monitored_projects (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,           -- 'joyeria-alianzas'
  name text not null,                  -- 'Joyería Alianzas'
  client_id uuid references public.clients(id),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Los checks configurados por proyecto. Agregar un check nuevo
-- (o un proyecto nuevo) es un INSERT, no requiere tocar el
-- workflow de n8n ni el schema.
create table if not exists public.project_checks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.monitored_projects(id) on delete cascade,
  check_name text not null,            -- 'Supabase', 'Agente Alma', 'Sitio Web'
  url text not null,                   -- endpoint a pingear (puede tener info sensible: no se expone al dashboard)
  method text not null default 'GET',
  expected_status int not null default 200,
  timeout_ms int not null default 8000,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Historial de resultados. n8n inserta una fila por check en
-- cada corrida (cada 15-30 min según lo que configures en el Schedule Trigger).
create table if not exists public.health_checks (
  id uuid primary key default gen_random_uuid(),
  project_check_id uuid not null references public.project_checks(id) on delete cascade,
  status text not null check (status in ('ok', 'fail')),
  http_status int,
  latency_ms int,
  detail text,
  checked_at timestamptz not null default now()
);

create index if not exists idx_health_checks_project_check_checked_at
  on public.health_checks (project_check_id, checked_at desc);

-- Alertas abiertas. n8n crea una cuando un check pasa de ok a fail
-- y no hay ya una alerta sin resolver para ese check (evita duplicar
-- la alerta en cada corrida mientras el problema sigue activo).
create table if not exists public.health_alerts (
  id uuid primary key default gen_random_uuid(),
  project_check_id uuid not null references public.project_checks(id) on delete cascade,
  status text not null default 'fail',
  message text,
  resolved boolean not null default false,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists idx_health_alerts_unresolved
  on public.health_alerts (project_check_id) where resolved = false;

-- ============================================================
-- RLS: las tablas base quedan CERRADAS a anon (mismo criterio que
-- ya aplicamos en chat_sessions/chat_messages — n8n escribe y lee
-- con la service_role key, nunca con la publishable).
-- ============================================================

alter table public.monitored_projects enable row level security;
alter table public.project_checks     enable row level security;
alter table public.health_checks      enable row level security;
alter table public.health_alerts      enable row level security;

-- Sin policies para anon/authenticated en ninguna de las 4 tablas:
-- RLS habilitado + cero policies = acceso denegado por defecto.
-- Solo service_role (n8n) puede tocarlas directamente.

-- ============================================================
-- Vistas de solo lectura para el dashboard: exponen lo mínimo
-- necesario (nombre del check, estado, latencia) y NUNCA el
-- campo `url` de project_checks, que puede tener webhooks internos.
-- ============================================================

create or replace view public.dashboard_status as
select
  mp.id as project_id,
  mp.slug,
  mp.name as project_name,
  pc.id as check_id,
  pc.check_name,
  latest.status,
  latest.http_status,
  latest.latency_ms,
  latest.checked_at
from public.monitored_projects mp
join public.project_checks pc on pc.project_id = mp.id and pc.active = true
left join lateral (
  select status, http_status, latency_ms, checked_at
  from public.health_checks
  where project_check_id = pc.id
  order by checked_at desc
  limit 1
) latest on true
where mp.active = true;

create or replace view public.dashboard_alerts as
select
  ha.id,
  mp.slug,
  mp.name as project_name,
  pc.check_name,
  ha.status,
  ha.message,
  ha.created_at
from public.health_alerts ha
join public.project_checks pc on pc.id = ha.project_check_id
join public.monitored_projects mp on mp.id = pc.project_id
where ha.resolved = false
order by ha.created_at desc;

grant select on public.dashboard_status to anon;
grant select on public.dashboard_alerts to anon;

-- ============================================================
-- Seed inicial: Joyería Alianzas con sus 3 checks base.
-- Ajustá las URLs reales antes de correr esto.
-- ============================================================

insert into public.monitored_projects (slug, name)
values ('joyeria-alianzas', 'Joyería Alianzas')
on conflict (slug) do nothing;

insert into public.project_checks (project_id, check_name, url, expected_status)
select id, 'Supabase (Auth health)', 'https://jqzdtbxsehjyyyxukyaj.supabase.co/auth/v1/health', 200
from public.monitored_projects where slug = 'joyeria-alianzas'
on conflict do nothing;

insert into public.project_checks (project_id, check_name, url, expected_status)
select id, 'Sitio Web', 'https://joyeria.a380.com.br/api/health', 200
from public.monitored_projects where slug = 'joyeria-alianzas'
on conflict do nothing;

insert into public.project_checks (project_id, check_name, url, expected_status, method)
select id, 'Agente Alma', 'https://joyeria.a380.com.br/api/chat', 401, 'GET'
from public.monitored_projects where slug = 'joyeria-alianzas'
on conflict do nothing;
-- Nota sobre "Agente Alma": /api/chat requiere POST + cookie de sesión,
-- así que un GET simple da 401 "No autorizado" — eso ya prueba que la ruta
-- está viva y respondiendo (no ENOTFOUND/500). Es un chequeo de "¿el proceso
-- está arriba?", no de "¿el agente responde bien?". Ver nota al final del
-- archivo de n8n sobre cómo subir el nivel del check si querés algo más fino.
