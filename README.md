# Laundry POS

An online point of sale for laundry shops. Counter staff can accept orders, record full payments, and release completed laundry. Managers can review daily collections and export reports. Run a separate app deployment and Supabase project for each shop.

## Set up a new shop

1. Have the shop owner create the Supabase project and the hosting account. In the project's SQL Editor, run the files in [supabase/migrations](supabase/migrations/) in filename order on the **empty project**. These files are the baseline for a new shop. If a project already has orders, take a backup, inspect its schema and policies, and plan a separate migration before switching its app to this version.
2. In Supabase Authentication, disable public email sign-up and create the manager and cashier accounts. Find each account's User UID in Authentication → Users. In the SQL Editor, register each UID with its display name and role. Use `manager` for the owner and `employee` for counter staff. The role lives in the database profile.

   ```sql
   insert into public.staff_profiles (user_id, display_name, role)
   values ('REPLACE-WITH-AUTH-USER-UUID', 'Shop owner', 'manager');
   ```

   To disable POS access for a departing cashier, set their `active` flag to `false` in `staff_profiles`. Keep the profile so records retain their staff attribution. During the pilot the project administrator handles account changes through Supabase. Managers can see the staff directory in the POS.
3. Add the shop's service and add-on catalog in the Supabase Table Editor. Set names, prices in pesos, and whether each item is active. Verify the prices against the shop's price list. Deactivate an item when it is discontinued so historical orders keep their original details.
4. Install and build with Node.js 24 and npm 11. Copy `.env.example` to `.env.local` for local development and replace the two Supabase values. Set `VITE_SHOP_NAME` to the shop name used in the app and on claim stubs. Use the project's publishable key or legacy anon key. Keep administrative keys out of browser builds.

   ```sh
   npm ci
   npm run dev
   npm run build
   ```

   On the hosting service, set the same variables at build time, publish `dist`, and configure SPA fallback to `index.html` for URLs such as `/orders`, `/dashboard`, and `/users`. Configure Supabase Authentication's Site URL to match the deployment. Use a dedicated origin per shop.
5. Run the go-live check below with disposable orders in a test project that uses the same migrations, price list, and role setup. Configure the real shop's backup routine and test a restore before handing it over. Review [Supabase's database backup and restore guidance](https://supabase.com/docs/guides/platform/backups) for the project's plan. Store backups in restricted storage outside the project and restore a copy to a separate test project. Verify the restored orders, payments, and staff sign-in. Excel downloads are sales records for analysis.

## Go-live check

- Sign in as a cashier. Create an unpaid order with a service and add-on. Find it by claim number, print the claim stub, and mark it done. Confirm it cannot be released before payment.
- Record Cash or GCash at pickup, then release the order. Have the manager compare the recorded collection against the closing totals. Run a payment on a different day from order intake and check that it appears on the payment date in Philippine time. Compare the Excel export with the dashboard.
- Interrupt a checkout in the test project and use the same form’s Retry save button. Verify exactly one complete order and at most one payment appear. Confirm that a manager can void an unpaid order with a reason and that a cashier cannot. Verify a disabled staff account cannot open order data.
- Agree on a paper outage procedure. If the counter loses its connection, use numbered paper entries, then reconcile them against the order list before recording them online. If you closed an unconfirmed checkout, search for it first to avoid entering it twice. The installed web app requires an internet connection for order and payment writes.

The pilot supports full payments. Deposits and refunds need a separate process. Paid and released orders are locked in the POS, so record any refund separately when reconciling the books.

## Developer checks

Run `npm run lint` and `npm run build` before deployment. With `psql` connected as the database owner to a disposable test project that already has the baseline, run:

```sh
psql -X -v ON_ERROR_STOP=1 -f supabase/tests/pilot_integrity.sql
```

The SQL check exercises rollback, retry, payment, release, and access rules with fixture accounts. Run it only in a disposable project. It rolls back fixture rows, and PostgreSQL sequences may still advance.
