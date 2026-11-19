-- Run with psql as the database owner on a disposable database after both migrations.
begin;

insert into auth.users (id, email) values
  ('44444444-4444-4444-8444-444444444444', 'cashier-adjustments@example.test'),
  ('55555555-5555-4555-8555-555555555555', 'manager-adjustments@example.test');
insert into public.staff_profiles (user_id, display_name, role) values
  ('44444444-4444-4444-8444-444444444444', 'Adjustments cashier', 'employee'),
  ('55555555-5555-4555-8555-555555555555', 'Adjustments manager', 'manager');
insert into public.services (id, name, price) values (-1042, 'Test dry', 150);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"44444444-4444-4444-8444-444444444444","email":"cashier-adjustments@example.test"}', true);

do $$
declare
  items jsonb := '[{"id":-1042,"quantity":1}]';
  pending_id uuid;
  paid_id uuid;
  complimentary_id uuid;
  deferred_complimentary_id uuid;
  initial_discount_at timestamptz;
  prior_update timestamptz;
  settlement_request uuid := gen_random_uuid();
  settlement_id uuid;
  edited_id uuid;
begin
  begin
    perform public.save_order(gen_random_uuid(), null, 'Missing reason', null, null, null, items, '[]', null, 150, null, 10, null, false);
    raise exception 'An unexplained discount was accepted';
  exception when invalid_parameter_value then null;
  end;

  begin
    perform public.save_order(gen_random_uuid(), null, 'Unmarked complimentary', null, null, null, items, '[]', null, 150, null, 150, 'Full amount', false);
    raise exception 'A zero final total was accepted without choosing Complimentary';
  exception when invalid_parameter_value then null;
  end;

  pending_id := public.save_order(gen_random_uuid(), null, 'Discounted at intake', null, null, null, items, '[]', null, 150, null, 20, 'Loyalty', false);
  select discount_at, updated_at into initial_discount_at, prior_update from public.orders where id = pending_id;
  if not exists (select 1 from public.orders where id = pending_id and subtotal = 150 and total = 130 and discount_amount = 20
      and not payment_status and discount_reason = 'Loyalty' and discount_by = auth.uid()) then
    raise exception 'Intake discount did not retain the correct balance and details';
  end if;
  perform public.record_order_payment(pending_id, gen_random_uuid(), 'cash', 130, null, null, false, prior_update);
  if not exists (select 1 from public.orders where id = pending_id and total = 130 and payment_status
      and discount_reason = 'Loyalty' and discount_at = initial_discount_at) then
    raise exception 'Settling an existing discount changed its details';
  end if;

  paid_id := public.save_order(gen_random_uuid(), null, 'Discount at pickup', null, null, null, items, '[]', null, 150, null);
  select updated_at into prior_update from public.orders where id = paid_id;
  settlement_id := public.record_order_payment(paid_id, settlement_request, 'gcash', 150, 25.75, 'Promotion', false, prior_update);
  if public.record_order_payment(paid_id, settlement_request, 'gcash', 150, 25.75, 'Promotion', false, prior_update) <> settlement_id then
    raise exception 'Retry returned a different discounted payment';
  end if;
  begin
    perform public.record_order_payment(paid_id, settlement_request, 'gcash', 150, 20, 'Promotion', false, prior_update);
    raise exception 'Settlement request ID was reused with a changed discount';
  exception when invalid_parameter_value then null;
  end;

  complimentary_id := public.save_order(gen_random_uuid(), null, 'Comp at intake', null, null, null, items, '[]', null, 150, null, null, 'Quality guarantee', true);
  if not exists (select 1 from public.orders where id = complimentary_id and payment_status and subtotal = 150 and total = 0
      and discount_amount = 150 and discount_reason = 'Quality guarantee') then
    raise exception 'Complimentary checkout did not settle at zero';
  end if;

  deferred_complimentary_id := public.save_order(gen_random_uuid(), null, 'Comp at pickup', null, null, null, items, '[]', null, 150, null);
  select updated_at into prior_update from public.orders where id = deferred_complimentary_id;
  perform public.advance_order(deferred_complimentary_id, 'done');
  begin
    perform public.record_order_payment(deferred_complimentary_id, gen_random_uuid(), null, 150, null, 'Service recovery', true, prior_update);
    raise exception 'Changing the order while the settlement form was open did not invalidate it';
  exception when invalid_parameter_value then null;
  end;
  select updated_at into prior_update from public.orders where id = deferred_complimentary_id;
  settlement_request := gen_random_uuid();
  settlement_id := public.record_order_payment(deferred_complimentary_id, settlement_request, null, 150, null, 'Service recovery', true, prior_update);
  perform public.advance_order(deferred_complimentary_id, 'released');
  if public.record_order_payment(deferred_complimentary_id, settlement_request, null, 150, null, 'Service recovery', true, prior_update) <> settlement_id then
    raise exception 'Complimentary settlement retry after release did not return the original result';
  end if;

  edited_id := public.save_order(gen_random_uuid(), null, 'Corrected discount', null, null, null, items, '[]', null, 150, null, 30, 'Draft discount', false);
  select updated_at into prior_update from public.orders where id = edited_id;
  perform public.save_order(gen_random_uuid(), edited_id, 'Corrected discount', null, null, null, items, '[]', null, 150, prior_update, 0, 'Not applicable', false);
  if not exists (select 1 from public.orders where id = edited_id and total = 150 and discount_amount = 0 and discount_at is null
      and discount_by is null and discount_reason is null and not payment_status) then
    raise exception 'Removing a draft discount did not restore its original balance';
  end if;
