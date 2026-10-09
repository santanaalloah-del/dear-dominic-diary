-- Backwards-compatible atomic update of the photo initiative portion of Diario settings.
-- Never overwrite other app settings in concurrent updates.
create or replace function public.upsert_spontaneous_photo_state(
  p_user_id uuid, p_state jsonb
) returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if p_user_id is null or p_state is null or jsonb_typeof(p_state) <> 'object'
     or octet_length(p_state::text) > 80000 then
    raise exception 'Invalid spontaneous photo state' using errcode='22023';
  end if;
  if (select auth.uid()) is distinct from p_user_id
     and coalesce((select auth.role()), '') <> 'service_role' then
    raise exception 'Not authorized for spontaneous photo state' using errcode='42501';
  end if;
  insert into public.diario_settings(user_id,data)
  values (p_user_id, jsonb_build_object('spontaneous_photo_state',p_state))
  on conflict (user_id)
  do update set
    data = coalesce(public.diario_settings.data,'{}'::jsonb)
           || jsonb_build_object('spontaneous_photo_state',p_state),
    updated_at = now();
end;
$$;
revoke all on function public.upsert_spontaneous_photo_state(uuid,jsonb) from public;
grant execute on function public.upsert_spontaneous_photo_state(uuid,jsonb) to authenticated,service_role;
