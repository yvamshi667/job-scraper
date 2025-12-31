import fetch from "node-fetch";

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "";
const SCRAPER_SECRET_KEY = process.env.SCRAPER_SECRET_KEY || "";

const WEBHOOK_URL = SUPABASE_URL
  ? `${SUPABASE_URL}/functions/v1/ingest-jobs`
  : null;

// ---------------- SAFE HELPERS ----------------

export async function getCompanies() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn(
      "⚠️ Supabase env vars missing (SUPABASE_URL / SUPABASE_ANON_KEY). Returning empty companies list."
    );
    return [];
  }

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/companies?active=eq.true`,
    {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    }
  );

  if (!res.ok) {
    console.warn("⚠️ Failed to fetch companies:", await res.text());
    return [];
  }

  return res.json();
}

export async function sendJobs(jobs) {
  if (!WEBHOOK_URL || !SCRAPER_SECRET_KEY) {
    console.warn(
      "⚠️ WEBHOOK_URL or SCRAPER_SECRET_KEY missing. Skipping job ingestion."
    );
    return;
  }

  await fetch(WEBHOOK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-scraper-key": SCRAPER_SECRET_KEY,
    },
    body: JSON.stringify({ jobs }),
  });
}
