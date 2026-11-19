-- 讓 journey_edit_locks 變更能立刻推到訂閱端（踢人／對方離開重搶鎖）
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'journey_edit_locks'
  ) then
    alter publication supabase_realtime add table public.journey_edit_locks;
  end if;
end $$;
