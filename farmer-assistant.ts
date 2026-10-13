import OpenAI from "openai";
import pg from "pg";

type FarmerRecord = {
  id: number | string;
  name: string;
  village: string | null;
  sugarcane_tons: number | string | null;
  amount_paid: number | string | null;
  payment_pending: number | string | null;
};

const selectedColumns = "id,name,village,sugarcane_tons,amount_paid,payment_pending";
let pool: pg.Pool | undefined;

async function getFarmerRecords(): Promise<FarmerRecord[]> {
  const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (supabaseUrl && supabaseKey) {
    const url = new URL(`${supabaseUrl}/rest/v1/farmers`);
    url.searchParams.set("select", selectedColumns);
    url.searchParams.set("order", "sugarcane_tons.desc.nullslast");

    const headers: Record<string, string> = {
      apikey: supabaseKey,
      Accept: "application/json"
    };
    // Legacy service-role keys are JWTs. Current sb_secret keys must only be sent as apikey.
    if (!supabaseKey.startsWith("sb_secret_")) {
      headers.Authorization = `Bearer ${supabaseKey}`;
    }
    const response = await fetch(url, { headers });
    if (!response.ok) {
      const details = await response.text();
      throw new Error(`Supabase farmers query failed (${response.status}): ${details}`);
    }
    return await response.json() as FarmerRecord[];
  }

  if (!pool) {
    const sslDisabled = process.env.PGSSLMODE?.toLowerCase() === "disable";
    const pgHost = process.env.PGHOST || "";
    const sslRequired = process.env.PGSSLMODE?.toLowerCase() === "require" || pgHost.endsWith(".supabase.co");
    pool = new pg.Pool({
      ssl: sslDisabled ? false : sslRequired ? { rejectUnauthorized: false } : undefined
    });
  }
  const result = await pool.query<FarmerRecord>(
    `SELECT id, name, village, sugarcane_tons, amount_paid, payment_pending
     FROM farmers
     ORDER BY sugarcane_tons DESC NULLS LAST`
  );
  return result.rows;
}

export async function askFarmerQuestion(question: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured.");

  const farmerRecords = await getFarmerRecords();
  if (farmerRecords.length === 0) {
    return "I couldn't find any farmer records. Check that the farmers table contains data.";
  }

  const openai = new OpenAI({ apiKey });
  const response = await openai.responses.create({
    model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
    instructions: "You are a sugarcane factory data assistant. Answer the user's question using only the supplied farmer records. If the records do not contain the answer, say so. Calculate totals carefully and report money in Indian rupees (INR). Keep the answer clear and concise.",
    input: `User question: ${question}\n\nFarmer records from the database:\n${JSON.stringify(farmerRecords)}`
  });
  return response.output_text;
}
