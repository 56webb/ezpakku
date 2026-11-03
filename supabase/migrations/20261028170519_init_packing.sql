-- EZpakku packing lists.
-- The wireframe stores data in the browser. These functions are the contract
-- for cloud sync once a Supabase project is connected.
-- Points and slot_capacity change only inside private.buy_slot.
-- total_travel_days is the sum of days on journeys the account currently owns.

create schema if not exists private;

revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create type public.bag_type as enum (
  'suitcase',
  'backpack',
  'sling',
  'anti_theft',
  'pouch',
  'wallet',
  'custom'
);

create type public.list_mode as enum ('detail', 'template');

create type public.share_permission as enum ('read_only', 'editable');

create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  google_id text unique,
  name text not null default '',
  email text,
  total_travel_days integer not null default 0 check (total_travel_days >= 0),
  points integer not null default 0 check (points >= 0),
  slot_capacity integer not null default 2 check (slot_capacity >= 2)
);

create table public.journeys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  name text not null,
  location text not null,
  days integer not null check (days between 1 and 365),
  purpose text,
  start_date date not null,
  end_date date not null,
  mode public.list_mode not null,
  is_ended boolean not null default false,
  created_at timestamptz not null default now(),
  check (end_date >= start_date)
);

create table public.bags (
  id uuid primary key default gen_random_uuid(),
  journey_id uuid not null references public.journeys (id) on delete cascade,
  name text not null,
  type public.bag_type not null,
  color text not null,
  sort_order integer not null default 0,
  sealed boolean not null default false
);

create table public.categories (
  id uuid primary key,
  name text not null,
  is_system boolean not null default false,
  user_id uuid references public.users (id) on delete cascade,
  sort_order integer not null default 0,
  check (
    (is_system = true and user_id is null)
    or (is_system = false and user_id is not null)
  )
);

create table public.items (
  id uuid primary key,
  category_id uuid not null references public.categories (id),
  name text not null,
  description text,
  affiliate_url text,
  is_active boolean not null default true
);

create table public.journey_categories (
  journey_id uuid not null references public.journeys (id) on delete cascade,
  category_id uuid not null references public.categories (id),
  sort_order integer not null default 0,
  collapse_checked boolean not null default false,
  primary key (journey_id, category_id)
);

create table public.journey_items (
  id uuid primary key default gen_random_uuid(),
  journey_id uuid not null references public.journeys (id) on delete cascade,
  item_id uuid references public.items (id),
  custom_name text,
  category_id uuid references public.categories (id),
  bag_id uuid references public.bags (id),
  is_checked boolean not null default false,
  sort_order integer not null default 0,
  tags text[] not null default '{}',
  note text not null default '',
  check (item_id is not null or custom_name is not null)
);

create table public.shares (
  id uuid primary key default gen_random_uuid(),
  journey_id uuid not null unique references public.journeys (id) on delete cascade,
  share_token text not null unique,
  permission public.share_permission not null,
  created_by uuid not null references public.users (id),
  created_at timestamptz not null default now()
);

create table public.share_members (
  share_id uuid not null references public.shares (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  primary key (share_id, user_id)
);

create index journeys_user_id_idx on public.journeys (user_id);
create index bags_journey_id_idx on public.bags (journey_id);
create index items_category_id_idx on public.items (category_id);
create index journey_items_journey_id_idx on public.journey_items (journey_id);
create index journey_items_bag_id_idx on public.journey_items (bag_id);

alter table public.users enable row level security;
alter table public.journeys enable row level security;
alter table public.bags enable row level security;
alter table public.categories enable row level security;
alter table public.items enable row level security;
alter table public.journey_categories enable row level security;
alter table public.journey_items enable row level security;
alter table public.shares enable row level security;
alter table public.share_members enable row level security;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, name)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      split_part(coalesce(new.email, '旅人'), '@', 1)
    )
  );
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_user();

create or replace function private.touch_journey_ended()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- is_ended is refreshed when the row is written. It does not roll forward
  -- by itself the next morning; the app also compares end_date locally.
  new.is_ended := new.end_date < (timezone('Asia/Taipei', now()))::date;
  return new;
end;
$$;

