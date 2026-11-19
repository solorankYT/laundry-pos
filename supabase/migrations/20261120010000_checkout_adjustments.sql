begin;

alter table public.orders
  add column subtotal numeric(12, 2),
  add column discount_amount numeric(12, 2) not null default 0,
  add column discount_reason text,
  add column discount_by uuid,
  add column discount_at timestamptz;

update public.orders set subtotal = total;

alter table public.orders
  alter column subtotal set not null,
  drop constraint orders_total_check,
  add constraint orders_subtotal_check check (subtotal > 0 and subtotal < 10000000000),
  add constraint orders_adjustment_amount_check check (
    discount_amount between 0 and subtotal and total = subtotal - discount_amount
  ),
  add constraint orders_zero_balance_settled_check check (total > 0 or payment_status),
  add constraint orders_adjustment_details_check check (
    (discount_amount = 0 and discount_reason is null and discount_by is null and discount_at is null)
    or (discount_amount > 0 and discount_reason is not null and char_length(btrim(discount_reason)) between 1 and 500
      and discount_by is not null and discount_at is not null)
  );

alter table public.order_audit
  drop constraint order_audit_action_check,
  add constraint order_audit_action_check check (
    action in ('created', 'edited', 'done', 'released', 'cancelled', 'paid', 'adjusted', 'complimentary')
  ),
  add column previous_discount_amount numeric(12, 2),
  add column discount_amount numeric(12, 2),
  add column subtotal numeric(12, 2),
  add column total numeric(12, 2);

create table laundry_private.order_settlement_requests (
  request_id uuid primary key,
  actor_id uuid not null,
  payload_hash bytea not null,
  order_id uuid not null references public.orders (id),
  result_id uuid not null
);
alter table laundry_private.order_settlement_requests enable row level security;

create function laundry_private.resolve_discount(
  p_subtotal numeric,
  p_previous_amount numeric,
  p_previous_reason text,
  p_discount_amount numeric,
  p_reason text,
  p_complimentary boolean
)
returns table (amount numeric, reason text)
language plpgsql
immutable
set search_path = ''
as $$
declare
  requested_reason text := nullif(btrim(p_reason), '');
begin
  if p_complimentary is null then
    raise exception 'Choose how to settle the order.' using errcode = '22023';
  end if;

  if p_complimentary then
    amount := p_subtotal;
    if p_discount_amount is not null and p_discount_amount <> p_subtotal then
      raise exception 'A complimentary order must cover the full subtotal.' using errcode = '22023';
    end if;
  else
    amount := coalesce(p_discount_amount, p_previous_amount, 0);
  end if;

  if amount < 0 or amount > p_subtotal or amount <> round(amount, 2)
      or (amount = p_subtotal and not p_complimentary) then
    raise exception 'Enter a valid discount below the subtotal, or select Complimentary.' using errcode = '22023';
  end if;

  reason := requested_reason;
  if amount > 0 then
    if not p_complimentary and amount = p_previous_amount then
      reason := coalesce(reason, p_previous_reason);
    end if;
    if reason is null or char_length(reason) > 500 then
      raise exception 'Enter an adjustment reason of up to 500 characters.' using errcode = '22023';
    end if;
  elsif char_length(reason) > 500 then
    raise exception 'Enter an adjustment reason of up to 500 characters.' using errcode = '22023';
  end if;

  return next;
end;
$$;

create function laundry_private.audit_discount(
  p_order_id uuid,
  p_previous_amount numeric,
  p_amount numeric,
  p_subtotal numeric,
  p_reason text,
  p_complimentary boolean
)
returns void
language sql
set search_path = ''
as $$
  insert into public.order_audit (
    order_id, action, reason, recorded_by, recorded_by_email, previous_discount_amount, discount_amount, subtotal, total
  ) values (
    p_order_id, case when p_complimentary then 'complimentary' else 'adjusted' end, p_reason,
    auth.uid(), auth.jwt()->>'email', coalesce(p_previous_amount, 0), p_amount, p_subtotal, p_subtotal - p_amount
  )
$$;

drop function public.save_order(uuid, uuid, text, text, timestamptz, text, jsonb, jsonb, text, numeric, timestamptz);
drop function public.record_order_payment(uuid, uuid, text, numeric);

