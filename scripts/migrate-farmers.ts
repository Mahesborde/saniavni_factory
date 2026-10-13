import "dotenv/config";
import pg from "pg";

type FarmerRecord = {
  id: number | string;
  name: string;
  village: string | null;
  sugarcane_tons: number | string | null;
  amount_paid: number | string | null;
  payment_pending: number | string | null;
};

const sourceRequired = ["PGHOST", "PGDATABASE", "PGUSER", "PGPASSWORD"] as const;
const missing = sourceRequired.filter(name => !process.env[name]);
if (missing.length) {
  throw new Error(`Set the source database variables in .env before migrating: ${missing.join(", ")}`);
}

const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "");
const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !supabaseKey) {
  throw new Error("Set SUPABASE_URL and SUPABASE_SECRET_KEY in .env before migrating.");
}

const host = process.env.PGHOST || "";
const sslDisabled = process.env.PGSSLMODE?.toLowerCase() === "disable";
const sslRequired = process.env.PGSSLMODE?.toLowerCase() === "require"
  || host.endsWith(".supabase.co")
  || host.endsWith(".pooler.supabase.com");
const source = new pg.Pool({
  ssl: sslDisabled ? false : sslRequired ? { rejectUnauthorized: false } : undefined
});

function headers(): Record<string, string> {
  const result: Record<string, string> = {
    apikey: supabaseKey!,
    "Content-Type": "application/json",
    Prefer: "resolution=merge-duplicates,return=minimal"
  };
  if (!supabaseKey!.startsWith("sb_secret_")) {
    result.Authorization = `Bearer ${supabaseKey}`;
  }
  return result;
}

async function main() {
  const { rows } = await source.query<FarmerRecord>(`
    SELECT id, name, village, sugarcane_tons, amount_paid, payment_pending
    FROM farmers
    ORDER BY id
  `);
  const endpoint = `${supabaseUrl}/rest/v1/farmers?on_conflict=id`;
  const batchSize = 200;

  for (let offset = 0; offset < rows.length; offset += batchSize) {
    const batch = rows.slice(offset, offset + batchSize);
    const response = await fetch(endpoint, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(batch)
    });
    if (!response.ok) {
      const details = await response.text();
      throw new Error(`Supabase import failed with HTTP ${response.status}: ${details}`);
    }
  }

  console.log(`Imported ${rows.length} farmer records to Supabase.`);
  console.log("Run supabase/after-import.sql in the Supabase SQL Editor to sync the ID sequence.");
}

try {
  await main();
} finally {
  await source.end();
}