end;
$$;

select set_config('request.jwt.claims', '{"sub":"55555555-5555-4555-8555-555555555555","email":"manager-adjustments@example.test"}', true);

do $$
declare
  cancelled_id uuid;
  released_id uuid;
begin
  if (select count(*) from public.order_payments p join public.orders o on o.id = p.order_id
        where o.customer_name = 'Discounted at intake' and p.amount = 130 and p.method = 'cash') <> 1
    or (select count(*) from public.order_payments p join public.orders o on o.id = p.order_id
        where o.customer_name = 'Discount at pickup' and p.amount = 124.25 and p.method = 'gcash') <> 1 then
    raise exception 'Collection ledger does not reflect discounted amounts';
  end if;
  if exists (select 1 from public.order_payments p join public.orders o on o.id = p.order_id
      where o.customer_name in ('Comp at intake', 'Comp at pickup')) then
    raise exception 'Complimentary orders generated payment ledger entries';
  end if;
  if (select count(*) from public.order_audit a join public.orders o on o.id = a.order_id
      where o.customer_name in ('Comp at intake', 'Comp at pickup') and a.action = 'complimentary'
      and a.recorded_by = '44444444-4444-4444-8444-444444444444' and a.subtotal = 150 and a.total = 0) <> 2 then
    raise exception 'A complimentary adjustment is missing its cashier audit event';
  end if;
  if not exists (select 1 from public.order_audit a join public.orders o on o.id = a.order_id
      where o.customer_name = 'Corrected discount' and a.action = 'adjusted'
      and a.previous_discount_amount = 30 and a.discount_amount = 0 and a.reason = 'Not applicable') then
    raise exception 'Discount correction audit is missing original amount and reason';
  end if;

  select id into cancelled_id from public.orders where customer_name = 'Comp at intake';
  perform public.void_order(cancelled_id, 'Mistaken courtesy');
  if not exists (select 1 from public.orders where id = cancelled_id and status = 'cancelled' and discount_amount = 150) then
    raise exception 'Voiding an unreleased complimentary order lost its discount history';
  end if;

  select id into released_id from public.orders where customer_name = 'Comp at pickup';
  begin
    perform public.void_order(released_id, 'Already released');
    raise exception 'A released complimentary order can be voided';
  exception when invalid_parameter_value then null;
  end;
end;
$$;

rollback;
