# Farmer data migration

The application reads the `public.farmers` table. The migration script copies every farmer row and the six columns used by the dashboard from the source PostgreSQL database into Supabase. It upserts by `id`, so it can be run again safely.

1. Fill the source `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, `PGPASSWORD`, and (when required) `PGSSLMODE` values in the local `.env`. These must point to the database that currently contains your data. Do not commit `.env`.
2. Set `DATABASE_URL` to the Supabase database URI copied from **Connect**. This is the runtime connection for the dashboard and the migration destination. Use the exact host and username shown by Connect, and URL-encode reserved characters in the URI password.
3. If you prefer the Supabase REST API instead, leave `DATABASE_URL` empty, set `SUPABASE_URL` and `SUPABASE_SECRET_KEY`, run `migrations/20261013000000_create_farmers.sql` in the Supabase SQL Editor before migrating, then run `after-import.sql` after the import.
4. Run `npm run migrate:farmer-data` from this project directory.
5. Verify the imported row count in Supabase, then redeploy the Vercel project.

The source PostgreSQL password and destination database password are different credentials. The migration needs both to copy records. For Vercel, set `DATABASE_URL` and `OPENAI_API_KEY` as server-side environment variables. If `DATABASE_URL` is omitted, the app uses the Supabase REST fallback with `SUPABASE_URL` and `SUPABASE_SECRET_KEY`. Never expose any of these credentials in frontend code.