create function public.record_order_payment(
  p_order_id uuid,
  p_request_id uuid,
  p_method text,
  p_expected_total numeric,
  p_discount_amount numeric default null,
  p_adjustment_reason text default null,
  p_complimentary boolean default false,
  p_expected_updated_at timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := laundry_private.require_staff();
  target_order public.orders%rowtype;
  existing_request laundry_private.order_settlement_requests%rowtype;
  existing_payment public.order_payments%rowtype;
  request_hash bytea;
  settlement_id uuid;
  adjustment record;
  discount_changed boolean;
  payable numeric;
  requested_reason text := nullif(btrim(p_adjustment_reason), '');
begin
  if p_request_id is null or p_expected_total is null or p_complimentary is null
      or (p_complimentary and p_method is not null)
      or (not p_complimentary and (p_method is null or p_method not in ('cash', 'gcash', 'other'))) then
    raise exception 'Select a valid payment method or choose Complimentary.' using errcode = '22023';
  end if;

  request_hash := sha256(convert_to(jsonb_build_array(
    p_order_id, p_method, trim_scale(p_expected_total), trim_scale(p_discount_amount),
    requested_reason, p_complimentary, extract(epoch from p_expected_updated_at)
  )::text, 'UTF8'));

  select * into target_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'Order not found.' using errcode = 'P0002';
  end if;

  select * into existing_request from laundry_private.order_settlement_requests where request_id = p_request_id;
  if found then
    if existing_request.actor_id <> actor_id or existing_request.payload_hash <> request_hash then
      raise exception 'Settlement request does not match the original settlement.' using errcode = '22023';
    end if;
    return existing_request.result_id;
  end if;

  -- Retried payments written before this migration have only the ledger request ID.
  select * into existing_payment from public.order_payments where request_id = p_request_id;
  if found then
    if existing_payment.order_id <> p_order_id or existing_payment.recorded_by <> actor_id
        or existing_payment.method <> p_method or existing_payment.amount <> p_expected_total
        or p_discount_amount is not null or requested_reason is not null or p_complimentary then
      raise exception 'Payment request does not match the original payment.' using errcode = '22023';
    end if;
    return existing_payment.id;
  end if;

  if target_order.status in ('cancelled', 'released') or target_order.payment_status then
    raise exception 'This order cannot accept another payment or adjustment.' using errcode = '22023';
  end if;
  if target_order.total <> p_expected_total
      or (p_expected_updated_at is not null and target_order.updated_at <> p_expected_updated_at) then
    raise exception 'The order changed. Refresh it and confirm the new total.' using errcode = '22023';
  end if;

  select * into adjustment from laundry_private.resolve_discount(
    target_order.subtotal, target_order.discount_amount, target_order.discount_reason,
    p_discount_amount, requested_reason, p_complimentary
  );
  discount_changed := adjustment.amount <> target_order.discount_amount
    or (adjustment.amount > 0 and adjustment.reason is distinct from target_order.discount_reason);
  payable := target_order.subtotal - adjustment.amount;

  if p_complimentary then
    settlement_id := p_order_id;
  else
    insert into public.order_payments (request_id, order_id, amount, method, recorded_by, recorded_by_email)
    values (p_request_id, p_order_id, payable, p_method, actor_id, auth.jwt()->>'email')
    returning id into settlement_id;
    perform laundry_private.audit_order(p_order_id, 'paid');
  end if;

  update public.orders set
    payment_status = true,
    total = payable,
    discount_amount = adjustment.amount,
    discount_reason = case when adjustment.amount > 0 then adjustment.reason end,
    discount_by = case when adjustment.amount > 0 then
      case when discount_changed then actor_id else target_order.discount_by end end,
    discount_at = case when adjustment.amount > 0 then
      case when discount_changed then clock_timestamp() else target_order.discount_at end end,
    updated_at = clock_timestamp()
  where id = p_order_id;

  if discount_changed then
    perform laundry_private.audit_discount(
      p_order_id, target_order.discount_amount, adjustment.amount, target_order.subtotal, adjustment.reason, p_complimentary
    );
  end if;
  insert into laundry_private.order_settlement_requests (request_id, actor_id, payload_hash, order_id, result_id)
  values (p_request_id, actor_id, request_hash, p_order_id, settlement_id);
  return settlement_id;
end;
$$;

create function public.save_order(
  p_request_id uuid,
  p_order_id uuid,
  p_customer_name text,
  p_customer_phone text,
  p_pickup_at timestamptz,
  p_notes text,
  p_items jsonb,
  p_addons jsonb,
  p_payment_method text,
  p_expected_total numeric,
  p_expected_updated_at timestamptz,
  p_discount_amount numeric default null,
  p_adjustment_reason text default null,
  p_complimentary boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  acting_user uuid := laundry_private.require_staff();
  target_order public.orders%rowtype;
  existing_request laundry_private.order_save_requests%rowtype;
  order_uuid uuid;
  request_payload jsonb;
  request_hash bytea;
  normalized_name text := btrim(p_customer_name);
  normalized_phone text := nullif(btrim(p_customer_phone), '');
  normalized_notes text := nullif(btrim(p_notes), '');
  item_count integer;
  addon_count integer;
  item_snapshot jsonb;
  addon_snapshot jsonb;
  item_total numeric;
  addon_total numeric;
  order_subtotal numeric;
  adjustment record;
  discount_changed boolean;
  requested_reason text := nullif(btrim(p_adjustment_reason), '');
begin
  if p_request_id is null or normalized_name is null or char_length(normalized_name) not between 1 and 120
      or char_length(normalized_phone) > 40 or char_length(normalized_notes) > 2000 or p_expected_total is null then
    raise exception 'Enter a customer name and valid order details.' using errcode = '22023';
  end if;
  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_typeof(p_addons) is distinct from 'array' then
    raise exception 'Services and add-ons must be lists.' using errcode = '22023';
  end if;
  if jsonb_array_length(p_items) not between 1 and 100 or jsonb_array_length(p_addons) > 100 then
    raise exception 'Select at least one service and up to 100 services or add-ons per order.' using errcode = '22023';
  end if;
  if p_complimentary is null or (p_payment_method is not null
      and (p_order_id is not null or p_complimentary or p_payment_method not in ('cash', 'gcash', 'other'))) then
    raise exception 'Select a valid payment method for a new order.' using errcode = '22023';
  end if;

  -- Leave the original payload intact for unchanged clients and pre-migration request IDs.
  request_payload := jsonb_build_array(
    p_order_id, normalized_name, normalized_phone, extract(epoch from p_pickup_at), normalized_notes,
    p_items, p_addons, p_payment_method, trim_scale(p_expected_total), extract(epoch from p_expected_updated_at)
  );
  if p_discount_amount is not null or requested_reason is not null or p_complimentary then
    request_payload := request_payload || jsonb_build_array(trim_scale(p_discount_amount), requested_reason, p_complimentary);
  end if;
  request_hash := sha256(convert_to(request_payload::text, 'UTF8'));
  insert into laundry_private.order_save_requests (request_id, actor_id, payload_hash)
  values (p_request_id, acting_user, request_hash) on conflict (request_id) do nothing;
  if not found then
    select * into existing_request from laundry_private.order_save_requests where request_id = p_request_id;
    if existing_request.actor_id <> acting_user or existing_request.payload_hash <> request_hash then
      raise exception 'Order request does not match the original save.' using errcode = '22023';
    end if;
    return existing_request.order_id;
  end if;

  if p_order_id is not null then
    select * into target_order from public.orders where id = p_order_id for update;
    if not found then
      raise exception 'Order not found.' using errcode = 'P0002';
    end if;
    if target_order.status not in ('pending', 'done') or target_order.payment_status then
      raise exception 'Only unpaid, unreleased orders can be edited.' using errcode = '22023';
    end if;
    if target_order.updated_at is distinct from p_expected_updated_at then
      raise exception 'This order changed. Reopen it before saving.' using errcode = '22023';
    end if;
  end if;

  -- Preserve prices and names for existing lines. Use active catalog values for newly added lines.
  select count(*), jsonb_agg(jsonb_build_object('id', s.id, 'quantity', i.quantity,
    'name', coalesce(old.service_name, s.name), 'price', coalesce(old.price, s.price))),
    sum(coalesce(old.price, s.price) * i.quantity)
  into item_count, item_snapshot, item_total
  from jsonb_to_recordset(p_items) as i(id bigint, quantity integer)
  join public.services s on s.id = i.id
  left join public.order_items old on old.order_id = p_order_id and old.service_id = s.id
  where (old.id is not null or s.is_active) and i.quantity between 1 and 1000;

  select count(*), jsonb_agg(jsonb_build_object('id', a.id, 'quantity', i.quantity,
    'name', coalesce(old.addon_name, a.name), 'price', coalesce(old.unit_price, a.price))),
    coalesce(sum(coalesce(old.unit_price, a.price) * i.quantity), 0)
  into addon_count, addon_snapshot, addon_total
  from jsonb_to_recordset(p_addons) as i(id bigint, quantity integer)
  join public.addons a on a.id = i.id
  left join public.order_addons old on old.order_id = p_order_id and old.addon_id = a.id
  where (old.id is not null or a.is_active) and i.quantity between 1 and 1000;

  if item_count <> jsonb_array_length(p_items) or addon_count <> jsonb_array_length(p_addons) then
    raise exception 'Check service and add-on availability and quantities.' using errcode = '22023';
  end if;
  order_subtotal := item_total + addon_total;
  if order_subtotal <> p_expected_total then
    raise exception 'The price changed. Reopen the order form and confirm the new total.' using errcode = '22023';
  end if;
  select * into adjustment from laundry_private.resolve_discount(
    order_subtotal, target_order.discount_amount, target_order.discount_reason,
    p_discount_amount, requested_reason, p_complimentary
  );
  discount_changed := adjustment.amount <> coalesce(target_order.discount_amount, 0)
    or (adjustment.amount > 0 and adjustment.reason is distinct from target_order.discount_reason);

  if p_order_id is null then
    insert into public.orders (
      customer_name, customer_phone, pickup_at, notes, subtotal, total, payment_status,
      discount_amount, discount_reason, discount_by, discount_at, created_by, created_by_email
    ) values (
      normalized_name, normalized_phone, p_pickup_at, normalized_notes, order_subtotal,
      order_subtotal - adjustment.amount, p_complimentary, adjustment.amount,
      case when adjustment.amount > 0 then adjustment.reason end,
      case when adjustment.amount > 0 then acting_user end,
      case when adjustment.amount > 0 then clock_timestamp() end,
      acting_user, auth.jwt()->>'email'
    )
    returning id into order_uuid;
    perform laundry_private.audit_order(order_uuid, 'created');
  else
    order_uuid := p_order_id;
    update public.orders set
      customer_name = normalized_name,
      customer_phone = normalized_phone,
      pickup_at = p_pickup_at,
      notes = normalized_notes,
      subtotal = order_subtotal,
      total = order_subtotal - adjustment.amount,
      payment_status = p_complimentary,
      discount_amount = adjustment.amount,
      discount_reason = case when adjustment.amount > 0 then adjustment.reason end,
      discount_by = case when adjustment.amount > 0 then
        case when discount_changed then acting_user else target_order.discount_by end end,
      discount_at = case when adjustment.amount > 0 then
        case when discount_changed then clock_timestamp() else target_order.discount_at end end,
      updated_at = clock_timestamp()
    where id = order_uuid;
    delete from public.order_addons where order_id = order_uuid;
    delete from public.order_items where order_id = order_uuid;
    perform laundry_private.audit_order(order_uuid, 'edited');
  end if;

  insert into public.order_items (order_id, service_id, service_name, price, quantity)
  select order_uuid, i.id, i.name, i.price, i.quantity
  from jsonb_to_recordset(item_snapshot) as i(id bigint, name text, price numeric, quantity integer);
  insert into public.order_addons (order_id, addon_id, addon_name, unit_price, quantity)
  select order_uuid, a.id, a.name, a.price, a.quantity
  from jsonb_to_recordset(coalesce(addon_snapshot, '[]')) as a(id bigint, name text, price numeric, quantity integer);

  if discount_changed then
    perform laundry_private.audit_discount(
      order_uuid, target_order.discount_amount, adjustment.amount, order_subtotal, adjustment.reason, p_complimentary
    );
  end if;
  if p_payment_method is not null then
    perform public.record_order_payment(order_uuid, p_request_id, p_payment_method, order_subtotal - adjustment.amount);
  end if;

  update laundry_private.order_save_requests set order_id = order_uuid where request_id = p_request_id;
  return order_uuid;
end;
$$;

create or replace function public.void_order(p_order_id uuid, p_reason text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_order public.orders%rowtype;
  normalized_reason text := btrim(p_reason);
begin
  if public.get_staff_role() is distinct from 'manager' then
    raise exception 'A manager account is required to void an order.' using errcode = '42501';
  end if;
  if normalized_reason is null or char_length(normalized_reason) not between 1 and 500 then
    raise exception 'Enter a reason for voiding the order.' using errcode = '22023';
  end if;
  select * into target_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'Order not found.' using errcode = 'P0002';
  end if;
  if target_order.status = 'cancelled' then
    return p_order_id;
  end if;
  if target_order.status = 'released' or (target_order.payment_status and target_order.total > 0) then
    raise exception 'Paid or released orders cannot be voided.' using errcode = '22023';
  end if;
  update public.orders set status = 'cancelled', updated_at = clock_timestamp() where id = p_order_id;
  perform laundry_private.audit_order(p_order_id, 'cancelled', normalized_reason);
  return p_order_id;
end;
$$;

revoke execute on all functions in schema laundry_private from public, anon, authenticated;
revoke execute on function
  public.save_order(uuid, uuid, text, text, timestamptz, text, jsonb, jsonb, text, numeric, timestamptz, numeric, text, boolean),
  public.record_order_payment(uuid, uuid, text, numeric, numeric, text, boolean, timestamptz)
  from public, anon, authenticated;
grant execute on function
  public.save_order(uuid, uuid, text, text, timestamptz, text, jsonb, jsonb, text, numeric, timestamptz, numeric, text, boolean),
  public.record_order_payment(uuid, uuid, text, numeric, numeric, text, boolean, timestamptz)
  to authenticated;

commit;
