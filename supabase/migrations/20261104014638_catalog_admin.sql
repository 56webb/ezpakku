-- Catalog admin: items, affiliates, bag presets, rules, safety tags, version.
-- App users read active rows. Writes require users.is_admin.

alter table public.users
  add column if not exists is_admin boolean not null default false;

create table if not exists public.affiliates (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  label text not null,
  url text not null,
  platform text not null default '',
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.items
  add column if not exists template_key text,
  add column if not exists default_bag text not null default 'main'
    check (default_bag in ('personal', 'main')),
  add column if not exists qty_spec jsonb not null default '1'::jsonb,
  add column if not exists tags text[] not null default '{}',
  add column if not exists note text not null default '',
  add column if not exists sort_order integer not null default 0,
  add column if not exists affiliate_id uuid references public.affiliates (id) on delete set null;

create unique index if not exists items_template_key_uidx
  on public.items (template_key)
  where template_key is not null;

create table if not exists public.item_rules (
  item_id uuid primary key references public.items (id) on delete cascade,
  international boolean,
  climates text[] not null default '{}',
  travel_types text[] not null default '{}',
  luggage text[] not null default '{}',
  needs_adapter boolean,
  high_voltage boolean,
  min_days integer
);

create table if not exists public.safety_tags (
  id text primary key,
  label text not null,
  title text not null,
  detail text not null,
  forbid_checked boolean not null default false,
  international_only boolean not null default false,
  sources jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.bag_presets (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  summary text not null default '',
  luggage_plan text check (luggage_plan is null or luggage_plan in ('carryon7', 'checked')),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bag_preset_bags (
  id uuid primary key default gen_random_uuid(),
  preset_id uuid not null references public.bag_presets (id) on delete cascade,
  name text not null,
  type public.bag_type not null,
  color text not null default '#111111',
  kind text not null check (kind in ('personal', 'carryon', 'checked', 'other')),
  sort_order integer not null default 0
);

create table if not exists public.bag_preset_items (
  preset_id uuid not null references public.bag_presets (id) on delete cascade,
  item_id uuid not null references public.items (id) on delete cascade,
  bag_sort_order integer not null default 0,
  sort_order integer not null default 0,
  primary key (preset_id, item_id, bag_sort_order)
);

create table if not exists public.catalog_meta (
  id integer primary key default 1 check (id = 1),
  version integer not null default 1,
  published_at timestamptz,
  notes text not null default ''
);

insert into public.catalog_meta (id, version, notes)
values (1, 1, 'initial catalog admin schema')
on conflict (id) do nothing;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select is_admin from public.users where id = auth.uid()),
    false
  );
$$;

revoke all on function private.is_admin() from public, anon, authenticated;
grant execute on function private.is_admin() to authenticated;

alter table public.affiliates enable row level security;
alter table public.item_rules enable row level security;
alter table public.safety_tags enable row level security;
alter table public.bag_presets enable row level security;
alter table public.bag_preset_bags enable row level security;
alter table public.bag_preset_items enable row level security;
alter table public.catalog_meta enable row level security;

-- Reads: any signed-in user can see active catalog.
create policy affiliates_select on public.affiliates
for select to authenticated
using (is_active = true or private.is_admin());

create policy affiliates_admin_write on public.affiliates
for all to authenticated
using (private.is_admin())
with check (private.is_admin());

create policy item_rules_select on public.item_rules
for select to authenticated
using (true);

create policy item_rules_admin_write on public.item_rules
for all to authenticated
using (private.is_admin())
with check (private.is_admin());

create policy safety_tags_select on public.safety_tags
for select to authenticated
using (true);

create policy safety_tags_admin_write on public.safety_tags
for all to authenticated
using (private.is_admin())
with check (private.is_admin());

create policy bag_presets_select on public.bag_presets
for select to authenticated
using (is_active = true or private.is_admin());

create policy bag_presets_admin_write on public.bag_presets
for all to authenticated
using (private.is_admin())
with check (private.is_admin());

create policy bag_preset_bags_select on public.bag_preset_bags
for select to authenticated
using (
  exists (
    select 1 from public.bag_presets as preset
    where preset.id = bag_preset_bags.preset_id
      and (preset.is_active = true or private.is_admin())
  )
);

create policy bag_preset_bags_admin_write on public.bag_preset_bags
for all to authenticated
using (private.is_admin())
with check (private.is_admin());

create policy bag_preset_items_select on public.bag_preset_items
for select to authenticated
using (
  exists (
    select 1 from public.bag_presets as preset
    where preset.id = bag_preset_items.preset_id
      and (preset.is_active = true or private.is_admin())
  )
);

create policy bag_preset_items_admin_write on public.bag_preset_items
for all to authenticated
using (private.is_admin())
with check (private.is_admin());

create policy catalog_meta_select on public.catalog_meta
for select to authenticated
using (true);

create policy catalog_meta_admin_write on public.catalog_meta
for all to authenticated
using (private.is_admin())
with check (private.is_admin());

-- Existing items: allow admin update/insert beyond the old select-only policy.
drop policy if exists items_admin_write on public.items;
create policy items_admin_write on public.items
for all to authenticated
using (private.is_admin())
with check (private.is_admin());

drop policy if exists categories_admin_write on public.categories;
create policy categories_admin_write on public.categories
for all to authenticated
using (private.is_admin())
with check (private.is_admin());

grant select on table public.affiliates to authenticated;
grant select, insert, update, delete on table public.affiliates to authenticated;
grant select on table public.item_rules to authenticated;
grant select, insert, update, delete on table public.item_rules to authenticated;
grant select on table public.safety_tags to authenticated;
grant select, insert, update, delete on table public.safety_tags to authenticated;
grant select on table public.bag_presets to authenticated;
grant select, insert, update, delete on table public.bag_presets to authenticated;
grant select on table public.bag_preset_bags to authenticated;
grant select, insert, update, delete on table public.bag_preset_bags to authenticated;
grant select on table public.bag_preset_items to authenticated;
grant select, insert, update, delete on table public.bag_preset_items to authenticated;
grant select on table public.catalog_meta to authenticated;
grant select, insert, update, delete on table public.catalog_meta to authenticated;

-- items previously only had select; admins need write
grant insert, update, delete on table public.items to authenticated;
grant insert, update, delete on table public.categories to authenticated;
