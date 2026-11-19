-- Run with psql as the database owner on a disposable database after the pilot baseline.
-- Auth identities are isolated test fixtures. The transaction rolls them back.
begin;

insert into auth.users (id, email) values
  ('11111111-1111-4111-8111-111111111111', 'cashier@example.test'),
  ('22222222-2222-4222-8222-222222222222', 'manager@example.test'),
  ('33333333-3333-4333-8333-333333333333', 'unassigned@example.test');
insert into public.staff_profiles (user_id, display_name, role) values
  ('11111111-1111-4111-8111-111111111111', 'Test cashier', 'employee'),
  ('22222222-2222-4222-8222-222222222222', 'Test manager', 'manager');
insert into public.services (id, name, price) values (-1001, 'Test wash', 150);
insert into public.addons (id, name, price) values (-1001, 'Test detergent', 25);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","email":"cashier@example.test","user_metadata":{"role":"manager"}}', true);

do $$
<<pilot_integrity>>
declare
  request_id uuid := '00000000-0000-4000-8000-000000000001';
  payment_request uuid := '00000000-0000-4000-8000-000000000002';
  order_id uuid;
  cancelled_candidate uuid;
  payment_id uuid;
  prior_update timestamptz;
  items jsonb := '[{"id":-1001,"quantity":1}]';
  addons jsonb := '[{"id":-1001,"quantity":2}]';
begin
  if public.get_staff_role() is distinct from 'employee' or (select count(*) from public.staff_profiles) <> 1 then
    raise exception 'Cashier permissions used client metadata or disclosed other profiles';
  end if;

  begin
    -- The duplicate line fails after inserting the order header.
    perform public.save_order(request_id, null, 'Interrupted', null, null, null, items || items, addons, null, 350, null);
    raise exception 'Duplicate service was accepted';
  exception when unique_violation then null;
  end;
  if exists (select 1 from public.orders where customer_name = 'Interrupted') then
    raise exception 'Incomplete order survived a line-item failure';
  end if;

  order_id := public.save_order(request_id, null, 'Order for review', '0917-555-0100', null, null, items, addons, null, 200, null);
  if public.save_order(request_id, null, 'Order for review', '0917-555-0100', null, null, items, addons, null, 200.00, null) <> order_id then
    raise exception 'Retry generated a different order';
  end if;
  if (select count(*) from public.orders where customer_name = 'Order for review') <> 1 or
     not exists (select 1 from public.orders where id = order_id and total = 200 and search_text like '%09175550100%') then
    raise exception 'Order snapshot, claim search, or retry state is incorrect';
  end if;

  begin
    perform public.save_order(request_id, null, 'Different order', null, null, null, items, addons, null, 200, null);
    raise exception 'Request ID was accepted for a different order payload';
  exception when invalid_parameter_value then null;
  end;

  select updated_at into prior_update from public.orders where id = order_id;
  begin
    perform public.save_order(gen_random_uuid(), order_id, 'Changed name', null, null, null, items || items, addons, null, 350, prior_update);
    raise exception 'Duplicate line was accepted on edit';
  exception when unique_violation then null;
  end;
  if not exists (select 1 from public.orders where id = order_id and customer_name = 'Order for review')
    or not exists (select 1 from public.order_addons a where a.order_id = pilot_integrity.order_id and a.total = 50)
    or not exists (select 1 from public.order_items i where i.order_id = pilot_integrity.order_id and i.price = 150) then
    raise exception 'Failed edit changed saved data';
  end if;

  begin
    perform public.save_order(gen_random_uuid(), order_id, 'Underpriced', null, null, null, items, addons, null, 199, prior_update);
    raise exception 'Submitted price mismatch was accepted';
  exception when invalid_parameter_value then null;
  end;

  perform public.advance_order(order_id, 'done');
  begin
    perform public.save_order(gen_random_uuid(), order_id, 'Stale edit', null, null, null, items, addons, null, 200, prior_update);
    raise exception 'Stale edit was accepted';
  exception when invalid_parameter_value then null;
  end;
  begin
    perform public.advance_order(order_id, 'released');
    raise exception 'Order was released without payment';
  exception when invalid_parameter_value then null;
  end;
  begin
    perform public.record_order_payment(order_id, payment_request, 'gcash', 199);
    raise exception 'Payment recorded for a different displayed amount';
  exception when invalid_parameter_value then null;
  end;
  payment_id := public.record_order_payment(order_id, payment_request, 'gcash', 200);
  perform public.advance_order(order_id, 'released');
  if public.record_order_payment(order_id, payment_request, 'gcash', 200) <> payment_id then
    raise exception 'Retry generated a different payment after release';
  end if;
  if not exists (select 1 from public.orders where id = order_id and payment_status and status = 'released') then
    raise exception 'Paid order was not released';
  end if;

  if exists (select 1 from public.order_payments) or exists (select 1 from public.order_audit) then
    raise exception 'Cashier can read manager-only data';
  end if;
  begin
    update public.orders set status = 'cancelled' where id = order_id;
    raise exception 'Direct write bypassed the order functions';
  exception when insufficient_privilege then null;
  end;
  cancelled_candidate := public.save_order(gen_random_uuid(), null, 'Void candidate', null, null, null, items, '[]', null, 150, null);
  begin
    perform public.void_order(cancelled_candidate, 'Failed authorization test');
    raise exception 'Cashier can void orders';
  exception when insufficient_privilege then null;
  end;
  perform public.save_order(gen_random_uuid(), null, 'Paid at intake', null, null, null, items, '[]', 'cash', 150, null);
