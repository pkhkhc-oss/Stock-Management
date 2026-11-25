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
