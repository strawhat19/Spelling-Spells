begin;

create function app_private.get_account_sign_in_methods(p_account_ids text[], p_expected_auth_uid uuid)
returns table (account_id text, providers text[])
language plpgsql stable security definer set search_path = ''
as $$
begin
  if auth.uid() is null or p_expected_auth_uid is distinct from auth.uid() or not app_private.is_owner() then
    raise exception 'Sign-in methods require the active verified Owner.' using errcode = '42501';
  end if;
  if p_account_ids is null or coalesce(array_ndims(p_account_ids), 1) <> 1 or cardinality(p_account_ids) > 50 then
    raise exception 'Request at most 50 distinct existing account IDs.' using errcode = '22023';
  end if;
  if exists (select 1 from unnest(p_account_ids) requested(id) where requested.id is null or char_length(requested.id) not between 1 and 200)
    or (select count(distinct requested.id) from unnest(p_account_ids) requested(id)) <> cardinality(p_account_ids)
    or (select count(*) from public.accounts a where a.id = any(p_account_ids)) <> cardinality(p_account_ids) then
    raise exception 'Request at most 50 distinct existing account IDs.' using errcode = '22023';
  end if;
  return query
    select a.id, coalesce(array_agg(distinct i.provider order by i.provider) filter (where i.provider is not null), array[]::text[])
    from public.accounts a
    join auth.users u on u.id = a.auth_uid
    left join auth.identities i on i.user_id = u.id
      and i.provider ~ '^[a-z][a-z0-9:_-]{0,63}$'
      and (i.provider <> 'email' or nullif(u.encrypted_password, '') is not null)
    where a.id = any(p_account_ids)
    group by a.id, a.number
    order by a.number desc;
end;
$$;

create function public.get_account_sign_in_methods(p_account_ids text[], p_expected_auth_uid uuid)
returns table (account_id text, providers text[])
language sql stable security invoker set search_path = ''
as $$ select * from app_private.get_account_sign_in_methods(p_account_ids, p_expected_auth_uid); $$;

revoke all on function app_private.get_account_sign_in_methods(text[], uuid) from public, anon, authenticated;
revoke all on function public.get_account_sign_in_methods(text[], uuid) from public, anon, authenticated;
grant execute on function app_private.get_account_sign_in_methods(text[], uuid) to authenticated;
grant execute on function public.get_account_sign_in_methods(text[], uuid) to authenticated;

comment on function public.get_account_sign_in_methods(text[], uuid) is 'Owner-only bounded linked sign-in methods. Email requires a configured password; no credentials, identity metadata or session data are returned.';
commit;