create trigger journeys_set_ended
before insert or update of start_date, end_date on public.journeys
for each row execute function private.touch_journey_ended();

create or replace function private.sync_travel_days()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  affected uuid;
begin
  if tg_op = 'DELETE' then
    affected := old.user_id;
  else
    affected := new.user_id;
  end if;

  update public.users as account
  set total_travel_days = coalesce((
    select sum(journey.days)::integer
    from public.journeys as journey
    where journey.user_id = affected
  ), 0)
  where account.id = affected;

  if tg_op = 'UPDATE' and old.user_id is distinct from new.user_id then
    update public.users as account
    set total_travel_days = coalesce((
      select sum(journey.days)::integer
      from public.journeys as journey
      where journey.user_id = old.user_id
    ), 0)
    where account.id = old.user_id;
  end if;

  return null;
end;
$$;

create trigger journeys_sync_days
after insert or update of days, user_id or delete on public.journeys
for each row execute function private.sync_travel_days();

create or replace function private.can_edit(target_journey uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null and (
    exists (
      select 1 from public.journeys as journey
      where journey.id = target_journey and journey.user_id = auth.uid()
    )
    or exists (
      select 1
      from public.shares as share
      join public.share_members as member on member.share_id = share.id
      where share.journey_id = target_journey
        and share.permission = 'editable'
        and member.user_id = auth.uid()
    )
  );
$$;

create or replace function private.create_journey(
  p_name text,
  p_location text,
  p_days integer,
  p_purpose text,
  p_start date,
  p_mode public.list_mode,
  p_bags jsonb,
  p_categories jsonb,
  p_items jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  uid uuid := auth.uid();
  capacity integer;
  occupied integer;
  jid uuid;
  bag jsonb;
  cat jsonb;
  item jsonb;
  new_bag uuid;
  bag_map jsonb := '{}'::jsonb;
  bag_id uuid;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;
  if length(trim(coalesce(p_name, ''))) = 0 or length(trim(coalesce(p_location, ''))) = 0 then
    raise exception 'name and location are required';
  end if;
  if p_days is null or p_days < 1 or p_days > 365 then
    raise exception 'invalid days';
  end if;
  if jsonb_typeof(p_bags) <> 'array' or jsonb_array_length(p_bags) < 1 then
    raise exception 'at least one bag';
  end if;

  select slot_capacity
  into capacity
  from public.users
  where id = uid
  for update;

  if capacity is null then
    raise exception 'profile missing';
  end if;

  select count(*)::integer
  into occupied
  from public.journeys
  where user_id = uid;

  if occupied >= capacity then
    raise exception 'no open slot';
  end if;

  insert into public.journeys (user_id, name, location, days, purpose, start_date, end_date, mode)
  values (
    uid,
    trim(p_name),
    trim(p_location),
    p_days,
    nullif(trim(coalesce(p_purpose, '')), ''),
    p_start,
    p_start + (p_days - 1),
    p_mode
  )
  returning id into jid;

  for bag in select value from jsonb_array_elements(p_bags) loop
    insert into public.bags (journey_id, name, type, color, sort_order)
    values (
      jid,
      trim(bag ->> 'name'),
      (bag ->> 'type')::public.bag_type,
      bag ->> 'color',
      coalesce((bag ->> 'sort_order')::integer, 0)
    )
    returning id into new_bag;
    bag_map := bag_map || jsonb_build_object(bag ->> 'key', new_bag::text);
  end loop;

  for cat in select value from jsonb_array_elements(coalesce(p_categories, '[]'::jsonb)) loop
    if coalesce((cat ->> 'is_system')::boolean, false) = false then
      insert into public.categories (id, name, is_system, user_id, sort_order)
      values (
        (cat ->> 'id')::uuid,
        trim(cat ->> 'name'),
        false,
        uid,
        coalesce((cat ->> 'sort_order')::integer, 0)
      )
      on conflict (id) do nothing;
    end if;

    insert into public.journey_categories (journey_id, category_id, sort_order, collapse_checked)
    values (
      jid,
      (cat ->> 'id')::uuid,
      coalesce((cat ->> 'sort_order')::integer, 0),
      coalesce((cat ->> 'collapse_checked')::boolean, false)
    );
  end loop;

  for item in select value from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) loop
    bag_id := (bag_map ->> (item ->> 'bag_key'))::uuid;
    if bag_id is null then
      raise exception 'item is not assigned to a bag';
    end if;
    insert into public.journey_items (
      journey_id, item_id, custom_name, category_id, bag_id, is_checked, sort_order, tags, note
    )
    values (
      jid,
      nullif(item ->> 'item_id', '')::uuid,
      nullif(trim(coalesce(item ->> 'custom_name', '')), ''),
      (item ->> 'category_id')::uuid,
      bag_id,
      false,
      coalesce((item ->> 'sort_order')::integer, 0),
      coalesce(
        array(select jsonb_array_elements_text(coalesce(item -> 'tags', '[]'::jsonb))),
        '{}'::text[]
      ),
      coalesce(item ->> 'note', '')
    );
  end loop;

  return jid;
end;
$$;

create or replace function private.buy_slot()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  capacity integer;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  update public.users
  set
    points = points - 100,
    slot_capacity = slot_capacity + 1
  where id = uid
    and points >= 100
  returning slot_capacity into capacity;

  if capacity is null then
    raise exception 'insufficient points';
  end if;

  return capacity;
end;
$$;

create or replace function private.open_share(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  share_row public.shares%rowtype;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  select * into share_row from public.shares where share_token = p_token;
  if share_row.id is null then
    raise exception 'share not found';
  end if;

  if share_row.permission = 'editable' and share_row.created_by <> uid then
    insert into public.share_members (share_id, user_id)
    values (share_row.id, uid)
    on conflict do nothing;
  end if;

  return jsonb_build_object(
    'journey_id', share_row.journey_id,
    'permission', share_row.permission
  );
end;
$$;

create or replace function private.set_share_permission(
  p_journey_id uuid,
  p_permission public.share_permission
)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  uid uuid := auth.uid();
  token text;
  share_id uuid;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;
  if not exists (
    select 1 from public.journeys
    where id = p_journey_id and user_id = uid
  ) then
    raise exception 'only the owner can share';
  end if;

  select id, share_token into share_id, token
  from public.shares
  where journey_id = p_journey_id;

  if share_id is null then
    token := replace(gen_random_uuid()::text, '-', '');
    insert into public.shares (journey_id, share_token, permission, created_by)
    values (p_journey_id, token, p_permission, uid);
  else
    update public.shares
    set permission = p_permission
    where id = share_id;
    if p_permission = 'read_only' then
      delete from public.share_members where share_id = share_id;
    end if;
  end if;

  return token;
end;
$$;

create or replace function public.create_journey(
  p_name text,
  p_location text,
  p_days integer,
  p_purpose text,
  p_start date,
  p_mode public.list_mode,
  p_bags jsonb,
  p_categories jsonb,
  p_items jsonb
)
returns uuid
language sql
security invoker
set search_path = public
as $$
  select private.create_journey(
    p_name, p_location, p_days, p_purpose, p_start, p_mode, p_bags, p_categories, p_items
  );
$$;

create or replace function public.buy_slot()
returns integer
language sql
security invoker
set search_path = public
as $$
  select private.buy_slot();
$$;

create or replace function public.open_share(p_token text)
returns jsonb
language sql
security invoker
set search_path = public
as $$
  select private.open_share(p_token);
$$;

create or replace function public.set_share_permission(
  p_journey_id uuid,
  p_permission public.share_permission
)
returns text
language sql
security invoker
set search_path = public
as $$
  select private.set_share_permission(p_journey_id, p_permission);
$$;

revoke all on function private.handle_new_user() from public, anon, authenticated;
revoke all on function private.touch_journey_ended() from public, anon, authenticated;
revoke all on function private.sync_travel_days() from public, anon, authenticated;
revoke all on function private.can_edit(uuid) from public, anon, authenticated;
revoke all on function private.create_journey(text, text, integer, text, date, public.list_mode, jsonb, jsonb, jsonb) from public, anon, authenticated;
revoke all on function private.buy_slot() from public, anon, authenticated;
revoke all on function private.open_share(text) from public, anon, authenticated;
revoke all on function private.set_share_permission(uuid, public.share_permission) from public, anon, authenticated;

grant execute on function private.handle_new_user() to supabase_auth_admin;
grant execute on function private.touch_journey_ended() to authenticated;
grant execute on function private.sync_travel_days() to authenticated;
grant execute on function private.can_edit(uuid) to authenticated;
grant execute on function private.create_journey(text, text, integer, text, date, public.list_mode, jsonb, jsonb, jsonb) to authenticated;
grant execute on function private.buy_slot() to authenticated;
grant execute on function private.open_share(text) to authenticated;
grant execute on function private.set_share_permission(uuid, public.share_permission) to authenticated;

revoke all on function public.create_journey(text, text, integer, text, date, public.list_mode, jsonb, jsonb, jsonb) from public, anon;
revoke all on function public.buy_slot() from public, anon;
revoke all on function public.open_share(text) from public, anon;
revoke all on function public.set_share_permission(uuid, public.share_permission) from public, anon;
grant execute on function public.create_journey(text, text, integer, text, date, public.list_mode, jsonb, jsonb, jsonb) to authenticated;
grant execute on function public.buy_slot() to authenticated;
grant execute on function public.open_share(text) to authenticated;
grant execute on function public.set_share_permission(uuid, public.share_permission) to authenticated;

revoke all on table public.users from anon, authenticated;
revoke all on table public.journeys from anon, authenticated;
revoke all on table public.bags from anon, authenticated;
revoke all on table public.categories from anon, authenticated;
revoke all on table public.items from anon, authenticated;
revoke all on table public.journey_categories from anon, authenticated;
revoke all on table public.journey_items from anon, authenticated;
revoke all on table public.shares from anon, authenticated;
revoke all on table public.share_members from anon, authenticated;

grant select on table public.users to authenticated;
grant select, update, delete on table public.journeys to authenticated;
grant select, insert, update, delete on table public.bags to authenticated;
grant select, insert, update, delete on table public.categories to authenticated;
grant select on table public.items to authenticated;
grant select, insert, update, delete on table public.journey_categories to authenticated;
grant select, insert, update, delete on table public.journey_items to authenticated;
grant select on table public.shares to authenticated;
grant select on table public.share_members to authenticated;

create policy users_select_own on public.users
for select to authenticated
using (id = auth.uid());

create policy journeys_access on public.journeys
for select to authenticated
using (private.can_edit(id));

create policy journeys_update on public.journeys
for update to authenticated
using (private.can_edit(id))
with check (private.can_edit(id));

create policy journeys_delete_owner on public.journeys
for delete to authenticated
using (user_id = auth.uid());

create policy bags_access on public.bags
for all to authenticated
using (private.can_edit(journey_id))
with check (private.can_edit(journey_id));

create policy categories_select on public.categories
for select to authenticated
using (is_system = true or user_id = auth.uid());

create policy categories_insert_custom on public.categories
for insert to authenticated
with check (is_system = false and user_id = auth.uid());

create policy categories_update_custom on public.categories
for update to authenticated
using (is_system = false and user_id = auth.uid())
with check (is_system = false and user_id = auth.uid());

create policy categories_delete_custom on public.categories
for delete to authenticated
using (is_system = false and user_id = auth.uid());

create policy items_select_active on public.items
for select to authenticated
using (is_active = true);

create policy journey_categories_access on public.journey_categories
for all to authenticated
using (private.can_edit(journey_id))
with check (private.can_edit(journey_id));

create policy journey_items_access on public.journey_items
for all to authenticated
using (private.can_edit(journey_id))
with check (private.can_edit(journey_id));

create policy shares_select_participant on public.shares
for select to authenticated
using (
  created_by = auth.uid()
  or exists (
    select 1 from public.share_members as member
    where member.share_id = shares.id and member.user_id = auth.uid()
  )
);

create policy share_members_select on public.share_members
for select to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1 from public.shares as share
    where share.id = share_members.share_id and share.created_by = auth.uid()
  )
);

