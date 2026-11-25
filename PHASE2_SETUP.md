# BeanFlow POS — Phase 2 backend foundation

Phase 2 adds a secure multi-branch database foundation for staff access, customers, stock movements and audit history.

## 1. Apply the migration

1. Open your Supabase project.
2. Go to **SQL Editor → New query**.
3. Run `supabase/schema.sql` first if you have not already created the Phase 1 database.
4. Run `supabase/phase2_security.sql`.
5. Confirm the new tables exist: `branches`, `staff_profiles`, `customers`, `inventory_movements`, and `audit_logs`.

**Important:** The Phase 2 migration removes the Phase 1 development-only anonymous policies. Existing browser sessions using the anon key will no longer be able to read/write business data until users sign in and receive a staff profile.

## 2. Create the first staff account

1. In Supabase, open **Authentication → Users → Add user**.
2. Create the owner account using an email and a strong password.
3. Copy that user's UUID.
4. In SQL Editor, run the following after replacing the values:

```sql
insert into public.staff_profiles(user_id, branch_id, full_name, role)
values (
  'PASTE_AUTH_USER_UUID',
  (select id from public.branches where code='MAIN'),
  'Store Owner',
  'owner'
);
```

Allowed roles: `owner`, `admin`, `manager`, `cashier`, `kitchen`.

## 3. Add more branches

```sql
insert into public.branches(name, code, address, phone)
values ('Branch 2', 'BR02', 'Phnom Penh', '+855...');
```

A staff member is assigned to one branch through `staff_profiles.branch_id`. Data policies restrict records to the signed-in staff member's branch.

## 4. New database modules

- **Staff profiles:** role and branch assignment linked to Supabase Auth.
- **Branches:** separate business locations.
- **Customers:** customer contact records per branch.
- **Inventory movements:** stock-in, sale, adjustment, waste and return history.
- **Audit logs:** records administrative actions for review.

## 5. Security notes

- Use the Supabase **anon/public key** in browser applications, never the `service_role` key.
- Keep Row Level Security enabled.
- Create staff users through Supabase Auth and assign a profile only after verifying the user.
- Test each role with a separate account before using live transactions.
- Back up the database before applying schema changes.

## Current implementation boundary

This migration establishes the database and security foundation. The Phase 1 browser interface remains a demo-oriented frontend; its login screens, role-specific navigation, customer/inventory screens, branch selector, and automatic audit/stock transaction workflows still need to be wired to these new tables before this is used as a live production POS. Do not treat the migration alone as a completed production deployment.
