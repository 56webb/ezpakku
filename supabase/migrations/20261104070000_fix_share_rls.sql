-- Fix share RLS bugs (H1–H3 from architecture review).
-- H1: ambiguous share_id in set_share_permission when clearing members on read_only.
-- H2: read-only openers never joined share_members; SELECT only allowed can_edit.
-- H3: editable members could UPDATE journeys.user_id / mode via broad column grants.

-- --- H2: can_view (owner or any share member) ---
create or replace function private.can_view(target_journey uuid)
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
        and member.user_id = auth.uid()
    )
  );
$$;

revoke all on function private.can_view(uuid) from public, anon, authenticated;
grant execute on function private.can_view(uuid) to authenticated;

-- open_share: always record the opener as a member (read_only or editable).
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

  if share_row.created_by <> uid then
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

-- --- H1: rename PL/pgSQL variable to avoid ambiguous share_id ---
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
  v_share_id uuid;
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

  select id, share_token into v_share_id, token
  from public.shares
  where journey_id = p_journey_id;

  if v_share_id is null then
    token := replace(gen_random_uuid()::text, '-', '');
    insert into public.shares (journey_id, share_token, permission, created_by)
    values (p_journey_id, token, p_permission, uid)
    returning id into v_share_id;
  else
    update public.shares
    set permission = p_permission
    where id = v_share_id;
    if p_permission = 'read_only' then
      delete from public.share_members
      where public.share_members.share_id = v_share_id;
    end if;
  end if;

  return token;
end;
$$;

-- --- Policies: SELECT via can_view; writes via can_edit ---
drop policy if exists journeys_access on public.journeys;
create policy journeys_select on public.journeys
for select to authenticated
using (private.can_view(id));

drop policy if exists bags_access on public.bags;
create policy bags_select on public.bags
for select to authenticated
using (private.can_view(journey_id));
create policy bags_insert on public.bags
for insert to authenticated
with check (private.can_edit(journey_id));
create policy bags_update on public.bags
for update to authenticated
using (private.can_edit(journey_id))
with check (private.can_edit(journey_id));
create policy bags_delete on public.bags
for delete to authenticated
using (private.can_edit(journey_id));

drop policy if exists journey_categories_access on public.journey_categories;
create policy journey_categories_select on public.journey_categories
for select to authenticated
using (private.can_view(journey_id));
create policy journey_categories_insert on public.journey_categories
for insert to authenticated
with check (private.can_edit(journey_id));
create policy journey_categories_update on public.journey_categories
for update to authenticated
using (private.can_edit(journey_id))
with check (private.can_edit(journey_id));
create policy journey_categories_delete on public.journey_categories
for delete to authenticated
using (private.can_edit(journey_id));

drop policy if exists journey_items_access on public.journey_items;
create policy journey_items_select on public.journey_items
for select to authenticated
using (private.can_view(journey_id));
create policy journey_items_insert on public.journey_items
for insert to authenticated
with check (private.can_edit(journey_id));
create policy journey_items_update on public.journey_items
for update to authenticated
using (private.can_edit(journey_id))
with check (private.can_edit(journey_id));
create policy journey_items_delete on public.journey_items
for delete to authenticated
using (private.can_edit(journey_id));

-- --- H3: column-level UPDATE + block ownership / mode changes ---
revoke update on table public.journeys from authenticated;
grant update (name, location, purpose, days, start_date, end_date) on table public.journeys to authenticated;

create or replace function private.protect_journey_identity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.user_id is distinct from old.user_id then
    raise exception 'cannot transfer journey ownership';
  end if;
  if new.mode is distinct from old.mode then
    raise exception 'cannot change list mode';
  end if;
  if new.id is distinct from old.id then
    raise exception 'cannot change journey id';
  end if;
  return new;
end;
$$;

drop trigger if exists journeys_protect_identity on public.journeys;
create trigger journeys_protect_identity
before update on public.journeys
for each row execute function private.protect_journey_identity();

revoke all on function private.protect_journey_identity() from public, anon, authenticated;
