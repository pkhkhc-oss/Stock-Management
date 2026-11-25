# BeanFlow Coffee POS — Clone

A responsive coffee-shop POS/admin dashboard recreated from the supplied compiled app bundle.

## Included modules
- Point of Sale: menu search, category filters, cart quantities, tax calculation and checkout
- Dashboard: sales, order, product and pending-order summary
- Order management: search, filter and update order status
- Kitchen display: preparation queue and status progression
- Products and categories: add/edit/delete catalogue records
- Reports: sales summary and CSV export
- Settings: store profile, JSON backup and optional Supabase connection

## Run locally
1. Extract the ZIP.
2. Open `index.html` in Chrome/Edge, or serve the folder:
   ```bash
   python -m http.server 8080
   ```
3. Visit `http://localhost:8080`.

The app works in demo mode and saves data in browser local storage. No build step is required.

## Connect Supabase
1. Create a Supabase project.
2. Open SQL Editor and run `supabase/schema.sql`.
3. In the app, open **Settings → Supabase connection**.
4. Enter your Project URL and anon public key, then click **Connect database**.

The browser app uses the Supabase anon key only. Configure Row Level Security and policies before production use. Do not expose a service-role key in client-side code.

## Important limitations
This is a functional frontend clone based on the supplied compiled JavaScript bundle. The upload did not include the original backend/API server, server-side authorization, payment gateway, receipt printer integration, or original production database. Those integrations are not reproduced. Supabase mode expects the schema in this project and appropriate RLS policies. Demo checkout does not process real payments.

## Phase 2 backend foundation

See [`PHASE2_SETUP.md`](PHASE2_SETUP.md) and run [`supabase/phase2_security.sql`](supabase/phase2_security.sql) after the original schema to add branch-scoped staff roles, customer records, inventory movement history, audit logs, and authenticated Row Level Security. This migration disables the original development-only anon policies. The current frontend still requires Phase 2 UI wiring before live production use.

## Category image upload

- Open **Categories** → **Add category** or **Edit / Image**.
- Choose a PNG, JPG, or WEBP image (up to 5 MB). The app resizes and compresses it before saving.
- In demo/local mode, the image is stored in this browser's local storage. It will not automatically appear on another device.
- For Supabase Storage, run `supabase/category-images.sql` after `schema.sql` and `phase2_security.sql`. The bucket is public-read; uploads/updates/deletes require an authenticated staff account with owner, admin, or manager role. The current starter UI does not yet include staff sign-in, so unauthenticated uploads fall back to local browser storage.


## Phase 3: receipt printing, cash out and staff login / permissions

### Receipt printing
- After checkout, confirm whether to print the customer receipt.
- Open **Orders** and click **Print receipt** to reprint.
- The print layout is sized for an 80 mm thermal receipt. Browser print settings control the actual printer and paper size.
- This uses the browser print dialog; direct ESC/POS or silent printer integration is not included.

### Cash out
- Open **Cash Out** and select **Record cash out**.
- Enter an amount and reason; the record stores staff name, reference and timestamp.
- Export cash-out history as CSV.
- In Supabase mode, run `supabase/phase3_cashout.sql` after Phase 2. Cash-out records are branch-scoped and restricted by RLS.

### Staff login and roles
- Supabase login uses Supabase Auth email/password plus the `staff_profiles` record created by Phase 2.
- Owner / Administrator: all modules and staff profile provisioning.
- Manager: POS, dashboard, orders, cash out, kitchen, products, categories and reports.
- Cashier: POS, orders and cash out.
- Kitchen: Kitchen Display only.
- Create staff users in Supabase Dashboard → Authentication → Users. Then sign in as an Owner/Admin and use Settings → Staff access & roles to assign the Auth user UUID, full name, branch UUID and role.
- The browser app never creates Auth users or stores staff passwords. Do not expose a Supabase service-role key.
- Demo login is provided to preview role-specific navigation only. It is browser-local and is NOT a secure authentication mechanism. For real deployment, use Supabase Auth and the Phase 2/3 RLS migrations. Database RLS—not just hidden navigation—must enforce access.

### Deployment SQL order
1. `supabase/schema.sql` (only if starting from a fresh project)
2. `supabase/phase2_security.sql`
3. `supabase/category-images.sql` (if using category image uploads)
4. `supabase/phase3_cashout.sql`

### Important production notes
- Receipt printing relies on a browser print dialog. Connect/configure the thermal printer in the operating system and select 80 mm paper in print settings.
- This starter does not implement direct drawer-kick hardware control, automatic cash reconciliation, or payment terminal integration.
- Ensure existing Phase 2 staff profile records and branch UUIDs are provisioned correctly before enabling live staff sign-in.