end;
$$;

select set_config('request.jwt.claims', '{"sub":"22222222-2222-4222-8222-222222222222","email":"manager@example.test"}', true);

do $$
declare
  cancelled_id uuid;
  released_id uuid;
begin
  if public.get_staff_role() is distinct from 'manager' or (select count(*) from public.staff_profiles) < 2 then
    raise exception 'Manager cannot see staff profiles';
  end if;
  select id into released_id from public.orders where customer_name = 'Order for review';
  if (select count(*) from public.order_payments where order_id = released_id and amount = 200 and method = 'gcash') <> 1 then
    raise exception 'Collection ledger differs from the saved checkout';
  end if;
  if not exists (
    select 1 from public.order_payments p join public.orders o on o.id = p.order_id
    where o.customer_name = 'Paid at intake' and o.payment_status and p.amount = 150 and p.method = 'cash'
  ) then
    raise exception 'Payment at intake was not recorded with the order';
  end if;
  begin
    perform public.void_order(released_id, 'Already collected');
    raise exception 'Manager could void a collected order';
  exception when invalid_parameter_value then null;
  end;

  select id into cancelled_id from public.orders where customer_name = 'Void candidate';
  perform public.void_order(cancelled_id, 'Customer cancelled');
  perform public.void_order(cancelled_id, 'Customer cancelled');
  if not exists (select 1 from public.orders where id = cancelled_id and status = 'cancelled') or
    (select count(*) from public.order_audit where order_id = cancelled_id and action = 'cancelled'
      and recorded_by = auth.uid() and reason = 'Customer cancelled') <> 1 then
    raise exception 'Voiding did not preserve the order and a single audit event';
  end if;
end;
$$;

select set_config('request.jwt.claims', '{"sub":"33333333-3333-4333-8333-333333333333","user_metadata":{"role":"manager"}}', true);

do $$
begin
  if public.get_staff_role() is not null or exists (select 1 from public.orders) or exists (select 1 from public.services) then
    raise exception 'Unassigned login can read shop data';
  end if;
  begin
    perform public.save_order(gen_random_uuid(), null, 'Denied', null, null, null, '[{"id":-1001,"quantity":1}]', '[]', null, 150, null);
    raise exception 'Unassigned login can save orders';
  exception when insufficient_privilege then null;
  end;
end;
$$;

rollback;
