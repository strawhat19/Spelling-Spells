-- Prepared source only. Applying this migration and deploying the billing handlers are separate release steps.
begin;
lock table public.pricing_plans, public.feature_settings in share row exclusive mode;

create table app_private.billing_configuration (
  app_id text primary key check (app_id = 'spelling-spells'),
  provider_account_id text not null check (provider_account_id ~ '^acct_[A-Za-z0-9]+$'),
  livemode boolean not null,
  active boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table app_private.billing_configuration enable row level security;
insert into app_private.billing_configuration (app_id, provider_account_id, livemode, active)
values ('spelling-spells', 'acct_1URo3fKwCE6Umy8w', true, true);

create table public.pricing_plan_tiers (
  id text primary key references public.pricing_plans (id) on delete restrict,
  slug text not null unique,
  number bigint not null unique,
  display_order integer not null check (display_order between 0 and 10000)
);
alter table public.pricing_plan_tiers enable row level security;
create policy pricing_plan_tiers_public_read on public.pricing_plan_tiers for select to anon, authenticated using (true);
insert into public.pricing_plan_tiers (id, slug, number, display_order)
select id, slug, number, display_order from public.pricing_plans;

create function app_private.sync_pricing_plan_tier()
returns trigger language plpgsql security definer set search_path = ''
as $$ begin
  if tg_op = 'UPDATE' and (new.id <> old.id or new.slug <> old.slug or new.number <> old.number) then
    raise exception 'Plan Identity Cannot Be Changed' using errcode = '22023';
  end if;
  insert into public.pricing_plan_tiers (id, slug, number, display_order) values (new.id, new.slug, new.number, new.display_order)
  on conflict (id) do update set display_order = excluded.display_order;
  return new;
end; $$;
create trigger pricing_plans_sync_tier after insert or update on public.pricing_plans
for each row execute function app_private.sync_pricing_plan_tier();

create function app_private.owner_archive_pricing_plan(p_id text, p_expected_revision bigint, p_expected_auth_uid uuid)
returns text language plpgsql security definer set search_path = ''
as $$
declare saved public.pricing_plans%rowtype;
begin
  perform app_private.require_catalog_actor(p_expected_auth_uid);
  select * into saved from public.pricing_plans where id = p_id for update;
  if not found then raise exception 'This Plan No Longer Exists' using errcode = 'P0002'; end if;
  if p_expected_revision is null or saved.revision <> p_expected_revision then
    raise exception 'This Plan Changed; Reload Before Archiving' using errcode = '40001';
  end if;
  if saved.active then
    update public.pricing_plans set active = false, revision = revision + 1, updated_at = clock_timestamp() where id = p_id;
  end if;
  return p_id;
end; $$;
create or replace function app_private.owner_delete_pricing_plan(p_id text, p_expected_revision bigint, p_expected_auth_uid uuid)
returns text language sql security invoker set search_path = ''
as $$ select app_private.owner_archive_pricing_plan(p_id, p_expected_revision, p_expected_auth_uid); $$;
create function public.owner_archive_pricing_plan(p_id text, p_expected_revision bigint, p_expected_auth_uid uuid)
returns text language sql security invoker set search_path = ''
as $$ select app_private.owner_archive_pricing_plan(p_id, p_expected_revision, p_expected_auth_uid); $$;

create table public.account_entitlements (
  account_id text primary key references public.accounts (id) on delete restrict,
  state text not null default 'free' check (state in ('free', 'paid', 'pending', 'unavailable')),
  plan_slug text references public.pricing_plan_tiers (slug) on delete restrict,
  valid_from timestamptz,
  valid_until timestamptz,
  cancel_at_period_end boolean not null default false,
  subscription_status text,
  revision bigint not null default 1 check (revision between 1 and 9007199254740991),
  updated_at timestamptz not null default now(),
  constraint account_entitlement_window check (state <> 'paid' or (
    plan_slug is not null and plan_slug <> 'free' and valid_from is not null and valid_until is not null and valid_until > valid_from
  ))
);
alter table public.account_entitlements enable row level security;

create function app_private.current_billing_account_id()
returns text language sql stable security definer set search_path = ''
as $$ select a.id from public.accounts a join auth.users u on u.id = a.auth_uid
  join auth.sessions s on s.user_id = u.id
  where a.auth_uid = auth.uid() and a.active and not coalesce(u.is_anonymous, false)
    and s.id::text = auth.jwt() ->> 'session_id'; $$;
create policy account_entitlements_read_self on public.account_entitlements for select to authenticated
using (account_id = (select app_private.current_billing_account_id()));

create function app_private.initialize_account_entitlement()
returns trigger language plpgsql security definer set search_path = ''
as $$ begin insert into public.account_entitlements (account_id) values (new.id); return new; end; $$;
create trigger accounts_initialize_entitlement after insert on public.accounts
for each row execute function app_private.initialize_account_entitlement();
insert into public.account_entitlements (account_id) select id from public.accounts;

create function app_private.billing_entitlement(p_account_id text)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare
  entitlement public.account_entitlements%rowtype;
  plan_name text;
begin
  if not exists (select 1 from public.accounts where id = p_account_id and active) then
    raise exception 'Your Active Account Could Not Be Confirmed' using errcode = '42501';
  end if;
  select * into entitlement from public.account_entitlements where account_id = p_account_id;
  if not found then raise exception 'The Account Entitlement Is Unavailable' using errcode = 'P0002'; end if;
  if entitlement.state = 'paid' then
    if not exists (
      select 1 from app_private.billing_entitlement_authority e join app_private.billing_bindings b on b.id = e.binding_id
      join app_private.billing_configuration c on c.app_id = b.app_id and c.provider_account_id = b.provider_account_id
        and c.livemode = b.livemode and c.active
      where e.account_id = p_account_id and b.account_id = p_account_id
    ) then entitlement.state := 'unavailable'; end if;
  end if;
  if entitlement.state = 'paid' then
    if entitlement.valid_from <= now() and entitlement.valid_until > now() then
      select p.name into plan_name from public.pricing_plans p join public.pricing_plan_tiers t
        on t.id = p.id and t.slug = p.slug and t.number = p.number and t.display_order = p.display_order
      where p.slug = entitlement.plan_slug;
      if plan_name is null then entitlement.state := 'unavailable'; end if;
    else entitlement.state := 'free'; end if;
  end if;
  return jsonb_build_object(
    'state', entitlement.state, 'revision', entitlement.revision, 'updatedAt', entitlement.updated_at,
    'planSlug', case when entitlement.state = 'free' then 'free' when entitlement.state = 'paid' then entitlement.plan_slug else null end,
    'planName', case when entitlement.state = 'free' then 'Free' when entitlement.state = 'paid' then plan_name else null end,
    'validFrom', case when entitlement.state = 'paid' then entitlement.valid_from else null end,
    'validUntil', case when entitlement.state = 'paid' then entitlement.valid_until else null end,
    'subscriptionStatus', entitlement.subscription_status, 'cancelAtPeriodEnd', entitlement.cancel_at_period_end
  );
end; $$;
create function app_private.own_billing_entitlement()
returns jsonb language sql security definer set search_path = ''
as $$ select app_private.billing_entitlement(app_private.current_billing_account_id()); $$;
create function public.own_billing_entitlement()
returns jsonb language sql security invoker set search_path = ''
as $$ select app_private.own_billing_entitlement(); $$;

-- Bindings, leases, request identities and event keys are infrastructure records, never public account data.
insert into app_private.counters (name) values ('billing_bindings'), ('billing_attempts');
create table app_private.billing_bindings (
  id text primary key,
  number bigint not null unique check (number between 1 and 9007199254740991),
  account_id text not null references public.accounts (id) on delete restrict,
  app_id text not null,
  provider_account_id text not null,
  livemode boolean not null,
  stripe_customer_id text,
  stripe_subscription_id text,
  customer_attempt_started_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (account_id, app_id, provider_account_id, livemode),
  unique (provider_account_id, livemode, stripe_customer_id),
  constraint billing_bindings_app_id check (
    id ~ ('^BillingBinding_' || number::text || '_Stripe_[0-9]{4}-[0-9]{2}-[0-9]{2}_[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$')
  )
);
create unique index billing_bindings_subscription on app_private.billing_bindings (provider_account_id, livemode, stripe_subscription_id)
where stripe_subscription_id is not null;
create table app_private.billing_operation_leases (
  account_id text primary key references public.accounts (id) on delete restrict,
  binding_id text not null references app_private.billing_bindings (id) on delete restrict,
  operation_id uuid not null unique,
  lease_token uuid not null,
  lease_until timestamptz not null
);
create table app_private.billing_entitlement_authority (
  account_id text primary key references public.accounts (id) on delete restrict,
  binding_id text not null references app_private.billing_bindings (id) on delete restrict
);
create table app_private.billing_attempts (
  id text primary key,
  number bigint not null unique check (number between 1 and 9007199254740991),
  binding_id text not null references app_private.billing_bindings (id) on delete restrict,
  plan_id text not null references public.pricing_plans (id) on delete restrict,
  plan_slug text not null,
  plan_revision bigint not null,
  stripe_price_id text not null,
  stripe_product_id text not null,
  amount integer not null check (amount between 1 and 100000000),
  currency text not null check (currency = 'usd'),
  interval text not null check (interval in ('month', 'year')),
  stripe_session_id text unique,
  idempotency_key text not null unique,
  status text not null check (status in ('prepared', 'open', 'complete', 'expired', 'uncertain', 'reconciled', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint billing_attempts_app_id check (
    id ~ ('^BillingAttempt_' || number::text || '_Checkout_[0-9]{4}-[0-9]{2}-[0-9]{2}_[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$')
  )
);
create unique index billing_attempts_pending_binding on app_private.billing_attempts (binding_id)
where status in ('prepared', 'open', 'complete', 'uncertain');
create index billing_attempts_binding_created on app_private.billing_attempts (binding_id, created_at desc);
create table app_private.billing_subscriptions (
  id uuid primary key default gen_random_uuid(),
  binding_id text not null references app_private.billing_bindings (id) on delete restrict,
  provider_account_id text not null,
  livemode boolean not null,
  stripe_subscription_id text not null,
  status text not null,
  plan_slug text,
  valid_from timestamptz,
  valid_until timestamptz,
  updated_at timestamptz not null default now(),
  unique (provider_account_id, livemode, stripe_subscription_id)
);
create index billing_subscriptions_binding on app_private.billing_subscriptions (binding_id);
create table app_private.billing_events (
  id uuid primary key default gen_random_uuid(),
  binding_id text not null references app_private.billing_bindings (id) on delete restrict,
  app_id text not null,
  provider_account_id text not null,
  livemode boolean not null,
  stripe_event_id text not null,
  event_type text not null,
  event_created timestamptz,
  committed_at timestamptz not null default now(),
  unique (provider_account_id, livemode, stripe_event_id)
);
create index billing_events_binding_committed on app_private.billing_events (binding_id, committed_at desc);
alter table app_private.billing_bindings enable row level security;
alter table app_private.billing_operation_leases enable row level security;
alter table app_private.billing_entitlement_authority enable row level security;
alter table app_private.billing_attempts enable row level security;
alter table app_private.billing_subscriptions enable row level security;
alter table app_private.billing_events enable row level security;

create function app_private.billing_attempt_json(p_binding_id text)
returns jsonb language sql stable security invoker set search_path = ''
as $$ select jsonb_build_object('id', id, 'status', status, 'planId', plan_id, 'planSlug', plan_slug,
  'planRevision', plan_revision, 'priceId', stripe_price_id, 'sessionId', stripe_session_id,
  'productId', stripe_product_id, 'amount', amount, 'currency', currency, 'interval', interval,
  'idempotencyKey', idempotency_key, 'createdAt', created_at)
  from app_private.billing_attempts where binding_id = p_binding_id
    and status in ('prepared', 'open', 'complete', 'uncertain') order by created_at desc limit 1; $$;
create function app_private.billing_context(p_binding_id text)
returns jsonb language sql stable security invoker set search_path = ''
as $$ select jsonb_build_object('bindingId', b.id, 'accountId', b.account_id, 'authUid', a.auth_uid,
  'active', a.active, 'role', a.role, 'appId', b.app_id, 'providerAccountId', b.provider_account_id, 'livemode', b.livemode,
  'createdAt', b.created_at,
  'customerAttemptStartedAt', b.customer_attempt_started_at,
  'customerId', b.stripe_customer_id, 'subscriptionId', b.stripe_subscription_id,
  'attempt', app_private.billing_attempt_json(b.id))
  from app_private.billing_bindings b join public.accounts a on a.id = b.account_id where b.id = p_binding_id; $$;
create function app_private.require_billing_lease(p_operation_id uuid, p_lease_token uuid)
returns app_private.billing_bindings language plpgsql security invoker set search_path = ''
as $$
declare operation app_private.billing_operation_leases%rowtype; binding app_private.billing_bindings%rowtype;
begin
  select * into operation from app_private.billing_operation_leases where operation_id = p_operation_id for update;
  if not found or operation.lease_token is distinct from p_lease_token or operation.lease_until <= clock_timestamp() then
    raise exception 'The Billing Operation Expired Or Is Busy. Refresh Before Retrying' using errcode = '55P03';
  end if;
  select * into binding from app_private.billing_bindings where id = operation.binding_id for update;
  return binding;
end; $$;

create function app_private.billing_operation(p_action text, p_payload jsonb)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  actor public.accounts%rowtype;
  binding app_private.billing_bindings%rowtype;
  operation app_private.billing_operation_leases%rowtype;
  attempt app_private.billing_attempts%rowtype;
  plan public.pricing_plans%rowtype;
  next_number bigint;
  operation_id uuid;
  lease_token uuid;
  wanted_state text;
  wanted_plan text;
  wanted_from timestamptz;
  wanted_until timestamptz;
  customer_id text;
  subscription_id text;
  event_id text;
  subscription_record_id uuid;
  result jsonb;
begin
  if p_payload is null or jsonb_typeof(p_payload) is distinct from 'object' or octet_length(p_payload::text) > 16000 then
    raise exception 'Use A Valid Billing Request' using errcode = '22023';
  end if;
  if p_action in ('acquire', 'read', 'lookup', 'event', 'approved_prices') then
    if nullif(p_payload ->> 'appId', '') is null or char_length(p_payload ->> 'appId') > 120
      or p_payload ->> 'providerAccountId' !~ '^acct_[A-Za-z0-9]+$'
      or jsonb_typeof(p_payload -> 'livemode') is distinct from 'boolean' then
      raise exception 'Confirm The Billing App, Provider Account And Mode' using errcode = '22023';
    end if;
    if not exists (select 1 from app_private.billing_configuration where active and app_id = p_payload ->> 'appId'
      and provider_account_id = p_payload ->> 'providerAccountId' and livemode = (p_payload ->> 'livemode')::boolean) then
      raise exception 'The Billing Scope Does Not Match This App Environment' using errcode = '42501';
    end if;
  end if;
  if p_action in ('acquire', 'read', 'approved_prices') then
    select * into actor from public.accounts where auth_uid = (p_payload ->> 'authUid')::uuid for update;
    if not found then raise exception 'The Billing Account Could Not Be Confirmed' using errcode = '42501'; end if;
    select * into binding from app_private.billing_bindings where account_id = actor.id
      and app_id = p_payload ->> 'appId' and provider_account_id = p_payload ->> 'providerAccountId'
      and livemode = (p_payload ->> 'livemode')::boolean;
    if p_action = 'read' then return case when binding.id is null then null else app_private.billing_context(binding.id) end; end if;
    if p_action = 'approved_prices' then
      select coalesce(jsonb_agg(jsonb_build_object('id', id, 'planId', plan_id, 'planSlug', plan_slug,
        'planRevision', plan_revision, 'priceId', stripe_price_id, 'productId', stripe_product_id, 'amount', amount,
        'currency', currency, 'interval', interval, 'sessionId', stripe_session_id, 'status', status, 'createdAt', created_at)
        order by number), '[]'::jsonb) into result
      from (select * from app_private.billing_attempts where binding_id = binding.id order by number limit 101) history;
      if jsonb_array_length(result) > 100 then
        raise exception 'The Approved Billing History Exceeds The Complete 100-Attempt Window' using errcode = '54000';
      end if;
      return result;
    end if;
    if binding.id is null then
      update app_private.counters set number = number + 1 where name = 'billing_bindings' returning number into next_number;
      insert into app_private.billing_bindings (id, number, account_id, app_id, provider_account_id, livemode)
      values (app_private.catalog_id('BillingBinding', next_number, 'Stripe'), next_number, actor.id,
        p_payload ->> 'appId', p_payload ->> 'providerAccountId', (p_payload ->> 'livemode')::boolean) returning * into binding;
    end if;
    operation_id := (p_payload ->> 'operationId')::uuid;
    if operation_id is null then raise exception 'Use A Stable Billing Operation Identity' using errcode = '22023'; end if;
    select * into operation from app_private.billing_operation_leases where account_id = actor.id for update;
    if found and operation.lease_until > clock_timestamp() then
      if operation.operation_id <> operation_id or operation.binding_id <> binding.id then
        raise exception 'Another Billing Operation Is In Progress' using errcode = '55P03';
      end if;
    else
      insert into app_private.billing_operation_leases (account_id, binding_id, operation_id, lease_token, lease_until)
      values (actor.id, binding.id, operation_id, gen_random_uuid(), clock_timestamp() + interval '90 seconds')
      on conflict (account_id) do update set binding_id = excluded.binding_id, operation_id = excluded.operation_id,
        lease_token = excluded.lease_token, lease_until = excluded.lease_until returning * into operation;
    end if;
    return app_private.billing_context(binding.id) || jsonb_build_object('leaseToken', operation.lease_token, 'leaseUntil', operation.lease_until);
  elsif p_action = 'lookup' then
    customer_id := nullif(p_payload ->> 'customerId', ''); subscription_id := nullif(p_payload ->> 'subscriptionId', '');
    if customer_id is null and subscription_id is null and nullif(p_payload ->> 'sessionId', '') is null then
      raise exception 'A Verified Provider Resource Is Required' using errcode = '22023';
    end if;
    select b.* into binding from app_private.billing_bindings b
    where b.app_id = p_payload ->> 'appId' and b.provider_account_id = p_payload ->> 'providerAccountId'
      and b.livemode = (p_payload ->> 'livemode')::boolean
      and (customer_id is null or b.stripe_customer_id = customer_id)
      and (subscription_id is null or b.stripe_subscription_id = subscription_id or exists (
        select 1 from app_private.billing_subscriptions s where s.binding_id = b.id and s.stripe_subscription_id = subscription_id))
      and (nullif(p_payload ->> 'sessionId', '') is null or exists (
        select 1 from app_private.billing_attempts t where t.binding_id = b.id and t.stripe_session_id = p_payload ->> 'sessionId'));
    return case when binding.id is null then null else app_private.billing_context(binding.id) end;
  elsif p_action = 'event' then
    return jsonb_build_object('alreadyProcessed', exists (select 1 from app_private.billing_events e
      where e.app_id = p_payload ->> 'appId' and e.provider_account_id = p_payload ->> 'providerAccountId'
        and e.livemode = (p_payload ->> 'livemode')::boolean and e.stripe_event_id = p_payload ->> 'eventId'));
  end if;

  operation_id := (p_payload ->> 'operationId')::uuid;
  lease_token := (p_payload ->> 'leaseToken')::uuid;
  binding := app_private.require_billing_lease(operation_id, lease_token);
  if not exists (select 1 from app_private.billing_configuration where active and app_id = binding.app_id
    and provider_account_id = binding.provider_account_id and livemode = binding.livemode) then
    raise exception 'The Billing Scope Changed. Reload Before Retrying' using errcode = '42501';
  end if;
  if p_action = 'prepare_customer' then
    if not exists (select 1 from public.accounts where id = binding.account_id and active) then
      raise exception 'An Active Account Is Required To Prepare Billing' using errcode = '42501';
    end if;
    if binding.stripe_customer_id is null and binding.customer_attempt_started_at is null then
      update app_private.billing_bindings set customer_attempt_started_at = clock_timestamp(), updated_at = clock_timestamp()
      where id = binding.id;
    end if;
    return app_private.billing_context(binding.id);
  elsif p_action = 'save_customer' then
    customer_id := p_payload ->> 'customerId';
    if customer_id is null or customer_id !~ '^cus_[A-Za-z0-9]+$'
      or (binding.stripe_customer_id is not null and binding.stripe_customer_id <> customer_id) then
      raise exception 'The Billing Customer Binding Cannot Be Replaced' using errcode = '22023';
    end if;
    update app_private.billing_bindings set stripe_customer_id = customer_id, updated_at = clock_timestamp() where id = binding.id;
    return app_private.billing_context(binding.id);
  elsif p_action = 'prepare_attempt' then
    if not exists (select 1 from public.accounts where id = binding.account_id and active) then
      raise exception 'An Active Account Is Required To Start Checkout' using errcode = '42501';
    end if;
    result := app_private.billing_attempt_json(binding.id);
    if result is not null then return result; end if;
    if binding.stripe_customer_id is null then raise exception 'Bind The Verified Customer Before Checkout' using errcode = '22023'; end if;
    select * into plan from public.pricing_plans where id = p_payload ->> 'planId';
    if not found or not plan.active or plan.slug = 'free' or plan.price_cents <= 0 or plan.interval not in ('month', 'year')
      or plan.slug is distinct from p_payload ->> 'planSlug' or plan.revision is distinct from (p_payload ->> 'planRevision')::bigint
      or p_payload ->> 'priceId' !~ '^price_[A-Za-z0-9]+$' or p_payload ->> 'productId' !~ '^prod_[A-Za-z0-9]+$'
      or jsonb_typeof(p_payload -> 'amount') is distinct from 'number' or p_payload ->> 'amount' !~ '^[1-9][0-9]{0,8}$'
      or (p_payload ->> 'amount')::integer is distinct from plan.price_cents
      or upper(p_payload ->> 'currency') is distinct from plan.currency or p_payload ->> 'interval' is distinct from plan.interval then
      raise exception 'This Billing Offer Changed Or Is Unavailable' using errcode = '22023';
    end if;
    update app_private.counters set number = number + 1 where name = 'billing_attempts' returning number into next_number;
    insert into app_private.billing_attempts (id, number, binding_id, plan_id, plan_slug, plan_revision, stripe_price_id,
      stripe_product_id, amount, currency, interval, idempotency_key, status)
    values (app_private.catalog_id('BillingAttempt', next_number, 'Checkout'), next_number, binding.id, plan.id, plan.slug,
      plan.revision, p_payload ->> 'priceId', p_payload ->> 'productId', plan.price_cents, lower(plan.currency), plan.interval,
      'spelling-spells-checkout-' || gen_random_uuid()::text, 'prepared');
    return app_private.billing_attempt_json(binding.id);
  elsif p_action = 'save_attempt' then
    select * into attempt from app_private.billing_attempts where id = p_payload ->> 'attemptId' and binding_id = binding.id for update;
    if found and p_payload ->> 'status' in ('open', 'complete', 'expired', 'uncertain', 'closed')
      and attempt.status = p_payload ->> 'status'
      and attempt.stripe_session_id is not distinct from nullif(p_payload ->> 'sessionId', '') then
      return jsonb_build_object('saved', true);
    end if;
    if not found or p_payload ->> 'status' not in ('open', 'complete', 'expired', 'uncertain', 'closed')
      or attempt.status in ('expired', 'reconciled', 'closed')
      or (attempt.status = 'complete' and p_payload ->> 'status' not in ('complete', 'uncertain', 'closed')) then
      raise exception 'This Checkout Attempt Cannot Be Replaced' using errcode = '22023';
    end if;
    if p_payload ->> 'status' = 'closed' and (attempt.stripe_session_id is null or not exists (
      select 1 from public.account_entitlements where account_id = binding.account_id and state = 'free'
        and subscription_status in ('canceled', 'incomplete_expired')
    )) then raise exception 'Confirm The Terminal Provider State Before Closing Checkout' using errcode = '22023'; end if;
    if nullif(p_payload ->> 'sessionId', '') is not null and p_payload ->> 'sessionId' !~ '^cs_[A-Za-z0-9_]+$' then
      raise exception 'Use A Valid Checkout Session' using errcode = '22023';
    end if;
    if attempt.stripe_session_id is not null and attempt.stripe_session_id is distinct from p_payload ->> 'sessionId' then
      raise exception 'The Checkout Session Binding Cannot Be Replaced' using errcode = '22023';
    end if;
    if nullif(p_payload ->> 'sessionId', '') is null and p_payload ->> 'status' <> 'uncertain' then
      raise exception 'The Checkout Session Must Be Confirmed' using errcode = '22023';
    end if;
    update app_private.billing_attempts set stripe_session_id = coalesce(stripe_session_id, nullif(p_payload ->> 'sessionId', '')),
      status = p_payload ->> 'status', updated_at = clock_timestamp() where id = attempt.id;
    return jsonb_build_object('saved', true);
  elsif p_action = 'clear_attempt' then
    select * into attempt from app_private.billing_attempts where id = p_payload ->> 'attemptId' and binding_id = binding.id;
    if not found or attempt.status not in ('expired', 'closed') then
      raise exception 'An Unresolved Checkout Attempt Cannot Be Cleared' using errcode = '22023';
    end if;
    return jsonb_build_object('cleared', true);
  elsif p_action = 'commit' then
    customer_id := p_payload ->> 'customerId'; subscription_id := nullif(p_payload ->> 'subscriptionId', '');
    wanted_state := p_payload ->> 'state'; wanted_plan := nullif(p_payload ->> 'planSlug', '');
    wanted_from := (p_payload ->> 'validFrom')::timestamptz; wanted_until := (p_payload ->> 'validUntil')::timestamptz;
    event_id := nullif(p_payload ->> 'eventId', '');
    if binding.stripe_customer_id is null or binding.stripe_customer_id is distinct from customer_id
      or wanted_state not in ('free', 'paid', 'pending', 'unavailable')
      or jsonb_typeof(p_payload -> 'cancelAtPeriodEnd') is distinct from 'boolean'
      or (subscription_id is not null and subscription_id !~ '^sub_[A-Za-z0-9]+$')
      or char_length(coalesce(p_payload ->> 'subscriptionStatus', '')) > 80 then
      raise exception 'The Verified Billing State Is Invalid' using errcode = '22023';
    end if;
    if wanted_state = 'paid' and (subscription_id is null or wanted_plan is null or wanted_plan = 'free'
      or wanted_from is null or wanted_until is null or wanted_until <= wanted_from or wanted_from > now() or wanted_until <= now()
      or not exists (select 1 from public.pricing_plans p join public.pricing_plan_tiers t on t.id = p.id
        and t.slug = p.slug and t.number = p.number and t.display_order = p.display_order where p.slug = wanted_plan)) then
      raise exception 'Paid Access Requires A Verified Current Paid Service Period And Catalog Tier' using errcode = '22023';
    end if;
    if event_id is not null then
      if event_id !~ '^evt_[A-Za-z0-9]+$' or nullif(p_payload ->> 'eventType', '') is null then
        raise exception 'Use A Verified Stripe Event Identity' using errcode = '22023';
      end if;
      if exists (select 1 from app_private.billing_events where provider_account_id = binding.provider_account_id
        and livemode = binding.livemode and stripe_event_id = event_id) then
        return jsonb_build_object('alreadyProcessed', true);
      end if;
    end if;
    if subscription_id is not null then
      if exists (select 1 from app_private.billing_subscriptions where provider_account_id = binding.provider_account_id
        and livemode = binding.livemode and stripe_subscription_id = subscription_id and binding_id <> binding.id) then
        raise exception 'The Subscription Belongs To Another Billing Account' using errcode = '42501';
      end if;
      insert into app_private.billing_subscriptions (binding_id, provider_account_id, livemode, stripe_subscription_id, status, plan_slug, valid_from, valid_until)
      values (binding.id, binding.provider_account_id, binding.livemode, subscription_id, coalesce(p_payload ->> 'subscriptionStatus', 'unknown'), wanted_plan, wanted_from, wanted_until)
      on conflict (provider_account_id, livemode, stripe_subscription_id) do update set status = excluded.status,
        plan_slug = excluded.plan_slug, valid_from = excluded.valid_from, valid_until = excluded.valid_until, updated_at = clock_timestamp()
      where app_private.billing_subscriptions.binding_id = excluded.binding_id returning id into subscription_record_id;
      if subscription_record_id is null then
        raise exception 'The Subscription Belongs To Another Billing Account' using errcode = '42501';
      end if;
    end if;
    update app_private.billing_bindings set stripe_subscription_id = subscription_id, updated_at = clock_timestamp() where id = binding.id;
    insert into app_private.billing_entitlement_authority (account_id, binding_id) values (binding.account_id, binding.id)
    on conflict (account_id) do update set binding_id = excluded.binding_id;
    update public.account_entitlements set state = wanted_state,
      plan_slug = case when wanted_state = 'paid' then wanted_plan else null end,
      valid_from = case when wanted_state = 'paid' then wanted_from else null end,
      valid_until = case when wanted_state = 'paid' then wanted_until else null end,
      cancel_at_period_end = (p_payload ->> 'cancelAtPeriodEnd')::boolean,
      subscription_status = nullif(p_payload ->> 'subscriptionStatus', ''), revision = revision + 1, updated_at = clock_timestamp()
    where account_id = binding.account_id and (state, plan_slug, valid_from, valid_until, cancel_at_period_end, subscription_status)
      is distinct from (wanted_state, case when wanted_state = 'paid' then wanted_plan else null end,
        case when wanted_state = 'paid' then wanted_from else null end, case when wanted_state = 'paid' then wanted_until else null end,
        (p_payload ->> 'cancelAtPeriodEnd')::boolean, nullif(p_payload ->> 'subscriptionStatus', ''));
    if wanted_state = 'paid' then
      update app_private.billing_attempts set status = 'reconciled', updated_at = clock_timestamp()
      where binding_id = binding.id and status in ('complete', 'open');
    end if;
    if event_id is not null then
      insert into app_private.billing_events (binding_id, app_id, provider_account_id, livemode, stripe_event_id, event_type, event_created)
      values (binding.id, binding.app_id, binding.provider_account_id, binding.livemode, event_id,
        p_payload ->> 'eventType', (p_payload ->> 'eventCreated')::timestamptz);
    end if;
    if exists (select 1 from public.accounts where id = binding.account_id and active) then
      return app_private.billing_entitlement(binding.account_id);
    end if;
    return jsonb_build_object('state', 'unavailable', 'saved', true, 'accountId', binding.account_id);
  elsif p_action = 'release' then
    delete from app_private.billing_operation_leases l
    where l.operation_id = (p_payload ->> 'operationId')::uuid and l.lease_token = (p_payload ->> 'leaseToken')::uuid;
    return jsonb_build_object('released', true);
  end if;
  raise exception 'Use A Supported Billing Operation' using errcode = '22023';
end; $$;
create function public.billing_operation(p_action text, p_payload jsonb)
returns jsonb language sql security invoker set search_path = ''
as $$ select app_private.billing_operation(p_action, p_payload); $$;

create or replace function app_private.feature_policy_valid(p_policy jsonb)
returns boolean language plpgsql immutable security invoker set search_path = ''
as $$
begin
  if p_policy is null or jsonb_typeof(p_policy) is distinct from 'object' then return false; end if;
  if p_policy - array['roles', 'plans', 'enabled', 'planMode', 'description', 'minimumRole'] <> '{}'::jsonb
    or not (p_policy ?& array['roles', 'plans', 'enabled', 'planMode', 'description', 'minimumRole']) then return false; end if;
  if jsonb_typeof(p_policy -> 'enabled') is distinct from 'boolean'
    or jsonb_typeof(p_policy -> 'description') is distinct from 'string'
    or jsonb_typeof(p_policy -> 'minimumRole') is distinct from 'string'
    or p_policy ->> 'planMode' is distinct from 'minimum' then return false; end if;
  if char_length(p_policy ->> 'description') not between 1 and 600
    or p_policy ->> 'description' <> btrim(p_policy ->> 'description') or p_policy ->> 'description' ~ '[[:cntrl:]]'
    or p_policy ->> 'minimumRole' not in ('Guest', 'Member', 'Subscriber', 'Developer', 'Admin', 'Owner') then return false; end if;
  if p_policy -> 'plans' <> 'null'::jsonb then
    if jsonb_typeof(p_policy -> 'plans') is distinct from 'array' then return false; end if;
    if jsonb_array_length(p_policy -> 'plans') <> 1 or jsonb_typeof(p_policy -> 'plans' -> 0) is distinct from 'string'
      or p_policy -> 'plans' ->> 0 = 'free' or p_policy -> 'plans' ->> 0 !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
      or char_length(p_policy -> 'plans' ->> 0) > 80 then return false; end if;
  end if;
  if p_policy -> 'roles' = 'null'::jsonb then return true; end if;
  if jsonb_typeof(p_policy -> 'roles') is distinct from 'array' then return false; end if;
  if jsonb_array_length(p_policy -> 'roles') > 6 or exists (
    select 1 from jsonb_array_elements(p_policy -> 'roles') role
    where jsonb_typeof(role) <> 'string' or role #>> '{}' not in ('Guest', 'Member', 'Subscriber', 'Developer', 'Admin', 'Owner')
  ) then return false; end if;
  return (select count(*) = count(distinct role) from jsonb_array_elements_text(p_policy -> 'roles') role);
end; $$;
create or replace function app_private.feature_map_valid(p_features jsonb)
returns boolean language plpgsql immutable security invoker set search_path = ''
as $$
declare feature_key text;
begin
  if p_features is null or jsonb_typeof(p_features) is distinct from 'object' then return false; end if;
  if p_features - array['themeToggle', 'marquee', 'notifications', 'contact', 'grimoireTools'] <> '{}'::jsonb
    or not (p_features ?& array['themeToggle', 'marquee', 'notifications', 'contact', 'grimoireTools']) then return false; end if;
  foreach feature_key in array array['themeToggle', 'marquee', 'notifications', 'contact', 'grimoireTools'] loop
    if not app_private.feature_policy_valid(p_features -> feature_key) then return false; end if;
  end loop;
  return true;
end; $$;
alter table public.feature_settings drop constraint feature_settings_version_check;
update public.feature_settings set version = 2, revision = revision + 1, updated_at = clock_timestamp(), features = jsonb_build_object(
  'themeToggle', features -> 'themeToggle' || '{"plans":null,"planMode":"minimum"}'::jsonb,
  'marquee', '{"roles":null,"plans":null,"enabled":true,"planMode":"minimum","minimumRole":"Guest","description":"Show the scrolling archive marquee"}'::jsonb,
  'notifications', '{"roles":null,"plans":null,"enabled":true,"planMode":"minimum","minimumRole":"Guest","description":"Read published archive announcements and manage private read status"}'::jsonb,
  'contact', '{"roles":null,"plans":null,"enabled":true,"planMode":"minimum","minimumRole":"Guest","description":"Open the public contact page and send a message"}'::jsonb,
  'grimoireTools', '{"roles":null,"plans":["starter"],"enabled":true,"planMode":"minimum","minimumRole":"Guest","description":"Use account collections, spell notes and flashcard practice"}'::jsonb
) where scope = 'global' and version = 1;
alter table public.feature_settings add constraint feature_settings_version_check check (version = 2);
alter table public.feature_settings alter column version set default 2;

create or replace function app_private.owner_save_feature_policy(p_key text, p_policy jsonb, p_expected_revision bigint, p_expected_auth_uid uuid)
returns setof public.feature_settings language plpgsql security definer set search_path = ''
as $$
declare saved public.feature_settings%rowtype;
begin
  perform app_private.require_catalog_actor(p_expected_auth_uid, true);
  if p_key not in ('themeToggle', 'marquee', 'notifications', 'contact', 'grimoireTools') or p_policy is null
    or octet_length(p_policy::text) > 5000 or not app_private.feature_policy_valid(p_policy) then
    raise exception 'Use A Supported Feature And Valid Feature Policy' using errcode = '22023';
  end if;
  if p_policy -> 'plans' <> 'null'::jsonb and not exists (
    select 1 from public.pricing_plan_tiers t join public.pricing_plans p on p.id = t.id
      and p.slug = t.slug and p.number = t.number and p.display_order = t.display_order
    where t.slug = p_policy -> 'plans' ->> 0
  ) then raise exception 'The Selected Minimum Tier Is Unavailable' using errcode = '22023'; end if;
  if p_expected_revision is null or p_expected_revision not between 1 and 9007199254740991 then
    raise exception 'Confirm The Current Feature Revision Before Saving' using errcode = '22023';
  end if;
  select * into saved from public.feature_settings where scope = 'global' for update;
  if not found then raise exception 'The Global Feature Settings Have Not Been Created' using errcode = 'P0002'; end if;
  if saved.version <> 2 or saved.revision <> p_expected_revision then
    raise exception 'The Feature Changed. Reload Before Saving' using errcode = '40001';
  end if;
  if saved.features -> p_key = p_policy then return next saved; return; end if;
  update public.feature_settings set features = jsonb_set(features, array[p_key], p_policy, false),
    revision = revision + 1, updated_at = clock_timestamp() where id = saved.id returning * into saved;
  return next saved;
end; $$;

create function app_private.plan_meets_minimum(p_plan_slug text, p_minimum_slug text)
returns boolean language sql stable security definer set search_path = ''
as $$ select p_minimum_slug is null or exists (
  select 1 from public.pricing_plan_tiers viewer join public.pricing_plans vp
    on vp.id = viewer.id and vp.slug = viewer.slug and vp.number = viewer.number and vp.display_order = viewer.display_order
  cross join public.pricing_plan_tiers minimum join public.pricing_plans mp
    on mp.id = minimum.id and mp.slug = minimum.slug and mp.number = minimum.number and mp.display_order = minimum.display_order
  where viewer.slug = p_plan_slug and viewer.slug <> 'free' and minimum.slug = p_minimum_slug and minimum.slug <> 'free'
    and (viewer.display_order, viewer.number) >= (minimum.display_order, minimum.number)
); $$;
create function app_private.feature_allows(p_key text)
returns boolean language plpgsql stable security definer set search_path = ''
as $$
declare
  policy jsonb;
  actor_role text := 'Guest';
  actor_id text;
  entitlement jsonb;
  role_rank integer;
  minimum_rank integer;
begin
  select features -> p_key into policy from public.feature_settings where scope = 'global' and version = 2;
  if policy is null or not app_private.feature_policy_valid(policy) or not (policy ->> 'enabled')::boolean then return false; end if;
  if auth.uid() is not null then
    actor_id := app_private.current_billing_account_id();
    if actor_id is null then return false; end if;
    select role into actor_role from public.accounts where id = actor_id and active;
  end if;
  role_rank := array_position(array['Guest', 'Member', 'Subscriber', 'Developer', 'Admin', 'Owner'], actor_role);
  minimum_rank := array_position(array['Guest', 'Member', 'Subscriber', 'Developer', 'Admin', 'Owner'], policy ->> 'minimumRole');
  if role_rank is null or minimum_rank is null or role_rank < minimum_rank
    or (policy -> 'roles' <> 'null'::jsonb and not (policy -> 'roles' ? actor_role)) then return false; end if;
  if policy -> 'plans' = 'null'::jsonb then return true; end if;
  if actor_id is null then return false; end if;
  entitlement := app_private.billing_entitlement(actor_id);
  return entitlement ->> 'state' = 'paid'
    and app_private.plan_meets_minimum(entitlement ->> 'planSlug', policy -> 'plans' ->> 0);
end; $$;

drop policy notifications_public_read on public.notifications;
drop policy notifications_account_read on public.notifications;
create policy notifications_public_read on public.notifications for select to anon
using (status = 'published' and (select app_private.feature_allows('notifications')));
create policy notifications_account_read on public.notifications for select to authenticated
using ((status = 'published' and (select app_private.feature_allows('notifications'))) or (select app_private.is_owner()));
drop policy notification_feed_state_read on public.notification_feed_state;
create policy notification_feed_state_public_read on public.notification_feed_state for select to anon
using ((select app_private.feature_allows('notifications')));
create policy notification_feed_state_account_read on public.notification_feed_state for select to authenticated
using ((select app_private.feature_allows('notifications')) or (select app_private.is_owner()));
alter function app_private.mark_notifications_read(text[], uuid) rename to mark_notifications_read_before_feature_gate;
create function app_private.mark_notifications_read(p_ids text[], p_expected_auth_uid uuid)
returns void language plpgsql security definer set search_path = ''
as $$ begin
  if not app_private.feature_allows('notifications') then raise exception 'Notifications Are Unavailable For This Account' using errcode = '42501'; end if;
  perform app_private.mark_notifications_read_before_feature_gate(p_ids, p_expected_auth_uid);
end; $$;
alter function app_private.submit_contact(jsonb, uuid, uuid) rename to submit_contact_before_feature_gate;
create function app_private.submit_contact(p_payload jsonb, p_request_id uuid, p_expected_auth_uid uuid)
returns jsonb language plpgsql security definer set search_path = ''
as $$ begin
  if not app_private.feature_allows('contact') then raise exception 'Contact Is Unavailable For This Account' using errcode = '42501'; end if;
  return app_private.submit_contact_before_feature_gate(p_payload, p_request_id, p_expected_auth_uid);
end; $$;
create or replace function public.mark_notifications_read(p_ids text[], p_expected_auth_uid uuid)
returns void language sql security invoker set search_path = ''
as $$ select app_private.mark_notifications_read(p_ids, p_expected_auth_uid); $$;
create or replace function public.submit_contact(p_payload jsonb, p_request_id uuid, p_expected_auth_uid uuid)
returns jsonb language sql security invoker set search_path = ''
as $$ select app_private.submit_contact(p_payload, p_request_id, p_expected_auth_uid); $$;

create table public.account_grimoires (
  account_id text primary key references public.accounts (id) on delete restrict,
  data jsonb not null,
  revision bigint not null default 1 check (revision between 1 and 9007199254740991),
  updated_at timestamptz not null default now()
);
alter table public.account_grimoires enable row level security;
create policy account_grimoires_read_self on public.account_grimoires for select to authenticated
using (account_id = (select app_private.current_billing_account_id()));
create function app_private.empty_grimoire()
returns jsonb language sql immutable security invoker set search_path = ''
as $$ select '{"version":1,"collections":[],"entries":{},"nextCollectionNumber":1}'::jsonb; $$;
create function app_private.validate_grimoire(p_data jsonb)
returns void language plpgsql immutable security invoker set search_path = ''
as $$
declare
  collection jsonb;
  entry record;
  field text;
begin
  if p_data is null or jsonb_typeof(p_data) is distinct from 'object' or octet_length(p_data::text) > 16000000 then
    raise exception 'Use A Supported Grimoire Document' using errcode = '22023';
  end if;
  if p_data - array['version', 'collections', 'entries', 'nextCollectionNumber'] <> '{}'::jsonb
    or not (p_data ?& array['version', 'collections', 'entries', 'nextCollectionNumber'])
    or p_data -> 'version' <> '1'::jsonb or jsonb_typeof(p_data -> 'collections') is distinct from 'array'
    or jsonb_typeof(p_data -> 'entries') is distinct from 'object'
    or jsonb_typeof(p_data -> 'nextCollectionNumber') is distinct from 'number'
    or p_data ->> 'nextCollectionNumber' !~ '^[1-9][0-9]{0,15}$' then
    raise exception 'The Grimoire Format Is Invalid' using errcode = '22023';
  end if;
  if (p_data ->> 'nextCollectionNumber')::bigint > 9007199254740991
    or jsonb_array_length(p_data -> 'collections') > 50
    or (select count(*) from jsonb_object_keys(p_data -> 'entries')) > 2000 then
    raise exception 'Grimoire Capacity Is 50 Collections And 2000 Spell Entries' using errcode = '22023';
  end if;
  for collection in select value from jsonb_array_elements(p_data -> 'collections') loop
    if jsonb_typeof(collection) is distinct from 'object' then raise exception 'Use A Valid Collection' using errcode = '22023'; end if;
    if collection - array['id', 'name', 'number', 'spellIds'] <> '{}'::jsonb or not (collection ?& array['id', 'name', 'number', 'spellIds'])
      or jsonb_typeof(collection -> 'id') is distinct from 'string' or char_length(collection ->> 'id') not between 1 and 350
      or collection ->> 'id' !~ '^Collection_[1-9][0-9]*_[A-Za-z0-9_-]+$'
      or jsonb_typeof(collection -> 'name') is distinct from 'string' or char_length(collection ->> 'name') not between 1 and 80
      or btrim(collection ->> 'name') = '' or collection ->> 'name' <> btrim(collection ->> 'name')
      or collection ->> 'name' ~ '[[:cntrl:]]' or collection ->> 'name' !~ '[^[:space:]]'
      or jsonb_typeof(collection -> 'number') is distinct from 'number' or collection ->> 'number' !~ '^[1-9][0-9]{0,15}$'
      or jsonb_typeof(collection -> 'spellIds') is distinct from 'array' then
      raise exception 'The Collection Format Is Invalid' using errcode = '22023';
    end if;
    if (collection ->> 'number')::bigint >= (p_data ->> 'nextCollectionNumber')::bigint
      or left(collection ->> 'id', char_length('Collection_' || (collection ->> 'number') || '_')) <> 'Collection_' || (collection ->> 'number') || '_'
      or jsonb_array_length(collection -> 'spellIds') > 500 or exists (
        select 1 from jsonb_array_elements(collection -> 'spellIds') spell
        where jsonb_typeof(spell) <> 'string' or char_length(spell #>> '{}') not between 1 and 250
          or spell #>> '{}' !~ '^[A-Za-z0-9_-]+$' or spell #>> '{}' in ('__proto__', 'constructor', 'prototype')
      ) or (select count(*) <> count(distinct spell) from jsonb_array_elements_text(collection -> 'spellIds') spell) then
      raise exception 'A Collection Supports 500 Unique Spell References And A Stable Identity' using errcode = '22023';
    end if;
  end loop;
  if (select count(*) <> count(distinct value ->> 'id') or count(*) <> count(distinct value ->> 'number')
    from jsonb_array_elements(p_data -> 'collections')) then
    raise exception 'Collection Identities Must Be Unique' using errcode = '22023';
  end if;
  for entry in select key, value from jsonb_each(p_data -> 'entries') loop
    if char_length(entry.key) not between 1 and 250 or entry.key !~ '^[A-Za-z0-9_-]+$'
      or entry.key in ('__proto__', 'constructor', 'prototype') or jsonb_typeof(entry.value) is distinct from 'object' then
      raise exception 'Use A Valid Grimoire Spell Entry' using errcode = '22023';
    end if;
    if entry.value - array['note', 'streak', 'reviews', 'correct', 'lastReviewedAt'] <> '{}'::jsonb
      or not (entry.value ?& array['note', 'streak', 'reviews', 'correct', 'lastReviewedAt'])
      or jsonb_typeof(entry.value -> 'note') is distinct from 'string' or char_length(entry.value ->> 'note') > 4000 then
      raise exception 'Spell Notes Support Up To 4000 Characters' using errcode = '22023';
    end if;
    foreach field in array array['streak', 'reviews', 'correct'] loop
      if jsonb_typeof(entry.value -> field) is distinct from 'number' or entry.value ->> field !~ '^(0|[1-9][0-9]{0,15})$' then
        raise exception 'Use Valid Practice Counts' using errcode = '22023';
      end if;
      if (entry.value ->> field)::bigint > 9007199254740991 then raise exception 'Practice Count Limit Reached' using errcode = '22023'; end if;
    end loop;
    if (entry.value ->> 'correct')::bigint > (entry.value ->> 'reviews')::bigint
      or (entry.value ->> 'streak')::bigint > (entry.value ->> 'correct')::bigint
      or ((entry.value ->> 'reviews')::bigint = 0 and entry.value -> 'lastReviewedAt' <> 'null'::jsonb)
      or ((entry.value ->> 'reviews')::bigint > 0 and (jsonb_typeof(entry.value -> 'lastReviewedAt') is distinct from 'string'
        or entry.value ->> 'lastReviewedAt' !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$')) then
      raise exception 'Practice Progress Has An Invalid Count Or Date' using errcode = '22023';
    end if;
    if (entry.value ->> 'reviews')::bigint > 0 then perform (entry.value ->> 'lastReviewedAt')::timestamptz; end if;
  end loop;
end; $$;
create function app_private.grimoire_recovery_only(p_before jsonb, p_after jsonb)
returns boolean language plpgsql immutable security invoker set search_path = ''
as $$
declare collection jsonb; previous jsonb; entry record;
begin
  if p_after -> 'nextCollectionNumber' <> p_before -> 'nextCollectionNumber' then return false; end if;
  for collection in select value from jsonb_array_elements(p_after -> 'collections') loop
    select value into previous from jsonb_array_elements(p_before -> 'collections') where value ->> 'id' = collection ->> 'id';
    if previous is null or collection - 'spellIds' <> previous - 'spellIds'
      or exists (select 1 from jsonb_array_elements_text(collection -> 'spellIds') spell
        where not (previous -> 'spellIds' ? spell)) then return false; end if;
  end loop;
  for entry in select key, value from jsonb_each(p_after -> 'entries') loop
    previous := p_before -> 'entries' -> entry.key;
    if previous is null or (entry.value ->> 'note' <> '' and entry.value -> 'note' <> previous -> 'note')
      or (entry.value - 'note' <> previous - 'note' and entry.value - 'note' <>
        '{"streak":0,"reviews":0,"correct":0,"lastReviewedAt":null}'::jsonb) then return false; end if;
  end loop;
  return true;
end; $$;
create function app_private.get_grimoire(p_expected_auth_uid uuid)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare actor_id text := app_private.require_catalog_actor(p_expected_auth_uid, false); saved public.account_grimoires%rowtype;
begin
  select * into saved from public.account_grimoires where account_id = actor_id;
  return jsonb_build_object('data', coalesce(saved.data, app_private.empty_grimoire()), 'revision', coalesce(saved.revision, 0), 'updatedAt', saved.updated_at);
end; $$;
create function app_private.save_grimoire(p_data jsonb, p_expected_revision bigint, p_expected_auth_uid uuid)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  actor_id text := app_private.require_catalog_actor(p_expected_auth_uid, false);
  saved public.account_grimoires%rowtype;
  previous jsonb;
begin
  perform app_private.validate_grimoire(p_data);
  select * into saved from public.account_grimoires where account_id = actor_id for update;
  if p_expected_revision is null or p_expected_revision < 0 or coalesce(saved.revision, 0) <> p_expected_revision then
    raise exception 'Your Grimoire Changed On Another Device. Refresh Before Saving' using errcode = '40001';
  end if;
  previous := coalesce(saved.data, app_private.empty_grimoire());
  if previous = p_data then return app_private.get_grimoire(p_expected_auth_uid); end if;
  if not app_private.feature_allows('grimoireTools') and not app_private.grimoire_recovery_only(previous, p_data) then
    raise exception 'Your Current Plan Or Feature Policy Permits Reading, Exporting And Removing Existing Grimoire Data Only' using errcode = '42501';
  end if;
  if (p_data ->> 'nextCollectionNumber')::bigint < (previous ->> 'nextCollectionNumber')::bigint or exists (
    select 1 from jsonb_array_elements(p_data -> 'collections') item
    where not exists (select 1 from jsonb_array_elements(previous -> 'collections') old where old ->> 'id' = item ->> 'id')
      and (item ->> 'number')::bigint < (previous ->> 'nextCollectionNumber')::bigint
  ) then raise exception 'Collection Numbers Must Remain Monotonic' using errcode = '22023'; end if;
  if exists (
    select 1 from jsonb_array_elements(p_data -> 'collections') collection,
      lateral jsonb_array_elements_text(collection -> 'spellIds') requested(spell_id)
    where not exists (select 1 from public.catalog_spells s where s.id = requested.spell_id and s.status = 'published')
      and not exists (select 1 from jsonb_array_elements(previous -> 'collections') old
        where old ->> 'id' = collection ->> 'id' and old -> 'spellIds' ? requested.spell_id)
  ) or exists (
    select 1 from jsonb_object_keys(p_data -> 'entries') requested(spell_id)
    where not (previous -> 'entries' ? requested.spell_id)
      and not exists (select 1 from public.catalog_spells s where s.id = requested.spell_id and s.status = 'published')
  ) then raise exception 'New Grimoire References Must Belong To Published Spells' using errcode = '22023'; end if;
  insert into public.account_grimoires (account_id, data) values (actor_id, p_data)
  on conflict (account_id) do update set data = excluded.data, revision = public.account_grimoires.revision + 1, updated_at = clock_timestamp();
  return app_private.get_grimoire(p_expected_auth_uid);
end; $$;
create function public.get_grimoire(p_expected_auth_uid uuid)
returns jsonb language sql security invoker set search_path = ''
as $$ select app_private.get_grimoire(p_expected_auth_uid); $$;
create function public.save_grimoire(p_data jsonb, p_expected_revision bigint, p_expected_auth_uid uuid)
returns jsonb language sql security invoker set search_path = ''
as $$ select app_private.save_grimoire(p_data, p_expected_revision, p_expected_auth_uid); $$;

revoke all on public.pricing_plan_tiers, public.account_entitlements, public.account_grimoires from public, anon, authenticated, service_role;
grant select on public.pricing_plan_tiers to anon, authenticated;
grant select on public.pricing_plans to service_role;
grant select on public.account_entitlements, public.account_grimoires to authenticated;
revoke all on app_private.billing_configuration, app_private.billing_entitlement_authority,
  app_private.billing_bindings, app_private.billing_operation_leases, app_private.billing_attempts,
  app_private.billing_subscriptions, app_private.billing_events from public, anon, authenticated, service_role;
revoke all on function app_private.sync_pricing_plan_tier(), app_private.initialize_account_entitlement(),
  app_private.owner_archive_pricing_plan(text, bigint, uuid), public.owner_archive_pricing_plan(text, bigint, uuid),
  app_private.billing_attempt_json(text), app_private.billing_context(text), app_private.require_billing_lease(uuid, uuid),
  app_private.billing_operation(text, jsonb), public.billing_operation(text, jsonb),
  app_private.current_billing_account_id(), app_private.billing_entitlement(text), app_private.own_billing_entitlement(), public.own_billing_entitlement(),
  app_private.plan_meets_minimum(text, text), app_private.feature_allows(text),
  app_private.mark_notifications_read_before_feature_gate(text[], uuid), app_private.mark_notifications_read(text[], uuid),
  app_private.submit_contact_before_feature_gate(jsonb, uuid, uuid), app_private.submit_contact(jsonb, uuid, uuid),
  app_private.empty_grimoire(), app_private.validate_grimoire(jsonb), app_private.grimoire_recovery_only(jsonb, jsonb),
  app_private.get_grimoire(uuid), app_private.save_grimoire(jsonb, bigint, uuid),
  public.get_grimoire(uuid), public.save_grimoire(jsonb, bigint, uuid)
from public, anon, authenticated, service_role;
grant usage on schema app_private to anon, authenticated, service_role;
grant execute on function app_private.billing_operation(text, jsonb), public.billing_operation(text, jsonb) to service_role;
grant execute on function app_private.current_billing_account_id(), app_private.own_billing_entitlement(), public.own_billing_entitlement(),
  app_private.owner_archive_pricing_plan(text, bigint, uuid), public.owner_archive_pricing_plan(text, bigint, uuid),
  app_private.mark_notifications_read(text[], uuid), app_private.get_grimoire(uuid), app_private.save_grimoire(jsonb, bigint, uuid),
  public.get_grimoire(uuid), public.save_grimoire(jsonb, bigint, uuid) to authenticated;
grant execute on function app_private.feature_allows(text), app_private.submit_contact(jsonb, uuid, uuid) to anon, authenticated;

do $$
declare table_name text;
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    raise exception 'Confirm The Realtime Publication Before Applying Billing';
  end if;
  foreach table_name in array array['account_entitlements', 'account_grimoires', 'pricing_plan_tiers'] loop
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime'
      and schemaname = 'public' and tablename = table_name) then
      execute format('alter publication supabase_realtime add table public.%I', table_name);
    end if;
  end loop;
end; $$;
comment on table public.account_entitlements is 'Server-owned minimal own-account entitlement mirror. Paid access expires during evaluation; catalog edits and profile writes cannot assign a plan.';
comment on table public.pricing_plan_tiers is 'Public-safe stable tier ranks including inactive plans. Catalog writes maintain equality atomically; pricing publication remains separate.';
comment on table public.account_grimoires is 'Private account grimoire. Account-locked CAS writes enforce current feature audiences and authoritative document quotas; downgraded accounts retain read/export/removal recovery.';
comment on function public.billing_operation(text, jsonb) is 'Service-role-only Stripe persistence boundary. The hosted server separately verifies sessions/signatures, provider app/account/mode, resource bindings, price and paid invoice evidence before calling.';
commit;
