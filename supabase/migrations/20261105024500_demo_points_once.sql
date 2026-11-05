-- Non-admin demo points can only be claimed once.

alter table public.users
  add column if not exists demo_points_claimed boolean not null default false;

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
  claimed boolean;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;
  if p_amount is null or p_amount < 1 or p_amount > 10000 then
    raise exception 'invalid amount';
  end if;

  select coalesce(is_admin, false), coalesce(demo_points_claimed, false)
  into admin, claimed
  from public.users
  where id = uid
  for update;

  if admin is null then
    raise exception 'profile missing';
  end if;

  if not admin then
    if p_amount > 100 then
      raise exception 'amount too large';
    end if;
    if claimed then
      raise exception 'demo points already claimed';
    end if;
  end if;

  update public.users
  set
    points = points + p_amount,
    demo_points_claimed = case when admin then demo_points_claimed else true end
  where id = uid
  returning points into next_points;

  return next_points;
end;
$$;
