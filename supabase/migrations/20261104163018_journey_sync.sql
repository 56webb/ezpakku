-- Journey sync: updated_at, exclusive edit locks, upsert bundle RPC.

alter table public.journeys
  add column if not exists updated_at timestamptz not null default now();

create or replace function private.touch_journey_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists journeys_touch_updated_at on public.journeys;
create trigger journeys_touch_updated_at
before update on public.journeys
for each row execute function private.touch_journey_updated_at();

revoke all on function private.touch_journey_updated_at() from public, anon, authenticated;

-- Exclusive edit lock (kick the latter).
create table if not exists public.journey_edit_locks (
  journey_id uuid primary key references public.journeys (id) on delete cascade,
  holder_user_id uuid not null references public.users (id) on delete cascade,
  holder_session_id text not null,
  heartbeat_at timestamptz not null default now()
);

alter table public.journey_edit_locks enable row level security;

revoke all on table public.journey_edit_locks from anon, authenticated;
grant select on table public.journey_edit_locks to authenticated;

create policy journey_edit_locks_select on public.journey_edit_locks
for select to authenticated
using (private.can_view(journey_id));

create or replace function private.lock_expired(heartbeat timestamptz)
returns boolean
language sql
stable
as $$
  select heartbeat < now() - interval '90 seconds';
$$;

