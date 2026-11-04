-- M3: admin/demo grant points via RPC. M4: bag must belong to same journey.

create or replace function private.grant_points(p_amount integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  next_points integer;
  admin boolean;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;
  if p_amount is null or p_amount < 1 or p_amount > 10000 then
    raise exception 'invalid amount';
  end if;

  select coalesce(is_admin, false) into admin from public.users where id = uid;
  -- 線框期：任何人登入都可領示範點；正式金流上線後改成僅 admin 或付款 webhook。
  if not admin and p_amount > 100 then
    raise exception 'amount too large';
  end if;

  update public.users
  set points = points + p_amount
  where id = uid
  returning points into next_points;

  if next_points is null then
    raise exception 'profile missing';
  end if;
  return next_points;
end;
$$;

create or replace function public.grant_points(p_amount integer)
returns integer
language sql
security invoker
set search_path = public
as $$
  select private.grant_points(p_amount);
$$;

revoke all on function private.grant_points(integer) from public, anon, authenticated;
revoke all on function public.grant_points(integer) from public, anon;
grant execute on function public.grant_points(integer) to authenticated;

-- M4: journey_items.bag_id must point at a bag of the same journey.
create or replace function private.enforce_journey_item_bag()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.bag_id is null then
    return new;
  end if;
  if not exists (
    select 1 from public.bags as bag
    where bag.id = new.bag_id and bag.journey_id = new.journey_id
  ) then
    raise exception 'bag does not belong to journey';
  end if;
  return new;
end;
$$;

drop trigger if exists journey_items_enforce_bag on public.journey_items;
create trigger journey_items_enforce_bag
before insert or update of bag_id, journey_id on public.journey_items
for each row execute function private.enforce_journey_item_bag();

revoke all on function private.enforce_journey_item_bag() from public, anon, authenticated;