insert into public.categories (id, name, is_system, user_id, sort_order) values
  ('10000000-0000-4000-8000-000000000001', '衣物', true, null, 0),
  ('10000000-0000-4000-8000-000000000002', '盥洗', true, null, 1),
  ('10000000-0000-4000-8000-000000000003', '電子', true, null, 2),
  ('10000000-0000-4000-8000-000000000004', '證件', true, null, 3),
  ('10000000-0000-4000-8000-000000000005', '健康', true, null, 4),
  ('10000000-0000-4000-8000-000000000006', '其他', true, null, 5);

insert into public.items (id, category_id, name, description, affiliate_url) values
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '內褲', '依行程天數自行多帶', null),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', '上衣', '日常替換', null),
  ('20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', '備用上衣', '天數較長時多帶一件', null),
  ('20000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001', '長褲', '至少一條', null),
  ('20000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000001', '襪子', '依天數準備', null),
  ('20000000-0000-4000-8000-000000000006', '10000000-0000-4000-8000-000000000001', '外套', '晚上或冷氣房', null),
  ('20000000-0000-4000-8000-000000000007', '10000000-0000-4000-8000-000000000001', '泳衣', '海邊或泳池', null),
  ('20000000-0000-4000-8000-000000000008', '10000000-0000-4000-8000-000000000001', '保暖衣', '低溫行程', null),
  ('20000000-0000-4000-8000-000000000009', '10000000-0000-4000-8000-000000000001', '正式服裝', '商務場合', null),
  ('20000000-0000-4000-8000-000000000010', '10000000-0000-4000-8000-000000000001', '一套較正式的衣服', '約會或晚餐', null),
  ('20000000-0000-4000-8000-000000000011', '10000000-0000-4000-8000-000000000001', '刷毛外套', '登山或露營', null),
  ('20000000-0000-4000-8000-000000000012', '10000000-0000-4000-8000-000000000001', '手套', '寒冷天氣', null),
  ('20000000-0000-4000-8000-000000000013', '10000000-0000-4000-8000-000000000002', '牙刷', '個人盥洗', null),
  ('20000000-0000-4000-8000-000000000014', '10000000-0000-4000-8000-000000000002', '牙膏', '個人盥洗', null),
  ('20000000-0000-4000-8000-000000000015', '10000000-0000-4000-8000-000000000002', '洗髮精', '三天以上較常用到', null),
  ('20000000-0000-4000-8000-000000000016', '10000000-0000-4000-8000-000000000002', '防曬', '日照強的地方', 'https://example.com/go/sunscreen'),
  ('20000000-0000-4000-8000-000000000017', '10000000-0000-4000-8000-000000000002', '洗面乳', '日常清潔', null),
  ('20000000-0000-4000-8000-000000000018', '10000000-0000-4000-8000-000000000003', '手機充電器', '含傳輸線', 'https://example.com/go/charger'),
  ('20000000-0000-4000-8000-000000000019', '10000000-0000-4000-8000-000000000003', '筆電', '需要工作時', null),
  ('20000000-0000-4000-8000-000000000020', '10000000-0000-4000-8000-000000000003', '頭燈', '露營或夜間步行', null),
  ('20000000-0000-4000-8000-000000000021', '10000000-0000-4000-8000-000000000003', '行動電源', '長時間在外面', 'https://example.com/go/powerbank'),
  ('20000000-0000-4000-8000-000000000022', '10000000-0000-4000-8000-000000000004', '護照', '出國證件，建議另備影本', 'https://example.com/go/passport'),
  ('20000000-0000-4000-8000-000000000023', '10000000-0000-4000-8000-000000000004', '錢包', '現金與卡片', null),
  ('20000000-0000-4000-8000-000000000024', '10000000-0000-4000-8000-000000000005', '常備藥', '止痛、腸胃、過敏', null),
  ('20000000-0000-4000-8000-000000000025', '10000000-0000-4000-8000-000000000005', '個人藥品', '處方或固定服用', null),
  ('20000000-0000-4000-8000-000000000026', '10000000-0000-4000-8000-000000000005', '口罩', '機艙或備用', null),
  ('20000000-0000-4000-8000-000000000027', '10000000-0000-4000-8000-000000000006', '洗衣袋', '五天以上方便送洗', null),
  ('20000000-0000-4000-8000-000000000028', '10000000-0000-4000-8000-000000000006', '拖鞋', '住宿使用', null),
  ('20000000-0000-4000-8000-000000000029', '10000000-0000-4000-8000-000000000006', '雨傘', '突然下雨', null);