create or replace function private.acquire_edit_lock(
  p_journey_id uuid,
  p_session_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  existing public.journey_edit_locks%rowtype;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;
  if length(trim(coalesce(p_session_id, ''))) = 0 then
    raise exception 'session required';
  end if;
  if not private.can_edit(p_journey_id) then
    raise exception 'cannot edit';
  end if;

  select * into existing from public.journey_edit_locks where journey_id = p_journey_id for update;

  if existing.journey_id is null then
    insert into public.journey_edit_locks (journey_id, holder_user_id, holder_session_id, heartbeat_at)
    values (p_journey_id, uid, p_session_id, now());
    return jsonb_build_object('ok', true, 'held', true);
  end if;

  if existing.holder_user_id = uid and existing.holder_session_id = p_session_id then
    update public.journey_edit_locks
    set heartbeat_at = now()
    where journey_id = p_journey_id;
    return jsonb_build_object('ok', true, 'held', true);
  end if;

  if private.lock_expired(existing.heartbeat_at) then
    update public.journey_edit_locks
    set holder_user_id = uid,
        holder_session_id = p_session_id,
        heartbeat_at = now()
    where journey_id = p_journey_id;
    return jsonb_build_object('ok', true, 'held', true, 'took_over', true);
  end if;

  return jsonb_build_object(
    'ok', false,
    'held', false,
    'holder_user_id', existing.holder_user_id,
    'reason', '其他人正在編輯這份清單'
  );
end;
$$;

create or replace function private.renew_edit_lock(
  p_journey_id uuid,
  p_session_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  existing public.journey_edit_locks%rowtype;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  select * into existing from public.journey_edit_locks where journey_id = p_journey_id for update;
  if existing.journey_id is null
     or existing.holder_user_id <> uid
     or existing.holder_session_id <> p_session_id then
    return jsonb_build_object('ok', false, 'held', false, 'reason', '沒有編輯鎖');
  end if;

  update public.journey_edit_locks
  set heartbeat_at = now()
  where journey_id = p_journey_id;

  return jsonb_build_object('ok', true, 'held', true);
end;
$$;

create or replace function private.release_edit_lock(
  p_journey_id uuid,
  p_session_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  delete from public.journey_edit_locks
  where journey_id = p_journey_id
    and holder_user_id = uid
    and holder_session_id = p_session_id;

  return jsonb_build_object('ok', true);
end;
$$;

-- Replace bags / categories / items for a journey when caller holds the lock.
create or replace function private.upsert_journey_bundle(
  p_journey_id uuid,
  p_session_id text,
  p_base_updated_at timestamptz,
  p_meta jsonb,
  p_bags jsonb,
  p_categories jsonb,
  p_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  current_updated timestamptz;
  lock_row public.journey_edit_locks%rowtype;
  bag jsonb;
  cat jsonb;
  item jsonb;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;
  if not private.can_edit(p_journey_id) then
    raise exception 'cannot edit';
  end if;

  select * into lock_row from public.journey_edit_locks where journey_id = p_journey_id for update;
  if lock_row.journey_id is null
     or lock_row.holder_user_id <> uid
     or lock_row.holder_session_id <> p_session_id
     or private.lock_expired(lock_row.heartbeat_at) then
    raise exception 'edit lock required';
  end if;

  select updated_at into current_updated from public.journeys where id = p_journey_id;
  if current_updated is null then
    raise exception 'journey not found';
  end if;
  if p_base_updated_at is not null and current_updated > p_base_updated_at then
    return jsonb_build_object('ok', false, 'conflict', true, 'updated_at', current_updated);
  end if;

  update public.journeys
  set
    name = coalesce(nullif(trim(p_meta ->> 'name'), ''), name),
    location = coalesce(nullif(trim(p_meta ->> 'location'), ''), location),
    purpose = nullif(trim(coalesce(p_meta ->> 'purpose', '')), ''),
    days = coalesce((p_meta ->> 'days')::integer, days),
    start_date = coalesce((p_meta ->> 'start_date')::date, start_date),
    end_date = coalesce((p_meta ->> 'end_date')::date, end_date)
  where id = p_journey_id;

  delete from public.journey_items where journey_id = p_journey_id;
  delete from public.journey_categories where journey_id = p_journey_id;
  delete from public.bags where journey_id = p_journey_id;

  for bag in select value from jsonb_array_elements(coalesce(p_bags, '[]'::jsonb)) loop
    insert into public.bags (id, journey_id, name, type, color, sort_order, sealed)
    values (
      (bag ->> 'id')::uuid,
      p_journey_id,
      trim(bag ->> 'name'),
      (bag ->> 'type')::public.bag_type,
      bag ->> 'color',
      coalesce((bag ->> 'sort_order')::integer, 0),
      coalesce((bag ->> 'sealed')::boolean, false)
    );
  end loop;

  for cat in select value from jsonb_array_elements(coalesce(p_categories, '[]'::jsonb)) loop
    insert into public.journey_categories (journey_id, category_id, sort_order, collapse_checked)
    values (
      p_journey_id,
      (cat ->> 'category_id')::uuid,
      coalesce((cat ->> 'sort_order')::integer, 0),
      coalesce((cat ->> 'collapse_checked')::boolean, false)
    );
  end loop;

  for item in select value from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) loop
    insert into public.journey_items (
      id, journey_id, item_id, custom_name, category_id, bag_id,
      is_checked, sort_order, tags, note
    )
    values (
      (item ->> 'id')::uuid,
      p_journey_id,
      nullif(item ->> 'item_id', '')::uuid,
      nullif(trim(coalesce(item ->> 'custom_name', '')), ''),
      nullif(item ->> 'category_id', '')::uuid,
      nullif(item ->> 'bag_id', '')::uuid,
      coalesce((item ->> 'is_checked')::boolean, false),
      coalesce((item ->> 'sort_order')::integer, 0),
      coalesce(
        (select array_agg(value) from jsonb_array_elements_text(coalesce(item -> 'tags', '[]'::jsonb))),
        '{}'::text[]
      ),
      coalesce(item ->> 'note', '')
    );
  end loop;

  update public.journey_edit_locks
  set heartbeat_at = now()
  where journey_id = p_journey_id;

  select updated_at into current_updated from public.journeys where id = p_journey_id;
  return jsonb_build_object('ok', true, 'updated_at', current_updated);
end;
$$;

create or replace function public.acquire_edit_lock(p_journey_id uuid, p_session_id text)
returns jsonb
language sql
security invoker
set search_path = public
as $$
  select private.acquire_edit_lock(p_journey_id, p_session_id);
$$;

create or replace function public.renew_edit_lock(p_journey_id uuid, p_session_id text)
returns jsonb
language sql
security invoker
set search_path = public
as $$
  select private.renew_edit_lock(p_journey_id, p_session_id);
$$;

create or replace function public.release_edit_lock(p_journey_id uuid, p_session_id text)
returns jsonb
language sql
security invoker
set search_path = public
as $$
  select private.release_edit_lock(p_journey_id, p_session_id);
$$;

create or replace function public.upsert_journey_bundle(
  p_journey_id uuid,
  p_session_id text,
  p_base_updated_at timestamptz,
  p_meta jsonb,
  p_bags jsonb,
  p_categories jsonb,
  p_items jsonb
)
returns jsonb
language sql
security invoker
set search_path = public
as $$
  select private.upsert_journey_bundle(
    p_journey_id, p_session_id, p_base_updated_at, p_meta, p_bags, p_categories, p_items
  );
$$;

revoke all on function private.lock_expired(timestamptz) from public, anon, authenticated;
revoke all on function private.acquire_edit_lock(uuid, text) from public, anon, authenticated;
revoke all on function private.renew_edit_lock(uuid, text) from public, anon, authenticated;
revoke all on function private.release_edit_lock(uuid, text) from public, anon, authenticated;
revoke all on function private.upsert_journey_bundle(uuid, text, timestamptz, jsonb, jsonb, jsonb, jsonb)
  from public, anon, authenticated;

revoke all on function public.acquire_edit_lock(uuid, text) from public, anon;
revoke all on function public.renew_edit_lock(uuid, text) from public, anon;
revoke all on function public.release_edit_lock(uuid, text) from public, anon;
revoke all on function public.upsert_journey_bundle(uuid, text, timestamptz, jsonb, jsonb, jsonb, jsonb)
  from public, anon;

grant execute on function public.acquire_edit_lock(uuid, text) to authenticated;
grant execute on function public.renew_edit_lock(uuid, text) to authenticated;
grant execute on function public.release_edit_lock(uuid, text) to authenticated;
grant execute on function public.upsert_journey_bundle(uuid, text, timestamptz, jsonb, jsonb, jsonb, jsonb)
  to authenticated;
