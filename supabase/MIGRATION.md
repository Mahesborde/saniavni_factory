# Farmer data migration

The application reads the `public.farmers` table. The migration script copies every farmer row and the six columns used by the dashboard from the source PostgreSQL database into Supabase. It upserts by `id`, so it can be run again safely.

1. In Supabase, open **SQL Editor** and run `migrations/20261013000000_create_farmers.sql`.
2. Fill the source `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, `PGPASSWORD`, and (when required) `PGSSLMODE` values in the local `.env`. Do not commit `.env`.
3. Ensure `SUPABASE_URL` and `SUPABASE_SECRET_KEY` are set in `.env`.
4. Run `npm run migrate:farmer-data` from this project directory.
5. Run `after-import.sql` in Supabase SQL Editor to sync the generated ID sequence.
6. Verify the imported row count in the Supabase Table Editor, then redeploy the Vercel project.

The source PostgreSQL password and Supabase secret key are different credentials. The migration needs both: the former to read the source rows, and the latter to write them to Supabase.
